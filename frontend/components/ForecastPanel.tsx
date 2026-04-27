'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { ForecastResponse } from '@/lib/api'
import MetricCard from './MetricCard'

interface Message {
    role: 'user' | 'ai'
    content: string
}

interface ForecastPanelProps {
    result: ForecastResponse | null
    ticker: string
    loading: boolean
}

function TypingDots() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            <span className="dot w-2 h-2 rounded-full bg-blue-400 inline-block" />
            <span className="dot w-2 h-2 rounded-full bg-blue-400 inline-block" />
            <span className="dot w-2 h-2 rounded-full bg-blue-400 inline-block" />
        </div>
    )
}

function formatNumber(n: number | null | undefined): string {
    if (n == null) return '—'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}T`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}B`
    return `$${n.toFixed(2)}`
}

export default function ForecastPanel({ result, ticker, loading }: ForecastPanelProps) {
    const chatEndRef = useRef<HTMLDivElement>(null)

    const messages: Message[] = []
    if (ticker) {
        messages.push({ role: 'user', content: `Run market forecast for ${ticker}` })
    }
    if (result) {
        messages.push({
            role: 'ai',
            content: result.summary,
        })
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length, loading])

    if (!ticker && !loading && !result) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color: '#4B5563' }}>
                <Bot size={40} />
                <p className="text-sm">Enter a ticker and click Run Forecast to begin.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Two-column: chat + chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chat panel */}
                <div className="rounded-xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <Bot size={14} style={{ color: '#60A5FA' }} />
                        <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>AI Research Assistant</span>
                    </div>
                    <div className="p-4 space-y-3 min-h-[180px] max-h-[280px] overflow-y-auto">
                        <AnimatePresence>
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'ai' && (
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                                            <Bot size={12} className="text-white" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}
                                        style={{ color: '#E5E7EB' }}>
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <User size={12} style={{ color: '#9CA3AF' }} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                                        <Bot size={12} className="text-white" />
                                    </div>
                                    <div className="bubble-ai rounded-xl">
                                        <TypingDots />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Chart + metrics */}
                <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>Price Overview</span>
                        {result?.prediction && (
                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${result.prediction === 'UP' ? 'text-green-400' : 'text-red-400'}`}
                                style={{ background: result.prediction === 'UP' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                {result.prediction === 'UP'
                                    ? <TrendingUp size={12} />
                                    : <TrendingDown size={12} />}
                                {result.prediction}
                            </span>
                        )}
                    </div>
                    {result?.current_price ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-3xl font-black text-white">${result.current_price.toLocaleString()}</p>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#6B7280' }}>
                            Run a forecast to see price data
                        </div>
                    )}
                </div>
            </div>

            {/* Metrics row */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard
                        label="Current Price"
                        value={result.current_price ? `₹${result.current_price.toLocaleString()}` : null}
                        accent
                    />
                    <MetricCard
                        label="Market Cap"
                        value={result.market_cap ? formatNumber(result.market_cap * 1_000_000) : null}
                    />
                    <MetricCard
                        label="P/E Ratio"
                        value={result.pe_ratio ? result.pe_ratio.toFixed(1) : null}
                    />
                    <MetricCard
                        label="Confidence"
                        value={result.confidence ? `${result.confidence}%` : null}
                        accent
                    />
                </motion.div>
            )}

            {/* Forecast summary card */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="rounded-xl p-6"
                    style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-semibold text-white">Forecast Summary — {ticker}</h3>
                        <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg ${result.prediction === 'UP' ? 'text-green-400' : 'text-red-400'}`}
                                style={{ background: result.prediction === 'UP' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.prediction === 'UP' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                {result.prediction === 'UP'
                                    ? <TrendingUp size={14} />
                                    : <TrendingDown size={14} />}
                                {result.prediction} · {result.estimated_movement}
                            </span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Positives */}
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#10B981' }}>
                                Positive Drivers
                            </p>
                            <ul className="space-y-2">
                                {result.positives.map((p, i) => (
                                    <li key={i} className="flex gap-2 text-sm" style={{ color: '#D1D5DB' }}>
                                        <ChevronRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* Risks */}
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#EF4444' }}>
                                Risk Factors
                            </p>
                            <ul className="space-y-2">
                                {result.risks.map((r, i) => (
                                    <li key={i} className="flex gap-2 text-sm" style={{ color: '#D1D5DB' }}>
                                        <ChevronRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="mt-5">
                        <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B7280' }}>
                            <span>AI Confidence</span>
                            <span className="font-medium text-white">{result.confidence}%</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: '#1F2937' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${result.confidence}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg,#2563EB,#60A5FA)' }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
