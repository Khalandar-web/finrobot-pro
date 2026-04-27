'use client'

/**
 * CurrencyContext — Global USD ↔ INR toggle.
 * Persisted to localStorage. All money formatting goes through useCurrency().
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type Currency = 'USD' | 'INR'

interface CurrencyContextValue {
    currency: Currency
    setCurrency: (c: Currency) => void
    /** Convert a USD number to the active currency */
    convert: (usdValue: number) => number
    /** Format a USD number as a display string with the active symbol */
    fmt: (usdValue: number | null | undefined, opts?: FmtOpts) => string
    /** Format a pre-converted value (already in active currency) with symbol — no conversion */
    fmtRaw: (value: number | null | undefined, opts?: FmtOpts) => string
    /** Symbol string: '$' or '₹' */
    symbol: string
    /** Exchange rate (approximate) */
    rate: number
}

interface FmtOpts {
    /** If true, abbreviate large numbers (T / B / M / Cr / L) */
    compact?: boolean
    /** Decimal places (default: 2) */
    decimals?: number
}

// ── Constants ────────────────────────────────────────────────────────────────

const USD_TO_INR = 83.5   // approximate live rate
const STORAGE_KEY = 'finrobot_currency'

// ── Context ──────────────────────────────────────────────────────────────────

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>('INR')

    // Hydrate from localStorage once mounted
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY) as Currency | null
            if (saved === 'INR' || saved === 'USD') setCurrencyState(saved)
        } catch { /* ignore */ }
    }, [])

    const setCurrency = useCallback((c: Currency) => {
        setCurrencyState(c)
        try { localStorage.setItem(STORAGE_KEY, c) } catch { /* ignore */ }
    }, [])

    const rate = currency === 'INR' ? USD_TO_INR : 1
    const symbol = currency === 'INR' ? '₹' : '$'

    const convert = useCallback((usd: number) => usd * rate, [rate])

    const fmt = useCallback((
        usdValue: number | null | undefined,
        opts: FmtOpts = {}
    ): string => {
        if (usdValue == null || isNaN(usdValue)) return '—'
        const val = usdValue * rate
        const { compact = false, decimals = 2 } = opts

        if (compact) {
            if (currency === 'INR') {
                // Indian numbering: Cr (crore) = 10M, L (lakh) = 100k
                const absVal = Math.abs(val)
                if (absVal >= 1e12) return `${symbol}${(val / 1e12).toFixed(1)}T`
                if (absVal >= 1e11) return `${symbol}${(val / 1e7).toFixed(0)}Cr`   // 100Bn INR → Cr
                if (absVal >= 1e7)  return `${symbol}${(val / 1e7).toFixed(1)}Cr`
                if (absVal >= 1e5)  return `${symbol}${(val / 1e5).toFixed(1)}L`
                if (absVal >= 1e3)  return `${symbol}${(val / 1e3).toFixed(1)}K`
            } else {
                const absVal = Math.abs(val)
                if (absVal >= 1e12) return `${symbol}${(val / 1e12).toFixed(2)}T`
                if (absVal >= 1e9)  return `${symbol}${(val / 1e9).toFixed(1)}B`
                if (absVal >= 1e6)  return `${symbol}${(val / 1e6).toFixed(1)}M`
                if (absVal >= 1e3)  return `${symbol}${(val / 1e3).toFixed(1)}K`
            }
        }

        return `${symbol}${val.toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })}`
    }, [rate, symbol, currency])

    // Format a value already in the active currency (no conversion)
    const fmtRaw = useCallback((
        value: number | null | undefined,
        opts: FmtOpts = {}
    ): string => {
        if (value == null || isNaN(value)) return '—'
        const val = value
        const { compact = false, decimals = 2 } = opts

        if (compact) {
            if (currency === 'INR') {
                const absVal = Math.abs(val)
                if (absVal >= 1e12) return `${symbol}${(val / 1e12).toFixed(1)}T`
                if (absVal >= 1e11) return `${symbol}${(val / 1e7).toFixed(0)}Cr`
                if (absVal >= 1e7)  return `${symbol}${(val / 1e7).toFixed(1)}Cr`
                if (absVal >= 1e5)  return `${symbol}${(val / 1e5).toFixed(1)}L`
                if (absVal >= 1e3)  return `${symbol}${(val / 1e3).toFixed(1)}K`
            } else {
                const absVal = Math.abs(val)
                if (absVal >= 1e12) return `${symbol}${(val / 1e12).toFixed(2)}T`
                if (absVal >= 1e9)  return `${symbol}${(val / 1e9).toFixed(1)}B`
                if (absVal >= 1e6)  return `${symbol}${(val / 1e6).toFixed(1)}M`
                if (absVal >= 1e3)  return `${symbol}${(val / 1e3).toFixed(1)}K`
            }
        }

        return `${symbol}${val.toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })}`
    }, [symbol, currency])

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, convert, fmt, fmtRaw, symbol, rate }}>
            {children}
        </CurrencyContext.Provider>
    )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrency(): CurrencyContextValue {
    const ctx = useContext(CurrencyContext)
    if (!ctx) throw new Error('useCurrency must be used inside <CurrencyProvider>')
    return ctx
}
