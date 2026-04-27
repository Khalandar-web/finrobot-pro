import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
    baseURL: API_BASE,
    timeout: 60000,
})

// ── Types ────────────────────────────────────────────────────────────────────

export interface OHLCVCandle {
    date: string   // YYYY-MM-DD
    o: number      // open
    h: number      // high
    l: number      // low
    c: number      // close
    v: number      // volume
}

export interface ForecastResponse {
    ticker: string
    summary: string
    positives: string[]
    risks: string[]
    prediction: 'UP' | 'DOWN'
    estimated_movement: string
    confidence: number
    current_price: number | null
    market_cap: number | null
    pe_ratio: number | null
    // New simple AI fields
    trend?: string           // "Uptrend" / "Downtrend"
    sentiment?: string       // "Positive" / "Neutral" / "Negative"
    financial_health?: string // "Strong" / "Moderate" / "Weak"
    suggestion?: string      // "BUY" / "SELL" / "HOLD"
    why_trend?: string
    why_sentiment?: string
    why_financial?: string
    currency?: string        // "USD" / "INR"
    data_source?: string     // "finnhub" / "yfinance"
}

export interface RevenuePoint {
    year: number | string
    revenue: number
    gross_profit: number
}

export interface EPSPoint {
    year: number | string
    eps: number
}

export interface NewsArticle {
    sentiment: 'positive' | 'negative' | 'neutral' | string
    url: string
    source: string
    published_at: string
    title: string
}

export interface QuoteData {
    price: number
    open: number
    high: number
    low: number
    prev_close: number
    change_pct: number
    currency?: string
}

export interface CompareResult {
    stocks: {
        ticker: string
        price: number | null
        change_pct: number | null
        company_name: string
        market_cap: number | null
        pe_ratio: number | null
        sector: string | null
        industry: string | null
        currency: string
        error: boolean
    }[]
    timestamp: string
}

export interface TradingSignalResponse {
    entry: number
    target_min: number
    target_max: number
    stop_loss: number
    trend: string
    confidence: number
    reason: string[]
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function fetchForecast(ticker: string): Promise<ForecastResponse> {
    const res = await api.post('/forecast', { ticker })
    return res.data
}

export async function fetchQuote(ticker: string): Promise<QuoteData> {
    const res = await api.get('/quote', { params: { ticker } })
    return res.data
}

export async function fetchPriceHistory(ticker: string, days = 90): Promise<OHLCVCandle[]> {
    const res = await api.get('/price-history', { params: { ticker, days } })
    return res.data?.candles || res.data || []
}

export async function fetchNews(ticker: string): Promise<any[]> {
    const res = await api.get('/news', { params: { ticker } })
    return res.data?.news || res.data || []
}

export async function fetchFullDashboard(ticker: string): Promise<any> {
    const res = await api.get('/dashboard', { params: { ticker } })
    return res.data
}

export async function fetchAnnualReport(ticker: string, year: number): Promise<any> {
    const res = await api.post('/annual-report', { ticker, year })
    return res.data
}

export async function generateReport(data: {
    ticker: string
    price?: number | null
    trend?: string
    suggestion?: string
    confidence?: number
    positives?: string[]
    risks?: string[]
    summary?: string
    prediction?: string
    estimated_movement?: string
    sentiment?: string
    financial_health?: string
    company_name?: string
}): Promise<Blob> {
    const res = await api.post('/generate-report', data, {
        responseType: 'blob',
    })
    return res.data
}

export async function compareStocks(tickers: string[]): Promise<CompareResult> {
    const res = await api.post('/compare', { tickers })
    return res.data
}

export async function fetchTradingSignal(ticker: string): Promise<TradingSignalResponse> {
    const res = await api.post('/trading-signal', { ticker })
    return res.data
}

export default api
