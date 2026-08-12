import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

// cached forever
export const revalidate = false;

/**
 * Raw Markdown for a single page.
 *
 * Public URLs are `<page>.md` (see the rewrite in `next.config.mjs`), which
 * lands here as `/llms.mdx/<page>`. The site root is served as `/index.md`,
 * so a trailing `index` segment maps back to the empty slug.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await params;
  const page = source.getPage(
    slug.at(-1) === "index" ? slug.slice(0, -1) : slug,
  );

  if (!page) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}

export function generateStaticParams() {
  return source
    .generateParams()
    .map(({ slug }) => ({ slug: slug.length > 0 ? slug : ["index"] }));
}
