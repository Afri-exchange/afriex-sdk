import { z } from "zod";
import type { ToolRegistry } from "./index.js";

export function registerCustomerTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_create_customer",
    {
      description: "Create a new customer (end-user) for the business. A customer represents the person sending or receiving money through Afriex.",
      inputSchema: {
        fullName: z.string().min(1).describe("Customer's full name"),
        email: z.string().email().describe("Customer's email address"),
        phone: z.string().min(1).describe("Customer's phone number with country code"),
        countryCode: z
          .string()
          .length(2)
          .toUpperCase()
          .describe("Two-letter ISO country code, e.g. NG, GH, KE, US, GB"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ fullName, email, phone, countryCode }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const customer = await sdk.customers.create({ fullName, email, phone, countryCode });
        return {
          content: [{ type: "text", text: JSON.stringify(customer, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating customer: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_customer",
    {
      description: "Get a single customer by their unique identifier.",
      inputSchema: {
        customerId: z.string().min(1).describe("The customer's unique identifier"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ customerId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const customer = await sdk.customers.get(customerId);
        return {
          content: [{ type: "text", text: JSON.stringify(customer, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching customer: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_list_customers",
    {
      description: "List all customers for the business with optional pagination.",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number for pagination"),
        limit: z.number().int().positive().optional().describe("Maximum number of customers per page"),
        email: z.string().email().optional().describe("Filter by email address"),
        phone: z.string().optional().describe("Filter by phone number"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ page, limit, email, phone }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const customers = await sdk.customers.list({ page, limit, email, phone });
        return {
          content: [{ type: "text", text: JSON.stringify(customers, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing customers: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_update_customer_kyc",
    {
      description: "Update a customer's KYC (Know Your Customer) information. Attach identity verification data to a customer profile.",
      inputSchema: {
        customerId: z.string().min(1).describe("The customer's unique identifier"),
        kyc: z
          .record(z.string(), z.string())
          .describe("KYC data as key-value pairs. Common fields: idType, idNumber, dateOfBirth, address, country, idFrontImage, idBackImage, selfieImage"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ customerId, kyc }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const customer = await sdk.customers.updateKyc(customerId, { kyc });
        return {
          content: [{ type: "text", text: JSON.stringify(customer, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error updating KYC: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_delete_customer",
    {
      description: "Permanently delete a customer by their unique identifier.",
      inputSchema: {
        customerId: z.string().min(1).describe("The customer's unique identifier"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ customerId }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        await sdk.customers.delete(customerId);
        return {
          content: [{ type: "text", text: `Customer ${customerId} deleted successfully.` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error deleting customer: ${error}` }],
        };
      }
    },
  );
}
