import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner, Head } from 'nextra/components';
import { getPageMap } from 'nextra/api';
import 'nextra-theme-docs/style.css';

export const metadata = {
    title: 'Afriex SDK',
    description: 'Documentation for Afriex SDK',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const pageMap = await getPageMap();

    return (
        <html lang="en" suppressHydrationWarning>
            <Head />
            <body>
                <Layout
                    banner={<Banner storageKey="some-key">Afriex SDK is currently in beta.</Banner>}
                    navbar={
                        <Navbar
                            logo={<span>Afriex SDK</span>}
                            projectLink="https://github.com/codewithveek/afriex-sdk"
                        />
                    }
                    pageMap={pageMap}
                    docsRepositoryBase="https://github.com/codewithveek/afriex-sdk/tree/main/docs"
                    footer={<Footer>MIT {new Date().getFullYear()} © Afriex.</Footer>}
                >
                    {children}
                </Layout>
            </body>
        </html>
    );
}
