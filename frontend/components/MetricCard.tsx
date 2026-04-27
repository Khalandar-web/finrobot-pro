'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import ConfidenceRing from './ConfidenceRing'

interface MetricCardProps {
    label: React.ReactNode
    value: string | number | null
    icon?: React.ReactNode
    accent?: boolean
    loading?: boolean
    large?: boolean
    subValue?: string
    prediction?: 'UP' | 'DOWN' | null
    confidence?: number | null
    isConfidence?: boolean
    glowColor?: string
    updated?: boolean
    updateKey?: number
}

function Skeleton({ large }: { large?: boolean }) {
    return (
        <div>
            <div className="shimmer h-2.5 w-20 rounded mb-2.5" />
            <div className={`shimmer rounded ${large ? 'h-10 w-28' : 'h-7 w-20'}`} />
        </div>
    )
}

// Count-up hook (ease-out cubic, restarts on updateKey change)
function useCountUp(target: number, duration = 900, updateKey = 0) {
    const [current, setCurrent] = useState(0)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        if (target === 0) { setCurrent(0); return }
        const startTime = performance.now()
        const from = 0
        const animate = (now: number) => {
            const p = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setCurrent(from + (target - from) * eased)
            if (p < 1) rafRef.current = requestAnimationFrame(animate)
            else setCurrent(target)
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(animate)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [target, duration, updateKey])

    return current
}

// Extract numeric portion for animation
function AnimatedValue({ value, large, accent }: { value: string | number; large?: boolean; accent?: boolean }) {
    const strVal = String(value)
    const numMatch = strVal.match(/^([^0-9]*)([0-9]+\.?[0-9]*)(.*)$/)
    let prefix = strVal, suffix = '', numPart: number | null = null
    if (numMatch) { prefix = numMatch[1]; numPart = parseFloat(numMatch[2]); suffix = numMatch[3] }

    const animated = useCountUp(numPart ?? 0, 900)

    const displayNum = numPart !== null
        ? (Number.isInteger(numPart)
            ? Math.round(animated).toLocaleString()
            : (numPart < 100 ? animated.toFixed(2) : Math.round(animated).toLocaleString()))
        : ''

    return (
        <p className={`font-black tracking-tight ${large ? 'text-3xl' : 'text-xl'} ${accent ? 'gradient-text' : 'text-white'}`}
            style={{ lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {numPart !== null ? `${prefix}${displayNum}${suffix}` : strVal}
        </p>
    )
}

export default function MetricCard({
    label, value, icon, accent, loading, large, subValue,
    prediction, confidence, isConfidence, glowColor = 'rgba(37,99,235,0.4)', updateKey = 0,
}: MetricCardProps) {
    const [pulsing, setPulsing] = useState(false)

    useEffect(() => {
        if (!updateKey) return
        setPulsing(true)
        const t = setTimeout(() => setPulsing(false), 1400)
        return () => clearTimeout(t)
    }, [updateKey])

    return (
        <motion.div
            whileHover={{ scale: 1.03, y: -3 }}
            transition={{ duration: 0.18 }}
            className="metric-card rounded-2xl p-4 relative overflow-hidden"
            style={{
                border: `1px solid ${pulsing ? glowColor : 'rgba(255,255,255,0.06)'}`,
                boxShadow: pulsing ? `0 0 32px ${glowColor}, 0 0 64px ${glowColor}40` : '0 2px 16px rgba(0,0,0,0.3)',
                transition: 'border-color 0.4s, box-shadow 0.4s',
            }}>

            {/* Shimmer sweep on update */}
            <AnimatePresence>
                {pulsing && (
                    <motion.div
                        initial={{ x: '-100%', opacity: 0.8 }}
                        animate={{ x: '200%', opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, ease: 'easeOut' }}
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}60, transparent)` }} />
                )}
            </AnimatePresence>

            {/* Top accent line */}
            {pulsing && (
                <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(to right, transparent, ${glowColor}, transparent)` }} />
            )}

            {/* Label row */}
            <div className="flex items-center justify-between mb-3">
                <span className="mono font-semibold" style={{ color: '#4B5563', fontSize: '0.58rem', letterSpacing: '0.12em' }}>
                    {label}
                </span>
                {icon && <span style={{ color: '#374151' }}>{icon}</span>}
            </div>

            {loading ? (
                <Skeleton large={large} />
            ) : isConfidence && confidence != null ? (
                <div className="flex items-center gap-3">
                    <ConfidenceRing value={confidence} size={62} strokeWidth={5} />
                    <div>
                        <p className="text-xl font-black text-white">{confidence}%</p>
                        <p className="mono" style={{ color: '#4B5563', fontSize: '0.58rem', letterSpacing: '0.08em' }}>AI SCORE</p>
                    </div>
                </div>
            ) : prediction != null ? (
                <div className="flex flex-col gap-2">
                    <motion.div
                        key={prediction}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 280 }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl w-fit ${prediction === 'UP' ? 'prediction-badge-up  text-green-400' : 'prediction-badge-down text-red-400'}`}>
                        {prediction === 'UP' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        <span className="text-xl font-black">{prediction}</span>
                    </motion.div>
                    {subValue && <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>{subValue}</p>}
                </div>
            ) : (
                <div>
                    {value != null ? (
                        <AnimatedValue value={value} large={large} accent={accent} />
                    ) : (
                        <p className={`font-bold ${large ? 'text-3xl' : 'text-xl'}`} style={{ color: '#374151' }}>—</p>
                    )}
                    {subValue && (
                        <p className="mono mt-1" style={{ color: '#6B7280', fontSize: '0.62rem', letterSpacing: '0.06em' }}>{subValue}</p>
                    )}
                </div>
            )}
        </motion.div>
    )
}
