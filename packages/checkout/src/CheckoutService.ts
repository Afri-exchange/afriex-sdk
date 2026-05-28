import { HttpClient, ValidationBuilder } from "@afriex/core";
import {
  CreateCheckoutSessionRequest,
  CheckoutSession,
  CreateCheckoutSessionResponse,
} from "./types.js";

export class CheckoutService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Create a checkout session
   * POST /checkout-session
   *
   * Creates a hosted checkout session where customers can complete payments.
   * Returns a checkout URL that can be embedded or redirected to.
   */
  async createSession(
    request: CreateCheckoutSessionRequest
  ): Promise<CheckoutSession> {
    this.validateCreateSessionRequest(request);

    const response = await this.httpClient.post<CreateCheckoutSessionResponse>(
      "/checkout-session",
      request
    );
    return response.data;
  }

  private validateCreateSessionRequest(
    request: CreateCheckoutSessionRequest
  ): void {
    new ValidationBuilder()
      // Validate customer
      .required("customer.fullName", request.customer?.fullName)
      .required("customer.email", request.customer?.email)
      .required("customer.phone", request.customer?.phone)
      .required("customer.countryCode", request.customer?.countryCode)
      // Validate transaction
      .required("transaction.sourceAmount", request.transaction?.sourceAmount)
      .required(
        "transaction.sourceCurrency",
        request.transaction?.sourceCurrency
      )
      .required(
        "transaction.destinationAmount",
        request.transaction?.destinationAmount
      )
      .required(
        "transaction.destinationCurrency",
        request.transaction?.destinationCurrency
      )
      .required("transaction.type", request.transaction?.type)
      .required("transaction.meta", request.transaction?.meta)
      .required(
        "transaction.meta.idempotencyKey",
        request.transaction?.meta?.idempotencyKey
      )
      .required(
        "transaction.meta.reference",
        request.transaction?.meta?.reference
      )
      // Validate URLs
      .required("successUrl", request.successUrl)
      .required("cancelUrl", request.cancelUrl)
      // Validate type-specific fields
      .condition(
        "transaction.destinationId",
        request.transaction?.type === "WITHDRAW" &&
          !request.transaction?.destinationId,
        "destinationId is required for WITHDRAW transactions"
      )
      .condition(
        "transaction.sourceId",
        request.transaction?.type === "DEPOSIT" &&
          !request.transaction?.sourceId,
        "sourceId is required for DEPOSIT transactions"
      )
      .throwIfInvalid();
  }
}
