import { HttpClient, ValidationBuilder } from "@afriex/core";
import { TriggerWebhookRequest, TriggerWebhookResponse } from "./types.js";

/**
 * Service for triggering test webhooks
 * Note: This is only available in sandbox/staging environments
 */
export class WebhookService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Trigger a test webhook
   * POST /webhooks/trigger
   *
   * Manually triggers a test webhook for development/testing.
   * Only available in sandbox/staging environment.
   *
   * @param request - The webhook event type and resource ID
   * @returns Success confirmation
   */
  async triggerTestWebhook(
    request: TriggerWebhookRequest
  ): Promise<TriggerWebhookResponse> {
    new ValidationBuilder()
      .required("event", request.event)
      .required("resourceId", request.resourceId)
      .throwIfInvalid();

    return this.httpClient.post<TriggerWebhookResponse>(
      "/webhooks/trigger",
      request
    );
  }
}
