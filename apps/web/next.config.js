/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lifeos/shared'],
  eslint: {
    dirs: ['src'],
  },
}

module.exports = nextConfig