import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const repoUrl = "https://github.com/Afri-exchange/afriex-sdk";

/** Permalink to a page's source file, for the "Open in GitHub" page action. */
export function sourceUrl(path: string) {
  return `${repoUrl}/blob/main/docs/content/${path}`;
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Afriex SDK",
    },
    githubUrl: repoUrl,
  };
}
