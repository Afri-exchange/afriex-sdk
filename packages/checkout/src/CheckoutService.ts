import { HttpClient, ValidationBuilder } from "@afriex/core";
import {
  CreateCheckoutSessionRequest,
  CheckoutSession,
  CreateCheckoutSessionResponse,
} from "./types.js";

export class CheckoutService {
  private static readonly supportedChannels = new Set([
    "VIRTUAL_BANK_ACCOUNT",
    "MOBILE_MONEY",
  ]);

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
      .required("amount", request.amount)
      .condition(
        "amount",
        request.amount !== undefined && !Number.isInteger(request.amount),
        "amount must be an integer value in minor units"
      )
      .condition(
        "amount",
        typeof request.amount === "number" && request.amount < 100,
        "amount must be at least 100"
      )
      .required("currency", request.currency)
      .condition(
        "currency",
        request.currency !== undefined &&
          request.currency !== "" &&
          request.currency.trim().length !== 3,
        "currency must be a 3-letter ISO 4217 code"
      )
      .required("merchantReference", request.merchantReference)
      .required("redirectUrl", request.redirectUrl)
      .condition(
        "redirectUrl",
        request.redirectUrl !== undefined &&
          request.redirectUrl !== "" &&
          !this.isHttpsUrl(request.redirectUrl),
        "redirectUrl must be a valid HTTPS URL"
      )
      .required("customer.email", request.customer?.email)
      .required("customer.phone", request.customer?.phone)
      .required("customer.countryCode", request.customer?.countryCode)
      .required("customer.name", request.customer?.name)
      .condition(
        "customer.countryCode",
        request.customer?.countryCode !== undefined &&
          request.customer.countryCode !== "" &&
          request.customer.countryCode.trim().length !== 2,
        "customer.countryCode must be a 2-letter ISO country code"
      )
      .required("channels", request.channels)
      .condition(
        "channels",
        Array.isArray(request.channels) && request.channels.length === 0,
        "channels must contain at least one payment channel"
      )
      .condition(
        "channels",
        this.hasInvalidChannels(request.channels),
        "channels contains an unsupported payment channel"
      )
      .condition(
        "metadata",
        this.hasInvalidMetadata(request.metadata),
        "metadata values must be strings"
      )
      .throwIfInvalid();
  }

  private hasInvalidChannels(
    channels: CreateCheckoutSessionRequest["channels"] | unknown
  ): boolean {
    if (channels === undefined) {
      return false;
    }

    if (!Array.isArray(channels)) {
      return true;
    }

    return channels.some(
      (channel) =>
        typeof channel !== "string" ||
        !CheckoutService.supportedChannels.has(channel)
    );
  }

  private hasInvalidMetadata(
    metadata: CreateCheckoutSessionRequest["metadata"] | unknown
  ): boolean {
    if (metadata === undefined) {
      return false;
    }

    if (
      metadata === null ||
      typeof metadata !== "object" ||
      Array.isArray(metadata)
    ) {
      return true;
    }

    return Object.values(metadata).some((value) => typeof value !== "string");
  }

  private isHttpsUrl(url: string): boolean {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }
}
