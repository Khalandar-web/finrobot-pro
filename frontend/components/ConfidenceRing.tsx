'use client'

import { motion } from 'framer-motion'

interface ConfidenceRingProps {
    value: number   // 0–100
    size?: number   // SVG diameter in px (default 80)
    strokeWidth?: number
}

export default function ConfidenceRing({
    value,
    size = 80,
    strokeWidth = 7,
}: ConfidenceRingProps) {
    const r = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * r
    const progress = ((100 - value) / 100) * circumference

    // Colour based on confidence level
    const colour =
        value >= 75 ? '#10B981' :
            value >= 55 ? '#F59E0B' :
                '#EF4444'

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Track */}
            <svg width={size} height={size} className="absolute -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={colour}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: progress }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 4px ${colour}88)` }}
                />
            </svg>
            {/* Label */}
            <div className="flex flex-col items-center z-10">
                <span className="text-lg font-bold" style={{ color: colour, lineHeight: 1 }}>
                    {value}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>
                    %
                </span>
            </div>
        </div>
    )
}
