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
    "CARD",
  ]);

  private static readonly maxMetadataEntries = 50;
  private static readonly maxMetadataKeyLength = 128;
  private static readonly maxMetadataValueLength = 1024;

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
   *
   * `channels` is a cap, not an exact list: channels the `currency` cannot
   * collect on are dropped, and the ones the payer will be offered come back on
   * the response as `channels`.
   *
   * Note: Only available in sandbox for now; production answers 403.
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
        this.metadataProblem(request.metadata) !== undefined,
        this.metadataProblem(request.metadata) ?? ""
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

  /**
   * What is wrong with the metadata, or `undefined` when it is valid. The
   * limits are the API's: it rejects metadata that goes over any of them.
   */
  private metadataProblem(
    metadata: CreateCheckoutSessionRequest["metadata"] | unknown
  ): string | undefined {
    if (metadata === undefined) {
      return undefined;
    }

    if (
      metadata === null ||
      typeof metadata !== "object" ||
      Array.isArray(metadata)
    ) {
      return "metadata must be an object of string values";
    }

    const entries = Object.entries(metadata);

    if (entries.some(([, value]) => typeof value !== "string")) {
      return "metadata values must be strings";
    }

    if (entries.length > CheckoutService.maxMetadataEntries) {
      return `metadata can hold at most ${CheckoutService.maxMetadataEntries} entries`;
    }

    if (
      entries.some(
        ([key]) =>
          key.length === 0 || key.length > CheckoutService.maxMetadataKeyLength
      )
    ) {
      return `metadata keys must be 1 to ${CheckoutService.maxMetadataKeyLength} characters long`;
    }

    if (
      entries.some(
        ([, value]) =>
          (value as string).length > CheckoutService.maxMetadataValueLength
      )
    ) {
      return `metadata values can be at most ${CheckoutService.maxMetadataValueLength} characters long`;
    }

    return undefined;
  }

  private isHttpsUrl(url: string): boolean {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }
}
