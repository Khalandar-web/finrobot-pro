'use client'

import { useEffect, useRef } from 'react'

export default function NeuralBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width = canvas.offsetWidth
        let height = canvas.offsetHeight
        canvas.width = width
        canvas.height = height

        const PARTICLE_COUNT = 80
        const CONNECTION_DIST = 140

        interface Particle {
            x: number; y: number; vx: number; vy: number
            size: number; opacity: number; pulsePhase: number
            hue: number
        }

        const particles: Particle[] = []
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                size: Math.random() * 1.8 + 0.8,
                opacity: Math.random() * 0.5 + 0.15,
                pulsePhase: Math.random() * Math.PI * 2,
                hue: Math.random() > 0.7 ? 270 : 220,  // 30% purple tint
            })
        }

        // Light wave anchors (moving gradient blobs)
        const blobs = [
            { x: width * 0.25, y: height * 0.4, vx: 0.12, vy: 0.08, r: width * 0.5 },
            { x: width * 0.7, y: height * 0.6, vx: -0.1, vy: 0.07, r: width * 0.45 },
        ]

        let t = 0
        const draw = () => {
            t += 0.01
            ctx.clearRect(0, 0, width, height)

            // Moving blob radial gradients (light waves)
            for (const b of blobs) {
                b.x += b.vx
                b.y += b.vy
                if (b.x < 0 || b.x > width) b.vx *= -1
                if (b.y < 0 || b.y > height) b.vy *= -1

                const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
                grad.addColorStop(0, 'rgba(37,99,235,0.045)')
                grad.addColorStop(0.5, 'rgba(124,58,237,0.02)')
                grad.addColorStop(1, 'rgba(11,15,25,0)')
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, width, height)
            }

            // Connections with glow
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x
                    const dy = particles[i].y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < CONNECTION_DIST) {
                        const alpha = (1 - dist / CONNECTION_DIST) * 0.2
                        const avgHue = (particles[i].hue + particles[j].hue) / 2
                        const sat = avgHue > 240 ? '80%' : '90%'
                        ctx.beginPath()
                        ctx.strokeStyle = `hsla(${avgHue},${sat},70%,${alpha})`
                        ctx.lineWidth = 0.7
                        ctx.moveTo(particles[i].x, particles[i].y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.stroke()
                    }
                }
            }

            // Particles
            for (const p of particles) {
                p.x += p.vx
                p.y += p.vy
                if (p.x < -10) p.x = width + 10
                if (p.x > width + 10) p.x = -10
                if (p.y < -10) p.y = height + 10
                if (p.y > height + 10) p.y = -10

                const pulse = 0.5 + 0.5 * Math.sin(t * 1.8 + p.pulsePhase)
                const alpha = p.opacity * (0.6 + 0.4 * pulse)

                // Outer glow (larger, softer)
                const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6)
                glowGrad.addColorStop(0, `hsla(${p.hue},90%,70%,${alpha * 0.5})`)
                glowGrad.addColorStop(1, `hsla(${p.hue},90%,70%,0)`)
                ctx.beginPath()
                ctx.fillStyle = glowGrad
                ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2)
                ctx.fill()

                // Core dot
                ctx.beginPath()
                ctx.fillStyle = `hsla(${p.hue},90%,78%,${alpha})`
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fill()
            }

            rafRef.current = requestAnimationFrame(draw)
        }

        draw()

        const handleResize = () => {
            width = canvas.offsetWidth
            height = canvas.offsetHeight
            canvas.width = width
            canvas.height = height
        }
        window.addEventListener('resize', handleResize)
        return () => {
            cancelAnimationFrame(rafRef.current)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none', zIndex: 0 }}
        />
    )
}
