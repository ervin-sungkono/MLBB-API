/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: [
          'puppeteer-core',
          '@sparticuz/chromium-min',
        ],
    },
};

export default nextConfig;
