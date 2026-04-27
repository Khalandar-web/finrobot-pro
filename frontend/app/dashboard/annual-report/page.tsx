'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Loader2, BookOpen, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchAnnualReport } from '@/lib/api'

export default function AnnualReportPage() {
    const [ticker, setTicker] = useState('')
    const [year, setYear] = useState(2023)
    const [loading, setLoading] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [result, setResult] = useState<any>(null)

    const generate = async () => {
        const sym = ticker.trim().toUpperCase()
        if (!sym) { toast.error('Please enter a ticker.'); return }
        if (year < 2000 || year > 2025) { toast.error('Year must be between 2000 and 2025.'); return }
        setLoading(true)
        setResult(null)
        try {
            const data = await fetchAnnualReport(sym, year)
            setResult(data)
            toast.success(`Report generated for ${sym} ${year}`)
        } catch (err: unknown) {
            const errObj = err as any
            const detail = errObj?.response?.data?.detail
            let msg = errObj?.message ?? 'Failed to generate report.'
            if (typeof detail === 'string') msg = detail
            else if (Array.isArray(detail)) msg = detail[0]?.msg || 'Validation error'
            else if (detail && typeof detail === 'object') msg = detail.msg || 'Error occurred'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    const downloadPdf = async () => {
        const sym = ticker.trim().toUpperCase()
        if (!sym) return
        setDownloading(true)
        try {
            const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const res = await fetch(`${BASE_URL}/annual-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker: sym, year }),
            })
            if (!res.ok) throw new Error('PDF download failed')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${sym}_${year}_AnnualReport.pdf`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('PDF downloaded!')
        } catch (err: unknown) {
            toast.error((err as Error)?.message ?? 'PDF download failed')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="p-6 max-w-[1000px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Annual Report Generator</h1>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    Generate institutional-grade 400–500 word equity reports powered by NVIDIA NIM AI
                </p>
            </div>

            {/* Form card */}
            <div className="rounded-xl p-5 mb-5" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#6B7280' }}>
                            Ticker Symbol
                        </label>
                        <input
                            className="fin-input w-full px-4 py-2.5 rounded-xl text-sm"
                            placeholder="e.g. MSFT, AAPL, NVDA"
                            value={ticker}
                            onChange={e => setTicker(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && generate()}
                        />
                    </div>
                    <div className="w-full sm:w-36">
                        <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#6B7280' }}>
                            Fiscal Year
                        </label>
                        <input
                            type="number"
                            className="fin-input w-full px-4 py-2.5 rounded-xl text-sm"
                            value={year}
                            min={2000}
                            max={2025}
                            onChange={e => setYear(parseInt(e.target.value))}
                        />
                    </div>
                    <div className="flex items-end">
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={generate}
                            disabled={loading}
                            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white h-[42px] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                            {loading
                                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                                : <><BookOpen size={15} /> Generate Report</>}
                        </motion.button>
                    </div>
                </div>

                {/* Popular tickers */}
                <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="text-xs" style={{ color: '#6B7280', lineHeight: '28px' }}>Examples:</span>
                    {['MSFT', 'AAPL', 'NVDA', 'TSLA', 'AMZN'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTicker(t)}
                            className="text-xs px-3 py-1 rounded-lg font-medium transition-all"
                            style={{
                                background: ticker === t ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${ticker === t ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                color: ticker === t ? '#60A5FA' : '#9CA3AF',
                            }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Info banner */}
            {!result && !loading && (
                <div className="rounded-xl p-4 flex gap-3" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
                    <AlertCircle size={16} style={{ color: '#60A5FA', flexShrink: 0, marginTop: 2 }} />
                    <div className="text-sm" style={{ color: '#9CA3AF' }}>
                        Reports are generated using financial data from FMP and SEC EDGAR combined with NVIDIA NIM AI analysis.
                        Generation takes 20–60 seconds. The PDF is automatically saved on the server and can be downloaded below.
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl p-8 flex flex-col items-center gap-4"
                    style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full" style={{ border: '2px solid rgba(37,99,235,0.15)' }} />
                        <div className="absolute inset-0 rounded-full animate-spin"
                            style={{ borderTop: '2px solid #2563EB', borderRight: '2px solid transparent', borderBottom: '2px solid transparent', borderLeft: '2px solid transparent' }} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-white mb-1">Generating Institutional Report</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                            Fetching financial data, analysing with NVIDIA NIM, building PDF…
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Report result */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}>
                    {/* Header bar */}
                    <div className="rounded-t-xl px-5 py-4 flex items-center justify-between"
                        style={{ background: '#111827', borderTop: '1px solid rgba(255,255,255,0.07)', borderLeft: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(37,99,235,0.15)' }}>
                                <FileText size={15} style={{ color: '#60A5FA' }} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{result.ticker} — Annual Equity Report {result.year}</p>
                                <p className="text-xs" style={{ color: '#6B7280' }}>~{result.word_count} words · Generated by FinRobot-NVIDIA</p>
                            </div>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={downloadPdf}
                            disabled={downloading}
                            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50">
                            {downloading
                                ? <><Loader2 size={13} className="animate-spin" /> Downloading…</>
                                : <><Download size={13} /> Download PDF</>}
                        </motion.button>
                    </div>

                    {/* Report body */}
                    <div className="rounded-b-xl p-6 overflow-y-auto max-h-[600px]"
                        style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none' }}>
                        <div className="prose prose-invert max-w-none">
                            {result.report_text.split('\n\n').map((para: string, i: number) => (
                                <p key={i} className="text-sm leading-7 mb-4" style={{ color: '#D1D5DB' }}>
                                    {para.trim()}
                                </p>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
