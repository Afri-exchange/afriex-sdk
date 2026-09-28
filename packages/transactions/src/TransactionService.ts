import { HttpClient, ValidationBuilder, ValidationError } from "@afriex/core";
import {
  Transaction,
  CreateTransactionRequest,
  AuthorizeTransactionRequest,
  ListTransactionsParams,
  TransactionListResponse,
  SimulateTransactionRequest,
  SettlementAdvice,
  SubmitPoolAccountProofRequest,
  DEFAULT_TRANSACTION_TYPE,
} from "./types.js";

export class TransactionService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Create a new transaction
   * POST /transaction
   */
  async create(request: CreateTransactionRequest): Promise<Transaction> {
    this.validateCreateRequest(request);

    const response = await this.httpClient.post<{ data: Transaction }>(
      "/transaction",
      request
    );
    return response.data;
  }

  /**
   * Get a transaction by ID
   * GET /transaction/{transactionId}
   */
  async get(transactionId: string): Promise<Transaction> {
    if (!transactionId) {
      throw new ValidationError("Transaction ID is required");
    }

    const response = await this.httpClient.get<{ data: Transaction }>(
      `/transaction/${transactionId}`
    );
    return response.data;
  }

  /**
   * List all transactions with pagination
   * GET /transaction
   */
  async list(
    params?: ListTransactionsParams
  ): Promise<TransactionListResponse> {
    const normalizedParams = params
      ? {
          ...params,
          status: this.joinQueryValues(params.status),
          type: this.joinQueryValues(params.type),
          channel: this.joinQueryValues(params.channel),
          currency: this.joinQueryValues(params.currency),
        }
      : undefined;

    return this.httpClient.get<TransactionListResponse>("/transaction", {
      params: normalizedParams,
    });
  }

  /**
   * Authorize a pending transaction that needs an extra step (e.g. OTP on a
   * mobile-money deposit left in CUSTOMER_ACTION_REQUIRED).
   * POST /transaction/{transactionId}/authorize
   */
  async authorize(
    transactionId: string,
    request: AuthorizeTransactionRequest
  ): Promise<Transaction> {
    if (!transactionId) {
      throw new ValidationError("Transaction ID is required");
    }

    new ValidationBuilder()
      .required("type", request.type)
      .required("otp", request.otp)
      .throwIfInvalid();

    const response = await this.httpClient.post<{ data: Transaction }>(
      `/transaction/${transactionId}/authorize`,
      request
    );
    return response.data;
  }

  /**
   * Finalize a pending sandbox transaction with the outcome you choose.
   * POST /transaction/{transactionId}/simulate
   *
   * The transaction must still be PENDING, PROCESSING or UNKNOWN; a deposit
   * waiting for an OTP has to be authorized first. The returned transaction
   * is the one before it is finalized: the result arrives by the
   * TRANSACTION.UPDATED webhook shortly after.
   *
   * Note: Sandbox only. Production answers 403.
   */
  async simulate(
    transactionId: string,
    request: SimulateTransactionRequest
  ): Promise<Transaction> {
    if (!transactionId) {
      throw new ValidationError("Transaction ID is required");
    }

    new ValidationBuilder()
      .required("outcome", request?.outcome)
      .condition(
        "outcome",
        Boolean(request?.outcome) &&
          request.outcome !== "success" &&
          request.outcome !== "failed",
        "outcome must be 'success' or 'failed'"
      )
      .throwIfInvalid();

    const response = await this.httpClient.post<{ data: Transaction }>(
      `/transaction/${transactionId}/simulate`,
      { outcome: request.outcome }
    );
    return response.data;
  }

  /**
   * Get the settlement and remittance advice for a transaction.
   * GET /transaction/{transactionId}/advice
   *
   * Advices exist only for USD withdrawals created with
   * `meta.settlement: "request"`. Any other transaction answers 404. The
   * download URL is valid for 5 minutes; call again for a fresh one.
   */
  async getAdvice(transactionId: string): Promise<SettlementAdvice> {
    if (!transactionId) {
      throw new ValidationError("Transaction ID is required");
    }

    const response = await this.httpClient.get<{ data: SettlementAdvice }>(
      `/transaction/${transactionId}/advice`
    );
    return response.data;
  }

  /**
   * Submit proof of a deposit made to the business pool account.
   * POST /transaction/pool-account
   *
   * Creates a deposit in IN_REVIEW. An operator then confirms or rejects the
   * bank inflow: approval arrives as TRANSACTION.CREATED, rejection as
   * POOL_DEPOSIT_REQUEST.REJECTED.
   */
  async submitPoolAccountProof(
    request: SubmitPoolAccountProofRequest
  ): Promise<Transaction> {
    new ValidationBuilder()
      .condition(
        "amount",
        typeof request?.amount !== "number" ||
          Number.isNaN(request.amount) ||
          request.amount < 0,
        "amount must be a number that is not negative"
      )
      .required("customerId", request?.customerId)
      .required("countryCode", request?.countryCode)
      .required("reference", request?.reference)
      .required("fileKey", request?.fileKey)
      .required("timestamp", request?.timestamp)
      .condition(
        "senderDetails.name",
        request?.senderDetails !== undefined && !request.senderDetails?.name,
        "senderDetails.name is required when senderDetails is sent"
      )
      .throwIfInvalid();

    const timestamp =
      request.timestamp instanceof Date
        ? request.timestamp.toISOString()
        : request.timestamp;

    const response = await this.httpClient.post<{ data: Transaction }>(
      "/transaction/pool-account",
      { ...request, timestamp }
    );
    return response.data;
  }

  private validateCreateRequest(request: CreateTransactionRequest): void {
    const type = request.type ?? DEFAULT_TRANSACTION_TYPE;

    new ValidationBuilder()
      .condition(
        "customerId",
        type !== "SWAP" && !request.customerId,
        "Customer ID is required for DEPOSIT and WITHDRAW transactions"
      )
      .condition(
        "sourceAmount",
        !request.sourceAmount && !request.destinationAmount,
        "Either sourceAmount or destinationAmount is required"
      )
      .condition(
        "destinationAmount",
        type === "SWAP" &&
          Boolean(request.sourceAmount) &&
          Boolean(request.destinationAmount),
        "A SWAP takes exactly one of sourceAmount or destinationAmount"
      )
      .required("sourceCurrency", request.sourceCurrency)
      .required("destinationCurrency", request.destinationCurrency)
      .required("meta", request.meta)
      .required("meta.idempotencyKey", request.meta?.idempotencyKey)
      .required("meta.reference", request.meta?.reference)
      .condition(
        "destinationId",
        type === "WITHDRAW" &&
          !("destinationId" in request && request.destinationId),
        "Destination ID is required for WITHDRAW transactions"
      )
      .condition(
        "sourceId",
        type === "DEPOSIT" && !("sourceId" in request && request.sourceId),
        "Source ID is required for DEPOSIT transactions"
      )
      .condition(
        "correspondentBankName",
        Boolean(request.correspondentBankName) !==
          Boolean(request.correspondentBankAccountNumber),
        "correspondentBankName and correspondentBankAccountNumber must be provided together"
      )
      .condition(
        "meta.settlement",
        request.meta?.settlement === "request" && type !== "WITHDRAW",
        "meta.settlement 'request' is only supported for WITHDRAW transactions"
      )
      .throwIfInvalid();
  }

  private joinQueryValues(
    value?: string | string[]
  ): string | undefined {
    if (Array.isArray(value)) {
      return value.join(",");
    }

    return value;
  }
}
