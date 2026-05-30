/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    },
    async rewrites() {
        const proxyTarget = (
            process.env.API_PROXY_TARGET ||
            process.env.NEXT_PUBLIC_API_URL ||
            'http://localhost:8000'
        ).replace(/\/$/, '');

        return [
            {
                source: '/api/:path*',
                destination: `${proxyTarget}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
