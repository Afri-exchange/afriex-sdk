import { z } from "zod";
import type { ToolRegistry } from "./index.js";

export function registerRateTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_get_rates",
    {
      description: "Get real-time exchange rates for currency pairs. Returns a nested map of base currencies to their exchange rates against target currencies. Supports all Afriex currencies: USD, NGN, GHS, KES, UGX, XOF, EGP, GBP, EUR, CAD, PKR and more.",
      inputSchema: {
        fromSymbols: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Base currency codes, comma-separated or array. E.g. 'USD,GBP' or ['USD', 'GBP']. If omitted, returns rates for all base currencies."),
        toSymbols: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe("Target currency codes, comma-separated or array. E.g. 'NGN,KES,GHS' or ['NGN', 'KES', 'GHS']. If omitted, returns rates against all target currencies."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ fromSymbols, toSymbols }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const rates = await sdk.rates.getRates({ fromSymbols, toSymbols });
        return {
          content: [{ type: "text", text: JSON.stringify(rates, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching rates: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_convert_currency",
    {
      description: "Convert an amount from one currency to another using real-time exchange rates. Simple convenience wrapper around afriex_get_rates.",
      inputSchema: {
        amount: z.number().positive().describe("Amount to convert"),
        from: z.string().length(3).toUpperCase().describe("Source currency code, e.g. USD"),
        to: z.string().length(3).toUpperCase().describe("Target currency code, e.g. NGN"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ amount, from, to }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const converted = await sdk.rates.convert(amount, from, to);
        return {
          content: [{ type: "text", text: `${amount} ${from} = ${converted} ${to}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error converting currency: ${error}` }],
        };
      }
    },
  );
}
