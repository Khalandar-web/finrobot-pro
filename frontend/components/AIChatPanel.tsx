'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchForecast, ForecastResponse } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system'

interface ChatMessage {
    id: string
    role: MessageRole
    content: string
    ticker?: string
    forecast?: ForecastResponse
    ts: Date
    loading?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 9) }

/** Pull a ticker from the user's message, e.g. "analyse AAPL" → "AAPL" */
function extractTicker(text: string): string | null {
    // Look for 1–5 uppercase letters that appear as a token (bounded)
    const match = text.match(/\b([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\b/)
    return match ? match[1] : null
}

/** Convert forecast data to a human-readable chat response */
function forecastToMessage(f: ForecastResponse): string {
    const dir = f.prediction === 'UP' ? '📈 BULLISH' : '📉 BEARISH'
    const conf = f.confidence ? `${f.confidence}%` : 'N/A'
    const move = f.estimated_movement || 'N/A'
    const positives = f.positives?.slice(0, 2).map(p => `• ${p}`).join('\n') || ''
    const risks = f.risks?.slice(0, 2).map(r => `• ${r}`).join('\n') || ''
    return [
        `**${f.ticker} — ${dir}** | Confidence: ${conf} | Est. move: ${move}`,
        '',
        f.summary,
        positives ? `\n**Positives:**\n${positives}` : '',
        risks ? `\n**Risks:**\n${risks}` : '',
    ].filter(Boolean).join('\n')
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
    const isUser = msg.role === 'user'
    const isSystem = msg.role === 'system'

    if (isSystem) {
        return (
            <div className="flex justify-center my-1">
                <span className="mono px-3 py-1 rounded-full" style={{ color: '#4B5563', fontSize: '0.6rem', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.03)' }}>
                    {msg.content}
                </span>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                    background: isUser
                        ? 'linear-gradient(135deg,rgba(37,99,235,0.3),rgba(124,58,237,0.3))'
                        : 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.15))',
                    border: isUser ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(16,185,129,0.2)',
                }}>
                {isUser
                    ? <User size={11} style={{ color: '#60A5FA' }} />
                    : <Bot size={11} style={{ color: '#10B981' }} />
                }
            </div>

            {/* Bubble */}
            <div className="max-w-[80%]">
                {msg.loading ? (
                    <div className="px-3 py-2.5 rounded-2xl"
                        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                        <div className="flex items-center gap-1.5">
                            <span className="mono" style={{ color: '#4B5563', fontSize: '0.6rem', letterSpacing: '0.08em' }}>NEURAL PROCESSING</span>
                            {[0, 1, 2].map(i => (
                                <motion.span key={i} className="w-1 h-1 rounded-full"
                                    style={{ background: '#10B981', display: 'inline-block' }}
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`px-3 py-2.5 rounded-2xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                        style={{
                            background: isUser
                                ? 'linear-gradient(135deg,rgba(37,99,235,0.18),rgba(124,58,237,0.12))'
                                : 'rgba(255,255,255,0.04)',
                            border: isUser
                                ? '1px solid rgba(37,99,235,0.2)'
                                : '1px solid rgba(255,255,255,0.07)',
                        }}>
                        <div className="text-sm text-white whitespace-pre-wrap leading-relaxed" style={{ fontSize: '0.82rem' }}>
                            {msg.content.split('**').map((part, i) =>
                                i % 2 === 1
                                    ? <strong key={i} style={{ color: '#60A5FA' }}>{part}</strong>
                                    : <span key={i}>{part}</span>
                            )}
                        </div>
                        {/* Forecast quick stats */}
                        {msg.forecast && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md mono"
                                    style={{
                                        fontSize: '0.58rem', letterSpacing: '0.08em', fontWeight: 700,
                                        background: msg.forecast.prediction === 'UP' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: msg.forecast.prediction === 'UP' ? '#10B981' : '#EF4444',
                                        border: `1px solid ${msg.forecast.prediction === 'UP' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                    }}>
                                    {msg.forecast.prediction === 'UP' ? <TrendingUp size={8} style={{ display: 'inline', marginRight: 3 }} /> : <TrendingDown size={8} style={{ display: 'inline', marginRight: 3 }} />}
                                    {msg.forecast.prediction} · {msg.forecast.confidence}% CONF
                                </span>
                                {msg.forecast.current_price && (
                                    <span className="px-2 py-0.5 rounded-md mono"
                                        style={{ fontSize: '0.58rem', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        ${msg.forecast.current_price.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        )}
                        <p className="mono mt-1" style={{ color: '#374151', fontSize: '0.55rem' }}>
                            {msg.ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// ─── Main Chat Panel ──────────────────────────────────────────────────────────

interface AIChatPanelProps {
    defaultTicker?: string
}

export default function AIChatPanel({ defaultTicker }: AIChatPanelProps) {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm FinRobot's AI trading assistant. Ask me to analyze any stock — for example:\n\n"Analyze AAPL"\n"What's your outlook on NVDA?"\n"Is TSLA a buy right now?"`,
            ts: new Date(),
        }
    ])
    const [input, setInput] = useState('')
    const [processing, setProcessing] = useState(false)
    const [unread, setUnread] = useState(0)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setUnread(0)
            setTimeout(() => inputRef.current?.focus(), 200)
        }
    }, [open])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const send = useCallback(async () => {
        const text = input.trim()
        if (!text || processing) return
        setInput('')

        const userMsg: ChatMessage = { id: genId(), role: 'user', content: text, ts: new Date() }
        const loadingMsg: ChatMessage = { id: genId(), role: 'assistant', content: '', ts: new Date(), loading: true }

        setMessages(prev => [...prev, userMsg, loadingMsg])
        setProcessing(true)

        // Determine ticker: from message text, or fall back to defaultTicker
        const rawTicker = extractTicker(text.toUpperCase()) || defaultTicker?.toUpperCase()

        if (!rawTicker) {
            setMessages(prev => prev.filter(m => m.id !== loadingMsg.id).concat({
                id: genId(),
                role: 'assistant',
                content: 'Please mention a stock ticker in your message, e.g. "Analyze AAPL" or "What\'s your view on MSFT?"',
                ts: new Date(),
            }))
            setProcessing(false)
            return
        }

        try {
            setMessages(prev => prev.map(m =>
                m.id === loadingMsg.id ? { ...m, content: `Analyzing ${rawTicker}...` } : m
            ))
            const forecast = await fetchForecast(rawTicker)
            const replyContent = forecastToMessage(forecast)

            setMessages(prev => prev.map(m =>
                m.id === loadingMsg.id
                    ? { ...m, content: replyContent, forecast, ticker: rawTicker, loading: false }
                    : m
            ))
            if (!open) setUnread(c => c + 1)
        } catch (err) {
            setMessages(prev => prev.map(m =>
                m.id === loadingMsg.id
                    ? {
                        ...m,
                        content: `Failed to analyze ${rawTicker}. The AI backend may be busy. Please try again.`,
                        loading: false,
                    }
                    : m
            ))
        } finally {
            setProcessing(false)
        }
    }, [input, processing, defaultTicker, open])

    return (
        <>
            {/* Floating button */}
            <motion.button
                whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.94 }}
                onClick={() => setOpen(v => !v)}
                className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-2xl flex items-center justify-center shadow-2xl"
                style={{
                    width: 52, height: 52,
                    background: open
                        ? 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(239,68,68,0.15))'
                        : 'linear-gradient(135deg,#2563EB,#7C3AED)',
                    boxShadow: open ? '0 0 24px rgba(239,68,68,0.3)' : '0 0 32px rgba(37,99,235,0.5), 0 8px 24px rgba(0,0,0,0.4)',
                    border: open ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
                }}>
                <AnimatePresence mode="wait">
                    {open
                        ? <motion.div key="close" initial={{ scale: 0.6, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.6 }}>
                            <X size={20} className="text-white" />
                        </motion.div>
                        : <motion.div key="open" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }} className="relative">
                            <MessageCircle size={20} className="text-white" />
                            {unread > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                                    style={{ background: '#EF4444', color: 'white' }}>{unread}</span>
                            )}
                        </motion.div>
                    }
                </AnimatePresence>
            </motion.button>

            {/* Chat panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="fixed bottom-[72px] right-6 z-40 ai-chat-panel rounded-2xl flex flex-col"
                        style={{ width: 360, height: 480, maxHeight: '70vh' }}>

                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.15))', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <Zap size={14} style={{ color: '#10B981' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white leading-none mb-0.5">FinRobot AI Chat</p>
                                <p className="mono" style={{ color: '#4B5563', fontSize: '0.58rem', letterSpacing: '0.1em' }}>
                                    {processing ? '⚡ ANALYZING...' : '● READY · LLAMA 3 70B'}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            {defaultTicker && (
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="mono" style={{ color: '#4B5563', fontSize: '0.6rem', letterSpacing: '0.1em' }}>ACTIVE:</span>
                                    <span className="mono px-2 py-0.5 rounded-md font-bold"
                                        style={{ background: 'rgba(37,99,235,0.12)', color: '#60A5FA', fontSize: '0.65rem', border: '1px solid rgba(37,99,235,0.2)' }}>
                                        {defaultTicker}
                                    </span>
                                    <span className="mono" style={{ color: '#374151', fontSize: '0.6rem' }}>· will be used if no ticker in message</span>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    className="fin-input flex-1 px-3 py-2.5 rounded-xl text-sm"
                                    placeholder='e.g. "Analyze NVDA" or ask anything…'
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                                    disabled={processing}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                                    onClick={send}
                                    disabled={processing || !input.trim()}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)', boxShadow: '0 0 14px rgba(37,99,235,0.4)' }}>
                                    <Send size={14} className="text-white" />
                                </motion.button>
                            </div>
                            {processing && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="flex items-center gap-1.5 mt-2">
                                    <AlertTriangle size={10} style={{ color: '#F59E0B' }} />
                                    <span className="mono" style={{ color: '#4B5563', fontSize: '0.58rem' }}>AI analysis takes 30–60s · please wait</span>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
