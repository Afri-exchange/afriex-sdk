import { z } from "zod";
import type { ToolRegistry } from "./index.js";
import { webhookVerifyOutputSchema, webhookParsedOutputSchema, triggerWebhookOutputSchema, toStructured } from "../schemas/output.js";

export function registerWebhookTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_verify_webhook_signature",
    {
      description: "Verify the signature of an incoming webhook payload from Afriex. Use this to confirm that a webhook was genuinely sent by Afriex. Returns whether the signature is valid.",
      inputSchema: {
        payload: z.string().min(1).describe("The raw webhook payload body as a string (the entire JSON body, unparsed)"),
        signature: z
          .string()
          .min(1)
          .describe("The signature from the x-webhook-signature header of the webhook request"),
      },
      outputSchema: webhookVerifyOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ payload, signature }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const isValid = sdk.webhooks.verify(payload, signature);
        const message = isValid
          ? "Webhook signature is VALID. The webhook was genuinely sent by Afriex."
          : "Webhook signature is INVALID. The webhook may have been tampered with or the webhookPublicKey may not be configured.";
        return {
          content: [{ type: "text", text: message }],
          structuredContent: { valid: isValid, message },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error verifying webhook: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_verify_and_parse_webhook",
    {
      description: "Verify an incoming webhook signature and parse the payload. Throws an error if the signature is invalid. Returns the parsed webhook payload with event type and data.",
      inputSchema: {
        payload: z.string().min(1).describe("The raw webhook payload body as a string"),
        signature: z
          .string()
          .min(1)
          .describe("The signature from the x-webhook-signature header of the webhook request"),
      },
      outputSchema: webhookParsedOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ payload, signature }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const parsed = sdk.webhooks.verifyAndParse(payload, signature);
        return {
          content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
          structuredContent: toStructured(parsed),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Webhook verification failed: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_trigger_test_webhook",
    {
      description: "[SANDBOX ONLY] Manually trigger a test webhook event for development and testing. Fires a real signed webhook to the business's configured callback URL. Only works in staging/sandbox environment. Requires entityId (resourceId is a deprecated alias).",
      inputSchema: {
        event: z
          .enum([
            "CUSTOMER.CREATED",
            "CUSTOMER.UPDATED",
            "CUSTOMER.DELETED",
            "PAYMENT_METHOD.CREATED",
            "PAYMENT_METHOD.UPDATED",
            "PAYMENT_METHOD.DELETED",
            "TRANSACTION.CREATED",
            "TRANSACTION.UPDATED",
            "CHECKOUT_SESSION.CREATED",
          ])
          .describe("The webhook event type to trigger"),
        entityId: z
          .string()
          .min(1)
          .optional()
          .describe("The entity ID (customerId, paymentMethodId, transactionId, or checkout session UUID) to use in the test payload. Required unless the deprecated resourceId is supplied instead."),
        resourceId: z
          .string()
          .min(1)
          .optional()
          .describe("Deprecated — use entityId instead. Kept as a fallback; still routed to the API as entityId."),
      },
      outputSchema: triggerWebhookOutputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ event, entityId, resourceId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const result = await sdk.webhooks.triggerTestWebhook({ event, entityId, resourceId });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: toStructured(result),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error triggering test webhook: ${error}` }],
        };
      }
    },
  );
}
