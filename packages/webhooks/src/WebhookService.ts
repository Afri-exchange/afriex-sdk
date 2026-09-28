import * as crypto from "crypto";
import { HttpClient, ValidationBuilder } from "@afriex/core";
import {
  TriggerWebhookRequest,
  TriggerWebhookResponse,
  WebhookPayload,
} from "./types.js";

/**
 * Unified service for webhook verification and sandbox test triggering.
 */
export class WebhookService {
  private readonly httpClient?: HttpClient;
  private readonly publicKey?: string;

  constructor(httpClient?: HttpClient, publicKey?: string) {
    this.httpClient = httpClient;
    this.publicKey = publicKey;
  }

  /**
   * Verify webhook signature using Afriex's public key.
   * Returns false when no public key is configured.
   *
   * @param payload - The raw request body, exactly as received. Pass the
   *   string or Buffer the server read, never a re-serialized object.
   * @param signature - The value of the `x-webhook-signature` header
   */
  verify(payload: string | Buffer, signature: string): boolean {
    if (!this.publicKey || !payload || payload.length === 0 || !signature) {
      return false;
    }

    try {
      const verifier = crypto.createVerify("SHA256");
      verifier.update(payload);
      return verifier.verify(this.publicKey, signature, "base64");
    } catch {
      return false;
    }
  }

  /**
   * Verify and parse a webhook payload.
   *
   * @throws when no public key is configured or the signature does not match
   */
  verifyAndParse(payload: string | Buffer, signature: string): WebhookPayload {
    if (!this.publicKey) {
      throw new Error("Public key is required for webhook verification");
    }

    if (!this.verify(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    const body = typeof payload === "string" ? payload : payload.toString("utf8");
    return JSON.parse(body) as WebhookPayload;
  }

  /**
   * Trigger a test webhook
   * POST /webhooks/trigger
   *
   * Manually triggers a test webhook for development/testing.
   * Only available in sandbox/staging environment.
   *
   * `POOL_DEPOSIT_REQUEST.REJECTED` cannot be fired from here: it is delivered
   * by the pool-account review flow only.
   *
   * @param request - The webhook event type and entity ID (`resourceId` is
   *   accepted as a deprecated fallback for `entityId`)
   * @returns An envelope whose `data` carries the queued event and its delivery URL
   */
  async triggerTestWebhook(
    request: TriggerWebhookRequest
  ): Promise<TriggerWebhookResponse> {
    if (!this.httpClient) {
      throw new Error("HTTP client is required to trigger test webhooks");
    }

    new ValidationBuilder()
      .required("event", request.event)
      .requireOneOf(
        [
          ["entityId", request.entityId],
          ["resourceId", request.resourceId],
        ],
        "Either entityId or resourceId is required"
      )
      .throwIfInvalid();

    let entityId = request.entityId;
    if (!entityId && request.resourceId) {
      console.warn(
        "[@afriex/webhooks] `resourceId` is deprecated on triggerTestWebhook() and will be removed in a future version. Use `entityId` instead."
      );
      entityId = request.resourceId;
    }

    return this.httpClient.post<TriggerWebhookResponse>("/webhooks/trigger", {
      event: request.event,
      entityId,
    });
  }
}
