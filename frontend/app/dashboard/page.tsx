'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Zap, Activity, BarChart2, TrendingUp, TrendingDown,
  DollarSign, Globe, BarChart, Target, Cpu, ChevronRight,
  FileText, Wifi, Clock, Play, Database, GitCompare
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

import {
  fetchForecast, fetchPriceHistory, fetchNews, fetchTradingSignal,
  ForecastResponse, OHLCVCandle, TradingSignalResponse
} from '@/lib/api'
import { useCurrency } from '@/lib/currency'


import AIAnalysisPanel from '@/components/AIAnalysisPanel'
import TradingChart from '@/components/TradingChart'
import MetricCard from '@/components/MetricCard'
import NewsPanel from '@/components/NewsPanel'
import AIChatPanel from '@/components/AIChatPanel'
import SignalCard from '@/components/SignalCard'
import ReportGenerator from '@/components/ReportGenerator'
import CompareStocks from '@/components/CompareStocks'

// ─── Client-side ticker normalization (mirrors backend stock_router) ─────────
const KNOWN_INDIAN_TICKERS = new Set([
  'RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','ITC',
  'KOTAKBANK','LT','HINDUNILVR','MARUTI','AXISBANK','BAJFINANCE','WIPRO',
  'HCLTECH','ADANIENT','TATAMOTORS','SUNPHARMA','TITAN','TATASTEEL',
  'POWERGRID','NTPC','ONGC','ULTRACEMCO','TECHM','JSWSTEEL','NESTLEIND',
  'BAJAJFINSV','INDUSINDBK','COALINDIA','GRASIM','ADANIPORTS','BRITANNIA',
  'CIPLA','DRREDDY','EICHERMOT','HEROMOTOCO','HINDALCO','BPCL','DIVISLAB',
  'APOLLOHOSP','ASIANPAINT','SPICEJET','IDFCFIRSTB','YESBANK','BANKBARODA',
  'PNB','VEDL','TATAPOWER','ZOMATO','PAYTM','NYKAA','IRCTC','HAL','BEL',
  'NHPC','IOC','SAIL','GAIL','HDFCLIFE','SBILIFE','ICICIPRULI','BAJAJ-AUTO',
  'M&M','MUTHOOTFIN','DLF','GODREJCP','PIDILITIND','HAVELLS','DABUR',
  'COLPAL','BIOCON','LUPIN','TORNTPHARM','AUROPHARMA','LICHSGFIN',
])

function normalizeClientTicker(raw: string): string {
  const t = raw.trim().toUpperCase()
  if (t.endsWith('.NS') || t.endsWith('.BO')) return t
  if (KNOWN_INDIAN_TICKERS.has(t)) return t + '.NS'
  return t
}

function getCurrencySymbol(ticker: string): string {
  const t = ticker.toUpperCase()
  if (t.endsWith('.NS') || t.endsWith('.BO')) return '₹'
  return '$'
}


// ─── Constants ────────────────────────────────────────────────────────────────
const QUICK_TICKERS = ['AAPL', 'RELIANCE.NS', 'NVDA', 'TCS.NS', 'AMZN', 'SBIN.NS', 'META', 'TSLA']

const LIVE_TICKERS = [
  { sym: 'AAPL', price: '212.49', chg: '+1.23%', up: true, currency: '$' },
  { sym: 'RELIANCE.NS', price: '2,945', chg: '+0.87%', up: true, currency: '₹' },
  { sym: 'NVDA', price: '118.42', chg: '-0.43%', up: false, currency: '$' },
  { sym: 'TCS.NS', price: '3,845', chg: '+2.14%', up: true, currency: '₹' },
  { sym: 'GOOG', price: '170.53', chg: '+0.55%', up: true, currency: '$' },
  { sym: 'SBIN.NS', price: '864', chg: '-0.22%', up: false, currency: '₹' },
  { sym: 'META', price: '518.12', chg: '+1.66%', up: true, currency: '$' },
  { sym: 'TSLA', price: '286.01', chg: '+3.12%', up: true, currency: '$' },
  { sym: 'SPY', price: '518.34', chg: '+0.18%', up: true, currency: '$' },
  { sym: 'INFY.NS', price: '1,560', chg: '-0.09%', up: false, currency: '₹' },
  { sym: 'AMZN', price: '186.21', chg: '+1.45%', up: true, currency: '$' },
  { sym: 'MSFT', price: '410.32', chg: '+0.54%', up: true, currency: '$' },
]

const MARKET_BOARD = [
  { sym: 'AAPL', price: '212.49', chg: '+1.23%', cap: '$3.26T', up: true, currency: '$' },
  { sym: 'RELIANCE.NS', price: '2,945', chg: '+0.87%', cap: '₹19.2L Cr', up: true, currency: '₹' },
  { sym: 'NVDA', price: '118.42', chg: '-0.43%', cap: '$2.92T', up: false, currency: '$' },
  { sym: 'TCS.NS', price: '3,845', chg: '+2.14%', cap: '₹14.1L Cr', up: true, currency: '₹' },
  { sym: 'MSFT', price: '410.32', chg: '+0.92%', cap: '$3.05T', up: true, currency: '$' },
  { sym: 'SBIN.NS', price: '864', chg: '-0.22%', cap: '₹7.8L Cr', up: false, currency: '₹' },
  { sym: 'AMZN', price: '186.21', chg: '+1.45%', cap: '$1.93T', up: true, currency: '$' },
  { sym: 'INFY.NS', price: '1,560', chg: '-0.09%', cap: '₹6.5L Cr', up: false, currency: '₹' },
]

const AI_STEPS = [
  { label: 'Connecting to data feeds…', icon: Wifi },
  { label: 'Fetching live market data…', icon: Activity },
  { label: 'Analyzing market trend...', icon: TrendingUp },
  { label: 'Calculating risk levels...', icon: Target },
  { label: 'Generating AI trade setup...', icon: Zap },
]

// ─── DEMO MODE DATA ───────────────────────────────────────────────────────────
const DEMO_FORECAST: ForecastResponse = {
  ticker: 'AAPL',
  summary: 'Apple shows strong momentum driven by robust iPhone sales and growing services revenue. The company continues to dominate the premium smartphone market while expanding its ecosystem.',
  positives: [
    'Strong iPhone 16 sales exceeding market expectations',
    'Services revenue growing at 15% year-over-year',
    'Share buyback program worth $110 billion announced',
    'AI features boosting upgrade cycle momentum'
  ],
  risks: [
    'Regulatory pressure in EU affecting App Store revenue',
    'Supply chain concerns with key manufacturing partners',
    'Smartphone market saturation in developed economies'
  ],
  prediction: 'UP',
  estimated_movement: '3-5%',
  confidence: 78,
  current_price: 212.49,
  market_cap: 3260000,
  pe_ratio: 33.2,
  trend: 'Uptrend',
  sentiment: 'Positive',
  financial_health: 'Strong',
  suggestion: 'BUY',
  why_trend: 'Apple stock has been in a consistent uptrend over the last month, gaining 8.5% with strong buying volume.',
  why_sentiment: 'Recent news about iPhone 16 sales and AI features has been overwhelmingly positive, boosting investor confidence.',
  why_financial: "Apple's balance sheet remains exceptionally strong with $160B in cash reserves and consistent revenue growth.",
  currency: 'USD',
  data_source: 'finnhub',
}

const DEMO_CANDLES: OHLCVCandle[] = (() => {
  const candles: OHLCVCandle[] = []
  let price = 185
  const now = new Date()
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const change = (Math.random() - 0.45) * 4
    const open = price
    price = Math.max(150, price + change)
    const close = price
    const high = Math.max(open, close) + Math.random() * 2
    const low = Math.min(open, close) - Math.random() * 2
    candles.push({
      date: d.toISOString().split('T')[0],
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(close.toFixed(2)),
      v: Math.floor(40000000 + Math.random() * 60000000),
    })
  }
  return candles
})()

const DEMO_TRADING_SIGNAL: TradingSignalResponse = {
  entry: 212.49,
  target_min: 214.61,
  target_max: 218.86,
  stop_loss: 208.24,
  trend: 'Bullish',
  confidence: 72,
  reason: [
    'Price above moving average',
    'Positive trend momentum',
    'Stable volatility'
  ]
}



// ─── Live Ticker Bar ──────────────────────────────────────────────────────────
function LiveTickerBar() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const doubled = [...LIVE_TICKERS, ...LIVE_TICKERS]

  return (
    <div className="ticker-bar h-9 flex items-center overflow-hidden relative" style={{ zIndex: 30 }}>
      {/* Market status */}
      <div className="flex items-center gap-2 px-4 shrink-0 h-full"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(11,14,17,0.96)' }}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
        </span>
        <span className="mono text-xs font-semibold" style={{ color: '#10B981', letterSpacing: '0.08em', fontSize: '0.6rem' }}>MARKET OPEN</span>
      </div>

      {/* Scrolling tickers */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          className="flex items-center gap-6 whitespace-nowrap"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity }}>
          {doubled.map((t, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
               <span className="mono font-bold text-white" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>{t.sym}</span>
              <span className="mono" style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{t.currency}{t.price}</span>
              <span className={`mono font-semibold flex items-center gap-0.5`}
                style={{ fontSize: '0.62rem', color: t.up ? '#10B981' : '#EF4444' }}>
                {t.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                {t.chg}
              </span>
              <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Clock */}
      <div className="flex items-center gap-1.5 px-4 shrink-0 h-full"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'rgba(11,14,17,0.96)' }}>
        <Clock size={11} style={{ color: '#6B7280' }} />
        <span className="mono" style={{ fontSize: '0.62rem', color: '#6B7280', letterSpacing: '0.06em' }}>{time} UTC+5:30</span>
      </div>
    </div>
  )
}

// ─── AI Thinking Overlay ──────────────────────────────────────────────────────
function AIThinkingOverlay({ ticker }: { ticker: string }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepDuration = 2200
    const stepId = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, AI_STEPS.length - 1))
    }, stepDuration)

    const progId = setInterval(() => {
      setProgress(p => Math.min(p + 1, 92))
    }, 140)

    return () => { clearInterval(stepId); clearInterval(progId) }
  }, [])

  const StepIcon = AI_STEPS[stepIdx].icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}>

      {/* Particle ring */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: i % 2 === 0 ? '#00ED7E' : '#00FF88',
              top: '50%', left: '50%',
              boxShadow: `0 0 8px ${i % 2 === 0 ? '#00ED7E' : '#00FF88'}`,
            }}
            animate={{
              x: Math.cos((i / 8) * Math.PI * 2) * (120 + i * 8),
              y: Math.sin((i / 8) * Math.PI * 2) * (120 + i * 8),
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{ duration: 2.5, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 relative">
        {/* Orb */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.3), transparent)', filter: 'blur(20px)', width: 120, height: 120, top: -10, left: -10 }} />
          <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #1D4ED8, #00ED7E, #00FF88)',
              boxShadow: '0 0 60px rgba(0,255,136,0.6), 0 0 120px rgba(0,255,136,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
              <StepIcon size={36} className="text-white" />
            </motion.div>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"
            style={{ transform: 'scale(1.4)', animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-xl font-bold text-white mb-2 tracking-tight">
            Analyzing <span className="gradient-text">{ticker}</span>
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 justify-center">
              <span className="text-sm" style={{ color: '#9CA3AF' }}>{AI_STEPS[stepIdx].label}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Steps progress */}
        <div className="flex gap-2">
          {AI_STEPS.map((s, i) => (
            <motion.div key={i}
              className="h-1 rounded-full"
              style={{ background: i <= stepIdx ? (i % 2 === 0 ? '#00ED7E' : '#00FF88') : 'rgba(255,255,255,0.08)' }}
              animate={{ width: i === stepIdx ? 32 : 8 }}
              transition={{ duration: 0.4 }} />
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-72">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
            <span className="mono" style={{ fontSize: '0.62rem' }}>PROCESSING</span>
            <span className="mono" style={{ fontSize: '0.62rem' }}>{progress}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00ED7E, #00FF88, #06B6D4)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Stagger container variant ────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
} as const
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
} as const

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTicker, setActiveTicker] = useState('')
  const [forecastTime, setForecastTime] = useState<Date | null>(null)
  const [updateKey, setUpdateKey] = useState(0)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [candles, setCandles] = useState<OHLCVCandle[]>([])
  const [newsData, setNewsData] = useState<any>(null)
  const [tradingSignal, setTradingSignal] = useState<TradingSignalResponse | null>(null)

  const { fmt, symbol } = useCurrency()

  const searchRef = useRef<HTMLInputElement>(null)

  // Demo mode handler
  const activateDemo = useCallback(() => {
    setDemoMode(true)
    setActiveTicker('AAPL')
    setTicker('AAPL')
    setForecast(DEMO_FORECAST)
    setCandles(DEMO_CANDLES)
    setTradingSignal(DEMO_TRADING_SIGNAL)
    setForecastTime(new Date())
    setUpdateKey(k => k + 1)
    setLivePrice(212.49)
    toast.success('Demo mode activated — showing AAPL sample data')
  }, [])

  const runForecast = useCallback(async (t?: string) => {
    const rawSym = (t ?? ticker).trim().toUpperCase()
    if (!rawSym) { toast.error('Please enter a ticker symbol.'); return }
    const sym = normalizeClientTicker(rawSym)

    setDemoMode(false)
    setLoading(true)
    setActiveTicker(sym)
    setLivePrice(null)
    setForecast(null)
    setCandles([])
    setNewsData(null)
    setTradingSignal(null)

    try {
      const [fr, pr, nr, tr] = await Promise.allSettled([
        fetchForecast(sym),
        fetchPriceHistory(sym),
        fetchNews(sym),
        fetchTradingSignal(sym),
      ])
      if (fr.status === 'fulfilled') { setForecast(fr.value); setForecastTime(new Date()); setUpdateKey(k => k + 1) }
      else {
        const detail = (fr.reason as any)?.response?.data?.detail
        let msg = 'Forecast failed — please try again'
        if (typeof detail === 'string') msg = detail
        else if (Array.isArray(detail)) msg = detail[0]?.msg || 'Validation error'
        else if (detail && typeof detail === 'object') msg = detail.msg || 'Forecast failed'
        toast.error(msg)
      }
      if (pr.status === 'fulfilled') {
        const data = pr.value
        setCandles(Array.isArray(data) ? data : [])
      }
      if (nr.status === 'fulfilled') setNewsData(nr.value)
      if (tr.status === 'fulfilled') setTradingSignal(tr.value)
      if (fr.status === 'fulfilled') toast.success(`Analysis complete for ${sym}`)
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  // Called by chart when user clicks a time range tab (1W/1M/3M/1Y)
  const handleChartRangeChange = useCallback(async (days: number) => {
    if (!activeTicker || demoMode) return
    try {
      const ph = await fetchPriceHistory(activeTicker, days)
      setCandles(Array.isArray(ph) ? ph : [])
    } catch {
      toast.error('Failed to fetch price history')
    }
  }, [activeTicker, demoMode])

  // WebSocket for live price
  useEffect(() => {
    if (!activeTicker || demoMode) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    const port = '8000'
    const wsUrl = `${protocol}//${hostname}:${port}/ws/price/${activeTicker}`

    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
         const data = JSON.parse(event.data)
         if (data.price !== undefined && data.price !== null) {
            setLivePrice(data.price)
         }
      } catch (e) {}
    }

    return () => { ws.close() }
  }, [activeTicker, demoMode])

  // Auto-detect currency for the active ticker
  const activeCurrencySymbol = activeTicker ? getCurrencySymbol(activeTicker) : '$'

  return (
    <div className="animated-gradient-bg min-h-screen flex flex-col relative" style={{ overflowX: 'hidden' }}>
      {/* Dynamic Background Energy */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-gradient-to-b from-blue-900/30 via-purple-900/10 to-transparent blur-3xl opacity-40 animate-pulse rounded-full" style={{ transform: 'translate(20%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-gradient-to-t from-purple-900/20 via-blue-900/10 to-transparent blur-3xl opacity-30 rounded-full" style={{ transform: 'translate(-20%, 20%)' }} />
      </div>
      <AnimatePresence>{loading && <AIThinkingOverlay ticker={activeTicker || ticker} />}</AnimatePresence>

      {/* Live ticker bar (sticky top) */}
      <div className="sticky top-0 z-30"><LiveTickerBar /></div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 py-6 flex flex-col space-y-6">

        {/* ── Page header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5 mb-0.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#00ED7E,#00FF88)', boxShadow: '0 0 16px rgba(0,255,136,0.4)' }}>
                <BarChart2 size={15} className="text-white" />
              </div>
              Research Dashboard
            </h1>
            <p className="text-sm mono" style={{ color: '#6B7280', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              AI STOCK ANALYSIS · NVIDIA NIM · LLAMA 3 70B
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Demo Mode Button */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={activateDemo}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: demoMode ? 'linear-gradient(135deg,#059669,#10B981)' : 'rgba(16,185,129,0.1)',
                color: demoMode ? '#fff' : '#10B981',
                border: `1px solid ${demoMode ? '#10B981' : 'rgba(16,185,129,0.3)'}`,
                boxShadow: demoMode ? '0 0 20px rgba(16,185,129,0.4)' : 'none',
              }}
            >
              <Play size={12} />
              {demoMode ? 'DEMO ACTIVE' : 'Demo Mode'}
            </motion.button>

            {forecast && (
              <div className="text-right">
                <p className="text-xs mono" style={{ color: '#4B5563', letterSpacing: '0.06em' }}>LAST ANALYSIS</p>
                <p className="text-sm font-semibold text-white mono">
                  {forecastTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Stats Strip ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Activity, label: 'Market Status', value: 'Open', color: '#10B981', glow: 'rgba(16,185,129,0.3)' },
            { icon: Globe, label: 'Coverage', value: '5,000+ Tickers', color: '#A4FFB9', glow: 'rgba(0,255,136,0.3)' },
            { icon: Cpu, label: 'AI Model', value: 'Llama 3 70B', color: '#A4FFB9', glow: 'rgba(0,237,126,0.3)' },
            {
              icon: BarChart2,
              label: 'AI Confidence',
              value: forecast ? `${forecast.confidence}%` : '—',
              color: forecast ? (forecast.confidence >= 70 ? '#00FF88' : forecast.confidence >= 40 ? '#F59E0B' : '#FF7169') : '#F59E0B',
              glow: 'rgba(245,158,11,0.3)',
            },
          ].map(({ icon: Icon, label, value, color, glow }) => (
            <div key={label} className="terminal-header rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, boxShadow: `0 0 16px ${glow}` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="mono" style={{ color: '#6B7280', fontSize: '0.6rem', letterSpacing: '0.1em', fontWeight: 600 }}>{label.toUpperCase()}</p>
                <p className="text-sm font-bold text-white">{value}</p>
              </div>
              {label === 'Market Status' && (
                <div className="ml-auto">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                  </span>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* ── Search bar ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
          className="panel-card rounded-2xl p-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#4B5563' }} />
              <input
                ref={searchRef}
                className="fin-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium"
                placeholder="Search ticker (AAPL, MSFT, RELIANCE, TCS…)"
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && runForecast()}
                disabled={loading}
                autoFocus
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}
              onClick={() => runForecast()}
              disabled={loading}
              className="btn-primary flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed">
              <Zap size={15} />
              Run Forecast
            </motion.button>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap items-center">
            <span className="mono text-xs" style={{ color: '#6B7280', letterSpacing: '0.06em', fontSize: '0.6rem' }}>QUICK:</span>
            {QUICK_TICKERS.map(t => (
              <motion.button
                key={t} whileTap={{ scale: 0.95 }}
                onClick={() => { setTicker(t); runForecast(t) }}
                disabled={loading}
                className={`mono text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40 ${activeTicker === t ? 'ticker-btn-active' : ''}`}
                style={{
                  fontSize: '0.65rem', letterSpacing: '0.06em',
                  background: activeTicker === t ? 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,237,126,0.15))' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activeTicker === t ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: activeTicker === t ? '#A4FFB9' : '#6B7280',
                }}>
                {t}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Demo Mode Badge ── */}
        <AnimatePresence>
          {demoMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <Play size={12} style={{ color: '#10B981' }} />
              <span className="mono text-xs font-bold" style={{ color: '#10B981', letterSpacing: '0.06em' }}>
                DEMO MODE — Showing sample data for AAPL. Search any ticker to exit demo.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RESULTS ── */}
        <AnimatePresence>
          {(activeTicker || loading) && (
            <motion.div key="results" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}
              className="flex flex-col gap-4">

              {/* ROW 1: Metric cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <MetricCard
                  label={
                    <div className="flex items-center gap-1.5 flex-nowrap shrink-0 overflow-visible whitespace-nowrap">
                      CURRENT PRICE
                      {livePrice !== null && (
                        <div className="flex items-center gap-1 px-1 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[0.45rem] font-bold text-emerald-500">LIVE</span>
                        </div>
                      )}
                    </div>
                  }
                  large accent
                  value={livePrice !== null ? `${activeCurrencySymbol}${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : forecast?.current_price != null ? `${activeCurrencySymbol}${forecast.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null}
                  loading={loading && !forecast}
                  icon={<span style={{ fontSize: '0.9rem' }}>{activeCurrencySymbol}</span>}
                  subValue={activeTicker}
                  updated={livePrice !== null ? true : updateKey > 0} updateKey={livePrice !== null ? livePrice : updateKey}
                  glowColor="rgba(0,255,136,0.5)"
                />
                <MetricCard
                  label="MARKET CAP"
                  value={forecast?.market_cap != null
                    ? fmt(forecast.market_cap * 1_000_000, { compact: true })
                    : null}
                  loading={loading && !forecast}
                  icon={<Globe size={13} />}
                  updated={updateKey > 0} updateKey={updateKey}
                  glowColor="rgba(16,185,129,0.4)"
                />
                <MetricCard
                  label="P/E RATIO"
                  value={forecast?.pe_ratio ? `${forecast.pe_ratio.toFixed(1)}x` : null}
                  loading={loading && !forecast}
                  icon={<BarChart size={13} />}
                  updated={updateKey > 0} updateKey={updateKey}
                  glowColor="rgba(245,158,11,0.4)"
                />
                <MetricCard
                  label="AI CONFIDENCE"
                  value={null} isConfidence confidence={forecast?.confidence ?? null}
                  loading={loading && !forecast}
                  updated={updateKey > 0} updateKey={updateKey}
                  glowColor="rgba(167,139,250,0.45)"
                />
                <MetricCard
                  label="PREDICTION"
                  value={null}
                  prediction={forecast?.prediction ?? null}
                  subValue={forecast?.estimated_movement}
                  loading={loading && !forecast}
                  icon={<Target size={13} />}
                  updated={updateKey > 0} updateKey={updateKey}
                  glowColor={forecast?.prediction === 'UP' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}
                />
              </motion.div>

              {/* ROW 2: AI Analysis (7/12) + Candlestick Chart (5/12) */}
              <motion.div variants={itemVariants} className="grid grid-cols-12 gap-6">
                {/* AI Panel — 7 cols */}
                <div className="col-span-12 lg:col-span-7">
                  <AIAnalysisPanel
                    result={forecast}
                    ticker={activeTicker}
                    loading={loading}
                    onRefresh={() => runForecast(activeTicker)}
                    forecastTime={forecastTime}
                  />
                </div>

                {/* Chart — 5 cols */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-4" style={{ minHeight: 480 }}>
                  <div className="panel-card rounded-2xl p-4 flex flex-col flex-1 relative">
                    <TradingChart
                      candles={candles}
                      ticker={activeTicker}
                      prediction={forecast?.prediction ?? null}
                      tradingSignal={tradingSignal}
                      loading={loading && candles.length === 0}
                      onRangeChange={handleChartRangeChange}
                    />
                  </div>

                  {/* AI Signal Component underneath chart */}
                  {!loading && candles.length > 0 && <SignalCard ticker={activeTicker} tradingSignal={tradingSignal} />}
                </div>
              </motion.div>

              {/* ROW 3: Report Generator + Compare Stocks */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReportGenerator result={forecast} ticker={activeTicker} />
                <CompareStocks />
              </motion.div>

              {/* ROW 4: News Panel */}
              {newsData && (
                <motion.div variants={itemVariants}>
                  <NewsPanel
                    articles={newsData?.articles ?? newsData ?? []}
                    ticker={activeTicker}
                    loading={loading}
                    onRefresh={() => runForecast(activeTicker)}
                  />
                </motion.div>
              )}

              {/* Data source footer */}
              {forecast && (
                <motion.div variants={itemVariants}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-center gap-3">
                    <Database size={12} style={{ color: '#4B5563' }} />
                    <span className="mono text-xs" style={{ color: '#4B5563', letterSpacing: '0.06em' }}>
                      Data: {(forecast.data_source || 'finnhub + yfinance').toUpperCase()} · Currency: {forecast.currency || (activeCurrencySymbol === '₹' ? 'INR' : 'USD')}
                    </span>
                  </div>
                  <span className="mono text-xs" style={{ color: '#4B5563', letterSpacing: '0.06em' }}>
                    Last updated: {forecastTime?.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {!activeTicker && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col gap-4">

            {/* Hero row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              {/* Left: CTA panel */}
              <div className="lg:col-span-5 panel-card rounded-2xl p-6 flex flex-col justify-between"
                style={{ border: '1px solid rgba(0,255,136,0.2)', background: 'linear-gradient(135deg, rgba(11,14,17,0.97), rgba(11,14,17,0.99))' }}>
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="orb-float w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,255,136,0.25), rgba(0,237,126,0.2))',
                        border: '1px solid rgba(0,255,136,0.3)',
                        boxShadow: '0 0 48px rgba(0,255,136,0.2)',
                      }}>
                      <Cpu size={26} style={{ color: '#A4FFB9' }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white leading-tight">Start AI Research</h2>
                      <p className="mono" style={{ color: '#6B7280', fontSize: '0.65rem', letterSpacing: '0.06em' }}>NVIDIA NIM · LLAMA 3 70B</p>
                    </div>
                  </div>
                  <p className="text-sm mb-4" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
                    Enter any ticker for AI-powered analysis — charts, predictions, news sentiment, and smart reports.
                  </p>

                  {/* Demo Mode prominent CTA */}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={activateDemo}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold text-white mb-4"
                    style={{
                      background: 'linear-gradient(135deg, #059669, #10B981)',
                      boxShadow: '0 0 24px rgba(16,185,129,0.3)',
                    }}
                  >
                    <Play size={16} />
                    Try Demo Mode (AAPL)
                  </motion.button>

                  {/* Quick launch buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_TICKERS.map(t => (
                      <motion.button key={t} whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setTicker(t); runForecast(t) }}
                        className="btn-primary flex items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-bold text-white">
                        {t}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Featured metrics */}
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="mono mb-3" style={{ color: '#6B7280', fontSize: '0.6rem', letterSpacing: '0.1em' }}>PLATFORM STATS</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Tickers', value: '5,000+', color: '#A4FFB9' },
                      { label: 'AI Model', value: '70B', color: '#A4FFB9' },
                      { label: 'Uptime', value: '99.9%', color: '#10B981' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-lg font-black" style={{ color }}>{value}</p>
                        <p className="mono" style={{ color: '#6B7280', fontSize: '0.58rem', letterSpacing: '0.08em' }}>{label.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Live market board */}
              <div className="lg:col-span-7 panel-card rounded-2xl overflow-hidden">
                {/* Board header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(11,14,17,0.6)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#00ED7E,#00FF88)', boxShadow: '0 0 12px rgba(0,255,136,0.4)' }}>
                      <Activity size={13} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">Live Market Overview</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                    </span>
                  </div>
                  <span className="mono" style={{ color: '#6B7280', fontSize: '0.6rem', letterSpacing: '0.08em' }}>MARKET OPEN · NYSE/NSE</span>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['SYMBOL', 'PRICE', 'CHANGE', 'MKT CAP'].map((h, i) => (
                    <span key={h} className={`mono col-span-3 ${i > 0 ? 'text-right' : ''}`}
                      style={{ color: '#4B5563', fontSize: '0.55rem', letterSpacing: '0.12em', fontWeight: 700 }}>{h}</span>
                  ))}
                </div>

                {/* Board rows */}
                <div className="divide-y divide-white/5">
                  {MARKET_BOARD.map((row, i) => (
                    <motion.button
                      key={row.sym}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { setTicker(row.sym); runForecast(row.sym) }}
                      className="w-full grid grid-cols-12 px-4 py-2.5 transition-all group text-left"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,136,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="col-span-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: row.up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${row.up ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                          {row.up ? <TrendingUp size={10} style={{ color: '#10B981' }} /> : <TrendingDown size={10} style={{ color: '#EF4444' }} />}
                        </div>
                        <span className="mono font-bold text-white group-hover:text-emerald-300 transition-colors" style={{ fontSize: '0.75rem', letterSpacing: '0.06em' }}>{row.sym}</span>
                      </div>
                      <span className="col-span-3 mono font-semibold text-right" style={{ color: '#E2E8F0', fontSize: '0.75rem' }}>{row.currency}{row.price}</span>
                      <span className="col-span-3 mono font-bold text-right" style={{ color: row.up ? '#10B981' : '#EF4444', fontSize: '0.75rem' }}>{row.chg}</span>
                      <span className="col-span-3 mono text-right" style={{ color: '#6B7280', fontSize: '0.72rem' }}>{row.cap}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom row: Reports + Compare Stocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Annual report CTA */}
              <div className="panel-card rounded-2xl p-5 flex items-center justify-between"
                style={{ border: '1px solid rgba(167,139,250,0.18)', background: 'rgba(0,237,126,0.04)' }}>
                <div>
                  <p className="text-sm font-bold text-white mb-1">Need a Full Annual Report?</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Generate a 400–500 word institutional equity report. Download as PDF.
                  </p>
                </div>
                <Link href="/dashboard/annual-report">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
                    <FileText size={14} />
                    Generate Report
                  </motion.button>
                </Link>
              </div>

              {/* Capabilities card */}
              <div className="panel-card rounded-2xl p-5" style={{ border: '1px solid rgba(0,255,136,0.15)' }}>
                <p className="text-sm font-bold text-white mb-3">What FinRobot Analyzes</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: BarChart2, label: 'Candlestick Charts', color: '#A4FFB9' },
                    { icon: Cpu, label: 'AI Inference (70B)', color: '#A4FFB9' },
                    { icon: Globe, label: 'News Sentiment', color: '#10B981' },
                    { icon: Target, label: 'Price Prediction', color: '#F59E0B' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Icon size={13} style={{ color }} />
                      <span className="text-xs font-medium" style={{ color: '#CBD5E1' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </div>

      {/* Floating AI Chat — always mounted so users can ask questions any time */}
      <AIChatPanel defaultTicker={activeTicker || ticker || undefined} />
    </div>
  )
}
