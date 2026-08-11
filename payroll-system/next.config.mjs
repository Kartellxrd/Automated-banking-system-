/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ['*.app.github.dev', 'localhost:3000'],
    },
  },
};

export default nextConfig;