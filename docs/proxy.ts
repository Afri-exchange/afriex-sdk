import { NextResponse, type NextRequest } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";

// Docs are served from the site root (`baseUrl: "/"`), so the whole path is the slug.
const { rewrite: rewriteLLM } = rewritePath("{/*path}", "/llms.mdx{/*path}");

/**
 * Serve raw Markdown to clients that ask for it via `Accept`, at the same URL
 * browsers get HTML from. Agents that can't set headers should use the
 * explicit `<page>.md` URLs instead.
 */
export default function proxy(request: NextRequest) {
  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl), {
        // The URL now has two representations, so shared caches must key on
        // the header they were selected by.
        headers: { Vary: "Accept" },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Doc pages only. Excluding any path containing a `.` also covers static
    // assets, the `<page>.md` URLs, `/llms.txt`, `/llms-full.txt`, and the
    // `/llms.mdx/*` route we rewrite to (which would otherwise recurse).
    //
    // Only `/api/search` is excluded, not all of `/api/` — the docs have their
    // own `/api/*` section (`content/api`) that must stay negotiable.
    "/((?!api/search|_next/|.*\\.).*)",
  ],
};
