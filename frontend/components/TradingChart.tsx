'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, TrendingUp, TrendingDown, Maximize2, Minus } from 'lucide-react'
import { OHLCVCandle, TradingSignalResponse } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradingChartProps {
    candles: OHLCVCandle[]
    ticker: string
    prediction: 'UP' | 'DOWN' | null
    tradingSignal?: TradingSignalResponse | null
    loading: boolean
    onRangeChange?: (days: number) => void
}

type TimeRange = '1W' | '1M' | '3M' | '1Y'

const TIME_RANGES: { label: TimeRange; days: number }[] = [
    { label: '1W', days: 7 },
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '1Y', days: 365 },
]

// ─── EMA Calculator ──────────────────────────────────────────────────────────

function calculateEMA(data: number[], period: number): (number | null)[] {
    const ema: (number | null)[] = []
    const k = 2 / (period + 1)
    let prevEma: number | null = null

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            ema.push(null)
        } else if (i === period - 1) {
            // First EMA = SMA of first `period` values
            let sum = 0
            for (let j = 0; j < period; j++) sum += data[j]
            prevEma = sum / period
            ema.push(prevEma)
        } else {
            prevEma = data[i] * k + (prevEma ?? data[i]) * (1 - k)
            ema.push(prevEma)
        }
    }
    return ema
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ChartSkeleton() {
    return (
        <div className="flex flex-col gap-3 p-1">
            <div className="flex items-center justify-between">
                <div className="shimmer h-3 w-40 rounded" />
                <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => <div key={i} className="shimmer h-6 w-10 rounded" />)}
                </div>
            </div>
            <div className="shimmer rounded-xl" style={{ height: 300 }} />
            <div className="shimmer rounded-xl" style={{ height: 60 }} />
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TradingChart({ candles, ticker, prediction, tradingSignal, loading, onRangeChange }: TradingChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const volumeContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const volumeChartRef = useRef<any>(null)
    const candleSeriesRef = useRef<any>(null)
    const emaSeriesRef = useRef<any>(null)
    const volumeSeriesRef = useRef<any>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)

    const [range, setRange] = useState<TimeRange>('1M')
    const [mounted, setMounted] = useState(false)
    const [lwcModule, setLwcModule] = useState<any>(null)

    // Dynamically import lightweight-charts (no SSR)
    useEffect(() => {
        setMounted(true)
        import('lightweight-charts').then(mod => {
            setLwcModule(mod)
        })
    }, [])

    const isIndianStock = ticker.toUpperCase().endsWith('.NS') || ticker.toUpperCase().endsWith('.BO')
    const currencySymbol = isIndianStock ? '₹' : '$'

    // Slice candles based on range
    const visibleCandles = useMemo(() => {
        const targetDays = TIME_RANGES.find(t => t.label === range)?.days ?? 30
        return candles.slice(-targetDays)
    }, [candles, range])

    // Range change handler
    const handleRangeChange = useCallback((r: TimeRange, days: number) => {
        setRange(r)
        onRangeChange?.(days)
    }, [onRangeChange])

    // Price summary
    const lastCandle = visibleCandles[visibleCandles.length - 1]
    const firstCandle = visibleCandles[0]
    const rangeChg = lastCandle && firstCandle && firstCandle.c > 0
        ? (((lastCandle.c - firstCandle.c) / firstCandle.c) * 100).toFixed(2)
        : null
    const rangeChgUp = rangeChg !== null ? parseFloat(rangeChg) >= 0 : true

    // ─── Create & update charts ──────────────────────────────────────────

    useEffect(() => {
        if (!lwcModule || !chartContainerRef.current || !volumeContainerRef.current || visibleCandles.length === 0) return

        const { createChart, ColorType, CrosshairMode, LineStyle } = lwcModule

        // Cleanup previous (guard against already-disposed objects)
        if (chartRef.current) {
            try { chartRef.current.remove() } catch (_) {}
            chartRef.current = null
        }
        if (volumeChartRef.current) {
            try { volumeChartRef.current.remove() } catch (_) {}
            volumeChartRef.current = null
        }

        const containerWidth = chartContainerRef.current.clientWidth

        // ── Main candlestick chart ─────────────────────────────────────
        const chart = createChart(chartContainerRef.current, {
            width: containerWidth,
            height: 300,
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#64748b',
                fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                fontSize: 10,
            },
            grid: {
                vertLines: { color: 'rgba(148, 163, 184, 0.06)', style: LineStyle.Dotted },
                horzLines: { color: 'rgba(148, 163, 184, 0.06)', style: LineStyle.Dotted },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: 'rgba(96, 165, 250, 0.4)',
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1e293b',
                },
                horzLine: {
                    color: 'rgba(96, 165, 250, 0.4)',
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1e293b',
                },
            },
            timeScale: {
                borderColor: 'rgba(148, 163, 184, 0.08)',
                timeVisible: false,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: Math.max(6, Math.min(18, containerWidth / visibleCandles.length * 0.7)),
            },
            rightPriceScale: {
                borderColor: 'rgba(148, 163, 184, 0.08)',
                scaleMargins: { top: 0.1, bottom: 0.08 },
            },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { mouseWheel: true, pinch: true },
        })
        chartRef.current = chart

        // Candlestick series
        const candleSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        })
        candleSeriesRef.current = candleSeries

        // Format candle data for lightweight-charts
        const candleData = visibleCandles.map(c => ({
            time: c.date, // YYYY-MM-DD string
            open: c.o,
            high: c.h,
            low: c.l,
            close: c.c,
        }))
        candleSeries.setData(candleData)

        if (tradingSignal) {
            candleSeries.createPriceLine({
                price: tradingSignal.target_max,
                color: '#22c55e',
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'TARGET MAX',
            });
            candleSeries.createPriceLine({
                price: tradingSignal.target_min,
                color: '#22c55e',
                lineWidth: 2,
                lineStyle: LineStyle.Dotted,
                axisLabelVisible: true,
                title: 'TARGET MIN',
            });
            candleSeries.createPriceLine({
                price: tradingSignal.stop_loss,
                color: '#ef4444',
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'STOP LOSS',
            });
            candleSeries.createPriceLine({
                price: tradingSignal.entry,
                color: '#3b82f6',
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'ENTRY',
            });
        }

        // EMA overlay (20-period)
        const closes = visibleCandles.map(c => c.c)
        const ema20 = calculateEMA(closes, 20)
        const emaData = visibleCandles
            .map((c, i) => ema20[i] !== null ? { time: c.date, value: ema20[i] as number } : null)
            .filter(Boolean) as { time: string; value: number }[]

        if (emaData.length > 0) {
            const emaSeries = chart.addLineSeries({
                color: '#f59e0b',
                lineWidth: 1.5,
                lineStyle: LineStyle.Solid,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
            })
            emaSeries.setData(emaData)
            emaSeriesRef.current = emaSeries
        }

        // Price format for tooltip
        candleSeries.applyOptions({
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        })

        chart.timeScale().fitContent()

        // ── Volume chart ──────────────────────────────────────────────
        const volumeChart = createChart(volumeContainerRef.current, {
            width: containerWidth,
            height: 60,
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#475569',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: 'rgba(148, 163, 184, 0.04)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: 'rgba(96, 165, 250, 0.3)', width: 1, style: LineStyle.Dashed, labelVisible: false },
                horzLine: { visible: false },
            },
            timeScale: {
                visible: false,
                barSpacing: Math.max(6, Math.min(18, containerWidth / visibleCandles.length * 0.7)),
            },
            rightPriceScale: {
                borderColor: 'rgba(148, 163, 184, 0.08)',
                scaleMargins: { top: 0.1, bottom: 0 },
            },
            handleScroll: false,
            handleScale: false,
        })
        volumeChartRef.current = volumeChart

        const volumeSeries = volumeChart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        })
        volumeSeriesRef.current = volumeSeries

        const volumeData = visibleCandles.map(c => ({
            time: c.date,
            value: c.v,
            color: c.c >= c.o ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)',
        }))
        volumeSeries.setData(volumeData)
        volumeChart.timeScale().fitContent()

        // Sync crosshairs
        chart.subscribeCrosshairMove((param: any) => {
            if (param.time) {
                volumeChart.setCrosshairPosition(0, param.time, volumeSeries)
            } else {
                volumeChart.clearCrosshairPosition()
            }
        })

        // ── Resize observer ──────────────────────────────────────────
        if (resizeObserverRef.current) resizeObserverRef.current.disconnect()

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width
                if (newWidth > 0) {
                    try {
                        chart.resize(newWidth, 300)
                        volumeChart.resize(newWidth, 60)
                    } catch (_) {}
                }
            }
        })

        if (chartContainerRef.current) {
            observer.observe(chartContainerRef.current)
        }
        resizeObserverRef.current = observer

        return () => {
            observer.disconnect()
            try { chart.remove() } catch (_) {}
            try { volumeChart.remove() } catch (_) {}
        }
    }, [lwcModule, visibleCandles, tradingSignal])

    if (loading) return <ChartSkeleton />
    if (!mounted) return <ChartSkeleton />
    if (candles.length === 0) return (
        <div className="flex flex-col items-center justify-center gap-3 py-12" style={{ minHeight: 300 }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <BarChart2 size={20} style={{ color: '#ef4444' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#6B7280' }}>Data not available</p>
            <p className="text-xs" style={{ color: '#4B5563' }}>Unable to fetch chart data for {ticker}</p>
        </div>
    )

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-1"
        >
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                {/* Left: ticker + stats */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono font-bold" style={{ color: '#e2e8f0', fontSize: '0.78rem', letterSpacing: '0.04em' }}>
                        {ticker}
                    </span>
                    {lastCandle && (
                        <span className="mono font-bold" style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                            {currencySymbol}{lastCandle.c.toFixed(2)}
                        </span>
                    )}
                    {rangeChg !== null && (
                        <span className="mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{
                                fontSize: '0.6rem', letterSpacing: '0.06em',
                                background: rangeChgUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                color: rangeChgUp ? '#22c55e' : '#ef4444',
                                border: `1px solid ${rangeChgUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            }}>
                            {rangeChgUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            {rangeChgUp ? '+' : ''}{rangeChg}%
                        </span>
                    )}
                    {prediction && (
                        <motion.span
                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="mono flex items-center gap-1 font-bold px-2 py-0.5 rounded-full"
                            style={{
                                background: prediction === 'UP' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                border: `1px solid ${prediction === 'UP' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                color: prediction === 'UP' ? '#22c55e' : '#ef4444',
                                fontSize: '0.58rem',
                            }}>
                            {prediction === 'UP' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            AI: {prediction}
                        </motion.span>
                    )}
                </div>

                {/* Right: time range tabs */}
                <div className="flex items-center gap-1">
                    <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {TIME_RANGES.map(({ label, days }) => (
                            <motion.button key={label} whileTap={{ scale: 0.93 }}
                                onClick={() => handleRangeChange(label, days)}
                                className="mono px-2.5 py-1 rounded-md font-bold transition-all"
                                style={{
                                    fontSize: '0.6rem', letterSpacing: '0.06em',
                                    background: range === label ? 'rgba(37,99,235,0.2)' : 'transparent',
                                    color: range === label ? '#60A5FA' : '#6B7280',
                                    border: `1px solid ${range === label ? 'rgba(37,99,235,0.35)' : 'transparent'}`,
                                    boxShadow: range === label ? '0 0 10px rgba(37,99,235,0.2)' : 'none',
                                }}>
                                {label}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 mb-1 px-1">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full" style={{ background: '#22c55e' }} />
                    <span className="mono" style={{ fontSize: '0.52rem', color: '#64748b', letterSpacing: '0.08em' }}>BULLISH</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full" style={{ background: '#ef4444' }} />
                    <span className="mono" style={{ fontSize: '0.52rem', color: '#64748b', letterSpacing: '0.08em' }}>BEARISH</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full" style={{ background: '#f59e0b' }} />
                    <span className="mono" style={{ fontSize: '0.52rem', color: '#64748b', letterSpacing: '0.08em' }}>EMA 20</span>
                </div>
            </div>

            {/* ── Candlestick chart container ── */}
            <div
                ref={chartContainerRef}
                className="w-full rounded-xl overflow-hidden"
                style={{
                    height: 300,
                    border: '1px solid rgba(148, 163, 184, 0.06)',
                    background: 'rgba(2, 6, 23, 0.5)',
                }}
            />

            {/* ── Volume chart container ── */}
            <div className="mt-0.5">
                <div className="mono mb-0.5 px-1" style={{ color: '#374151', fontSize: '0.55rem', letterSpacing: '0.1em' }}>VOLUME</div>
                <div
                    ref={volumeContainerRef}
                    className="w-full rounded-lg overflow-hidden"
                    style={{
                        height: 60,
                        border: '1px solid rgba(148, 163, 184, 0.04)',
                        background: 'rgba(2, 6, 23, 0.3)',
                    }}
                />
            </div>
        </motion.div>
    )
}
