/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['tesseract.js'],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.app.github.dev', 'localhost:3000'],
    },
  },
};

export default nextConfig;