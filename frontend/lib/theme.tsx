'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextValue {
    theme: Theme
    setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'finrobot_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        try {
            const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
            if (saved === 'light' || saved === 'dark') {
                setThemeState(saved)
            }
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        if (!mounted) return
        const root = document.documentElement
        if (theme === 'light') {
            root.classList.add('light')
            root.classList.remove('dark')
        } else {
            root.classList.add('dark')
            root.classList.remove('light')
        }
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch { /* ignore */ }
    }, [theme, mounted])

    const setTheme = (t: Theme) => {
        setThemeState(t)
    }

    // Optional: Avoid flashing unstyled content for theme, but for Next.js 
    // it's tricky without a script tag in layout. We'll rely on the default 'dark'
    // since the app is mainly a dark theme app initially.

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
    return ctx
}
