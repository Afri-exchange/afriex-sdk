import { z } from "zod";
import type { ToolRegistry } from "./index.js";
import { describeError } from "./errors.js";
import {
  transactionSchema,
  transactionListOutputSchema,
  settlementAdviceOutputSchema,
  toStructured,
} from "../schemas/output.js";

// The API takes an amount as a numeric string or a number, and returns a string.
const transactionAmount = z.union([
  z.string().regex(/^\d+(\.\d+)?$/),
  z.number().positive(),
]);

export function registerTransactionTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_create_transaction",
    {
      description: "Create a new transaction to process a payment. Supports three types: WITHDRAW (send funds to a destination), DEPOSIT (pull funds from a source), and SWAP (convert between currencies within the same wallet). Send sourceAmount or destinationAmount: the API derives the other at the live rate. A SWAP takes exactly one of them.",
      inputSchema: {
        type: z
          .enum(["WITHDRAW", "DEPOSIT", "SWAP"])
          .optional()
          .default("WITHDRAW")
          .describe("Transaction type: WITHDRAW (default, send funds), DEPOSIT (pull funds), or SWAP (currency conversion)"),
        customerId: z
          .string()
          .optional()
          .describe("Customer ID — required for DEPOSIT and WITHDRAW, optional for SWAP"),
        sourceAmount: transactionAmount
          .optional()
          .describe("Amount in the source currency, e.g. '100.50'. Required unless destinationAmount is sent."),
        sourceCurrency: z
          .string()
          .length(3)
          .toUpperCase()
          .describe("Source currency code, e.g. USD, NGN, GBP"),
        destinationCurrency: z
          .string()
          .length(3)
          .toUpperCase()
          .describe("Destination currency code, e.g. USD, NGN, GBP"),
        destinationAmount: transactionAmount
          .optional()
          .describe("Amount in the destination currency, e.g. '85000.00'. Required unless sourceAmount is sent. When both are sent, this one decides the payout unless shouldPreferSourceAmount is true. A SWAP rejects both."),
        destinationId: z
          .string()
          .optional()
          .describe("Payment method ID of the destination — required for WITHDRAW"),
        sourceId: z
          .string()
          .optional()
          .describe("Payment method ID of the source — required for DEPOSIT"),
        shouldPreferSourceAmount: z
          .boolean()
          .optional()
          .describe("Opt in to deriving destinationAmount from sourceAmount even when both amounts are sent. Defaults to false (destination-wins)."),
        correspondentBankName: z
          .string()
          .optional()
          .describe("Correspondent bank name, for a USD payout. Send it together with correspondentBankAccountNumber."),
        correspondentBankAccountNumber: z
          .string()
          .optional()
          .describe("Correspondent bank account number, for a USD payout. Send it together with correspondentBankName."),
        meta: z
          .object({
            idempotencyKey: z.string().min(1).describe("Unique key to prevent duplicate processing (use a UUID). A reused key is answered with 409 DUPLICATE_REQUEST."),
            reference: z.string().min(1).describe("Your internal reference for this transaction (e.g. order ID)"),
            narration: z.string().optional().describe("Human-readable reason or description"),
            invoice: z.string().optional().describe("Object key of an uploaded invoice, from afriex_create_upload_url with type transaction. Required for SWIFT withdrawals."),
            settlement: z
              .enum(["spot", "request"])
              .optional()
              .describe("spot (default) debits the main wallet. request debits the Collection wallet and is for WITHDRAW only."),
          })
          .describe("Transaction metadata with idempotencyKey and reference"),
      },
      outputSchema: transactionSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const { meta, ...rest } = params;
        const transaction = await sdk.transactions.create({
          ...rest,
          meta,
        } as Parameters<typeof sdk.transactions.create>[0]);
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
          structuredContent: toStructured(transaction),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating transaction: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_transaction",
    {
      description: "Get a single transaction by its unique identifier. Returns full transaction details including status, amounts, fees, and timestamps.",
      inputSchema: {
        transactionId: z.string().min(1).describe("The transaction's unique identifier"),
      },
      outputSchema: transactionSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ transactionId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const transaction = await sdk.transactions.get(transactionId);
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
          structuredContent: toStructured(transaction),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching transaction: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_list_transactions",
    {
      description: "List transactions with optional filters and pagination. Supports filtering by status, type, channel, currency, date range, and reference.",
      inputSchema: {
        page: z.number().int().nonnegative().optional().describe("Zero-based page number. The first page is 0."),
        limit: z.number().int().positive().max(100).optional().describe("Transactions per page, at most 100"),
        transactionId: z.string().optional().describe("Filter by specific transaction ID"),
        reference: z.string().optional().describe("Filter by merchant reference"),
        status: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by status(es). Values: PENDING, PROCESSING, SUCCESS, FAILED, CANCELLED, REFUNDED, RETRY, UNKNOWN, SCHEDULED, CUSTOMER_ACTION_REQUIRED, REJECTED, IN_REVIEW, RFI_REQUESTED, DISPUTED, DISPUTE_RESOLVED, DISPUTE_WON, DISPUTE_LOST, DISPUTE_EVIDENCE_SUBMITTED. COMPLETED is rejected: the success status is SUCCESS."),
        type: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by type(s). Values: WITHDRAW, DEPOSIT, SWAP, REVERSAL, SCHEDULED, SEND"),
        channel: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by channel(s). Values: BANK_ACCOUNT, MOBILE_MONEY, CARD, CRYPTO, VIRTUAL_BANK_ACCOUNT, POOL_ACCOUNT, ACH_BANK_ACCOUNT, INTERAC, PAYBILL_TILL, RFP, UPI, VIRTUAL_CARD, SWIFT, WE_CHAT, ALIPAY, WALLET, PAYMENT_LINQ, ADMIN"),
        currency: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by currency code(s), e.g. USD, NGN"),
        fromDate: z.string().optional().describe("Start date filter (ISO 8601 format)"),
        toDate: z.string().optional().describe("End date filter (ISO 8601 format)"),
      },
      outputSchema: transactionListOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const transactions = await sdk.transactions.list(params as Parameters<typeof sdk.transactions.list>[0]);
        return {
          content: [{ type: "text", text: JSON.stringify(transactions, null, 2) }],
          structuredContent: toStructured(transactions),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing transactions: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_authorize_transaction",
    {
      description: "Authorize a pending transaction that was created in a CUSTOMER_ACTION_REQUIRED state and needs an extra authorization step (for example, an OTP on a mobile-money deposit). Today the only supported type is OTP.",
      inputSchema: {
        transactionId: z.string().min(1).describe("The transaction's unique identifier"),
        type: z.literal("OTP").describe("The authorization method"),
        otp: z.string().min(1).describe("The one-time password supplied by the customer"),
      },
      outputSchema: transactionSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ transactionId, type, otp }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const transaction = await sdk.transactions.authorize(transactionId, { type, otp });
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
          structuredContent: toStructured(transaction),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error authorizing transaction: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_submit_pool_account_proof",
    {
      description: "Submit proof of a deposit made to the business pool account. Creates a deposit in IN_REVIEW: an operator then confirms the bank inflow before the funds are credited. Upload the proof first with afriex_create_upload_url and type transaction. A second submission that matches on every field is rejected with 409.",
      inputSchema: {
        amount: z.number().nonnegative().describe("The deposit amount in the major currency unit"),
        customerId: z.string().min(1).describe("The customer the deposit should be credited to. It must be the customer that reference names."),
        countryCode: z
          .string()
          .length(2)
          .toUpperCase()
          .describe("Two-letter ISO country code of the pool account, e.g. NG"),
        reference: z
          .string()
          .min(1)
          .describe("The customer's reference to credit that customer, or the pool account's own reference (from afriex_get_pool_account) to credit the business"),
        fileKey: z
          .string()
          .min(1)
          .describe("The key of the uploaded proof of payment. A key from a user-type upload is rejected as not found."),
        timestamp: z.string().min(1).describe("When the payment was sent, as an ISO 8601 date-time"),
        senderDetails: z
          .object({
            name: z.string().min(1).describe("The sender's full name"),
            accountNumber: z.string().optional().describe("The sender's account number or wallet identifier"),
            bankName: z.string().optional().describe("The sender's bank or financial institution"),
            countryCode: z.string().length(2).toUpperCase().optional().describe("Two-letter ISO country code of the sender"),
          })
          .optional()
          .describe("Who sent the payment. Helps the reviewer reconcile it."),
      },
      outputSchema: transactionSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const transaction = await sdk.transactions.submitPoolAccountProof(params);
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
          structuredContent: toStructured(transaction),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error submitting pool-account proof: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_transaction_advice",
    {
      description: "Get the settlement and remittance advice of a transaction: a download URL for the PDF, valid for 5 minutes. Only a USD withdrawal created with meta.settlement request has one; any other transaction is answered with 404. The advice is not a tax invoice.",
      inputSchema: {
        transactionId: z.string().min(1).describe("The transaction's unique identifier"),
      },
      outputSchema: settlementAdviceOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ transactionId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const advice = await sdk.transactions.getAdvice(transactionId);
        return {
          content: [{ type: "text", text: JSON.stringify(advice, null, 2) }],
          structuredContent: toStructured(advice),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching settlement advice: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_simulate_transaction",
    {
      description: "Sandbox only. Complete a pending sandbox transaction now, with the outcome you choose. The transaction must still be PENDING, PROCESSING or UNKNOWN. The result is the transaction before it is finalized: read it again with afriex_get_transaction a few seconds later for the final status. Production answers 403.",
      inputSchema: {
        transactionId: z.string().min(1).describe("The transaction's unique identifier"),
        outcome: z.enum(["success", "failed"]).describe("The status to finalize the transaction to"),
      },
      outputSchema: transactionSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ transactionId, outcome }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const transaction = await sdk.transactions.simulate(transactionId, { outcome });
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
          structuredContent: toStructured(transaction),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error simulating transaction: ${describeError(error)}` }],
        };
      }
    },
  );
}
