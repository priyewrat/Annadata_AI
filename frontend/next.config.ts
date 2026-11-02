import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable persistent filesystem pack cache in dev on Windows/OneDrive to prevent ENOENT pack.gz desync
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
