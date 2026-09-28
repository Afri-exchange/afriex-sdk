import { z } from "zod";
import type { ToolRegistry } from "./index.js";
import { describeError } from "./errors.js";
import {
  smeRegistrationOutputSchema,
  smeRegistrationStatusOutputSchema,
  toStructured,
} from "../schemas/output.js";

const kenyanMobile =
  "A Kenyan mobile number: +254712345678, 254712345678, 0712345678 or 712345678";

export function registerSmeRegistrationTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_initiate_sme_registration",
    {
      description: "Step 1 of 3. Start registering the business as its own SME in Kenya, so that dedicated KES virtual accounts are issued under its legal entity. Sends a one-time passcode to the mobile number. No other corridor needs this registration.",
      inputSchema: {
        mobile: z.string().min(1).describe(`${kenyanMobile}. The passcode is sent to it.`),
        email: z.string().email().describe("The business email address"),
        businessType: z
          .literal(2)
          .default(2)
          .describe("Must be 2: only Limited Liability Companies are supported"),
      },
      outputSchema: smeRegistrationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ mobile, email, businessType }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const registration = await sdk.smeRegistration.initiate({ mobile, email, businessType });
        return {
          content: [{ type: "text", text: JSON.stringify(registration, null, 2) }],
          structuredContent: toStructured(registration),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error initiating SME registration: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_confirm_sme_registration_otp",
    {
      description: "Step 2 of 3. Confirm the one-time passcode that afriex_initiate_sme_registration sent.",
      inputSchema: {
        onboardingRequestId: z.string().min(1).describe("The id returned by afriex_initiate_sme_registration"),
        otp: z.string().min(1).describe("The passcode sent to the mobile number"),
      },
      outputSchema: smeRegistrationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ onboardingRequestId, otp }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const registration = await sdk.smeRegistration.confirmOtp({ onboardingRequestId, otp });
        return {
          content: [{ type: "text", text: JSON.stringify(registration, null, 2) }],
          structuredContent: toStructured(registration),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error confirming SME registration passcode: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_submit_sme_registration",
    {
      description: "Step 3 of 3. Submit the company details, directors and documents. The API reference does not list the company detail fields, so `data` is sent as it is given. Every file field takes the key of a file uploaded with afriex_create_upload_url, and every director's mobile number must be Kenyan.",
      inputSchema: {
        data: z
          .object({
            directors: z
              .array(z.record(z.string(), z.unknown()))
              .min(1)
              .describe("The directors of the company. At least one."),
            organizationShareholders: z
              .array(z.record(z.string(), z.unknown()))
              .optional()
              .describe("The organizations that hold shares in the company"),
            media: z
              .array(z.record(z.string(), z.unknown()))
              .optional()
              .describe("The documents, each referring to an uploaded file by its key"),
          })
          .passthrough()
          .describe("The SUBMIT payload: directors, optional organizationShareholders and media, and the company detail fields"),
      },
      outputSchema: smeRegistrationOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ data }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const registration = await sdk.smeRegistration.submit(data);
        return {
          content: [{ type: "text", text: JSON.stringify(registration, null, 2) }],
          structuredContent: toStructured(registration),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error submitting SME registration: ${describeError(error)}` }],
        };
      }
    },
  );

  server.registerTool(
    "afriex_get_sme_registration_status",
    {
      description: "Get the most recent SME registration of the business. `status` says how far the steps have got; `reviewStatus`, present once the registration is submitted, is the review outcome. Dedicated KES virtual accounts are issued only once reviewStatus is APPROVED.",
      inputSchema: {},
      outputSchema: smeRegistrationStatusOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (_params, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const status = await sdk.smeRegistration.getStatus();
        return {
          content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
          structuredContent: toStructured(status),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error fetching SME registration status: ${describeError(error)}` }],
        };
      }
    },
  );
}
