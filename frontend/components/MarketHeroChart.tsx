'use client'

import React, { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

export default function MarketHeroChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        // 1. Instantiating the Chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                // Fully transparent so our glowing #020617 tailwind background shows natively
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.4)',
                fontFamily: 'monospace',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.04)', style: 1 },
                horzLines: { color: 'rgba(255, 255, 255, 0.04)', style: 1 },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.3, // Leave space for volume
                },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 12,
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { width: 1, color: 'rgba(255, 255, 255, 0.1)', style: 0 },
                horzLine: { width: 1, color: 'rgba(255, 255, 255, 0.1)', style: 0 },
            },
        })

        // 2. Attach Chart Series
        const candleSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        })

        const volumeSeries = chart.addHistogramSeries({
            color: 'rgba(96, 165, 250, 0.25)', // Smooth purple/blue blend
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        })

        chart.priceScale('').applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        })

        // 3. Generate initial Realistic OHLC Data
        let currentTime = Math.floor(Date.now() / 1000) - (86400 * 30) // 30 days back
        let currentPrice = 180.50

        const initialCandles = []
        const initialVolume = []

        const generateTick = (time: number, prevClose: number) => {
            const volatility = 0.5
            const rand = Math.random() - 0.48 // Slight upward bias
            const change = prevClose * (rand * volatility) / 100
            
            const open = prevClose
            const close = open + change
            const high = Math.max(open, close) + (Math.random() * 0.4)
            const low = Math.min(open, close) - (Math.random() * 0.4)
            const isUp = close >= open
            
            return {
                candle: { time, open, high, low, close },
                volume: {
                    time,
                    value: Math.random() * 1000 + 500,
                    color: isUp ? 'rgba(96, 165, 250, 0.2)' : 'rgba(192, 132, 252, 0.15)', // Blue/Purple blend
                }
            }
        }

        // Build 100 history bars
        for (let i = 0; i < 100; i++) {
            currentTime += 86400 // Daily ticks
            const tick = generateTick(currentTime, currentPrice)
            initialCandles.push(tick.candle)
            initialVolume.push(tick.volume)
            currentPrice = tick.candle.close
        }

        // @ts-ignore - Time types in lightweight charts can be strict, we're using raw unix timestamps
        candleSeries.setData(initialCandles)
        // @ts-ignore
        volumeSeries.setData(initialVolume)

        // 4. Live Tick Animation Simulation
        // We will push a new tick randomly every ~1 second to look "LIVE"
        let liveTime = currentTime
        let livePrice = currentPrice

        const tickInterval = setInterval(() => {
            liveTime += 86400 // Increment date/time
            const tick = generateTick(liveTime, livePrice)
            
            // @ts-ignore
            candleSeries.update(tick.candle)
            // @ts-ignore
            volumeSeries.update(tick.volume)
            
            livePrice = tick.candle.close
        }, 1200)

        // Force Fit Canvas
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                })
            }
        }
        window.addEventListener('resize', handleResize)
        handleResize() // init size

        return () => {
            clearInterval(tickInterval)
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [])

    return (
        <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
            <div ref={chartContainerRef} className="absolute inset-0 pointer-events-auto" />
        </div>
    )
}
