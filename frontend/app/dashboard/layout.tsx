import Sidebar from '@/components/Sidebar'
import { CurrencyProvider } from '@/lib/currency'
import { ThemeProvider } from '@/lib/theme'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        /*
         * Sidebar is position:fixed — it's out of normal flow.
         * Using a plain block wrapper (NOT flex) + marginLeft on <main>
         * is the correct pattern. If we use flex here, flex-1 on <main>
         * would consume 100vw AND then marginLeft adds 232px more = overflow.
         */
        <ThemeProvider>
            <CurrencyProvider>
                <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
                    <Sidebar />
                    <main
                        style={{
                            marginLeft: 'var(--sidebar-w, 232px)',
                            transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)',
                            background: 'transparent',
                            minHeight: '100vh',
                            overflowX: 'hidden',
                            /* Hard cap so no child can push past the available viewport */
                            maxWidth: 'calc(100vw - var(--sidebar-w, 232px))',
                        }}>
                        {children}
                    </main>
                </div>
            </CurrencyProvider>
        </ThemeProvider>
    )
}
