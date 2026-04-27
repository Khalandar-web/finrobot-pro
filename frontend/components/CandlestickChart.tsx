'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, TrendingUp, TrendingDown, GitCommitHorizontal } from 'lucide-react'
import { OHLCVCandle } from '@/lib/api'

// ApexCharts must be dynamically imported (no SSR) — it relies on window
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandlestickChartProps {
    candles: OHLCVCandle[]
    ticker: string
    prediction: 'UP' | 'DOWN' | null
    loading: boolean
    /** Called when user selects a time range requiring more data */
    onRangeChange?: (days: number) => void
}

type ChartMode = 'candlestick' | 'line'

type TimeRange = '1W' | '1M' | '3M' | '1Y'

const TIME_RANGES: { label: TimeRange; days: number }[] = [
    { label: '1W', days: 7 },
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '1Y', days: 365 },
]

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBar() {
    return (
        <div className="flex flex-col gap-3">
            <div className="shimmer h-3 w-40 rounded" />
            <div className="shimmer rounded-xl" style={{ height: 260 }} />
            <div className="shimmer rounded-xl" style={{ height: 70 }} />
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CandlestickChart({ candles, ticker, prediction, loading, onRangeChange }: CandlestickChartProps) {
    const [mode, setMode] = useState<ChartMode>('candlestick')
    const [mounted, setMounted] = useState(false)
    const [range, setRange] = useState<TimeRange>('1M')

    useEffect(() => { setMounted(true) }, [])

    // When range changes, notify parent to fetch appropriate data
    const handleRangeChange = (r: TimeRange, days: number) => {
        setRange(r)
        onRangeChange?.(days)
    }

    const upColor = '#10B981'
    const downColor = '#EF4444'
    const accentColor = prediction === 'DOWN' ? downColor : '#2563EB'

    // Slice candles based on selected range
    const visibleCandles = useMemo(() => {
        const targetDays = TIME_RANGES.find(t => t.label === range)?.days ?? 30
        return candles.slice(-targetDays)
    }, [candles, range])

    // Advanced features: Calculate SMA (Simple Moving Average)
    const smaPeriod = 5
    const smaData = visibleCandles.map((c, i) => {
        if (i < smaPeriod - 1) return { x: new Date(c.date), y: null }
        let sum = 0
        for (let j = 0; j < smaPeriod; j++) sum += visibleCandles[i - j].c
        return { x: new Date(c.date), y: parseFloat((sum / smaPeriod).toFixed(2)) }
    })

    const combinedSeries = [
        {
            name: ticker,
            type: mode === 'candlestick' ? 'candlestick' : 'area',
            data: mode === 'candlestick'
                ? visibleCandles.map(c => ({ x: new Date(c.date), y: [c.o, c.h, c.l, c.c] }))
                : visibleCandles.map(c => ({ x: new Date(c.date), y: c.c }))
        },
        {
            name: 'SMA (5)',
            type: 'line',
            data: smaData,
        }
    ]

    const volumeSeries = [{
        name: 'Volume',
        data: visibleCandles.map(c => ({
            x: new Date(c.date),
            y: c.v,
            fillColor: c.c >= c.o ? upColor : downColor,
        })),
    }]

    // Price summary for header
    const lastCandle = visibleCandles[visibleCandles.length - 1]
    const firstCandle = visibleCandles[0]
    const rangeChg = lastCandle && firstCandle && firstCandle.c > 0
        ? (((lastCandle.c - firstCandle.c) / firstCandle.c) * 100).toFixed(2)
        : null
    const rangeChgUp = rangeChg !== null ? parseFloat(rangeChg) >= 0 : true

    const baseXOptions: ApexCharts.ApexOptions['xaxis'] = {
        type: 'datetime' as const,
        labels: {
            style: { colors: '#4B5563', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace' },
            datetimeFormatter: { month: "MMM 'yy", day: 'dd MMM' },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: {
            stroke: { color: 'rgba(56,189,248,0.5)', width: 1, dashArray: 4 },
        },
    }

    const isIndianStock = ticker.toUpperCase().endsWith('.NS') || ticker.toUpperCase().endsWith('.BO')
    const currencySymbol = isIndianStock ? '₹' : '$'

    const baseYOptions: ApexCharts.ApexOptions['yaxis'] = {
        labels: {
            style: { colors: '#4B5563', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace' },
            formatter: (v: number) => `${currencySymbol}${v.toFixed(0)}`,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
    }

    const candlestickOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'line', // Parent type must be line to support mixed candlestick + line (SMA)
            background: 'transparent',
            toolbar: { show: false },
            animations: { enabled: true, speed: 500, animateGradually: { enabled: true, delay: 20 } },
            zoom: { enabled: false },
        },
        stroke: {
            width: [1, 2], // 1px for candlestick outline, 2px for SMA line
            curve: 'smooth',
            colors: ['transparent', '#F59E0B'] // SMA color is amber
        },
        grid: { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 3, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
        plotOptions: {
            candlestick: {
                colors: { upward: upColor, downward: downColor },
                wick: { useFillColor: true },
            },
        },
        xaxis: baseXOptions,
        yaxis: baseYOptions,
        tooltip: {
            theme: 'dark',
            custom: ({ dataPointIndex, w }: { seriesIndex: number; dataPointIndex: number; w: { globals: { initialSeries: Array<{ data: Array<{ y: number[] }> }> } } }) => {
                const d = w.globals.initialSeries[0].data[dataPointIndex]
                if (!d) return ''
                const [o, h, l, c] = d.y
                const color = c >= o ? upColor : downColor
                const date = visibleCandles[dataPointIndex]?.date ?? ''
                const chgPct = o > 0 ? (((c - o) / o) * 100).toFixed(2) : '0.00'
                const vol = visibleCandles[dataPointIndex]?.v ?? 0
                const isIndian = ticker.toUpperCase().endsWith('.NS') || ticker.toUpperCase().endsWith('.BO')
                const symbol = isIndian ? '₹' : '$'
                
                return `<div style="padding:12px 14px;background:#0a0e1a;border:1px solid rgba(96,165,250,0.18);border-radius:12px;font-size:11px;color:#E2E8F0;font-family:'JetBrains Mono',monospace;min-width:160px;box-shadow:0 8px 32px rgba(0,0,0,0.6)">
          <div style="color:#4B5563;margin-bottom:8px;font-size:9px;letter-spacing:0.1em">${date}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px">
            <div style="color:#4B5563;font-size:9px">OPEN</div><div style="color:${color}">${symbol}${o.toFixed(2)}</div>
            <div style="color:#4B5563;font-size:9px">HIGH</div><div style="color:${upColor}">${symbol}${h.toFixed(2)}</div>
            <div style="color:#4B5563;font-size:9px">LOW</div><div style="color:${downColor}">${symbol}${l.toFixed(2)}</div>
            <div style="color:#4B5563;font-size:9px">CLOSE</div><div style="color:${color};font-weight:700">${symbol}${c.toFixed(2)}</div>
            <div style="color:#4B5563;font-size:9px">VOL</div><div style="color:#9CA3AF;font-size:10px">${(vol / 1e6).toFixed(1)}M</div>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);color:${color};font-size:10px;font-weight:700">${c >= o ? '▲' : '▼'} ${chgPct}%</div>
        </div>`
            },
        },
    }

    const lineOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'area',
            background: 'transparent',
            toolbar: { show: false },
            animations: { enabled: true, speed: 700 },
            zoom: { enabled: false },
        },
        stroke: { curve: 'smooth', width: 2, colors: [accentColor] },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0,
                stops: [0, 100],
                colorStops: [{ offset: 0, color: accentColor, opacity: 0.3 }, { offset: 100, color: accentColor, opacity: 0 }],
            },
        },
        grid: { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 3 },
        xaxis: baseXOptions,
        yaxis: { ...baseYOptions },
        tooltip: {
            theme: 'dark',
            y: { formatter: (v: number) => `${currencySymbol}${v.toFixed(2)}` },
        },
        markers: { size: 0, hover: { size: 4 } },
    }

    const volumeOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar',
            background: 'transparent',
            toolbar: { show: false },
            animations: { enabled: true, speed: 500 },
            zoom: { enabled: false },
        },
        plotOptions: { bar: { columnWidth: '70%' } },
        grid: { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 3, yaxis: { lines: { show: true } } },
        xaxis: { ...baseXOptions, labels: { show: false } },
        yaxis: {
            labels: {
                style: { colors: '#6B7280', fontSize: '10px' },
                formatter: (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${v}`,
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        tooltip: {
            theme: 'dark',
            y: { formatter: (v: number) => `${(v / 1e6).toFixed(1)}M shares` },
        },
        dataLabels: { enabled: false },
    }

    if (loading) return <SkeletonBar />
    if (!mounted || candles.length === 0) return (
        <div className="h-64 flex items-center justify-center text-sm" style={{ color: '#6B7280' }}>
            Run a forecast to view chart data
        </div>
    )

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-1">

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                {/* Left: ticker label + prediction badge + range change */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono font-bold" style={{ color: '#4B5563', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                        {ticker} · {range} CHART
                    </span>
                    {rangeChg !== null && (
                        <span className="mono font-bold px-2 py-0.5 rounded-full"
                            style={{
                                fontSize: '0.58rem', letterSpacing: '0.06em',
                                background: rangeChgUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                color: rangeChgUp ? '#10B981' : '#EF4444',
                                border: `1px solid ${rangeChgUp ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            }}>
                            {rangeChgUp ? '▲' : '▼'} {Math.abs(parseFloat(rangeChg))}%
                        </span>
                    )}
                    {prediction && (
                        <motion.span
                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className={`mono flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${prediction === 'UP' ? 'text-green-400' : 'text-red-400'}`}
                            style={{
                                background: prediction === 'UP' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                border: `1px solid ${prediction === 'UP' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                fontSize: '0.58rem',
                            }}>
                            {prediction === 'UP' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            AI: {prediction}
                        </motion.span>
                    )}
                </div>

                {/* Right: time range tabs + chart mode toggle */}
                <div className="flex items-center gap-1.5">
                    {/* Time range */}
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

                    {/* Separator */}
                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

                    {/* Chart mode */}
                    {([['candlestick', BarChart2], ['line', GitCommitHorizontal]] as const).map(([m, Icon]) => (
                        <motion.button key={m} whileTap={{ scale: 0.95 }}
                            onClick={() => setMode(m as ChartMode)}
                            className="mono flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                            style={{
                                fontSize: '0.6rem', letterSpacing: '0.06em',
                                background: mode === m ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
                                color: mode === m ? '#60A5FA' : '#6B7280',
                                border: `1px solid ${mode === m ? 'rgba(37,99,235,0.35)' : 'rgba(255,255,255,0.06)'}`,
                                boxShadow: mode === m ? '0 0 12px rgba(37,99,235,0.2)' : 'none',
                            }}>
                            <Icon size={11} />
                            {m === 'candlestick' ? 'CANDLES' : 'LINE'}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Main chart */}
            <motion.div
                key={`${mode}-${range}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{ height: 260 }}>
                {mode === 'candlestick' ? (
                    <ReactApexChart type="line" series={combinedSeries} options={candlestickOptions} height={260} />
                ) : (
                    <ReactApexChart type="area" series={combinedSeries} options={lineOptions} height={260} />
                )}
            </motion.div>

            {/* Volume chart */}
            <div className="mt-1">
                <div className="mono mb-1" style={{ color: '#374151', fontSize: '0.6rem', letterSpacing: '0.1em' }}>VOLUME</div>
                <ReactApexChart type="bar" series={volumeSeries} options={volumeOptions} height={72} />
            </div>
        </motion.div>
    )
}
