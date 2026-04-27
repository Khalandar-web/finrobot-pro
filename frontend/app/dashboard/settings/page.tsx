'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, RefreshCw, CheckCircle2, XCircle, Moon, Sun, DollarSign, Activity } from 'lucide-react'
import { useCurrency, Currency } from '@/lib/currency'
import { useTheme, Theme } from '@/lib/theme'

type ApiStatus = 'idle' | 'testing' | 'working' | 'failed'

export default function SettingsPage() {
    const { currency, setCurrency } = useCurrency()
    const { theme, setTheme } = useTheme()

    const [nvidiaStatus, setNvidiaStatus] = useState<ApiStatus>('idle')
    const [finnhubStatus, setFinnhubStatus] = useState<ApiStatus>('idle')
    const [fmpStatus, setFmpStatus] = useState<ApiStatus>('idle')
    const [newsStatus, setNewsStatus] = useState<ApiStatus>('idle')

    const testNvidia = async () => {
        setNvidiaStatus('testing')
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const res = await fetch(`${apiBase}/health`, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (!res.ok) throw new Error('Failed')
            const data = await res.json()
            if (data?.api_keys_configured?.NVIDIA_API_KEY) {
                setNvidiaStatus('working')
            } else {
                setNvidiaStatus('failed')
            }
        } catch {
            setNvidiaStatus('failed')
        }
    }

    const testFinnhub = async () => {
        setFinnhubStatus('testing')
        try {
            const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'd6hub7pr01qr5k4dbcc0d6hub7pr01qr5k4dbccg'
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`)
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            if (data && data.c !== undefined) {
                setFinnhubStatus('working')
            } else {
                setFinnhubStatus('failed')
            }
        } catch {
            setFinnhubStatus('failed')
        }
    }

    const testFmp = async () => {
        setFmpStatus('testing')
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const res = await fetch(`${apiBase}/financials?ticker=AAPL`, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (!res.ok) throw new Error('Failed')
            const data = await res.json()
            if (data && data.ticker === 'AAPL') {
                setFmpStatus('working')
            } else {
                setFmpStatus('failed')
            }
        } catch {
            setFmpStatus('failed')
        }
    }

    const testNews = async () => {
        setNewsStatus('testing')
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const res = await fetch(`${apiBase}/news?ticker=AAPL`, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (!res.ok) throw new Error('Failed')
            const data = await res.json()
            if (data && data.articles) {
                setNewsStatus('working')
            } else {
                setNewsStatus('failed')
            }
        } catch {
            setNewsStatus('failed')
        }
    }

    const testAll = () => {
        testNvidia()
        testFinnhub()
        testFmp()
        testNews()
    }

    // Auto-test on mount
    useEffect(() => {
        testAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-8 pt-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}>
                    <Settings size={22} style={{ color: '#60A5FA' }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white mb-0.5">Control Panel</h1>
                    <p className="mono" style={{ color: '#6B7280', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                        PREFERENCES & API RELIABILITY
                    </p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Column: Preferences */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex flex-col gap-6">

                    <div className="panel-card rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                            <DollarSign size={18} style={{ color: '#10B981' }} />
                            Currency Preference
                        </h2>
                        <div className="flex gap-3">
                            {(['USD', 'INR'] as Currency[]).map((c) => (
                                <button key={c} onClick={() => setCurrency(c)}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                                    style={{
                                        background: currency === c ? 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))' : 'rgba(255,255,255,0.03)',
                                        border: currency === c ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                        color: currency === c ? '#10B981' : '#9CA3AF',
                                        boxShadow: currency === c ? '0 0 16px rgba(16,185,129,0.12)' : 'none'
                                    }}>
                                    {c === 'USD' ? '🇺🇸 USD' : '🇮🇳 INR'}
                                </button>
                            ))}
                        </div>
                        <p className="mt-4 text-xs" style={{ color: '#6B7280' }}>
                            Globally applies to market values, P&L, and charts. Conversion is approximate.
                        </p>
                    </div>

                    <div className="panel-card rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                            {theme === 'dark' ? <Moon size={18} style={{ color: '#F59E0B' }} /> : <Sun size={18} style={{ color: '#F59E0B' }} />}
                            Interface Theme
                        </h2>
                        <div className="flex gap-3">
                            {(['dark', 'light'] as Theme[]).map((t) => (
                                <button key={t} onClick={() => setTheme(t)}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                    style={{
                                        background: theme === t ? 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.1))' : 'rgba(255,255,255,0.03)',
                                        border: theme === t ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                        color: theme === t ? '#F59E0B' : '#9CA3AF',
                                        boxShadow: theme === t ? '0 0 16px rgba(245,158,11,0.12)' : 'none'
                                    }}>
                                    {t === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                </button>
                            ))}
                        </div>
                    </div>

                </motion.div>

                {/* Right Column: API Testing */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="panel-card rounded-2xl p-6 flex flex-col h-full">

                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity size={18} style={{ color: '#A78BFA' }} />
                            API Status Diagnostics
                        </h2>
                        <button onClick={testAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/5"
                            style={{ background: 'rgba(255,255,255,0.03)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
                            <RefreshCw size={12} />
                            Test All
                        </button>
                    </div>

                    <div className="flex-1 space-y-3">
                        <StatusRow title="NVIDIA NIM API" subtitle="Core LLM intelligence" status={nvidiaStatus} onTest={testNvidia} />
                        <StatusRow title="Finnhub" subtitle="Real-time live prices" status={finnhubStatus} onTest={testFinnhub} />
                        <StatusRow title="Financial Modeling Prep" subtitle="Financial fundamentals" status={fmpStatus} onTest={testFmp} />
                        <StatusRow title="NewsAPI" subtitle="Market headlines" status={newsStatus} onTest={testNews} />
                    </div>

                </motion.div>

            </div>
        </div>
    )
}

function StatusRow({ title, subtitle, status, onTest }: { title: string, subtitle: string, status: ApiStatus, onTest: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
                <p className="font-bold text-white text-sm">{title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{subtitle}</p>
            </div>
            
            <div className="flex items-center gap-3">
                {status === 'idle' && (
                    <span className="mono text-xs" style={{ color: '#6B7280' }}>Waiting</span>
                )}
                {status === 'testing' && (
                    <div className="flex items-center gap-1.5 mono text-xs" style={{ color: '#60A5FA' }}>
                        <RefreshCw size={11} className="animate-spin" /> Testing
                    </div>
                )}
                {status === 'working' && (
                    <div className="flex items-center gap-1.5 mono text-xs" style={{ color: '#10B981' }}>
                        <CheckCircle2 size={13} /> Working
                    </div>
                )}
                {status === 'failed' && (
                    <div className="flex items-center gap-1.5 mono text-xs" style={{ color: '#EF4444' }}>
                        <XCircle size={13} /> Failed
                    </div>
                )}
                
                <button onClick={onTest} disabled={status === 'testing'}
                    className="p-1.5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
                    title="Run specific test">
                    <RefreshCw size={12} style={{ color: '#9CA3AF' }} />
                </button>
            </div>
        </div>
    )
}
