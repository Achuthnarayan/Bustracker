/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow leaflet to work (it uses window)
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
};

module.exports = nextConfig;
