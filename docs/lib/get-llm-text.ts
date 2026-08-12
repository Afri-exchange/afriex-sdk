import type { source } from "@/lib/source";

/**
 * Render a page as standalone Markdown for LLM consumption.
 *
 * `getText("processed")` returns the Markdown after remark plugins have run
 * (frontmatter stripped, `<include>` resolved), which requires
 * `postprocess.includeProcessedMarkdown` in `source.config.ts`.
 */
export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${page.url})

${processed}`;
}
