import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content",
  docs: {
    // Required for `page.data.getText("processed")`, used by the LLM routes.
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig();
