import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The SDK's documentation moved to docs.afriex.com, so send every page there.
  async redirects() {
    return [
      {
        source: "/api/webhooks",
        destination: "https://docs.afriex.com/sdk/webhooks",
        permanent: true,
      },
      {
        source: "/:path*",
        destination: "https://docs.afriex.com/sdk/introduction",
        permanent: true,
      },
    ];
  },
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
