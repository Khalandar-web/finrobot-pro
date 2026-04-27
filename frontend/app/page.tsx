'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import HUDOverlay from '@/components/HUDOverlay'
import NeuralBackground from '@/components/NeuralBackground'

const MarketHeroChart = dynamic(() => import('@/components/MarketHeroChart'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>,
})

const TAGLINES = [
  'AI-Powered Financial Intelligence.',
  'Institutional-Grade Market Analysis.',
  'Your Edge in Every Trade.',
  'Real-Time. AI-Driven. Precise.',
]

function TypewriterTagline() {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'hold' | 'erasing'>('typing')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const phrase = TAGLINES[phraseIdx]

    if (phase === 'typing') {
      if (displayed.length < phrase.length) {
        timeoutRef.current = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 40)
      } else {
        timeoutRef.current = setTimeout(() => setPhase('hold'), 2000)
      }
    } else if (phase === 'hold') {
      timeoutRef.current = setTimeout(() => setPhase('erasing'), 600)
    } else if (phase === 'erasing') {
      if (displayed.length > 0) {
        timeoutRef.current = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 20)
      } else {
        setPhraseIdx(i => (i + 1) % TAGLINES.length)
        setPhase('typing')
      }
    }

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [displayed, phase, phraseIdx])

  return (
    <span className="inline-block">
      <span style={{ color: '#60A5FA' }}>{displayed}</span>
      <span
        className="inline-block w-0.5 h-4 ml-px align-middle"
        style={{
          background: '#60A5FA',
          animation: 'hudBlink 0.9s ease-in-out infinite',
          boxShadow: '0 0 6px #60A5FA',
        }}
      />
    </span>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cardHovered, setCardHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please enter your email and password.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    toast.success('Welcome back!')
    router.push('/dashboard')
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    })
  }

  return (
    <div className="min-h-screen flex flex-col animated-gradient-bg" onMouseMove={handleMouseMove}>

      {/* Ambient light blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div style={{
          position: 'absolute', top: '15%', left: '8%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'gradientShift 8s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '5%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'gradientShift 10s ease-in-out infinite alternate-reverse',
        }} />
      </div>

      {/* Top nav bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,8,15,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)', boxShadow: '0 0 16px rgba(37,99,235,0.5)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" opacity="0.9" />
              <circle cx="8" cy="8" r="2.5" fill="white" />
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">
            FinRobot <span className="gradient-text font-bold">Pro</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" style={{ boxShadow: '0 0 8px #34d399' }} />
          <span className="text-sm font-medium mono" style={{ color: '#6B7280', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
            AI ENGINE ONLINE
          </span>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex flex-1 pt-16">

        {/* LEFT — 3D robot hero */}
        <div className="relative flex-1 flex flex-col justify-end overflow-hidden" style={{ minHeight: '100vh' }}>
          <NeuralBackground />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="absolute inset-0 z-10 p-8 pt-20 pb-40 pointer-events-none">
            {/* Ambient Chart Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-blue-900/20 blur-3xl rounded-full animate-pulse" style={{ width: '80%', height: '80%', left: '10%', top: '10%' }} />
            <div className="relative z-10 w-full h-full pointer-events-auto">
              <MarketHeroChart />
            </div>
          </motion.div>

          <HUDOverlay />

          <div className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(2,6,23,1) 0%, rgba(2,6,23,0.4) 50%, transparent 85%)' }} />

          {/* Bottom hero text */}
          <div className="relative z-30 p-10 pb-14">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.5 }}>
              {/* Dynamic Status Text */}
              <div className="flex flex-col gap-2.5 mb-8">
                 <div className="flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 10px #34d399' }} />
                   <span className="text-[0.75rem] font-bold tracking-widest text-[#10B981] mono">AI ENGINE ONLINE</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '200ms', boxShadow: '0 0 10px #60A5FA' }} />
                   <span className="text-[0.75rem] font-bold tracking-widest text-blue-400 mono">MARKET DATA LIVE</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '400ms', boxShadow: '0 0 10px #A78BFA' }} />
                   <span className="text-[0.75rem] font-bold tracking-widest text-purple-400 mono">ANALYSIS READY</span>
                 </div>
              </div>

              <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                Smart Financial Insights
              </h1>
              <p className="text-base mb-1" style={{ color: '#6B7280', lineHeight: 1.7 }}>
                Generate professional equity research reports.
              </p>
              <p className="text-sm font-medium h-6">
                <TypewriterTagline />
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
              className="flex gap-3 mt-6 flex-wrap">
              {['Market Forecast', 'Annual Reports', 'Risk Analysis', 'Real-Time Data'].map(tag => (
                <span key={tag} className="text-xs px-3 py-1.5 rounded-full font-medium mono"
                  style={{
                    background: 'rgba(37,99,235,0.08)',
                    border: '1px solid rgba(37,99,235,0.25)',
                    color: '#60A5FA',
                    letterSpacing: '0.06em',
                  }}>
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* RIGHT — login form */}
        <div className="flex items-center justify-center w-full max-w-lg px-8 py-12 relative"
          style={{ background: 'rgba(6,8,15,0.6)', backdropFilter: 'blur(20px)' }}>

          <div className="absolute top-1/2 left-0 w-80 h-80 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', filter: 'blur(30px)' }} />

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22,1,0.36,1] }}
            className="w-full max-w-sm relative"
            onMouseEnter={() => setCardHovered(true)}
            onMouseLeave={() => setCardHovered(false)}>

            <div className="login-glass-card p-8 rounded-2xl relative overflow-hidden">
              <div className="card-top-glow" />

              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)', boxShadow: '0 0 16px rgba(37,99,235,0.4)' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" opacity="0.9" />
                    <circle cx="8" cy="8" r="2.5" fill="white" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white mono" style={{ letterSpacing: '0.04em' }}>FinRobot Pro</span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
              <p className="text-sm mb-7" style={{ color: '#6B7280' }}>Sign in to access your AI trading dashboard</p>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold mb-2 mono" style={{ color: '#9CA3AF', letterSpacing: '0.08em' }}>
                    EMAIL ADDRESS
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="trader@hedgefund.com"
                      className="fin-input-neo w-full px-4 py-3 rounded-xl text-sm"
                      autoComplete="email" />
                    <div className="input-glow-line" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2 mono" style={{ color: '#9CA3AF', letterSpacing: '0.08em' }}>
                    PASSWORD
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="fin-input-neo w-full px-4 py-3 rounded-xl text-sm"
                      autoComplete="current-password" />
                    <div className="input-glow-line" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600" />
                    <span className="text-xs" style={{ color: '#6B7280' }}>Remember device</span>
                  </label>
                  <button type="button" className="text-xs font-medium transition-colors" style={{ color: '#60A5FA' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#93C5FD')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#60A5FA')}>
                    Forgot password?
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="btn-neo w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                      </svg>
                      Authenticating…
                    </>
                  ) : (
                    <>
                      Access Dashboard
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-center mt-6" style={{ color: '#6B7280' }}>
                New to FinRobot?{' '}
                <button className="font-semibold transition-colors" style={{ color: '#60A5FA' }}>
                  Request access
                </button>
              </p>

              <div className="mt-5 p-3 rounded-xl text-xs text-center mono"
                style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)', color: '#4B5563', letterSpacing: '0.04em' }}>
                DEMO: any email + password to continue
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
