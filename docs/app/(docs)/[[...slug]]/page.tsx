import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "@/components/ai/page-actions";
import { sourceUrl } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  // The site root is served as `/index.md` — see `next.config.mjs`.
  const markdownUrl = page.url === "/" ? "/index.md" : `${page.url}.md`;

  return (
    <DocsPage toc={page.data.toc}>
      <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={sourceUrl(page.path)}
        />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
