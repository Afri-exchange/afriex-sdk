import { HttpClient, ValidationError } from "@afriex/core";
import {
  Transaction,
  CreateTransactionRequest,
  ListTransactionsParams,
  TransactionListResponse,
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
    const errors: Array<{ field: string; message: string }> = [];

    if (!request.customerId) {
      errors.push({ field: "customerId", message: "Customer ID is required" });
    }

    if (!request.sourceAmount) {
      errors.push({
        field: "sourceAmount",
        message: "Source amount is required",
      });
    }

    if (!request.destinationAmount) {
      errors.push({
        field: "destinationAmount",
        message: "Destination amount is required",
      });
    }

    if (!request.sourceCurrency) {
      errors.push({
        field: "sourceCurrency",
        message: "Source currency is required",
      });
    }

    if (!request.destinationCurrency) {
      errors.push({
        field: "destinationCurrency",
        message: "Destination currency is required",
      });
    }

    const type = request.type ?? "WITHDRAW";

    if (
      type === "WITHDRAW" &&
      !("destinationId" in request && request.destinationId)
    ) {
      errors.push({
        field: "destinationId",
        message: "Destination ID is required for WITHDRAW transactions",
      });
    }

    if (type === "DEPOSIT" && !("sourceId" in request && request.sourceId)) {
      errors.push({
        field: "sourceId",
        message: "Source ID is required for DEPOSIT transactions",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", errors);
    }
  }
}
