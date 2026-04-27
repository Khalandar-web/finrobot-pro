/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [],
    },

    transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],

    // ✅ ADD THIS (IMPORTANT)
    eslint: {
        ignoreDuringBuilds: true,
    },

    // Allow cross-origin requests to local backend during development
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://backend:8000/:path*',
            },
        ]
    },
}

module.exports = nextConfig