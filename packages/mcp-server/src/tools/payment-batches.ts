import { z } from "zod";
import type { ToolRegistry } from "./index.js";
import { describeError } from "./errors.js";
import {
  paymentBatchSchema,
  paymentBatchListOutputSchema,
  savedPaymentBatchRecipientSchema,
  paymentBatchRecipientListOutputSchema,
  paymentBatchOutcomesOutputSchema,
  paymentBatchSessionListOutputSchema,
  deletedOutputSchema,
  toStructured,
} from "../schemas/output.js";

const batchId = z.string().min(1).describe("The payment batch's unique identifier");

const recipientId = z
  .string()
  .min(1)
  .describe("The recipient's id in the batch: the recipientId from afriex_list_payment_batch_recipients, not the id returned when the recipient was added");

const page = z.number().int().nonnegative().optional().describe("Zero-based page number. The first page is 0.");

const limit = z.number().int().positive().max(100).optional().describe("Items per page, at most 100. Defaults to 100.");

// The wallet a batch is funded from. Every payout is converted from it.
const sourcePaymentMethod = z
  .object({
    channel: z.literal("WALLET").optional().describe("The only funding channel, and the default"),
    currencyCode: z
      .string()
      .length(3)
      .toUpperCase()
      .describe("Three-letter code of the wallet to pay from, e.g. USD"),
  })
  .describe("The wallet the batch is funded from");

// The account to pay, as on a payment method, plus what it is paid per run.
const recipientShape = {
  channel: z.string().min(1).describe("The payout channel, e.g. BANK_ACCOUNT, MOBILE_MONEY, UPI"),
  accountName: z.string().min(1).describe("The account holder's name"),
  accountNumber: z.string().min(1).describe("The account number, phone number or alias"),
  countryCode: z
    .string()
    .length(2)
    .toUpperCase()
    .describe("Two-letter ISO country code of the account, e.g. NG"),
  institution: z
    .object({
      institutionId: z.string().optional(),
      institutionName: z.string().optional(),
      institutionCode: z.string().optional(),
    })
    .optional()
    .describe("The bank or provider, from afriex_get_institutions. Required for every channel except UPI and INTERAC."),
  amount: z
    .object({
      value: z.union([z.string().min(1), z.number().positive()]).describe("What the recipient is paid on each run, in its own currency"),
      currencyCode: z
        .string()
        .length(3)
        .toUpperCase()
        .describe("Three-letter code of the currency the recipient receives, e.g. NGN"),
    })
    .describe("What the recipient is paid on each run"),
};

export function registerPaymentBatchTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_list_payment_batches",
    {
      description: "List the payment batches of the business, with the number of recipients in each.",
      inputSchema: { page, limit },
      outputSchema: paymentBatchListOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const batches = await sdk.paymentBatches.list(params);
        return {
          content: [{ type: "text", text: JSON.stringify(batches, null, 2) }],
          structuredContent: toStructured(batches),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing payment batches: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_create_payment_batch",
    {
      description: "Create an empty payment batch: a saved list of recipients that are paid together. Add recipients next, then start the payouts with afriex_withdraw_payment_batch.",
      inputSchema: {
        name: z.string().min(1).describe("A label for the batch, e.g. June payroll"),
        sourcePaymentMethod,
      },
      outputSchema: paymentBatchSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ name, sourcePaymentMethod: source }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const batch = await sdk.paymentBatches.create({ name, sourcePaymentMethod: source });
        return {
          content: [{ type: "text", text: JSON.stringify(batch, null, 2) }],
          structuredContent: toStructured(batch),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating payment batch: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_payment_batch",
    {
      description: "Get a payment batch by its unique identifier.",
      inputSchema: { batchId },
      outputSchema: paymentBatchSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ batchId: id }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const batch = await sdk.paymentBatches.get(id);
        return {
          content: [{ type: "text", text: JSON.stringify(batch, null, 2) }],
          structuredContent: toStructured(batch),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching payment batch: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_update_payment_batch",
    {
      description: "Replace the name and the funding wallet of a payment batch. The batch is replaced whole: send both, even when only one changes.",
      inputSchema: {
        batchId,
        name: z.string().min(1).describe("A label for the batch"),
        sourcePaymentMethod,
      },
      outputSchema: paymentBatchSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ batchId: id, name, sourcePaymentMethod: source }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const batch = await sdk.paymentBatches.update(id, { name, sourcePaymentMethod: source });
        return {
          content: [{ type: "text", text: JSON.stringify(batch, null, 2) }],
          structuredContent: toStructured(batch),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error updating payment batch: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_delete_payment_batch",
    {
      description: "Delete a payment batch by its unique identifier.",
      inputSchema: { batchId },
      outputSchema: deletedOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ batchId: id }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        await sdk.paymentBatches.delete(id);
        return {
          content: [{ type: "text", text: `Payment batch ${id} deleted successfully.` }],
          structuredContent: { deleted: true, id },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error deleting payment batch: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_list_payment_batch_recipients",
    {
      description: "List the recipients of a payment batch. Each one carries its recipientId, used to update or remove it, and the paymentMethodId of the account it is paid to.",
      inputSchema: { batchId, page, limit },
      outputSchema: paymentBatchRecipientListOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ batchId: id, page: pageNumber, limit: pageSize }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const recipients = await sdk.paymentBatches.listRecipients(id, { page: pageNumber, limit: pageSize });
        return {
          content: [{ type: "text", text: JSON.stringify(recipients, null, 2) }],
          structuredContent: toStructured(recipients),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing payment batch recipients: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_add_payment_batch_recipient",
    {
      description: "Add one recipient to a payment batch. The returned id is the paymentMethodId of the saved account, not the recipientId: read that from afriex_list_payment_batch_recipients. An account that is already in the batch is answered with 409 DUPLICATE_REQUEST.",
      inputSchema: { batchId, ...recipientShape },
      outputSchema: savedPaymentBatchRecipientSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ batchId: id, ...recipient }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const saved = await sdk.paymentBatches.addRecipient(id, recipient);
        return {
          content: [{ type: "text", text: JSON.stringify(saved, null, 2) }],
          structuredContent: toStructured(saved),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error adding payment batch recipient: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_add_payment_batch_recipients",
    {
      description: "Add several recipients to a payment batch. Each one is added on its own, so the call succeeds even when some are rejected: read `errors`, keyed by account number, on every call. `successes` is keyed by account number too.",
      inputSchema: {
        batchId,
        recipients: z.array(z.object(recipientShape)).min(1).describe("The recipients to add"),
      },
      outputSchema: paymentBatchOutcomesOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ batchId: id, recipients }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const outcomes = await sdk.paymentBatches.addRecipients(id, recipients);
        return {
          content: [{ type: "text", text: JSON.stringify(outcomes, null, 2) }],
          structuredContent: toStructured(outcomes),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error adding payment batch recipients: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_update_payment_batch_recipient",
    {
      description: "Replace the account details and the amount of a recipient. The recipient is replaced whole: send every field, even when only the amount changes. Pass paymentMethodId to update the saved account in place.",
      inputSchema: {
        batchId,
        recipientId,
        ...recipientShape,
        paymentMethodId: z
          .string()
          .optional()
          .describe("The recipient's paymentMethodId, to update that saved account in place"),
      },
      outputSchema: savedPaymentBatchRecipientSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ batchId: id, recipientId: recipient, ...request }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const saved = await sdk.paymentBatches.updateRecipient(id, recipient, request);
        return {
          content: [{ type: "text", text: JSON.stringify(saved, null, 2) }],
          structuredContent: toStructured(saved),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error updating payment batch recipient: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_remove_payment_batch_recipient",
    {
      description: "Remove a recipient from a payment batch. The saved account is kept as a payment method.",
      inputSchema: { batchId, recipientId },
      outputSchema: deletedOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ batchId: id, recipientId: recipient }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        await sdk.paymentBatches.removeRecipient(id, recipient);
        return {
          content: [{ type: "text", text: `Recipient ${recipient} removed from payment batch ${id}.` }],
          structuredContent: { deleted: true, id: recipient },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error removing payment batch recipient: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_withdraw_payment_batch",
    {
      description: "Start the payouts for a payment batch: one payout to every recipient. MOVES MONEY. Every call without a sessionId is a new run and pays every recipient again, the ones already paid included, so never call it twice to retry. To retry only the payouts that failed, pass the sessionId of that run, from afriex_list_payment_batch_sessions. `successes` and `errors` are keyed by recipientId; a recipient in `successes` has a payout in flight, not a settled one. A call made while a run is still in progress is refused with 409.",
      inputSchema: {
        batchId,
        sessionId: z
          .string()
          .optional()
          .describe("The id of an earlier run of this batch. Only the recipients that failed in that run are paid."),
      },
      outputSchema: paymentBatchOutcomesOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ batchId: id, sessionId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const outcomes = await sdk.paymentBatches.withdraw(id, sessionId ? { sessionId } : undefined);
        return {
          content: [{ type: "text", text: JSON.stringify(outcomes, null, 2) }],
          structuredContent: toStructured(outcomes),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error starting payment batch payouts: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_list_payment_batch_sessions",
    {
      description: "List the runs of a payment batch. meta.results on each run holds the result for every recipient, keyed by recipientId.",
      inputSchema: { batchId, page, limit },
      outputSchema: paymentBatchSessionListOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ batchId: id, page: pageNumber, limit: pageSize }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const sessions = await sdk.paymentBatches.listSessions(id, { page: pageNumber, limit: pageSize });
        return {
          content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
          structuredContent: toStructured(sessions),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing payment batch sessions: ${describeError(error)}` }],
        };
      }
    },
  );
}
