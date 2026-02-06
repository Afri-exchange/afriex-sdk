import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { Analytics } from '@vercel/analytics/next'
import 'nextra-theme-docs/style.css'
import type { ReactNode } from 'react'

export const metadata = {
    title: {
        default: 'Afriex SDK',
        template: '%s – Afriex SDK'
    },
    description: 'Afriex SDK - TypeScript SDK for Afriex Business API',
    openGraph: {
        title: 'Afriex SDK Documentation',
        description: 'TypeScript SDK for international money transfers and business payments'
    }
}

const navbar = (
    <Navbar
        logo={<span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Afriex SDK</span>}
        projectLink="https://github.com/codewithveek/afriex-sdk"
    />
)

const footer = <Footer>MIT {new Date().getFullYear()} © Afriex</Footer>

export default async function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>
            <body>
                <Layout
                    navbar={navbar}
                    pageMap={await getPageMap()}
                    docsRepositoryBase="https://github.com/codewithveek/afriex-sdk/tree/main/docs"
                    footer={footer}
                    sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
                    toc={{ backToTop: true }}
                >
                    {children}
                </Layout>
                <Analytics />
            </body>
        </html>
    )
}

