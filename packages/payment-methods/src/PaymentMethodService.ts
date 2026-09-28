import { HttpClient, ValidationError, ValidationBuilder } from "@afriex/core";
import {
  PaymentMethod,
  CreatePaymentMethodRequest,
  ListPaymentMethodsParams,
  PaymentMethodListResponse,
  InstitutionListResponse,
  ResolveAccountResponse,
  GetInstitutionsParams,
  ResolveAccountParams,
  CryptoWalletResponse,
  GetCryptoWalletParams,
  ListVirtualAccountsParams,
  CreateVirtualAccountParams,
  VirtualAccountListResponse,
  ListPoolAccountsParams,
  PoolAccountResponse,
  InstitutionCodesParams,
  InstitutionCodesResponse,
} from "./types.js";

export class PaymentMethodService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Create a new payment method
   * POST /payment-method
   *
   * `accountName`, `accountNumber` and `institution` are required for every
   * channel except UPI and INTERAC, which take no `institution`, and
   * VIRTUAL_BANK_ACCOUNT, which takes none of the three.
   */
  async create(request: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    this.validateCreateRequest(request);

    const response = await this.httpClient.post<{ data: PaymentMethod }>(
      "/payment-method",
      request
    );
    return response.data;
  }

  /**
   * Get a payment method by ID
   * GET /payment-method/{paymentMethodId}
   */
  async get(paymentMethodId: string): Promise<PaymentMethod> {
    if (!paymentMethodId) {
      throw new ValidationError("Payment method ID is required");
    }

    const response = await this.httpClient.get<{ data: PaymentMethod }>(
      `/payment-method/${paymentMethodId}`
    );
    return response.data;
  }

  /**
   * List all payment methods with pagination
   * GET /payment-method
   */
  async list(
    params?: ListPaymentMethodsParams
  ): Promise<PaymentMethodListResponse> {
    const normalizedParams = params
      ? {
          ...params,
          channel: this.joinQueryValues(params.channel),
          currencies: this.joinQueryValues(params.currencies),
          capabilities: this.joinQueryValues(params.capabilities),
          status: this.joinQueryValues(params.status),
        }
      : undefined;

    return this.httpClient.get<PaymentMethodListResponse>("/payment-method", {
      params: normalizedParams,
    });
  }

  /**
   * Delete a payment method
   * DELETE /payment-method/{paymentMethodId}
   */
  async delete(paymentMethodId: string): Promise<void> {
    if (!paymentMethodId) {
      throw new ValidationError("Payment method ID is required");
    }

    await this.httpClient.delete(`/payment-method/${paymentMethodId}`);
  }

  /**
   * Get list of institutions (banks/mobile money providers) for a country
   * GET /payment-method/institution
   *
   * The institutions are on the `data` property of the returned envelope.
   */
  async getInstitutions(
    params: GetInstitutionsParams
  ): Promise<InstitutionListResponse> {
    if (!params.channel || !params.countryCode) {
      throw new ValidationError("Channel and country code are required");
    }

    return this.httpClient.get<InstitutionListResponse>(
      "/payment-method/institution",
      {
        params,
      }
    );
  }

  /**
   * Resolves a bank code (SWIFT code or US routing number) to the corresponding bank or institution name.
   * GET /payment-method/institution/codes
   *
   * The bank name is at `.data.bankName`; `.data` is `null` when the code does
   * not resolve.
   */
  async resolveInstitutionCode(
    params: InstitutionCodesParams
  ): Promise<InstitutionCodesResponse> {
    if (!params.codeType || !params.country || !params.searchTerm) {
      throw new ValidationError(
        "Code type, country, and search term are required"
      );
    }

    return this.httpClient.get<InstitutionCodesResponse>(
      "/payment-method/institution/codes",
      {
        params,
      }
    );
  }

  /**
   * Resolve account details by account number
   * GET /payment-method/resolve
   *
   * The resolved account is on the `data` property of the returned envelope.
   */
  async resolveAccount(
    params: ResolveAccountParams
  ): Promise<ResolveAccountResponse> {
    if (!params.channel || !params.countryCode) {
      throw new ValidationError("Channel and country code are required");
    }

    if (!params.accountNumber) {
      throw new ValidationError("Account number is required");
    }

    if (params.channel === "BANK_ACCOUNT" && !params.institutionCode) {
      throw new ValidationError(
        "Institution code is required for bank accounts"
      );
    }

    return this.httpClient.get<ResolveAccountResponse>(
      "/payment-method/resolve",
      {
        params,
      }
    );
  }

  /**
   * Get or create crypto wallet payment method
   * GET /payment-method/crypto-wallet
   *
   * Returns one wallet carrying an address per supported network, at
   * `.data.addresses`.
   *
   * Note: The API reference documents this endpoint as production only.
   */
  async getCryptoWallet(
    params: GetCryptoWalletParams
  ): Promise<CryptoWalletResponse> {
    if (!params.asset) {
      throw new ValidationError("Asset is required");
    }

    return this.httpClient.get<CryptoWalletResponse>(
      "/payment-method/crypto-wallet",
      {
        params,
      }
    );
  }

  /**
   * List existing virtual accounts
   * GET /payment-method/virtual-account
   * Returns every active virtual account for the customer or business, or an
   * empty list when there is none. It never creates one.
   */
  async listVirtualAccounts(
    params: ListVirtualAccountsParams
  ): Promise<VirtualAccountListResponse> {
    if (!params.currency) {
      throw new ValidationError("Currency is required");
    }

    return this.httpClient.get<VirtualAccountListResponse>(
      "/payment-method/virtual-account",
      { params }
    );
  }

  /**
   * Create a new virtual account
   * POST /payment-method/virtual-account
   * Creates a dedicated virtual bank account for the customer or business.
   *
   * A virtual account for a customer can only be NGN; omit `customerId` to
   * create one in another currency for the business itself. In the sandbox,
   * fund it with `simulate-transfer`: it receives no money on its own.
   */
  async createVirtualAccount(
    params: CreateVirtualAccountParams
  ): Promise<PaymentMethod> {
    new ValidationBuilder()
      .required("currency", params.currency)
      .mutuallyExclusive("label", params.label, "amount", params.amount)
      .throwIfInvalid();

    const response = await this.httpClient.post<{ data: PaymentMethod }>(
      "/payment-method/virtual-account",
      params
    );
    return response.data;
  }

  /**
   * Get the pool account for a country
   * GET /payment-method/pool-account
   *
   * Returns the single pool account for `country`. Use its `reference` to
   * reconcile incoming deposits. Every call also sends a
   * `PAYMENT_METHOD.UPDATED` webhook carrying the pool account.
   */
  async getPoolAccount(params: ListPoolAccountsParams): Promise<PaymentMethod> {
    return this.listPoolAccounts(params);
  }

  /**
   * Get the pool account for a country
   * GET /payment-method/pool-account
   *
   * @deprecated Use `getPoolAccount()`. Despite the name, this returns one
   * pool account, not a list.
   */
  async listPoolAccounts(
    params: ListPoolAccountsParams
  ): Promise<PaymentMethod> {
    if (!params.country) {
      throw new ValidationError("Country is required");
    }

    const response = await this.httpClient.get<PoolAccountResponse>(
      "/payment-method/pool-account",
      { params }
    );
    return response.data;
  }

  private joinQueryValues(
    value?: string | string[]
  ): string | undefined {
    if (Array.isArray(value)) {
      return value.join(",");
    }

    return value;
  }

  /**
   * Which account fields are required depends on the channel: UPI and INTERAC
   * take no institution, and VIRTUAL_BANK_ACCOUNT takes none of accountName,
   * accountNumber or institution.
   */
  private validateCreateRequest(request: CreatePaymentMethodRequest): void {
    const { channel } = request;
    const needsAccount = channel !== "VIRTUAL_BANK_ACCOUNT";
    const needsInstitution =
      needsAccount && channel !== "UPI" && channel !== "INTERAC";

    const builder = new ValidationBuilder()
      .required("channel", channel)
      .required("customerId", request.customerId)
      .required("countryCode", request.countryCode);

    if (needsAccount) {
      builder
        .required("accountName", request.accountName)
        .required("accountNumber", request.accountNumber);
    }

    if (needsInstitution) {
      builder.required("institution", request.institution);
    }

    builder.throwIfInvalid();
  }
}
