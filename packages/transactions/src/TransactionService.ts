import { HttpClient, ValidationBuilder, ValidationError } from "@afriex/core";
import {
  Transaction,
  CreateTransactionRequest,
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
    return this.httpClient.get<TransactionListResponse>("/transaction", {
      params,
    });
  }

  private validateCreateRequest(request: CreateTransactionRequest): void {
    const type = request.type ?? DEFAULT_TRANSACTION_TYPE;

    new ValidationBuilder()
      .required("customerId", request.customerId)
      .required("sourceAmount", request.sourceAmount)
      .required("destinationAmount", request.destinationAmount)
      .required("sourceCurrency", request.sourceCurrency)
      .required("destinationCurrency", request.destinationCurrency)
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
}
