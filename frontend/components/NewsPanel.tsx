'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw, Rss } from 'lucide-react'
import { NewsArticle } from '@/lib/api'

interface NewsPanelProps {
    articles: NewsArticle[]
    ticker: string
    loading: boolean
    onRefresh?: () => void
}

function timeAgo(iso: string): string {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor(diff / 60_000)
    if (h >= 24) return `${Math.floor(h / 24)}d ago`
    if (h >= 1) return `${h}h ago`
    return `${m}m ago`
}

function SentimentBadge({ s }: { s: NewsArticle['sentiment'] }) {
    if (s === 'positive') return (
        <span className="sentiment-badge sentiment-positive"><TrendingUp size={8} />POSITIVE</span>
    )
    if (s === 'negative') return (
        <span className="sentiment-badge sentiment-negative"><TrendingDown size={8} />NEGATIVE</span>
    )
    return <span className="sentiment-badge sentiment-neutral"><Minus size={8} />NEUTRAL</span>
}

function SkeletonCard() {
    return (
        <div className="shimmer p-3.5 rounded-xl" style={{ height: 74 }} />
    )
}

export default function NewsPanel({ articles, ticker, loading, onRefresh }: NewsPanelProps) {
    return (
        <div className="panel-card rounded-2xl flex flex-col overflow-hidden" style={{ minHeight: 300 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,8,15,0.5)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', boxShadow: '0 0 16px rgba(124,58,237,0.45)' }}>
                        <Rss size={13} className="text-white" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-white block leading-none">Market News</span>
                        <span className="mono" style={{ color: '#4B5563', fontSize: '0.58rem', letterSpacing: '0.08em' }}>
                            LIVE FEED · SENTIMENT ANALYSIS
                        </span>
                    </div>
                    {ticker && (
                        <span className="mono px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.25)', fontSize: '0.62rem', letterSpacing: '0.08em' }}>
                            {ticker}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {articles.length > 0 && (
                        <span className="mono" style={{ color: '#4B5563', fontSize: '0.58rem', letterSpacing: '0.06em' }}>
                            {articles.length} ARTICLES
                        </span>
                    )}
                    {onRefresh && ticker && (
                        <motion.button whileTap={{ scale: 0.92 }} onClick={onRefresh} disabled={loading}
                            className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {!ticker && !loading && (
                    <div className="h-full flex flex-col items-center justify-center gap-2 py-10" style={{ color: '#374151' }}>
                        <Newspaper size={28} />
                        <p className="text-sm">Run a forecast to load news</p>
                    </div>
                )}

                {loading && articles.length === 0 && (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                )}

                <AnimatePresence>
                    {articles.map((article, i) => (
                        <motion.a
                            key={article.url || i}
                            href={article.url || '#'} target="_blank" rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.35 }}
                            className="news-card p-3.5 rounded-xl group">

                            <div className="flex items-center justify-between mb-2">
                                <SentimentBadge s={article.sentiment} />
                                <div className="flex items-center gap-1.5">
                                    <span className="mono" style={{ color: '#4B5563', fontSize: '0.6rem' }}>{article.source}</span>
                                    <span style={{ color: '#374151' }}>·</span>
                                    <span className="mono" style={{ color: '#4B5563', fontSize: '0.6rem' }}>{timeAgo(article.published_at)}</span>
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        whileHover={{ opacity: 1 }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={9} style={{ color: '#6B7280' }} />
                                    </motion.span>
                                </div>
                            </div>

                            <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors"
                                style={{ color: '#CBD5E1' }}>
                                {article.title}
                            </p>
                        </motion.a>
                    ))}
                </AnimatePresence>

                {!loading && ticker && articles.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: '#374151' }}>
                        <Newspaper size={24} />
                        <p className="text-xs text-center">No recent news found for {ticker}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
