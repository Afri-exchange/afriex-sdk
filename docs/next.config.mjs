import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Serve raw Markdown at `<page>.md` (site root is `/index.md`).
      {
        source: "/:path*.md",
        destination: "/llms.mdx/:path*",
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(config);
