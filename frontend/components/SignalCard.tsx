'use client'

import { motion } from 'framer-motion'
import { Zap, CheckCircle2, XCircle, Target, ShieldAlert, Crosshair, Info } from 'lucide-react'
import { TradingSignalResponse } from '@/lib/api'

interface SignalCardProps {
    ticker: string
    tradingSignal?: TradingSignalResponse | null
}

export default function SignalCard({ ticker, tradingSignal }: SignalCardProps) {
    if (!tradingSignal) return null

    const isBullish = tradingSignal.trend === 'Bullish'
    const theme = {
        bg: isBullish ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: isBullish ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        text: isBullish ? '#10B981' : '#EF4444',
        glow: isBullish ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        Icon: isBullish ? CheckCircle2 : XCircle
    }
    const Icon = theme.Icon

    const currency = ticker.endsWith('.NS') || ticker.endsWith('.BO') ? '₹' : '$'

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden h-full"
            style={{ 
                border: `1px solid ${theme.border}`,
                boxShadow: `0 8px 32px ${theme.glow}`
            }}>
            
            {/* Background glowing orb */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: theme.text }} />

            <div className="flex items-center justify-between mb-4 z-10">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-white" />
                    <span className="text-xs font-bold text-white tracking-wider uppercase">🤖 AI Trade Setup</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                    <Icon size={14} style={{ color: theme.text }} />
                    <span className="text-sm font-black tracking-widest" style={{ color: theme.text }}>{tradingSignal.trend.toUpperCase()}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5 z-10">
                <div className="p-3 rounded-xl flex flex-col items-center justify-center text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Crosshair size={14} style={{ color: '#3b82f6', marginBottom: '4px' }} />
                    <span className="text-[0.65rem] font-semibold text-gray-400 mb-1 tracking-wider">ENTRY</span>
                    <span className="text-sm font-bold text-white mono">{currency}{tradingSignal.entry.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-xl flex flex-col items-center justify-center text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <Target size={14} style={{ color: '#22c55e', marginBottom: '4px' }} />
                    <span className="text-[0.65rem] font-semibold text-gray-400 mb-1 tracking-wider" style={{ color: '#86efac' }}>TARGET</span>
                    <span className="text-[0.7rem] font-bold text-white mono">{currency}{tradingSignal.target_min.toFixed(2)} - {tradingSignal.target_max.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-xl flex flex-col items-center justify-center text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <ShieldAlert size={14} style={{ color: '#ef4444', marginBottom: '4px' }} />
                    <span className="text-[0.65rem] font-semibold text-gray-400 mb-1 tracking-wider" style={{ color: '#fca5a5' }}>STOP LOSS</span>
                    <span className="text-sm font-bold text-white mono">{currency}{tradingSignal.stop_loss.toFixed(2)}</span>
                </div>
            </div>

            <div className="mb-4 z-10">
                <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#9CA3AF' }}>AI Confidence</span>
                    <span className="font-bold text-white">{tradingSignal.confidence}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${tradingSignal.confidence}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full" 
                        style={{ background: theme.text }}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 z-10 mt-auto">
                <div className="flex items-center gap-1.5 mb-1">
                    <Info size={13} style={{ color: '#9CA3AF' }} />
                    <span className="text-[0.7rem] font-bold tracking-wider uppercase" style={{ color: '#9CA3AF' }}>Why this signal?</span>
                </div>
                <div className="flex flex-col gap-1.5 pl-1">
                    {tradingSignal.reason && tradingSignal.reason.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 size={12} style={{ color: theme.text, marginTop: '2px', flexShrink: 0 }} />
                            <span className="text-[0.75rem] leading-snug" style={{ color: '#D1D5DB' }}>{r}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
