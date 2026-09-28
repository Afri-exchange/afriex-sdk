import { z } from "zod";
import type { ToolRegistry } from "./index.js";
import { describeError } from "./errors.js";
import { uploadUrlOutputSchema, toStructured } from "../schemas/output.js";

export function registerMediaTools(registry: ToolRegistry): void {
  const { server } = registry;

  server.registerTool(
    "afriex_create_upload_url",
    {
      description: "Generate a presigned URL to upload one file to. PUT the file to `url` within `expiresIn` seconds, then pass `key` to the request that needs the file: meta.invoice on a SWIFT withdrawal, or fileKey on afriex_submit_pool_account_proof. Requests take the key, never the URL.",
      inputSchema: {
        fileName: z.string().min(1).describe("The name of the file to upload, e.g. invoice-1042.pdf"),
        type: z
          .enum(["transaction", "user"])
          .optional()
          .describe("transaction for transaction files (an invoice, a pool-account payment proof), user for identity documents. Defaults to user. The two are stored apart: a key from one is not found by an endpoint that expects the other."),
      },
      outputSchema: uploadUrlOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ fileName, type }, extra) => {
      try {
        const sdk = registry.getSdk(extra);
        const uploadUrl = await sdk.media.createUploadUrl({ fileName, type });
        return {
          content: [{ type: "text", text: JSON.stringify(uploadUrl, null, 2) }],
          structuredContent: toStructured(uploadUrl),
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating upload URL: ${describeError(error)}` }],
        };
      }
    },
  );
}
