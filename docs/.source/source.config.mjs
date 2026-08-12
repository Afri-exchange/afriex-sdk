// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
var docs = defineDocs({
  dir: "content",
  docs: {
    // Required for `page.data.getText("processed")`, used by the LLM routes.
    postprocess: {
      includeProcessedMarkdown: true
    }
  }
});
var source_config_default = defineConfig();
export {
  source_config_default as default,
  docs
};
