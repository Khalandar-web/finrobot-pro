'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, TrendingUp, FileText, Briefcase,
    Settings, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard',               color: '#60A5FA' },
    { icon: TrendingUp,      label: 'AI Forecast',  href: '/dashboard',               color: '#34D399' },
    { icon: FileText,        label: 'Annual Report', href: '/dashboard/annual-report', color: '#A78BFA' },
    { icon: Briefcase,       label: 'Portfolio',    href: '/dashboard/portfolio',      color: '#F59E0B' },
    { icon: Settings,        label: 'Settings',     href: '/dashboard/settings',       color: '#9CA3AF' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [hoveredHref, setHoveredHref] = useState<string | null>(null)

    // Sync sidebar width to CSS variable so layout can react without prop drilling
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-w', collapsed ? '68px' : '232px')
    }, [collapsed])

    return (
        <motion.aside
            animate={{ width: collapsed ? 68 : 232 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 top-0 h-screen flex flex-col z-40 overflow-hidden sidebar-premium">

            {/* Logo */}
            <div className="flex items-center px-4 py-4 gap-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: 60 }}>
                <div className="w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                        boxShadow: '0 0 16px rgba(37,99,235,0.5)',
                    }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" opacity="0.9" />
                        <circle cx="8" cy="8" r="2.5" fill="white" />
                    </svg>
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                            <p className="font-bold text-white text-sm leading-none">
                                FinRobot <span className="gradient-text">Pro</span>
                            </p>
                            <p className="mono mt-0.5" style={{ color: '#4B5563', fontSize: '0.52rem', letterSpacing: '0.1em' }}>
                                AI TRADING TERMINAL
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Label */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="mono px-4 pt-4 pb-1.5"
                        style={{ color: '#374151', fontSize: '0.52rem', letterSpacing: '0.14em', fontWeight: 600 }}>
                        NAVIGATION
                    </motion.p>
                )}
            </AnimatePresence>

            {/* Nav */}
            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-hidden">
                {NAV_ITEMS.map(({ icon: Icon, label, href, color }) => {
                    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                    const isHovered = hoveredHref === href

                    return (
                        <Link key={href} href={href}>
                            <div
                                className={`nav-item flex items-center gap-3 px-3 py-2.5 cursor-pointer ${isActive ? 'active' : ''}`}
                                title={collapsed ? label : undefined}
                                onMouseEnter={() => setHoveredHref(href)}
                                onMouseLeave={() => setHoveredHref(null)}>

                                <div className="relative flex-shrink-0">
                                    <Icon size={17}
                                        style={{
                                            color: isActive ? color : (isHovered ? color : '#6B7280'),
                                            transition: 'color 0.2s',
                                            filter: isActive ? `drop-shadow(0 0 6px ${color}80)` : 'none',
                                        }} />
                                </div>

                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="text-sm font-medium whitespace-nowrap"
                                            style={{ color: isActive ? color : (isHovered ? '#E2E8F0' : '#6B7280'), transition: 'color 0.2s' }}>
                                            {label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>

                                {/* Active indicator dot */}
                                {isActive && collapsed && (
                                    <div className="absolute right-1 w-1 h-1 rounded-full"
                                        style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                                )}
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 12px' }} />

            {/* Bottom */}
            <div className="p-2 space-y-0.5 pb-4">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="nav-item w-full flex items-center gap-3 px-3 py-2.5">
                    {collapsed
                        ? <ChevronRight size={17} style={{ color: '#6B7280' }} />
                        : <ChevronLeft size={17} style={{ color: '#6B7280' }} />}
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-sm font-medium whitespace-nowrap" style={{ color: '#6B7280' }}>
                                Collapse
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>

                <Link href="/">
                    <div className="nav-item flex items-center gap-3 px-3 py-2.5 cursor-pointer
                        hover:text-red-400 group">
                        <LogOut size={17} className="text-gray-600 group-hover:text-red-400 transition-colors" />
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="text-sm font-medium whitespace-nowrap text-gray-600 group-hover:text-red-400 transition-colors">
                                    Sign Out
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </Link>
            </div>
        </motion.aside>
    )
}
