import { HttpClient, ValidationError } from "@afriex/core";
import {
  PaymentMethod,
  CreatePaymentMethodRequest,
  ListPaymentMethodsParams,
  PaymentMethodListResponse,
  Institution,
  ResolveAccountResponse,
  GetInstitutionsParams,
  ResolveAccountParams,
  CryptoWalletResponse,
  GetCryptoWalletParams,
  GetVirtualAccountParams,
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
    return this.httpClient.get<PaymentMethodListResponse>("/payment-method", {
      params,
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
   */
  async getInstitutions(params: GetInstitutionsParams): Promise<Institution[]> {
    if (!params.channel || !params.countryCode) {
      throw new ValidationError("Channel and country code are required");
    }

    return this.httpClient.get<Institution[]>("/payment-method/institution", {
      params,
    });
  }

  /**
   * Resolves a bank code (SWIFT code or US routing number) to the corresponding bank or institution name.
   * GET /payment-method/institution/codes
   */
  async resolveInstitutionCode(
    params: InstitutionCodesParams
  ): Promise<InstitutionCodesResponse | null> {
    if (!params.codeType || !params.country || !params.searchTerm) {
      throw new ValidationError(
        "Code type, country, and search term are required"
      );
    }

    return this.httpClient.get<InstitutionCodesResponse | null>(
      "/payment-method/institution/codes",
      {
        params,
      }
    );
  }

  /**
   * Resolve account details by account number
   * GET /payment-method/resolve
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
   * Note: Only available in production
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
   * Get or create virtual account payment method
   * GET /payment-method/virtual-account
   * Note: Only available in production
   */
  async getVirtualAccount(
    params: GetVirtualAccountParams
  ): Promise<PaymentMethod> {
    if (!params.currency) {
      throw new ValidationError("Currency is required");
    }

    const response = await this.httpClient.get<{ data: PaymentMethod }>(
      "/payment-method/virtual-account",
      { params }
    );
    return response.data;
  }

  private validateCreateRequest(request: CreatePaymentMethodRequest): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!request.channel) {
      errors.push({ field: "channel", message: "Channel is required" });
    }

    if (!request.customerId) {
      errors.push({ field: "customerId", message: "Customer ID is required" });
    }

    if (!request.accountName) {
      errors.push({
        field: "accountName",
        message: "Account name is required",
      });
    }

    if (!request.accountNumber) {
      errors.push({
        field: "accountNumber",
        message: "Account number is required",
      });
    }

    if (!request.countryCode) {
      errors.push({
        field: "countryCode",
        message: "Country code is required",
      });
    }

    if (!request.institution) {
      errors.push({ field: "institution", message: "Institution is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", errors);
    }
  }
}
