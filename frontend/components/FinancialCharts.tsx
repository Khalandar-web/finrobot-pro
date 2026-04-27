'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { RevenuePoint, EPSPoint } from '@/lib/api'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface FinancialChartsProps {
    ticker: string
    revenue: RevenuePoint[]
    eps: EPSPoint[]
    loading: boolean
}

export default function FinancialCharts({ ticker, revenue, eps, loading }: FinancialChartsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map(i => (
                    <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', height: 220 }}>
                        <div className="h-3 w-28 rounded mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-full flex items-end gap-2 pb-4">
                            {[40, 55, 70, 80].map((h, j) => (
                                <div key={j} className="flex-1 rounded" style={{ height: `${h}%`, background: 'rgba(37,99,235,0.08)' }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (!revenue.length) return null

    const revenueOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar',
            background: 'transparent',
            toolbar: { show: false },
            animations: { enabled: true, speed: 700, animateGradually: { enabled: true, delay: 80 } },
        },
        plotOptions: {
            bar: {
                borderRadius: 5,
                columnWidth: '55%',
                dataLabels: { position: 'top' },
            },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: 'vertical',
                gradientToColors: ['#1D4ED8'],
                stops: [0, 100],
            },
        },
        colors: ['#2563EB', '#10B981'],
        dataLabels: {
            enabled: true,
            formatter: (v: number) => `₹${v}B`,
            style: { fontSize: '10px', colors: ['#9CA3AF'] },
            offsetY: -18,
        },
        grid: { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 3, yaxis: { lines: { show: true } } },
        xaxis: {
            categories: revenue.map(r => r.year),
            labels: { style: { colors: '#6B7280', fontSize: '11px' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#6B7280', fontSize: '10px' },
                formatter: (v: number) => `₹${v}B`,
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        legend: { show: true, labels: { colors: '#9CA3AF' }, fontSize: '11px' },
        tooltip: {
            theme: 'dark',
            y: { formatter: (v: number) => `₹${v}B` },
        },
    }

    const epsOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'line',
            background: 'transparent',
            toolbar: { show: false },
            animations: { enabled: true, speed: 700 },
        },
        stroke: { curve: 'smooth', width: 3, colors: ['#A78BFA'] },
        markers: {
            size: 5,
            colors: ['#A78BFA'],
            strokeColors: '#0D1117',
            strokeWidth: 2,
            hover: { size: 7 },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.2,
                opacityTo: 0,
                colorStops: [{ offset: 0, color: '#A78BFA', opacity: 0.25 }, { offset: 100, color: '#A78BFA', opacity: 0 }],
            },
        },
        grid: { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 3 },
        xaxis: {
            categories: eps.map(e => e.year),
            labels: { style: { colors: '#6B7280', fontSize: '11px' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#6B7280', fontSize: '10px' },
                formatter: (v: number) => `₹${v.toFixed(2)}`,
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => `₹${v.toFixed(2)}`,
            style: { fontSize: '10px', colors: ['#A78BFA'] },
            background: { enabled: false },
        },
        tooltip: {
            theme: 'dark',
            y: { formatter: (v: number) => `₹${v.toFixed(2)} EPS` },
        },
    }

    const revenueSeries = [
        { name: 'Revenue', data: revenue.map(r => r.revenue) },
        { name: 'Gross Profit', data: revenue.map(r => r.gross_profit) },
    ]

    const epsSeries = [{ name: 'EPS', data: eps.map(e => e.eps) }]

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Revenue chart */}
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>Revenue Growth</p>
                        <p className="text-sm font-semibold text-white">{ticker} — Annual (INR Billions)</p>
                    </div>
                </div>
                <ReactApexChart
                    type="bar"
                    series={revenueSeries}
                    options={revenueOptions}
                    height={165}
                />
            </div>

            {/* EPS chart */}
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>EPS Trend</p>
                        <p className="text-sm font-semibold text-white">{ticker} — Earnings Per Share</p>
                    </div>
                </div>
                <ReactApexChart
                    type="line"
                    series={epsSeries}
                    options={epsOptions}
                    height={165}
                />
            </div>
        </motion.div>
    )
}
