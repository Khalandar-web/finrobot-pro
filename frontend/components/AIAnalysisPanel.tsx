'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Bot, User, ChevronDown, TrendingUp, TrendingDown,
    AlertTriangle, CheckCircle2, RefreshCw, Clock, Cpu, Sparkles,
    Brain, Shield, Activity, Zap, HelpCircle, BarChart3,
    Database, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'
import { ForecastResponse } from '@/lib/api'

interface AIAnalysisPanelProps {
    result: ForecastResponse | null
    ticker: string
    loading: boolean
    onRefresh: () => void
    forecastTime: Date | null
}

// ── AI Thinking Animation ─────────────────────────────────────────────────────
const THINKING_STEPS = [
    { text: 'Fetching market data...', icon: Database, duration: 1800 },
    { text: 'Analyzing stock price history...', icon: BarChart3, duration: 2200 },
    { text: 'Processing news & sentiment...', icon: Activity, duration: 2000 },
    { text: 'Evaluating financial health...', icon: Shield, duration: 1800 },
    { text: 'Running AI prediction model...', icon: Brain, duration: 2500 },
    { text: 'Generating insights...', icon: Sparkles, duration: 1500 },
]

function AIThinkingAnimation() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        if (step >= THINKING_STEPS.length) return
        const timer = setTimeout(() => {
            setStep(s => Math.min(s + 1, THINKING_STEPS.length - 1))
        }, THINKING_STEPS[step].duration)
        return () => clearTimeout(timer)
    }, [step])

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 px-4 py-3">
            {THINKING_STEPS.map((s, i) => {
                const Icon = s.icon
                const active = i === step
                const done = i < step
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                        className="flex items-center gap-2.5"
                    >
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{
                                background: done ? 'rgba(0,255,136,0.15)' : active ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${done ? 'rgba(0,255,136,0.3)' : active ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            }}>
                            {done ? (
                                <CheckCircle2 size={10} style={{ color: '#00FF88' }} />
                            ) : active ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                                    <Icon size={10} style={{ color: '#60A5FA' }} />
                                </motion.div>
                            ) : (
                                <Icon size={10} style={{ color: '#4B5563' }} />
                            )}
                        </div>
                        <span className="mono" style={{
                            fontSize: '0.65rem',
                            letterSpacing: '0.04em',
                            color: done ? '#00FF88' : active ? '#60A5FA' : '#4B5563',
                            fontWeight: active ? 600 : 400,
                        }}>
                            {s.text}
                        </span>
                        {active && (
                            <motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                className="w-1 h-1 rounded-full ml-1"
                                style={{ background: '#60A5FA', boxShadow: '0 0 4px #60A5FA' }}
                            />
                        )}
                    </motion.div>
                )
            })}
        </motion.div>
    )
}

// ── Confidence Ring ───────────────────────────────────────────────────────────
function ConfidenceRing({ value, size = 64 }: { value: number; size?: number }) {
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (value / 100) * circumference
    const color = value >= 70 ? '#00FF88' : value >= 40 ? '#F59E0B' : '#FF7169'

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth={4} strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="mono font-black" style={{ fontSize: size * 0.26, color }}>{value}%</span>
            </div>
        </div>
    )
}

// ── Summary Card (Trend / Sentiment / Health) ─────────────────────────────────
function SummaryMetric({ label, value, icon: Icon, color }: {
    label: string; value: string; icon: any; color: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: `${color}08`, border: `1px solid ${color}20` }}
        >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15` }}>
                <Icon size={13} style={{ color }} />
            </div>
            <div>
                <p className="mono" style={{ color: '#6B7280', fontSize: '0.55rem', letterSpacing: '0.1em' }}>{label}</p>
                <p className="text-sm font-bold" style={{ color }}>{value}</p>
            </div>
        </motion.div>
    )
}

// ── Why This Prediction Card ──────────────────────────────────────────────────
function WhyCard({ icon: Icon, label, reason, color }: {
    icon: any; label: string; reason: string; color: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${color}15` }}>
                <Icon size={11} style={{ color }} />
            </div>
            <div>
                <p className="mono" style={{ color, fontSize: '0.58rem', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#CBD5E1' }}>{reason}</p>
            </div>
        </motion.div>
    )
}

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({ title, defaultOpen = true, accentColor = '#A4FFB9', icon, children, badge }: {
    title: string; defaultOpen?: boolean; accentColor?: string
    icon: React.ReactNode; children: React.ReactNode; badge?: string
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="section-card rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 transition-all hover:opacity-90">
                <div className="flex items-center gap-2">
                    <span style={{ color: accentColor }}>{icon}</span>
                    <span className="text-sm font-semibold text-white">{title}</span>
                    {badge && (
                        <span className="mono px-1.5 py-0.5 rounded text-white"
                            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30`, fontSize: '0.58rem', letterSpacing: '0.06em' }}>
                            {badge}
                        </span>
                    )}
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }}>
                    <ChevronDown size={14} style={{ color: '#6B7280' }} />
                </motion.div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                        <div className="px-4 pb-4 pt-1">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────────────────

export default function AIAnalysisPanel({ result, ticker, loading, onRefresh, forecastTime }: AIAnalysisPanelProps) {
    const timeStr = forecastTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    // Derive colors
    const suggestionColors: Record<string, string> = {
        BUY: '#00FF88', SELL: '#FF7169', HOLD: '#F59E0B',
    }
    const trendColors: Record<string, string> = {
        Uptrend: '#00FF88', Downtrend: '#FF7169',
    }
    const sentimentColors: Record<string, string> = {
        Positive: '#00FF88', Neutral: '#F59E0B', Negative: '#FF7169',
    }
    const healthColors: Record<string, string> = {
        Strong: '#00FF88', Moderate: '#F59E0B', Weak: '#FF7169',
    }

    return (
        <div className="ai-panel rounded-2xl overflow-hidden flex flex-col h-full shadow-[0_0_30px_rgba(0,255,136,0.15)] ring-1 ring-blue-500/30" style={{ minHeight: 420 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,8,15,0.6)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#00ED7E,#00FF88)', boxShadow: '0 0 16px rgba(0,255,136,0.4)' }}>
                            <Cpu size={14} className="text-white" />
                        </div>
                        {(loading || result) && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center"
                                style={{
                                    background: loading ? '#F59E0B' : '#00FF88',
                                    borderColor: '#06080f',
                                    boxShadow: loading ? '0 0 8px #F59E0B' : '0 0 8px #00FF88',
                                    animation: 'hudBlink 1.8s ease-in-out infinite',
                                }} />
                        )}
                    </div>
                    <div>
                        <span className="text-sm font-bold text-white block leading-none">AI Research Assistant</span>
                        <span className="mono" style={{ color: '#4B5563', fontSize: '0.58rem', letterSpacing: '0.08em' }}>NVIDIA NIM · LLAMA 3 70B</span>
                    </div>
                    {result && !loading && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            className="mono flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.2)', fontSize: '0.58rem', letterSpacing: '0.08em' }}>
                            <Sparkles size={9} />LIVE
                        </motion.span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {timeStr && (
                        <span className="mono flex items-center gap-1" style={{ color: '#6B7280', fontSize: '0.62rem' }}>
                            <Clock size={11} />{timeStr}
                        </span>
                    )}
                    {ticker && (
                        <motion.button whileTap={{ scale: 0.92 }} onClick={onRefresh} disabled={loading}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: 'rgba(0,255,136,0.1)', color: '#A4FFB9', border: '1px solid rgba(0,255,136,0.2)', fontSize: '0.7rem', fontWeight: 600 }}>
                            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">

                {/* Empty state */}
                {!ticker && !loading && (
                    <div className="h-full flex flex-col items-center justify-center gap-3 py-8" style={{ color: '#374151' }}>
                        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                            <Bot size={36} />
                        </motion.div>
                        <p className="text-sm text-center font-medium">Enter a ticker symbol above to start AI analysis</p>
                        <p className="text-xs text-center" style={{ color: '#4B5563' }}>Try AAPL, TSLA, RELIANCE.NS, TCS.NS</p>
                    </div>
                )}

                {/* AI Thinking Animation */}
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                                <Brain size={16} style={{ color: '#60A5FA' }} />
                            </motion.div>
                            <span className="text-sm font-semibold" style={{ color: '#60A5FA' }}>AI is thinking...</span>
                        </div>
                        <AIThinkingAnimation />
                    </motion.div>
                )}

                {/* Results */}
                {result && !loading && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

                        {/* AI Summary Text */}
                        <div className="bubble-ai rounded-2xl px-4 py-3">
                            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
                                {result.summary || 'Analysis complete.'}
                            </p>
                        </div>

                        {/* ── AI Summary Metrics ── */}
                        <div className="grid grid-cols-3 gap-2">
                            <SummaryMetric
                                label="TREND"
                                value={result.trend || (result.prediction === 'UP' ? 'Uptrend' : 'Downtrend')}
                                icon={result.trend === 'Downtrend' ? TrendingDown : TrendingUp}
                                color={trendColors[result.trend || 'Uptrend'] || '#00FF88'}
                            />
                            <SummaryMetric
                                label="SENTIMENT"
                                value={result.sentiment || 'Neutral'}
                                icon={Activity}
                                color={sentimentColors[result.sentiment || 'Neutral'] || '#F59E0B'}
                            />
                            <SummaryMetric
                                label="HEALTH"
                                value={result.financial_health || 'Moderate'}
                                icon={Shield}
                                color={healthColors[result.financial_health || 'Moderate'] || '#F59E0B'}
                            />
                        </div>

                        {/* ── Suggestion + Confidence ── */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="rounded-xl p-4 flex items-center justify-between"
                            style={{
                                background: `${suggestionColors[result.suggestion || 'HOLD']}08`,
                                border: `1px solid ${suggestionColors[result.suggestion || 'HOLD']}25`,
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: `${suggestionColors[result.suggestion || 'HOLD']}18`,
                                        boxShadow: `0 0 16px ${suggestionColors[result.suggestion || 'HOLD']}40`,
                                    }}>
                                    {result.suggestion === 'BUY' ? <ArrowUpRight size={20} style={{ color: '#00FF88' }} /> :
                                        result.suggestion === 'SELL' ? <ArrowDownRight size={20} style={{ color: '#FF7169' }} /> :
                                            <Minus size={20} style={{ color: '#F59E0B' }} />}
                                </div>
                                <div>
                                    <p className="mono" style={{ color: '#6B7280', fontSize: '0.55rem', letterSpacing: '0.1em' }}>AI SUGGESTION</p>
                                    <p className="text-xl font-black" style={{ color: suggestionColors[result.suggestion || 'HOLD'] }}>
                                        {result.suggestion || (result.prediction === 'UP' ? 'BUY' : 'SELL')}
                                    </p>
                                </div>
                            </div>
                            <ConfidenceRing value={result.confidence} size={60} />
                        </motion.div>

                        {/* ── Confidence Breakdown ── */}
                        <CollapsibleSection title="Confidence Breakdown" icon={<BarChart3 size={13} />} accentColor="#60A5FA" defaultOpen={true}>
                            <div className="space-y-2.5 mt-2">
                                {[
                                    { label: 'Data Quality', value: result.current_price ? 85 : 40, desc: result.current_price ? 'Live market data available' : 'Limited data available' },
                                    { label: 'Price Analysis', value: Math.min(95, result.confidence + 10), desc: `${result.trend || 'Trend'} detected in price history` },
                                    { label: 'News Sentiment', value: result.sentiment === 'Positive' ? 80 : result.sentiment === 'Negative' ? 30 : 55, desc: `Market mood is ${(result.sentiment || 'Neutral').toLowerCase()}` },
                                    { label: 'Financial Health', value: result.financial_health === 'Strong' ? 85 : result.financial_health === 'Weak' ? 30 : 60, desc: `Company health is ${(result.financial_health || 'Moderate').toLowerCase()}` },
                                ].map((item, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.08 }} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium" style={{ color: '#CBD5E1' }}>{item.label}</span>
                                            <span className="mono text-xs font-bold" style={{
                                                color: item.value >= 70 ? '#00FF88' : item.value >= 40 ? '#F59E0B' : '#FF7169'
                                            }}>{item.value}%</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            <motion.div
                                                initial={{ width: 0 }} animate={{ width: `${item.value}%` }}
                                                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                                className="h-full rounded-full"
                                                style={{
                                                    background: item.value >= 70 ? '#00FF88' : item.value >= 40 ? '#F59E0B' : '#FF7169',
                                                    boxShadow: `0 0 8px ${item.value >= 70 ? 'rgba(0,255,136,0.3)' : item.value >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(255,113,105,0.3)'}`,
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs" style={{ color: '#6B7280' }}>{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </CollapsibleSection>

                        {/* ── Why This Prediction? ── */}
                        <CollapsibleSection title="Why This Prediction?" icon={<HelpCircle size={13} />} accentColor="#818CF8" defaultOpen={true}>
                            <div className="space-y-2 mt-2">
                                <WhyCard
                                    icon={TrendingUp}
                                    label="PRICE TREND"
                                    reason={result.why_trend || `The stock is in a ${(result.trend || 'neutral').toLowerCase()} pattern.`}
                                    color={trendColors[result.trend || 'Uptrend'] || '#00FF88'}
                                />
                                <WhyCard
                                    icon={Activity}
                                    label="NEWS & SENTIMENT"
                                    reason={result.why_sentiment || `Market sentiment appears ${(result.sentiment || 'neutral').toLowerCase()}.`}
                                    color={sentimentColors[result.sentiment || 'Neutral'] || '#F59E0B'}
                                />
                                <WhyCard
                                    icon={Shield}
                                    label="FINANCIAL HEALTH"
                                    reason={result.why_financial || `The company's financial health is ${(result.financial_health || 'moderate').toLowerCase()}.`}
                                    color={healthColors[result.financial_health || 'Moderate'] || '#F59E0B'}
                                />
                            </div>
                        </CollapsibleSection>

                        {/* ── Key Positives ── */}
                        <CollapsibleSection title="Key Positives" icon={<CheckCircle2 size={13} />} accentColor="#00FF88"
                            badge={`${result.positives.length} factors`} defaultOpen={false}>
                            <ul className="space-y-2 mt-1">
                                {result.positives.map((p, i) => (
                                    <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="insight-positive flex items-start gap-2 text-sm py-1.5 mb-1" style={{ color: '#CBD5E1' }}>
                                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#00FF88', boxShadow: '0 0 6px #00FF88' }} />
                                        {p}
                                    </motion.li>
                                ))}
                            </ul>
                        </CollapsibleSection>

                        {/* ── Key Risks ── */}
                        <CollapsibleSection title="Key Risks" icon={<AlertTriangle size={13} />} accentColor="#FF7169"
                            badge={`${result.risks.length} factors`} defaultOpen={false}>
                            <ul className="space-y-2 mt-1">
                                {result.risks.map((r, i) => (
                                    <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="insight-negative flex items-start gap-2 text-sm py-1.5 mb-1" style={{ color: '#CBD5E1' }}>
                                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#FF7169', boxShadow: '0 0 6px #FF7169' }} />
                                        {r}
                                    </motion.li>
                                ))}
                            </ul>
                        </CollapsibleSection>

                        {/* ── Data Source + Last Updated ── */}
                        <div className="flex items-center justify-between px-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center gap-2">
                                <Database size={10} style={{ color: '#4B5563' }} />
                                <span className="mono" style={{ color: '#4B5563', fontSize: '0.55rem', letterSpacing: '0.08em' }}>
                                    Source: {result.data_source?.toUpperCase() || 'FINNHUB + YFINANCE'}
                                </span>
                            </div>
                            <span className="mono" style={{ color: '#4B5563', fontSize: '0.55rem' }}>
                                {timeStr ? `Updated ${timeStr}` : 'Just now'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
