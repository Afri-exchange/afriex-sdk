import { RootProvider } from "fumadocs-ui/provider/next";
import { Analytics } from "@vercel/analytics/next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: {
    default: "Afriex SDK",
    template: "%s – Afriex SDK",
  },
  description: "Afriex SDK - TypeScript SDK for Afriex Business API",
  openGraph: {
    title: "Afriex SDK Documentation",
    description:
      "TypeScript SDK for international money transfers and business payments",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
