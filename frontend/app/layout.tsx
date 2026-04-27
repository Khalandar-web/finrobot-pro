import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import VoiceAssistant from '@/components/VoiceAssistant'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinRobot Pro — AI-Powered Equity Research',
  description: 'Institutional-grade financial analysis powered by NVIDIA NIM AI. Generate market forecasts and annual reports in seconds.',
  keywords: 'AI equity research, financial analysis, NVIDIA NIM, market forecast',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <VoiceAssistant />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1F2937',
              color: '#F9FAFB',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#1F2937' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#1F2937' },
            },
          }}
        />
      </body>
    </html>
  )
}
