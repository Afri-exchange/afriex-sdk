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
          .record(
            z.enum([
              "REPRESENTATIVE_TYPE",
              "DATE_OF_BIRTH",
              "ADDRESS",
              "BANK_STATEMENT",
              "BUSINESS_CERTIFICATE",
              "COUNTRY",
              "ID_FRONT",
              "ID_BACK",
              "PHONE",
              "SELFIE",
              "PROOF_OF_ADDRESS",
              "PROOF_OF_INCOME",
              "BVN",
              "DRIVER_LICENSE",
              "PASSPORT",
              "NATIONAL_ID",
              "PAYMENT_METHOD",
              "RESIDENCE_PERMIT",
              "VEHICLE_REGISTRATION",
              "VOTER_ID",
              "OTHERS",
            ]),
            z.string()
          )
          .describe("KYC document type/value pairs, e.g. { BVN: '22222222222', DATE_OF_BIRTH: '1990-05-15', COUNTRY: 'NG' }"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ customerId, kyc }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const customer = await sdk.customers.updateKyc(customerId, kyc);
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
    "afriex_update_customer",
    {
      description: "Partially update a customer's profile. Send at least one of fullName, email, or phone; omitted fields are left unchanged.",
      inputSchema: {
        customerId: z.string().min(1).describe("The customer's unique identifier"),
        fullName: z.string().min(1).optional().describe("The customer's new full name"),
        email: z.string().email().optional().describe("The customer's new email address"),
        phone: z.string().min(1).optional().describe("The customer's new phone number"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ customerId, fullName, email, phone }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const customer = await sdk.customers.update(customerId, { fullName, email, phone });
        return {
          content: [{ type: "text", text: JSON.stringify(customer, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error updating customer: ${error}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_verify_customer",
    {
      description: "Run an identity verification against a customer document. Today the only supported docType is BVN (Nigeria). Verification is rate limited per business.",
      inputSchema: {
        customerId: z.string().min(1).describe("The customer's unique identifier"),
        docType: z.literal("BVN").describe("The type of document to verify"),
        docValue: z.string().min(1).describe("The document number to verify, e.g. the BVN"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ customerId, docType, docValue }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const customer = await sdk.customers.verify(customerId, { docType, docValue });
        return {
          content: [{ type: "text", text: JSON.stringify(customer, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error verifying customer: ${error}` }],
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
