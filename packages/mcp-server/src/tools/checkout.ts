import { z } from "zod";
import type { ToolRegistry } from "./index.js";

export function registerCheckoutTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.tool(
    "afriex_create_checkout_session",
    "Create a hosted checkout session for a customer. Returns a checkoutUrl that the customer should be redirected to in order to complete payment. The amount must be an integer in minor units (e.g. 10000 = 100.00).",
    {
      amount: z
        .number()
        .int()
        .min(100)
        .describe("Amount in minor units (e.g. 10000 = 100.00 in the currency's base unit). Must be at least 100."),
      currency: z
        .string()
        .length(3)
        .toUpperCase()
        .describe("Three-letter ISO currency code, e.g. NGN, GHS, KES"),
      merchantReference: z
        .string()
        .min(1)
        .describe("Your unique reference for this checkout (e.g. order or invoice ID)"),
      redirectUrl: z
        .string()
        .url()
        .refine((url) => url.startsWith("https://"), { message: "redirectUrl must be HTTPS" })
        .describe("URL to redirect the customer to after payment (must be HTTPS)"),
      customer: z
        .object({
          name: z.string().min(1).describe("Customer's full name"),
          email: z.string().email().describe("Customer's email address"),
          phone: z.string().min(1).describe("Customer's phone number with country code"),
          countryCode: z
            .string()
            .length(2)
            .toUpperCase()
            .describe("Two-letter ISO country code, e.g. NG, GH, KE"),
        })
        .describe("Customer information for the checkout"),
      channels: z
        .array(z.enum(["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY"]))
        .optional()
        .describe("Allowed payment channels. Defaults to all available channels."),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe("Optional metadata key-value pairs (values must be strings)"),
    },
    async ({ amount, currency, merchantReference, redirectUrl, customer, channels, metadata }) => {
      try {
        const sdk = registry.getSdk();
        const session = await sdk.checkout.createSession({
          amount,
          currency,
          merchantReference,
          redirectUrl,
          customer,
          channels,
          metadata,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating checkout session: ${error}` }],
        };
      }
    },
  );
}
