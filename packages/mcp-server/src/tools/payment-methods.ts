import { z } from "zod";
import type { ToolRegistry } from "./index.js";

export function registerPaymentMethodTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.tool(
    "afriex_create_payment_method",
    "Create a new payment method (bank account, mobile money, etc.) for a customer. Payment methods are used as sources or destinations for transactions.",
    {
      channel: z
        .enum(["BANK_ACCOUNT", "MOBILE_MONEY", "SWIFT", "UPI", "INTERAC", "WE_CHAT", "ALIPAY", "PAYBILL_TILL"])
        .describe("Payment channel type"),
      customerId: z.string().min(1).describe("The customer's unique identifier"),
      accountName: z.string().min(1).describe("Name on the bank account or mobile money account"),
      accountNumber: z.string().min(1).describe("Account number or mobile money phone number"),
      countryCode: z
        .string()
        .length(2)
        .toUpperCase()
        .describe("Two-letter ISO country code, e.g. NG, GH, KE, US"),
      institution: z
        .object({
          institutionId: z.string().optional().describe("Institution ID from afriex_get_institutions"),
          institutionName: z.string().optional().describe("Bank or provider name"),
          institutionCode: z.string().optional().describe("Bank or provider code"),
          institutionAddress: z.string().optional().describe("Bank branch address"),
        })
        .describe("Institution (bank/mobile money provider) details"),
      type: z
        .enum(["WITHDRAW", "DEPOSIT"])
        .optional()
        .describe("Capability: WITHDRAW (send funds to this method, default) or DEPOSIT (pull funds from this method)"),
      recipient: z
        .object({
          recipientEmail: z.string().optional(),
          recipientPhone: z.string().optional(),
          recipientName: z.string().optional(),
          recipientAddress: z.string().optional(),
        })
        .optional()
        .describe("Recipient contact information"),
    },
    async ({ channel, customerId, accountName, accountNumber, countryCode, institution, type, recipient }) => {
      try {
        const sdk = registry.getSdk();
        const pm = await sdk.paymentMethods.create({
          channel,
          customerId,
          accountName,
          accountNumber,
          countryCode,
          institution,
          type,
          recipient,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(pm, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating payment method: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_get_payment_method",
    "Get a single payment method by its unique identifier.",
    {
      paymentMethodId: z.string().min(1).describe("The payment method's unique identifier"),
    },
    async ({ paymentMethodId }) => {
      try {
        const sdk = registry.getSdk();
        const pm = await sdk.paymentMethods.get(paymentMethodId);
        return {
          content: [{ type: "text", text: JSON.stringify(pm, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching payment method: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_list_payment_methods",
    "List all payment methods with pagination.",
    {
      page: z.number().int().positive().optional().describe("Page number for pagination"),
      limit: z.number().int().positive().optional().describe("Payment methods per page"),
    },
    async ({ page, limit }) => {
      try {
        const sdk = registry.getSdk();
        const pms = await sdk.paymentMethods.list({ page, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(pms, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing payment methods: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_delete_payment_method",
    "Delete a payment method by its unique identifier.",
    {
      paymentMethodId: z.string().min(1).describe("The payment method's unique identifier"),
    },
    async ({ paymentMethodId }) => {
      try {
        const sdk = registry.getSdk();
        await sdk.paymentMethods.delete(paymentMethodId);
        return {
          content: [{ type: "text", text: `Payment method ${paymentMethodId} deleted successfully.` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error deleting payment method: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_get_institutions",
    "List banks or mobile money providers available for a specific country and channel. Use the returned codes to create payment methods.",
    {
      channel: z
        .enum(["BANK_ACCOUNT", "MOBILE_MONEY"])
        .describe("Payment channel to list institutions for"),
      countryCode: z
        .string()
        .length(2)
        .toUpperCase()
        .describe("Two-letter ISO country code, e.g. NG, GH, KE, US"),
    },
    async ({ channel, countryCode }) => {
      try {
        const sdk = registry.getSdk();
        const institutions = await sdk.paymentMethods.getInstitutions({ channel, countryCode });
        return {
          content: [{ type: "text", text: JSON.stringify(institutions, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching institutions: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_resolve_account",
    "Resolve account details (account holder name) for a bank account or mobile money number. Use this to verify account details before creating a payment method.",
    {
      channel: z
        .enum(["BANK_ACCOUNT", "MOBILE_MONEY"])
        .describe("Payment channel type"),
      accountNumber: z.string().min(1).describe("Account number or mobile money phone number to resolve"),
      countryCode: z
        .string()
        .length(2)
        .toUpperCase()
        .describe("Two-letter ISO country code, e.g. NG, GH, KE"),
      institutionCode: z
        .string()
        .optional()
        .describe("Institution code (required for BANK_ACCOUNT channel)"),
    },
    async ({ channel, accountNumber, countryCode, institutionCode }) => {
      try {
        const sdk = registry.getSdk();
        const result = await sdk.paymentMethods.resolveAccount({
          channel,
          accountNumber,
          countryCode,
          institutionCode,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error resolving account: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_get_crypto_wallet",
    "Get or create a crypto wallet address for a customer. Only works in production. Currently supports USDT and USDC.",
    {
      asset: z.enum(["USDT", "USDC"]).describe("Crypto asset: USDT (Tether) or USDC (USD Coin)"),
      customerId: z.string().min(1).describe("The customer's unique identifier"),
    },
    async ({ asset, customerId }) => {
      try {
        const sdk = registry.getSdk();
        const wallet = await sdk.paymentMethods.getCryptoWallet({ asset, customerId });
        return {
          content: [{ type: "text", text: JSON.stringify(wallet, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error with crypto wallet: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_list_virtual_accounts",
    "List all active virtual accounts for a customer or business. `currency` is required.",
    {
      currency: z
        .string()
        .length(3)
        .toUpperCase()
        .describe("Three-letter currency code, e.g. NGN, GHS, KES"),
      customerId: z.string().optional().describe("Customer ID to filter by. Omit to list business-level virtual accounts."),
    },
    async ({ currency, customerId }) => {
      try {
        const sdk = registry.getSdk();
        const accounts = await sdk.paymentMethods.listVirtualAccounts({ currency, customerId });
        return {
          content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing virtual accounts: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_create_virtual_account",
    "Create a new dedicated virtual bank account for a customer or business. Pass `customerId` to assign to an end-user; omit to create a business-level account.",
    {
      currency: z
        .string()
        .length(3)
        .toUpperCase()
        .describe("Three-letter currency code for the virtual account, e.g. NGN"),
      customerId: z.string().optional().describe("Customer ID to assign this virtual account to"),
      country: z.string().length(2).toUpperCase().optional().describe("Optional two-letter ISO country code"),
      label: z.string().optional().describe("Label for static virtual accounts (e.g. 'SALES', 'OPERATIONS'). Cannot be used with amount."),
      amount: z.number().positive().optional().describe("Amount for dynamic virtual accounts. Cannot be used with label."),
    },
    async ({ currency, customerId, country, label, amount }) => {
      try {
        const sdk = registry.getSdk();
        const account = await sdk.paymentMethods.createVirtualAccount({
          currency,
          customerId,
          country,
          label,
          amount,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(account, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating virtual account: ${error}` }],
        };
      }
    },
  );

  server.tool(
    "afriex_get_pool_account",
    "Get the pool account for a specific country. Use the reference on the response to reconcile incoming deposits.",
    {
      country: z
        .string()
        .length(2)
        .toUpperCase()
        .describe("Two-letter ISO country code, e.g. NG, GH, KE"),
    },
    async ({ country }) => {
      try {
        const sdk = registry.getSdk();
        const account = await sdk.paymentMethods.listPoolAccounts({ country });
        return {
          content: [{ type: "text", text: JSON.stringify(account, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching pool account: ${error}` }],
        };
      }
    },
  );
}
