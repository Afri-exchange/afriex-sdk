import { z } from "zod";
import type { ToolRegistry } from "./index.js";

export function registerBalanceTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_get_balance",
    {
      description: "Get wallet balances for one or more currencies. Returns a map of currency codes to their current available balances. Example currencies: USD, NGN, KES, GHS, UGX, XOF, EGP, GBP, EUR, CAD.",
      inputSchema: {
        currencies: z
          .union([
            z.string().describe("Comma-separated currency codes, e.g. 'USD,NGN,GBP'"),
            z.array(z.string()).describe("Array of currency codes, e.g. ['USD', 'NGN', 'GBP']"),
          ])
          .describe("Currency codes to fetch balances for"),
      },
    },
    async ({ currencies }) => {
      try {
        const sdk = registry.getSdk();
        const balances = await sdk.balance.getBalance({ currencies });
        return {
          content: [{ type: "text", text: JSON.stringify(balances, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching balances: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_top_up_sandbox",
    {
      description: "[SANDBOX ONLY] Credit the business wallet with test funds. Only works in the staging/sandbox environment. Returns the created transaction record.",
      inputSchema: {
        amount: z.number().positive().describe("Amount to credit — must be a positive number"),
        currency: z
          .string()
          .length(3)
          .toUpperCase()
          .describe("Uppercase 3-letter ISO currency code, e.g. USD, NGN, GBP"),
      },
    },
    async ({ amount, currency }) => {
      try {
        const sdk = registry.getSdk();
        const result = await sdk.balance.topUpSandbox({ amount, currency });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error topping up sandbox: ${error}` }],
        };
      }
    },
  );
}
