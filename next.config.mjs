/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@sparticuz/chromium'],
    },
};

export default nextConfig;
