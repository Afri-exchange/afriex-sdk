import { HttpClient, ValidationBuilder, ValidationError } from "@afriex/core";
import {
  Transaction,
  CreateTransactionRequest,
  AuthorizeTransactionRequest,
  ListTransactionsParams,
  TransactionListResponse,
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

  private validateCreateRequest(request: CreateTransactionRequest): void {
    const type = request.type ?? DEFAULT_TRANSACTION_TYPE;

    new ValidationBuilder()
      .condition(
        "customerId",
        type !== "SWAP" && !request.customerId,
        "Customer ID is required for DEPOSIT and WITHDRAW transactions"
      )
      .required("sourceAmount", request.sourceAmount)
      .condition(
        "destinationAmount",
        type !== "SWAP" && !request.destinationAmount,
        "Destination amount is required for DEPOSIT and WITHDRAW transactions"
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
