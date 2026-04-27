'use client'

import { motion } from 'framer-motion'

const HUD_LABELS = [
    { text: 'AI ENGINE', status: 'ONLINE', delay: 0.8, top: '18%', left: '6%' },
    { text: 'MARKET ANALYSIS', status: 'READY', delay: 1.1, top: '38%', left: '4%' },
    { text: 'LLM MODEL', status: 'ACTIVE', delay: 1.4, top: '58%', left: '7%' },
]

const CORNER_MARKS: Array<{ top?: string; bottom?: string; left?: string; right?: string; rotate: number }> = [
    { top: '8%', left: '5%', rotate: 0 },
    { top: '8%', right: '5%', rotate: 90 },
    { bottom: '8%', left: '5%', rotate: 270 },
    { bottom: '8%', right: '5%', rotate: 180 },
]

function CornerBracket({ style }: { style: React.CSSProperties }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="absolute"
            style={{ ...style, width: 20, height: 20 }}
        >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M0 8 L0 0 L8 0" stroke="#60A5FA" strokeWidth="1.5" />
            </svg>
        </motion.div>
    )
}

export default function HUDOverlay() {
    return (
        <div className="absolute inset-0 pointer-events-none z-30">
            {/* Corner brackets */}
            {CORNER_MARKS.map((c, i) => (
                <CornerBracket key={i} style={{
                    top: c.top, left: c.left, right: c.right,
                    bottom: c.bottom,
                    transform: `rotate(${c.rotate}deg)`,
                }} />
            ))}

            {/* Scan line */}
            <motion.div
                initial={{ top: '15%', opacity: 0 }}
                animate={{ top: ['15%', '85%', '15%'], opacity: [0, 0.15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 1 }}
                className="absolute left-0 right-0 h-px"
                style={{ background: 'linear-gradient(to right, transparent, rgba(96,165,250,0.6), transparent)' }}
            />

            {/* HUD labels */}
            {HUD_LABELS.map((label, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: label.delay }}
                    className="absolute flex items-center gap-2"
                    style={{ top: label.top, left: label.left }}
                >
                    {/* Blink dot */}
                    <span className="hud-blink-dot" />
                    <div className="hud-label">
                        <span className="hud-label-key">{label.text}</span>
                        <span className="hud-label-val">{label.status}</span>
                    </div>
                </motion.div>
            ))}

            {/* Bottom telemetry bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.8 }}
                className="absolute bottom-16 left-6 flex items-center gap-4"
            >
                {['SYS: 98%', 'LAT: 12ms', 'DATA: LIVE'].map((item, i) => (
                    <span key={i} className="hud-metric">{item}</span>
                ))}
            </motion.div>

            {/* Top right version tag */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.2 }}
                className="absolute top-6 right-6 text-xs font-mono"
                style={{ color: '#2563EB', letterSpacing: '0.15em' }}
            >
                v3.2.0 // NEURAL CORE
            </motion.div>
        </div>
    )
}
