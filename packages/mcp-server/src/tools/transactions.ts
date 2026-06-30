import { z } from "zod";
import type { ToolRegistry } from "./index.js";

export function registerTransactionTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_create_transaction",
    {
      description: "Create a new transaction to process a payment. Supports three types: WITHDRAW (send funds to a destination), DEPOSIT (pull funds from a source), and SWAP (convert between currencies within the same wallet).",
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
        sourceAmount: z
          .string()
          .regex(/^\d+(\.\d+)?$/)
          .describe("Amount in the source currency as a string (e.g. '100.50')"),
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
        destinationAmount: z
          .string()
          .regex(/^\d+(\.\d+)?$/)
          .optional()
          .describe("Amount in the destination currency as a string (e.g. '85000.00'). Required for DEPOSIT and WITHDRAW, omit for SWAP."),
        destinationId: z
          .string()
          .optional()
          .describe("Payment method ID of the destination — required for WITHDRAW"),
        sourceId: z
          .string()
          .optional()
          .describe("Payment method ID of the source — required for DEPOSIT"),
        channel: z
          .string()
          .optional()
          .describe("Payment channel: BANK_ACCOUNT, MOBILE_MONEY, SWIFT, UPI, INTERAC, WE_CHAT, ALIPAY, PAYBILL_TILL, CARD, CRYPTO"),
        meta: z
          .object({
            idempotencyKey: z.string().min(1).describe("Unique key to prevent duplicate processing (use a UUID)"),
            reference: z.string().min(1).describe("Your internal reference for this transaction (e.g. order ID)"),
            narration: z.string().optional().describe("Human-readable reason or description"),
            invoice: z.string().optional().describe("Base64-encoded invoice document"),
            merchantId: z.string().optional().describe("Your merchant/business identifier for reconciliation"),
          })
          .describe("Transaction metadata with idempotencyKey and reference"),
      },
    },
    async (params) => {
      try {
        const sdk = registry.getSdk();
        const { meta, ...rest } = params;
        const transaction = await sdk.transactions.create({
          ...rest,
          meta,
        } as Parameters<typeof sdk.transactions.create>[0]);
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating transaction: ${error}` }],
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
    },
    async ({ transactionId }) => {
      try {
        const sdk = registry.getSdk();
        const transaction = await sdk.transactions.get(transactionId);
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching transaction: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_list_transactions",
    {
      description: "List transactions with optional filters and pagination. Supports filtering by status, type, channel, currency, date range, and reference.",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number for pagination"),
        limit: z.number().int().positive().optional().describe("Transactions per page"),
        transactionId: z.string().optional().describe("Filter by specific transaction ID"),
        reference: z.string().optional().describe("Filter by merchant reference"),
        status: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by status(es). Values: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, SUCCESS, REFUNDED, REJECTED, CUSTOMER_ACTION_REQUIRED, IN_REVIEW, DISPUTED, DISPUTE_RESOLVED"),
        type: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by type(s). Values: WITHDRAW, DEPOSIT, SWAP, REVERSAL, SCHEDULED, SEND"),
        channel: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by channel(s). Values: BANK_ACCOUNT, MOBILE_MONEY, CARD, CRYPTO, VIRTUAL_BANK_ACCOUNT, SWIFT, UPI, INTERAC, WE_CHAT, ALIPAY"),
        currency: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by currency code(s), e.g. USD, NGN"),
        fromDate: z.string().optional().describe("Start date filter (ISO 8601 format)"),
        toDate: z.string().optional().describe("End date filter (ISO 8601 format)"),
      },
    },
    async (params) => {
      try {
        const sdk = registry.getSdk();
        const transactions = await sdk.transactions.list(params as Parameters<typeof sdk.transactions.list>[0]);
        return {
          content: [{ type: "text", text: JSON.stringify(transactions, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing transactions: ${error}` }],
        };
      }
    },
  );
}
