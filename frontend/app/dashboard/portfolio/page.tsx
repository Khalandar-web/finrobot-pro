'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, Trash2, TrendingUp, TrendingDown, DollarSign,
    BarChart2, RefreshCw, AlertCircle, PieChart as PieIcon,
    X, Check, Briefcase, Activity
} from 'lucide-react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useCurrency } from '@/lib/currency'
import toast from 'react-hot-toast'


// ─── Types ────────────────────────────────────────────────────────────────────

interface Holding {
    id: string
    ticker: string
    quantity: number
    avgPrice: number
}

interface HoldingWithQuote extends Holding {
    currentPrice: number
    changePct: number
    marketValue: number
    pnl: number
    pnlPct: number
    loading: boolean
    error: boolean
    currencySymbol: string
}

function getTickerCurrency(ticker: string): string {
    const t = ticker.toUpperCase()
    if (t.endsWith('.NS') || t.endsWith('.BO')) return '₹'
    return '$'
}

function fmtNative(value: number, currencySymbol: string): string {
    if (value === null || value === undefined || isNaN(value)) return '—'
    const locale = currencySymbol === '₹' ? 'en-IN' : 'en-US'
    return `${currencySymbol}${Math.abs(value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'finrobot_portfolio_holdings'
const USD_TO_INR = 83  // Approximate conversion rate

const CHART_COLORS = [
    '#00FF88', '#00ED7E', '#00FF88', '#F59E0B', '#FF7169',
    '#06B6D4', '#8B5CF6', '#34D399', '#FBBF24', '#F87171',
    '#A4FFB9', '#A4FFB9',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

// formatCurrency is now handled by useCurrency().fmt() — see component

function formatPct(v: number): string {
    if (v === null || v === undefined) return '—'
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}


function genId() {
    return Math.random().toString(36).slice(2, 10)
}

// ─── Add Holding Modal ────────────────────────────────────────────────────────

function AddHoldingModal({ onAdd, onClose }: { onAdd: (h: Holding) => void; onClose: () => void }) {
    const [ticker, setTicker] = useState('')
    const [quantity, setQuantity] = useState('')
    const [avgPrice, setAvgPrice] = useState('')
    const [err, setErr] = useState('')
    const [livePrice, setLivePrice] = useState<number | null>(null)
    const [liveCurrency, setLiveCurrency] = useState<string>('USD')
    const [livePriceLoading, setLivePriceLoading] = useState(false)
    const [livePriceError, setLivePriceError] = useState(false)

    // Debounced live price lookup when ticker changes
    useEffect(() => {
        const sym = ticker.trim().toUpperCase()
        if (sym.length < 1) {
            setLivePrice(null)
            setLivePriceError(false)
            return
        }
        const timer = setTimeout(async () => {
            setLivePriceLoading(true)
            setLivePriceError(false)
            setLivePrice(null)
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)
                const res = await fetch(`${apiBase}/quote?ticker=${sym}`, { signal: controller.signal })
                clearTimeout(timeoutId)
                if (!res.ok) throw new Error('Fetch failed')
                const data = await res.json()
                const price = data?.price
                const currency = data?.currency || 'USD'
                if (price && price > 0) {
                    setLivePrice(price)
                    setLiveCurrency(currency)
                } else {
                    setLivePriceError(true)
                }
            } catch {
                setLivePriceError(true)
            } finally {
                setLivePriceLoading(false)
            }
        }, 600)
        return () => clearTimeout(timer)
    }, [ticker])

    const submit = () => {
        const sym = ticker.trim().toUpperCase()
        const qty = parseFloat(quantity)
        const avg = parseFloat(avgPrice)
        if (!sym) { setErr('Ticker required'); return }
        if (isNaN(qty) || qty <= 0) { setErr('Quantity must be > 0'); return }
        if (isNaN(avg) || avg <= 0) { setErr('Average price must be > 0'); return }
        onAdd({ id: genId(), ticker: sym, quantity: qty, avgPrice: avg })
        onClose()
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(11,14,17,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}>
            <motion.div
                initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                onClick={e => e.stopPropagation()}
                className="panel-card rounded-2xl p-6 w-full max-w-sm mx-4"
                style={{ border: '1px solid rgba(0,255,136,0.3)', boxShadow: '0 0 60px rgba(0,255,136,0.2)' }}>

                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-white">Add Holding</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                        <X size={16} style={{ color: '#6B7280' }} />
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="mono text-xs block mb-1.5" style={{ color: '#6B7280', letterSpacing: '0.08em' }}>TICKER SYMBOL</label>
                        <input
                            className="fin-input w-full px-3 py-2.5 rounded-xl text-sm font-semibold uppercase"
                            placeholder="e.g. AAPL"
                            value={ticker}
                            onChange={e => { setTicker(e.target.value.toUpperCase()); setErr('') }}
                            onKeyDown={e => e.key === 'Enter' && submit()}
                            autoFocus
                        />
                    </div>

                    {/* Live Price Preview */}
                    {ticker.trim().length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="rounded-xl p-3"
                            style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
                            <div className="flex items-center justify-between">
                                <span className="mono text-xs" style={{ color: '#6B7280', letterSpacing: '0.08em' }}>CURRENT MARKET PRICE</span>
                                {livePriceLoading ? (
                                    <span className="shimmer inline-block w-20 h-4 rounded" />
                                ) : livePriceError ? (
                                    <span className="mono text-xs font-medium" style={{ color: '#F59E0B' }}>Unavailable</span>
                                ) : livePrice !== null ? (
                                    <span className="mono text-sm font-bold" style={{ color: '#00FF88' }}>
                                        {liveCurrency === 'INR' ? '₹' : '$'}{livePrice.toLocaleString(liveCurrency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                ) : null}
                            </div>
                            {livePrice !== null && !livePriceLoading && (
                                <p className="text-xs mt-1" style={{ color: '#4B5563' }}>
                                    Live via backend API · {liveCurrency === 'INR' ? '₹ INR' : '$ USD'}
                                </p>
                            )}
                        </motion.div>
                    )}

                    <div>
                        <label className="mono text-xs block mb-1.5" style={{ color: '#6B7280', letterSpacing: '0.08em' }}>QUANTITY (SHARES)</label>
                        <input
                            className="fin-input w-full px-3 py-2.5 rounded-xl text-sm"
                            placeholder="e.g. 50"
                            type="number"
                            min="0.001"
                            step="any"
                            value={quantity}
                            onChange={e => { setQuantity(e.target.value); setErr('') }}
                            onKeyDown={e => e.key === 'Enter' && submit()}
                        />
                    </div>
                    <div>
                        <label className="mono text-xs block mb-1.5" style={{ color: '#6B7280', letterSpacing: '0.08em' }}>AVG BUY PRICE ({liveCurrency === 'INR' ? '₹' : '$'})</label>
                        <input
                            className="fin-input w-full px-3 py-2.5 rounded-xl text-sm"
                            placeholder={livePrice ? `Current: ${liveCurrency === 'INR' ? '₹' : '$'}${livePrice.toFixed(2)}` : "e.g. 150.00"}
                            type="number"
                            min="0.01"
                            step="any"
                            value={avgPrice}
                            onChange={e => { setAvgPrice(e.target.value); setErr('') }}
                            onKeyDown={e => e.key === 'Enter' && submit()}
                        />
                    </div>

                    <AnimatePresence>
                        {err && (
                            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5 text-xs" style={{ color: '#FF7169' }}>
                                <AlertCircle size={12} />{err}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex gap-2 mt-5">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Cancel
                    </button>
                    <button onClick={submit}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white">
                        <Check size={14} />Add Holding
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Pie Chart Custom Tooltip ─────────────────────────────────────────────────
// NOTE: This component intentionally receives fmt as a prop because
// Recharts renders it outside the React context tree.
function CustomPieTooltip({
    active, payload, fmt,
}: {
    active?: boolean
    payload?: { name: string; value: number; payload: { pct: number } }[]
    fmt: (v: number | null) => string
}) {
    if (!active || !payload?.length) return null
    const p = payload[0]
    return (
        <div className="panel-card rounded-xl px-3 py-2" style={{ border: '1px solid rgba(0,255,136,0.3)', minWidth: 130 }}>
            <p className="font-bold text-white text-sm">{p.name}</p>
            <p className="mono text-xs" style={{ color: '#9CA3AF' }}>{fmt(p.value)}</p>
            <p className="mono text-xs" style={{ color: '#A4FFB9' }}>{p.payload.pct.toFixed(1)}% of portfolio</p>
        </div>
    )
}

// ─── Main Portfolio Page ──────────────────────────────────────────────────────

export default function PortfolioPage() {
    const [holdings, setHoldings] = useState<Holding[]>([])
    const [quotes, setQuotes] = useState<Record<string, any>>({})
    const [loadingTickers, setLoadingTickers] = useState<Set<string>>(new Set())
    const [showModal, setShowModal] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table')
    const [mounted, setMounted] = useState(false)

    const { fmtRaw, symbol } = useCurrency()
    // Portfolio values are already converted to INR, so use fmtRaw (no double conversion)
    const fmt = fmtRaw

    // Load from localStorage
    useEffect(() => {
        setMounted(true)
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) setHoldings(JSON.parse(saved))
        } catch { /* ignore */ }
    }, [])

    // Save to localStorage on change
    useEffect(() => {
        if (!mounted) return
        localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
    }, [holdings, mounted])

    // Fetch quotes for all unique tickers using backend universal router
    const fetchAllQuotes = useCallback(async (tickers: string[]) => {
        if (!tickers.length) return
        const unique = Array.from(new Set(tickers))
        setLoadingTickers(new Set(unique))

        const results = await Promise.allSettled(
            unique.map(async (t) => {
                try {
                    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 10000)
                    const res = await fetch(`${apiBase}/quote?ticker=${t}`, { signal: controller.signal })
                    clearTimeout(timeoutId)
                    if (!res.ok) throw new Error('Fetch failed')
                    const data = await res.json()
                    return [t, data]
                } catch {
                    return [t, null]
                }
            })
        )
        const newQuotes: Record<string, any> = {}
        results.forEach((r, i) => {
            newQuotes[unique[i]] = r.status === 'fulfilled' ? r.value[1] : null
        })
        setQuotes(prev => ({ ...prev, ...newQuotes }))
        setLoadingTickers(new Set())
    }, [])

    // Fetch quotes when holdings change
    useEffect(() => {
        if (!mounted) return
        const tickers = holdings.map(h => h.ticker)
        fetchAllQuotes(tickers)
    }, [holdings, mounted, fetchAllQuotes])

    const addHolding = (h: Holding) => {
        setHoldings(prev => [...prev, h])
        toast.success(`Added ${h.ticker} to portfolio`)
    }

    const removeHolding = (id: string) => {
        setHoldings(prev => prev.filter(h => h.id !== id))
        toast.success('Holding removed')
    }

    const refresh = async () => {
        setRefreshing(true)
        await fetchAllQuotes(holdings.map(h => h.ticker))
        setRefreshing(false)
        toast.success('Prices refreshed')
    }

    // Compute enriched holdings
    const enriched: HoldingWithQuote[] = holdings.map(h => {
        const q = quotes[h.ticker] as any
        const isLoading = loadingTickers.has(h.ticker)
        
        // Backend returns either 'INR' or 'USD'
        const qCurrency = q?.currency || 'USD'
        const rawPrice = q?.price
        
        // Guard: treat null/0 as unavailable
        // Keep in native currency — avgPrice entered in same currency as the stock
        let currentPrice: number | null = null
        if (rawPrice != null && rawPrice > 0) {
            currentPrice = rawPrice
        }
        
        const changePct = q?.change_pct ?? null
        const marketValue = currentPrice != null ? currentPrice * h.quantity : null
        const totalCost = h.avgPrice * h.quantity
        const pnl = marketValue != null ? marketValue - totalCost : null
        const pnlPct = (totalCost > 0 && pnl != null) ? (pnl / totalCost) * 100 : null
        return {
            ...h,
            currentPrice: currentPrice ?? 0,
            changePct: changePct ?? 0,
            marketValue: marketValue ?? 0,
            pnl: pnl ?? 0,
            pnlPct: pnlPct ?? 0,
            loading: isLoading && q === undefined,
            error: !isLoading && (q === null || q === undefined || currentPrice === null),
            currencySymbol: getTickerCurrency(h.ticker),
        }
    })

    const isAnyLoading = loadingTickers.size > 0;

    // Summary calculations — only include holdings with valid prices
    const validHoldings = enriched.filter(h => !h.error)
    const totalValue = validHoldings.reduce((acc, h) => acc + h.marketValue, 0)
    const totalCost = validHoldings.reduce((acc, h) => acc + h.avgPrice * h.quantity, 0)
    const totalPnl = totalCost > 0 ? totalValue - totalCost : 0
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

    // Pie chart data
    const pieData = enriched
        .filter(h => h.marketValue !== null && h.marketValue > 0)
        .map(h => ({
            name: h.ticker,
            value: h.marketValue!,
            pct: totalValue > 0 ? (h.marketValue! / totalValue) * 100 : 0,
        }))

    if (!mounted) return null

    return (
        <div className=" min-h-screen" style={{ overflowX: 'hidden' }}>
            <AnimatePresence>
                {showModal && <AddHoldingModal onAdd={addHolding} onClose={() => setShowModal(false)} />}
            </AnimatePresence>

            <div className="p-5 w-full max-w-full flex flex-col gap-4" style={{ overflowX: 'hidden' }}>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="flex items-center justify-between pt-1">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5 mb-0.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}>
                                <Briefcase size={15} className="text-white" />
                            </div>
                            Portfolio Tracker
                        </h1>
                        <p className="mono" style={{ color: '#6B7280', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                            REAL-TIME P&amp;L · LIVE PRICES VIA FINNHUB + YFINANCE
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {holdings.length > 0 && (
                            <motion.button whileTap={{ scale: 0.95 }} onClick={refresh} disabled={refreshing}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                                style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setShowModal(true)}
                            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white">
                            <Plus size={15} />Add Holding
                        </motion.button>
                    </div>
                </motion.div>

                {/* Summary Cards */}
                {holdings.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            {
                                label: 'PORTFOLIO VALUE', value: fmt(totalValue),
                                icon: DollarSign, color: '#A4FFB9', glow: 'rgba(0,255,136,0.35)',
                            },
                            {
                                label: 'TOTAL COST', value: fmt(totalCost),
                                icon: BarChart2, color: '#A4FFB9', glow: 'rgba(0,237,126,0.35)',
                            },
                            {
                                label: 'TOTAL P&L', value: fmt(totalPnl),
                                icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
                                color: totalPnl >= 0 ? '#00FF88' : '#FF7169',
                                glow: totalPnl >= 0 ? 'rgba(0,255,136,0.35)' : 'rgba(255,113,105,0.35)',
                            },
                            {
                                label: 'RETURN', value: formatPct(totalPnlPct),
                                icon: Activity,
                                color: totalPnlPct >= 0 ? '#00FF88' : '#FF7169',
                                glow: totalPnlPct >= 0 ? 'rgba(0,255,136,0.35)' : 'rgba(255,113,105,0.35)',
                            },
                        ].map(({ label, value, icon: Icon, color, glow }) => (
                            <div key={label} className="metric-card rounded-2xl p-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${color}18`, boxShadow: `0 0 16px ${glow}` }}>
                                    <Icon size={16} style={{ color }} />
                                </div>
                                <div>
                                    <p className="mono" style={{ color: '#6B7280', fontSize: '0.58rem', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</p>
                                    {isAnyLoading ? (
                                        <div className="shimmer h-6 w-20 rounded mt-0.5" />
                                    ) : (
                                        <p className="text-lg font-black" style={{ color }}>{value}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* Tab Bar */}
                {holdings.length > 0 && (
                    <div className="flex gap-1 panel-card rounded-xl p-1 w-fit">
                        {(['table', 'chart'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                    background: activeTab === tab ? 'linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,237,126,0.15))' : 'transparent',
                                    color: activeTab === tab ? '#A4FFB9' : '#6B7280',
                                    border: activeTab === tab ? '1px solid rgba(0,255,136,0.3)' : '1px solid transparent',
                                }}>
                                {tab === 'table' ? '📋 Holdings Table' : '🥧 Allocation Chart'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Holdings Table */}
                <AnimatePresence mode="wait">
                    {holdings.length === 0 ? (
                        <motion.div key="empty"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="panel-card rounded-2xl p-12 flex flex-col items-center text-center"
                            style={{ border: '1px dashed rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.02)' }}>
                            <motion.div
                                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                                style={{
                                    background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.1))',
                                    border: '1px solid rgba(245,158,11,0.25)',
                                    boxShadow: '0 0 40px rgba(245,158,11,0.12)',
                                }}>
                                <Briefcase size={28} style={{ color: '#F59E0B' }} />
                            </motion.div>
                            <h2 className="text-xl font-bold text-white mb-2">Your Portfolio is Empty</h2>
                            <p className="text-sm mb-6 max-w-sm" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
                                Add your stock holdings to track real-time P&L, market value, and portfolio allocation.
                            </p>
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setShowModal(true)}
                                className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white">
                                <Plus size={15} />Add Your First Holding
                            </motion.button>
                        </motion.div>
                    ) : activeTab === 'table' ? (
                        <motion.div key="table"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="panel-card rounded-2xl overflow-hidden">
                            {/* Table header */}
                            <div className="px-4 py-3 grid grid-cols-12 gap-2"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.5)' }}>
                                {['TICKER', 'QTY', `AVG (${symbol})`, `PRICE (${symbol})`, `MKT VALUE`, `P&L (${symbol})`, 'P&L (%)', 'DAY %', ''].map((h, i) => (
                                    <span key={i} className={`mono col-span-${i === 8 ? 1 : i === 0 ? 2 : 1} text-right ${i === 0 ? 'text-left' : ''}`}
                                        style={{ color: '#4B5563', fontSize: '0.55rem', letterSpacing: '0.12em', fontWeight: 700 }}>
                                        {h}
                                    </span>
                                ))}
                            </div>

                            {/* Table rows */}
                            <div className="divide-y divide-white/5">
                                {enriched.map((h, i) => (
                                    <motion.div key={h.id}
                                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.045 }}
                                        className="px-4 py-3 grid grid-cols-12 gap-2 items-center group transition-all hover:bg-white/[0.02]">

                                        {/* Ticker */}
                                        <div className="col-span-2 flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: h.loading ? 'rgba(255,255,255,0.05)' : h.pnl >= 0 ? 'rgba(0,255,136,0.12)' : 'rgba(255,113,105,0.12)',
                                                    border: `1px solid ${h.loading ? 'rgba(255,255,255,0.1)' : h.pnl >= 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,113,105,0.2)'}`,
                                                }}>
                                                {h.loading ? <Activity size={12} style={{ color: '#9CA3AF' }} /> :
                                                 h.pnl >= 0
                                                    ? <TrendingUp size={12} style={{ color: '#00FF88' }} />
                                                    : <TrendingDown size={12} style={{ color: '#FF7169' }} />
                                                }
                                            </div>
                                            <span className="mono font-bold text-white" style={{ fontSize: '0.78rem', letterSpacing: '0.05em' }}>{h.ticker}</span>
                                        </div>

                                        {/* Quantity */}
                                        <span className="col-span-1 mono text-right" style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                                            {h.quantity.toLocaleString()}
                                        </span>

                                        {/* Avg Price */}
                                        <span className="col-span-1 mono text-right" style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                                            {fmtNative(h.avgPrice, h.currencySymbol)}
                                        </span>

                                        {/* Current Price */}
                                        <span className="col-span-1 mono font-semibold text-right" style={{ color: '#E2E8F0', fontSize: '0.75rem' }}>
                                            {h.loading ? <span className="shimmer inline-block w-14 h-3 rounded" /> :
                                                h.error ? <span style={{ color: '#6B7280' }}>Data unavailable</span> :
                                                    fmtNative(h.currentPrice, h.currencySymbol)}
                                        </span>

                                        {/* Market Value */}
                                        <span className="col-span-2 mono font-semibold text-right" style={{ color: '#E2E8F0', fontSize: '0.75rem' }}>
                                            {h.loading ? <span className="shimmer inline-block w-16 h-3 rounded" /> :
                                                h.error ? <span style={{ color: '#6B7280' }}>Data unavailable</span> :
                                                fmtNative(h.marketValue, h.currencySymbol)}
                                        </span>

                                        {/* P&L */}
                                        <span className="col-span-2 mono font-bold text-right" style={{
                                            color: h.loading ? '#6B7280' : h.pnl >= 0 ? '#00FF88' : '#FF7169',
                                            fontSize: '0.75rem',
                                        }}>
                                            {h.loading ? <span className="shimmer inline-block w-14 h-3 rounded" /> :
                                                h.error ? <span style={{ color: '#6B7280' }}>—</span> :
                                                `${h.pnl >= 0 ? '+' : '-'}${fmtNative(h.pnl, h.currencySymbol)}`}
                                        </span>

                                        {/* P&L % */}
                                        <span className="col-span-1 mono font-bold text-right" style={{
                                            color: h.loading ? '#6B7280' : h.pnlPct >= 0 ? '#00FF88' : '#FF7169',
                                            fontSize: '0.75rem',
                                        }}>
                                            {h.loading ? <span className="shimmer inline-block w-10 h-3 rounded" /> :
                                                h.error ? <span style={{ color: '#6B7280' }}>—</span> :
                                                formatPct(h.pnlPct)}
                                        </span>

                                        {/* Day % */}
                                        <span className="col-span-1 mono text-right" style={{
                                            color: h.loading ? '#6B7280' : h.changePct >= 0 ? '#00FF88' : '#FF7169',
                                            fontSize: '0.72rem',
                                        }}>
                                            {h.loading ? <span className="shimmer inline-block w-10 h-3 rounded" /> :
                                                h.error ? <span style={{ color: '#6B7280' }}>—</span> :
                                                formatPct(h.changePct)}
                                        </span>

                                        {/* Remove */}
                                        <div className="col-span-1 flex justify-end">
                                            <motion.button whileTap={{ scale: 0.9 }}
                                                onClick={() => removeHolding(h.id)}
                                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                style={{ background: 'rgba(255,113,105,0.1)', color: '#FF7169' }}>
                                                <Trash2 size={12} />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Table footer: totals */}
                            <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
                                <span className="col-span-2 mono font-bold text-white" style={{ fontSize: '0.72rem' }}>TOTAL</span>
                                <span className="col-span-3" />
                                <span className="col-span-2 mono font-bold text-right text-white" style={{ fontSize: '0.75rem' }}>
                                    {isAnyLoading ? <span className="shimmer inline-block w-16 h-3 rounded" /> : fmt(totalValue)}
                                </span>
                                <span className="col-span-2 mono font-bold text-right" style={{
                                    color: totalPnl >= 0 ? '#00FF88' : '#FF7169', fontSize: '0.75rem',
                                }}>
                                    {isAnyLoading ? <span className="shimmer inline-block w-14 h-3 rounded" /> : `${totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}`}
                                </span>
                                <span className="col-span-1 mono font-bold text-right" style={{
                                    color: totalPnlPct >= 0 ? '#00FF88' : '#FF7169', fontSize: '0.75rem',
                                }}>
                                    {isAnyLoading ? <span className="shimmer inline-block w-10 h-3 rounded" /> : formatPct(totalPnlPct)}
                                </span>
                                <span className="col-span-2" />
                            </div>
                        </motion.div>
                    ) : (
                        /* Pie Chart View */
                        <motion.div key="chart"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                            {/* Pie */}
                            <div className="panel-card rounded-2xl p-5">
                                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                    <PieIcon size={14} style={{ color: '#A4FFB9' }} />Portfolio Allocation
                                </h2>
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%" cy="50%"
                                                innerRadius={80} outerRadius={130}
                                                paddingAngle={3}
                                                dataKey="value"
                                                animationBegin={0} animationDuration={900}>
                                                {pieData.map((_, idx) => (
                                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]}
                                                        stroke="transparent" />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip fmt={fmt} />} />
                                            <Legend
                                                formatter={(value) => (
                                                    <span style={{ color: '#CBD5E1', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                                        {value}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-64 flex items-center justify-center" style={{ color: '#4B5563' }}>
                                        <p className="text-sm">No price data available yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Allocation breakdown */}
                            <div className="panel-card rounded-2xl p-5">
                                <h2 className="text-sm font-bold text-white mb-4">Allocation Breakdown</h2>
                                <div className="space-y-3">
                                    {enriched
                                        .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
                                        .map((h, i) => {
                                            const pct = totalValue > 0 && h.marketValue ? (h.marketValue / totalValue) * 100 : 0
                                            return (
                                                <div key={h.id}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                            <span className="mono font-bold text-white" style={{ fontSize: '0.78rem' }}>{h.ticker}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="mono text-xs" style={{ color: '#9CA3AF' }}>
                                                                {fmt(h.marketValue)} · {pct.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                                                            className="h-full rounded-full"
                                                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
