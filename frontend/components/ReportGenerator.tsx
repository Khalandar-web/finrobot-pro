'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Loader2, X, Sparkles, CheckCircle2 } from 'lucide-react'
import { ForecastResponse, generateReport } from '@/lib/api'

interface ReportGeneratorProps {
    result: ForecastResponse | null
    ticker: string
}

export default function ReportGenerator({ result, ticker }: ReportGeneratorProps) {
    const [generating, setGenerating] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState('')

    const handleGenerate = async () => {
        if (!result || !ticker) return
        setGenerating(true)
        setError('')
        setDone(false)

        try {
            const blob = await generateReport({
                ticker,
                price: result.current_price,
                trend: result.trend || (result.prediction === 'UP' ? 'Uptrend' : 'Downtrend'),
                suggestion: result.suggestion || (result.prediction === 'UP' ? 'BUY' : 'SELL'),
                confidence: result.confidence,
                positives: result.positives,
                risks: result.risks,
                summary: result.summary,
                prediction: result.prediction,
                estimated_movement: result.estimated_movement,
                sentiment: result.sentiment || 'Neutral',
                financial_health: result.financial_health || 'Moderate',
            })

            // Create download link
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `FinRobot_Report_${ticker}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)

            setDone(true)
            setTimeout(() => setDone(false), 4000)
        } catch (err: any) {
            console.error('Report generation failed:', err)
            setError('Failed to generate report. Please try again.')
        } finally {
            setGenerating(false)
        }
    }

    if (!result || !ticker) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="panel-card rounded-2xl p-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.15))',
                            border: '1px solid rgba(124,58,237,0.3)',
                            boxShadow: '0 0 16px rgba(124,58,237,0.2)',
                        }}>
                        <FileText size={14} style={{ color: '#A78BFA' }} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Generate Full Report</p>
                        <p className="mono" style={{ color: '#6B7280', fontSize: '0.58rem', letterSpacing: '0.06em' }}>
                            AI-POWERED PDF · DOWNLOAD INSTANTLY
                        </p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                    style={{
                        background: done
                            ? 'linear-gradient(135deg, #059669, #10B981)'
                            : 'linear-gradient(135deg, #7C3AED, #6366F1)',
                        boxShadow: done
                            ? '0 0 20px rgba(16,185,129,0.4)'
                            : '0 0 20px rgba(124,58,237,0.3)',
                    }}
                >
                    {generating ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Generating...
                        </>
                    ) : done ? (
                        <>
                            <CheckCircle2 size={14} />
                            Downloaded!
                        </>
                    ) : (
                        <>
                            <Download size={14} />
                            Generate PDF
                        </>
                    )}
                </motion.button>
            </div>

            {/* Error state */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                        <X size={12} style={{ color: '#FF7169' }} />
                        <span className="text-xs" style={{ color: '#FF7169' }}>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Generating progress */}
            <AnimatePresence>
                {generating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-2"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={12} style={{ color: '#A78BFA' }} />
                            <span className="mono text-xs" style={{ color: '#9CA3AF' }}>AI is writing your report...</span>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 8, ease: 'easeInOut' }}
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg, #7C3AED, #6366F1, #60A5FA)' }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
