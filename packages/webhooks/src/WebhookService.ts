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
   */
  verify(payload: string, signature: string): boolean {
    if (!this.publicKey || !payload || !signature) {
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
   */
  verifyAndParse(payload: string, signature: string): WebhookPayload {
    if (!this.publicKey) {
      throw new Error("Public key is required for webhook verification");
    }

    if (!this.verify(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    return JSON.parse(payload) as WebhookPayload;
  }

  /**
   * Trigger a test webhook
   * POST /webhooks/trigger
   *
   * Manually triggers a test webhook for development/testing.
   * Only available in sandbox/staging environment.
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
