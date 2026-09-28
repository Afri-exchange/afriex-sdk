import { z } from "zod";
import type { ToolRegistry } from "./index.js";
import {
  paymentMethodSchema,
  paymentMethodListOutputSchema,
  deletedOutputSchema,
  institutionListOutputSchema,
  resolveAccountOutputSchema,
  resolveInstitutionCodeOutputSchema,
  cryptoWalletOutputSchema,
  virtualAccountListOutputSchema,
  virtualAccountCreatedOutputSchema,
  poolAccountOutputSchema,
  toStructured,
} from "../schemas/output.js";

// Channels that name the account through a bank, provider or wallet. Alipay is
// created on WE_CHAT with institutionCode and institutionName set to ALIPAY.
const institutionPaymentChannel = z.enum([
  "BANK_ACCOUNT",
  "MOBILE_MONEY",
  "ACH_BANK_ACCOUNT",
  "SWIFT",
  "WE_CHAT",
]);

// Channels addressed by an alias: a UPI ID or an Interac email.
const aliasPaymentChannel = z.enum(["UPI", "INTERAC"]);

// The filters GET /payment-method accepts. Anything else answers 422.
const paymentMethodListChannel = z.enum([
  "BANK_ACCOUNT",
  "MOBILE_MONEY",
  "INTERAC",
  "UPI",
  "WE_CHAT",
  "VIRTUAL_BANK_ACCOUNT",
  "RFP",
  "SWIFT",
]);

const paymentMethodListStatus = z.enum(["active", "pending"]);

const paymentMethodListCapability = z.enum(["WITHDRAW"]);

const virtualAccountLabel = z.enum([
  "SALES",
  "OPERATIONS",
  "PAYROLL",
  "COLLECTIONS",
  "VENDOR_PAYMENTS",
  "TAX",
  "REFUNDS",
  "MARKETING",
  "TREASURY",
  "GENERAL",
]);

export function registerPaymentMethodTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_create_payment_method",
    {
      description: "Create a new payment method (bank account, mobile money, etc.) for a customer. Payment methods are used as sources or destinations for transactions. `institution` is required for every channel except UPI and INTERAC. Alipay is created on WE_CHAT with institutionCode and institutionName set to ALIPAY. Cards are collected through checkout, and virtual accounts through afriex_create_virtual_account.",
      inputSchema: {
        channel: z
          .union([institutionPaymentChannel, aliasPaymentChannel])
          .describe("Payment channel type"),
        customerId: z.string().min(1).describe("The customer's unique identifier"),
        accountName: z.string().min(1).describe("Name on the bank account or mobile money account"),
        accountNumber: z
          .string()
          .min(1)
          .describe("Account number, UPI ID or Interac email. For MOBILE_MONEY send the phone number as digits only (country code + national number); a leading + is rejected."),
        countryCode: z
          .string()
          .length(2)
          .toUpperCase()
          .describe("Two-letter ISO country code, e.g. NG, GH, KE, US"),
        institution: z
          .object({
            institutionId: z.string().optional().describe("Institution identifier. Optional and rarely returned by afriex_get_institutions — match institutions by institutionCode"),
            institutionName: z.string().optional().describe("Bank or provider name"),
            institutionCode: z.string().optional().describe("Bank or provider code"),
            institutionAddress: z.string().optional().describe("Bank branch address"),
          })
          .optional()
          .describe("Institution (bank/mobile money provider) details. Required for every channel except UPI and INTERAC."),
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
      outputSchema: paymentMethodSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ channel, customerId, accountName, accountNumber, countryCode, institution, type, recipient }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const shared = { customerId, accountName, accountNumber, countryCode, type, recipient };
        // The SDK validates `institution` for the channels that need it.
        const pm = await sdk.paymentMethods.create(
          channel === "UPI" || channel === "INTERAC"
            ? { ...shared, channel, institution }
            : { ...shared, channel, institution: institution as NonNullable<typeof institution> },
        );
        return {
          content: [{ type: "text", text: JSON.stringify(pm, null, 2) }],
          structuredContent: toStructured(pm),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating payment method: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_payment_method",
    {
      description: "Get a single payment method by its unique identifier.",
      inputSchema: {
        paymentMethodId: z.string().min(1).describe("The payment method's unique identifier"),
      },
      outputSchema: paymentMethodSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ paymentMethodId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const pm = await sdk.paymentMethods.get(paymentMethodId);
        return {
          content: [{ type: "text", text: JSON.stringify(pm, null, 2) }],
          structuredContent: toStructured(pm),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching payment method: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_list_payment_methods",
    {
      description: "List all payment methods with pagination and optional filters.",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number for pagination"),
        limit: z.number().int().positive().optional().describe("Payment methods per page"),
        channel: z
          .union([paymentMethodListChannel, z.array(paymentMethodListChannel)])
          .optional()
          .describe("Filter by one or more payment channels"),
        currencies: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Filter by one or more 3-letter ISO 4217 currency codes"),
        capabilities: z
          .union([paymentMethodListCapability, z.array(paymentMethodListCapability)])
          .optional()
          .describe("Filter by capability. Only WITHDRAW is supported, and it is the default"),
        status: z
          .union([paymentMethodListStatus, z.array(paymentMethodListStatus)])
          .optional()
          .describe("Filter by one or more statuses. Defaults to active,pending"),
      },
      outputSchema: paymentMethodListOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ page, limit, channel, currencies, capabilities, status }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const pms = await sdk.paymentMethods.list({ page, limit, channel, currencies, capabilities, status });
        return {
          content: [{ type: "text", text: JSON.stringify(pms, null, 2) }],
          structuredContent: toStructured(pms),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing payment methods: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_delete_payment_method",
    {
      description: "Delete a payment method by its unique identifier.",
      inputSchema: {
        paymentMethodId: z.string().min(1).describe("The payment method's unique identifier"),
      },
      outputSchema: deletedOutputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ paymentMethodId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        await sdk.paymentMethods.delete(paymentMethodId);
        return {
          content: [{ type: "text", text: `Payment method ${paymentMethodId} deleted successfully.` }],
          structuredContent: { deleted: true, id: paymentMethodId },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error deleting payment method: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_institutions",
    {
      description: "List banks or mobile money providers available for a specific country and channel. Use the returned codes to create payment methods.",
      inputSchema: {
        channel: z
          .enum(["BANK_ACCOUNT", "SWIFT", "MOBILE_MONEY", "ACH_BANK_ACCOUNT"])
          .describe("Payment channel to list institutions for. UPI, INTERAC and WE_CHAT have no directory."),
        countryCode: z
          .string()
          .length(2)
          .toUpperCase()
          .describe("Two-letter ISO country code, e.g. NG, GH, KE, US"),
      },
      outputSchema: institutionListOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ channel, countryCode }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const response = await sdk.paymentMethods.getInstitutions({ channel, countryCode });
        const institutions = response.data;
        return {
          content: [{ type: "text", text: JSON.stringify(institutions, null, 2) }],
          structuredContent: { institutions },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching institutions: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_resolve_institution_code",
    {
      description: "Resolve a bank code (SWIFT code or US routing number) to the corresponding bank or institution name.",
      inputSchema: {
        searchTerm: z
          .string()
          .min(1)
          .describe("The bank code to resolve — a US routing number (8-9 digits) when codeType is routing_number, otherwise a SWIFT code"),
        country: z
          .string()
          .length(2)
          .toUpperCase()
          .default("US")
          .describe("ISO country code of the institution. Defaults to US. routing_number lookups are only supported for US."),
        codeType: z
          .enum(["swift_code", "routing_number"])
          .describe("The type of bank code to resolve"),
      },
      outputSchema: resolveInstitutionCodeOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ searchTerm, country, codeType }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const response = await sdk.paymentMethods.resolveInstitutionCode({ searchTerm, country, codeType });
        const result = response.data;
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { bankName: result?.bankName },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error resolving institution code: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_resolve_account",
    {
      description: "Resolve account details (account holder name) for a bank account or mobile money number. Use this to verify account details before creating a payment method.",
      inputSchema: {
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
          .min(1)
          .describe("The bank code for BANK_ACCOUNT, or the provider code for MOBILE_MONEY. Get it from afriex_get_institutions."),
      },
      outputSchema: resolveAccountOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ channel, accountNumber, countryCode, institutionCode }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const response = await sdk.paymentMethods.resolveAccount({
          channel,
          accountNumber,
          countryCode,
          institutionCode,
        });
        const result = response.data;
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: toStructured(result),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error resolving account: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_crypto_wallet",
    {
      description: "Get or create a crypto wallet address for a customer. Only works in production. Currently supports USDT and USDC.",
      inputSchema: {
        asset: z.enum(["USDT", "USDC"]).describe("Crypto asset: USDT (Tether) or USDC (USD Coin)"),
        customerId: z.string().min(1).describe("The customer's unique identifier"),
      },
      outputSchema: cryptoWalletOutputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ asset, customerId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const response = await sdk.paymentMethods.getCryptoWallet({ asset, customerId });
        const wallet = response.data;
        return {
          content: [{ type: "text", text: JSON.stringify(wallet, null, 2) }],
          structuredContent: toStructured(wallet),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error with crypto wallet: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_list_virtual_accounts",
    {
      description: "List all active virtual accounts for a customer or business. `currency` is required.",
      inputSchema: {
        currency: z
          .string()
          .length(3)
          .toUpperCase()
          .describe("Three-letter currency code, e.g. NGN, GHS, KES"),
        customerId: z.string().optional().describe("Customer ID to filter by. Omit to list business-level virtual accounts."),
        reference: z.string().optional().describe("Optional merchant-supplied reference to filter by"),
      },
      outputSchema: virtualAccountListOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ currency, customerId, reference }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const accounts = await sdk.paymentMethods.listVirtualAccounts({ currency, customerId, reference });
        return {
          content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }],
          structuredContent: toStructured(accounts),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing virtual accounts: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_create_virtual_account",
    {
      description: "Create a new dedicated virtual bank account for a customer or business. Pass `customerId` to assign to an end-user (NGN only); omit to create a business-level account. Pass exactly one of `label` (a permanent account) or `amount` (a one-time account). For some currencies the bank opens the account later: the result then has pending set to true and the account arrives by the PAYMENT_METHOD.CREATED webhook.",
      inputSchema: {
        currency: z
          .string()
          .length(3)
          .toUpperCase()
          .describe("Three-letter currency code for the virtual account, e.g. NGN"),
        customerId: z.string().optional().describe("Customer ID to assign this virtual account to"),
        label: virtualAccountLabel.optional().describe("Label for a static virtual account. Cannot be used with amount."),
        amount: z.number().positive().optional().describe("Amount for a dynamic virtual account. Cannot be used with label."),
      },
      outputSchema: virtualAccountCreatedOutputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ currency, customerId, label, amount }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const account = await sdk.paymentMethods.createVirtualAccount({
          currency,
          customerId,
          label,
          amount,
        });
        if (!account) {
          return {
            content: [{ type: "text", text: "The virtual account is being opened by the issuing bank. It will be delivered by the PAYMENT_METHOD.CREATED webhook." }],
            structuredContent: { pending: true },
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(account, null, 2) }],
          structuredContent: { pending: false, ...toStructured(account) },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating virtual account: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_pool_account",
    {
      description: "Get the pool account for a specific country. Use the reference on the response to reconcile incoming deposits.",
      inputSchema: {
        country: z
          .string()
          .length(2)
          .toUpperCase()
          .describe("Two-letter ISO country code, e.g. NG, GH, KE"),
        customerId: z.string().optional().describe("Optional customer ID to associate with this account"),
      },
      outputSchema: poolAccountOutputSchema.shape,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ country, customerId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const account = await sdk.paymentMethods.getPoolAccount({ country, customerId });
        return {
          content: [{ type: "text", text: JSON.stringify(account, null, 2) }],
          structuredContent: toStructured(account),
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
