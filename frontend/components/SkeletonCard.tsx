'use client'

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div
            className={`rounded-xl p-4 animate-pulse ${className}`}
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="h-3 w-24 rounded mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-7 w-32 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
    )
}

export function SkeletonChart({ height = 320 }: { height?: number }) {
    return (
        <div
            className="rounded-xl animate-pulse"
            style={{ height, background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="h-full flex flex-col justify-end px-4 pb-4 gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded"
                        style={{
                            height: `${Math.random() * 60 + 10}%`,
                            background: `rgba(37,99,235,${0.04 + i * 0.01})`,
                            alignSelf: 'flex-end',
                            width: `${100 / 12 - 1}%`,
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2 animate-pulse">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-3 rounded"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        width: i === lines - 1 ? '60%' : '100%',
                    }}
                />
            ))}
        </div>
    )
}
