/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
    async rewrites() {
        const proxyTarget = (process.env.API_PROXY_TARGET || '').replace(/\/$/, '');
        if (!proxyTarget || proxyTarget.includes('localhost')) {
            return [];
        }
        return [
            {
                source: '/api/:path*',
                destination: `${proxyTarget}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
