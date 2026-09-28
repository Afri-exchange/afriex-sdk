import { HttpClient, ValidationBuilder, ValidationError } from "@afriex/core";
import {
  PaymentBatch,
  PaymentBatchRequest,
  PaymentBatchListParams,
  PaymentBatchListResponse,
  PaymentBatchRecipientRequest,
  UpdatePaymentBatchRecipientRequest,
  SavedPaymentBatchRecipient,
  PaymentBatchRecipientListResponse,
  PaymentBatchOutcomes,
  WithdrawPaymentBatchParams,
  PaymentBatchSessionListResponse,
} from "./types.js";

export class PaymentBatchService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * List payment batches with pagination
   * GET /payment-batch
   */
  async list(
    params?: PaymentBatchListParams
  ): Promise<PaymentBatchListResponse> {
    return this.httpClient.get<PaymentBatchListResponse>("/payment-batch", {
      params,
    });
  }

  /**
   * Create an empty payment batch
   * POST /payment-batch
   *
   * Add recipients next, then start the payouts with `withdraw()`.
   */
  async create(request: PaymentBatchRequest): Promise<PaymentBatch> {
    this.validateBatchRequest(request);

    const response = await this.httpClient.post<{ data: PaymentBatch }>(
      "/payment-batch",
      request
    );
    return response.data;
  }

  /**
   * Get a payment batch by ID
   * GET /payment-batch/{batchId}
   */
  async get(batchId: string): Promise<PaymentBatch> {
    this.requireBatchId(batchId);

    const response = await this.httpClient.get<{ data: PaymentBatch }>(
      `/payment-batch/${batchId}`
    );
    return response.data;
  }

  /**
   * Update a payment batch
   * PATCH /payment-batch/{batchId}
   *
   * The batch is replaced whole: send the name and the funding method, even
   * when only one of them changes.
   */
  async update(
    batchId: string,
    request: PaymentBatchRequest
  ): Promise<PaymentBatch> {
    this.requireBatchId(batchId);
    this.validateBatchRequest(request);

    const response = await this.httpClient.patch<{ data: PaymentBatch }>(
      `/payment-batch/${batchId}`,
      request
    );
    return response.data;
  }

  /**
   * Delete a payment batch
   * DELETE /payment-batch/{batchId}
   */
  async delete(batchId: string): Promise<void> {
    this.requireBatchId(batchId);

    await this.httpClient.delete(`/payment-batch/${batchId}`);
  }

  /**
   * List the recipients in a batch
   * GET /payment-batch/{batchId}/recipients
   */
  async listRecipients(
    batchId: string,
    params?: PaymentBatchListParams
  ): Promise<PaymentBatchRecipientListResponse> {
    this.requireBatchId(batchId);

    return this.httpClient.get<PaymentBatchRecipientListResponse>(
      `/payment-batch/${batchId}/recipients`,
      { params }
    );
  }

  /**
   * Add one recipient to a batch
   * POST /payment-batch/{batchId}/recipients
   *
   * The returned `id` is the saved account's id, not the recipient's id in
   * the batch. Read the `recipientId` from `listRecipients()` to update or
   * remove the recipient.
   */
  async addRecipient(
    batchId: string,
    recipient: PaymentBatchRecipientRequest
  ): Promise<SavedPaymentBatchRecipient> {
    this.requireBatchId(batchId);
    this.validateRecipient(new ValidationBuilder(), recipient).throwIfInvalid();

    const response = await this.httpClient.post<{
      data: SavedPaymentBatchRecipient;
    }>(`/payment-batch/${batchId}/recipients`, recipient);
    return response.data;
  }

  /**
   * Add several recipients to a batch
   * POST /payment-batch/{batchId}/recipients/bulk
   *
   * Each recipient is added independently, so the call succeeds even when
   * some of them fail. Both outcome maps are keyed by account number.
   */
  async addRecipients(
    batchId: string,
    recipients: PaymentBatchRecipientRequest[]
  ): Promise<PaymentBatchOutcomes> {
    this.requireBatchId(batchId);

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new ValidationError("At least one recipient is required");
    }

    const builder = new ValidationBuilder();
    recipients.forEach((recipient, index) =>
      this.validateRecipient(builder, recipient, `recipients[${index}].`)
    );
    builder.throwIfInvalid();

    const response = await this.httpClient.post<{
      data: PaymentBatchOutcomes;
    }>(`/payment-batch/${batchId}/recipients/bulk`, recipients);
    return response.data;
  }

  /**
   * Update a recipient in a batch
   * PATCH /payment-batch/{batchId}/recipients/{recipientId}
   *
   * The recipient is replaced whole: send its account details and amount,
   * even when only one of them changes. Pass `paymentMethodId` to update the
   * saved account in place.
   */
  async updateRecipient(
    batchId: string,
    recipientId: string,
    request: UpdatePaymentBatchRecipientRequest
  ): Promise<SavedPaymentBatchRecipient> {
    this.requireBatchId(batchId);
    this.requireRecipientId(recipientId);
    this.validateRecipient(new ValidationBuilder(), request).throwIfInvalid();

    const response = await this.httpClient.patch<{
      data: SavedPaymentBatchRecipient;
    }>(`/payment-batch/${batchId}/recipients/${recipientId}`, request);
    return response.data;
  }

  /**
   * Remove a recipient from a batch
   * DELETE /payment-batch/{batchId}/recipients/{recipientId}
   *
   * Removes the recipient from this batch only. The saved account is kept.
   */
  async removeRecipient(batchId: string, recipientId: string): Promise<void> {
    this.requireBatchId(batchId);
    this.requireRecipientId(recipientId);

    await this.httpClient.delete(
      `/payment-batch/${batchId}/recipients/${recipientId}`
    );
  }

  /**
   * Start the payouts for a batch
   * POST /payment-batch/{batchId}/withdraw
   *
   * Every call is a new run and pays every recipient again. To retry only the
   * payouts that failed, pass the `sessionId` of the run to retry. The
   * outcomes are keyed by `recipientId`, and a payout that was accepted still
   * settles asynchronously.
   */
  async withdraw(
    batchId: string,
    params?: WithdrawPaymentBatchParams
  ): Promise<PaymentBatchOutcomes> {
    this.requireBatchId(batchId);

    const response = await this.httpClient.post<{
      data: PaymentBatchOutcomes;
    }>(
      `/payment-batch/${batchId}/withdraw`,
      undefined,
      params?.sessionId ? { params: { sessionId: params.sessionId } } : undefined
    );
    return response.data;
  }

  /**
   * List the runs of a batch
   * GET /payment-batch/{batchId}/sessions
   */
  async listSessions(
    batchId: string,
    params?: PaymentBatchListParams
  ): Promise<PaymentBatchSessionListResponse> {
    this.requireBatchId(batchId);

    return this.httpClient.get<PaymentBatchSessionListResponse>(
      `/payment-batch/${batchId}/sessions`,
      { params }
    );
  }

  private requireBatchId(batchId: string): void {
    if (!batchId) {
      throw new ValidationError("Batch ID is required");
    }
  }

  private requireRecipientId(recipientId: string): void {
    if (!recipientId) {
      throw new ValidationError("Recipient ID is required");
    }
  }

  private validateBatchRequest(request: PaymentBatchRequest): void {
    new ValidationBuilder()
      .required("name", request?.name)
      .required("sourcePaymentMethod", request?.sourcePaymentMethod)
      .condition(
        "sourcePaymentMethod.currencyCode",
        Boolean(request?.sourcePaymentMethod) &&
          !request.sourcePaymentMethod.currencyCode,
        "sourcePaymentMethod.currencyCode is required"
      )
      .throwIfInvalid();
  }

  /**
   * As on a payment method, UPI and INTERAC recipients take no institution.
   */
  private validateRecipient(
    builder: ValidationBuilder,
    recipient: PaymentBatchRecipientRequest,
    prefix = ""
  ): ValidationBuilder {
    const channel = recipient?.channel;
    const needsInstitution = channel !== "UPI" && channel !== "INTERAC";
    const amount = recipient?.amount;

    builder
      .required(`${prefix}channel`, channel)
      .required(`${prefix}accountName`, recipient?.accountName)
      .required(`${prefix}accountNumber`, recipient?.accountNumber)
      .required(`${prefix}countryCode`, recipient?.countryCode)
      .required(`${prefix}amount`, amount)
      .condition(
        `${prefix}amount.value`,
        Boolean(amount) &&
          (amount.value === undefined ||
            amount.value === null ||
            amount.value === ""),
        `${prefix}amount.value is required`
      )
      .condition(
        `${prefix}amount.currencyCode`,
        Boolean(amount) && !amount.currencyCode,
        `${prefix}amount.currencyCode is required`
      );

    if (needsInstitution) {
      builder.required(`${prefix}institution`, recipient?.institution);
    }

    return builder;
  }
}
