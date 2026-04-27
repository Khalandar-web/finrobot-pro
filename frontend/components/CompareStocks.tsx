'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    GitCompare, Search, TrendingUp, TrendingDown,
    Loader2, AlertCircle, ArrowRight
} from 'lucide-react'
import { compareStocks, CompareResult } from '@/lib/api'

export default function CompareStocks() {
    const [ticker1, setTicker1] = useState('')
    const [ticker2, setTicker2] = useState('')
    const [result, setResult] = useState<CompareResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [expanded, setExpanded] = useState(false)

    const handleCompare = async () => {
        const t1 = ticker1.trim().toUpperCase()
        const t2 = ticker2.trim().toUpperCase()
        if (!t1 || !t2) { setError('Enter two ticker symbols'); return }
        if (t1 === t2) { setError('Enter two different tickers'); return }

        setLoading(true)
        setError('')
        setResult(null)

        try {
            const data = await compareStocks([t1, t2])
            setResult(data)
        } catch (err) {
            setError('Comparison failed. Check ticker symbols.')
        } finally {
            setLoading(false)
        }
    }

    const fmtPrice = (price: number | null, currency: string) => {
        if (!price) return '—'
        const sym = currency === 'INR' ? '₹' : '$'
        return `${sym}${price.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const fmtCap = (cap: number | null, currency: string) => {
        if (!cap) return '—'
        const sym = currency === 'INR' ? '₹' : '$'
        if (cap >= 1e12) return `${sym}${(cap / 1e12).toFixed(1)}T`
        if (cap >= 1e9) return `${sym}${(cap / 1e9).toFixed(1)}B`
        if (cap >= 1e6) return `${sym}${(cap / 1e6).toFixed(0)}M`
        return `${sym}${cap.toLocaleString()}`
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-card rounded-2xl overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-all hover:bg-white/[0.02]"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(37,99,235,0.15))',
                            border: '1px solid rgba(6,182,212,0.3)',
                        }}>
                        <GitCompare size={14} style={{ color: '#22D3EE' }} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-white">Compare Stocks</p>
                        <p className="mono" style={{ color: '#6B7280', fontSize: '0.58rem', letterSpacing: '0.06em' }}>
                            SIDE-BY-SIDE ANALYSIS
                        </p>
                    </div>
                </div>
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ArrowRight size={14} style={{ color: '#6B7280', transform: 'rotate(90deg)' }} />
                </motion.div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="px-4 pb-4 space-y-3">
                            {/* Input Row */}
                            <div className="flex items-center gap-2">
                                <input
                                    className="fin-input flex-1 px-3 py-2 rounded-xl text-sm font-semibold uppercase"
                                    placeholder="AAPL"
                                    value={ticker1}
                                    onChange={e => { setTicker1(e.target.value.toUpperCase()); setError('') }}
                                    onKeyDown={e => e.key === 'Enter' && handleCompare()}
                                />
                                <span className="mono text-xs font-bold" style={{ color: '#6B7280' }}>VS</span>
                                <input
                                    className="fin-input flex-1 px-3 py-2 rounded-xl text-sm font-semibold uppercase"
                                    placeholder="TSLA"
                                    value={ticker2}
                                    onChange={e => { setTicker2(e.target.value.toUpperCase()); setError('') }}
                                    onKeyDown={e => e.key === 'Enter' && handleCompare()}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleCompare}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg,#06B6D4,#2563EB)', boxShadow: '0 0 12px rgba(6,182,212,0.3)' }}
                                >
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                    Compare
                                </motion.button>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 text-xs" style={{ color: '#FF7169' }}>
                                    <AlertCircle size={12} />{error}
                                </div>
                            )}

                            {/* Results Table */}
                            {result && result.stocks.length === 2 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl overflow-hidden"
                                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <div className="grid grid-cols-3 gap-0">
                                        {/* Header Row */}
                                        <div className="p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                            <span className="mono text-xs font-bold" style={{ color: '#6B7280' }}>METRIC</span>
                                        </div>
                                        {result.stocks.map((s, i) => (
                                            <div key={i} className="p-3 text-center"
                                                style={{ background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                                                <span className="mono text-xs font-bold text-white">{s.ticker}</span>
                                            </div>
                                        ))}

                                        {/* Data Rows */}
                                        {[
                                            { label: 'Company', key: 'company_name' },
                                            { label: 'Price', key: 'price', format: 'price' },
                                            { label: 'Change', key: 'change_pct', format: 'pct' },
                                            { label: 'Market Cap', key: 'market_cap', format: 'cap' },
                                            { label: 'P/E Ratio', key: 'pe_ratio', format: 'num' },
                                            { label: 'Sector', key: 'sector' },
                                        ].map((row, ri) => (
                                            <>
                                                <div key={`label-${ri}`} className="px-3 py-2.5"
                                                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <span className="mono text-xs" style={{ color: '#6B7280' }}>{row.label}</span>
                                                </div>
                                                {result.stocks.map((s: any, si) => {
                                                    let val = s[row.key]
                                                    let color = '#E2E8F0'

                                                    if (row.format === 'price') {
                                                        val = fmtPrice(val, s.currency)
                                                    } else if (row.format === 'pct') {
                                                        color = val != null ? (val >= 0 ? '#00FF88' : '#FF7169') : '#6B7280'
                                                        val = val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : '—'
                                                    } else if (row.format === 'cap') {
                                                        val = fmtCap(val, s.currency)
                                                    } else if (row.format === 'num') {
                                                        val = val != null ? val.toFixed(2) : '—'
                                                    } else {
                                                        val = val || '—'
                                                    }

                                                    // Highlight winner for numerical comparisons
                                                    const isBetter = row.format === 'pct' && result.stocks.length === 2 && s[row.key] != null &&
                                                        s[row.key] > (result.stocks[1 - si] as any)[row.key]

                                                    return (
                                                        <div key={`val-${ri}-${si}`}
                                                            className="px-3 py-2.5 text-center"
                                                            style={{
                                                                borderTop: '1px solid rgba(255,255,255,0.04)',
                                                                borderLeft: '1px solid rgba(255,255,255,0.06)',
                                                                background: isBetter ? 'rgba(0,255,136,0.04)' : 'transparent',
                                                            }}>
                                                            <span className={`mono text-xs ${row.format ? 'font-bold' : ''}`}
                                                                style={{ color }}>{val}</span>
                                                        </div>
                                                    )
                                                })}
                                            </>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
