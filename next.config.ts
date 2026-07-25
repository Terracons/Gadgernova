import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Product images use plain <img> pointing at R2 or /uploads, so next/image
  // optimisation isn't involved. If you switch to next/image, add your bucket
  // hostname to images.remotePatterns here.

  experimental: {
    serverActions: {
      // Product photos from a phone camera are routinely 8–10 MB.
      bodySizeLimit: "15mb",
    },
  },

  eslint: {
    // Keeps `next build` from failing a buyer's deploy over lint style.
    ignoreDuringBuilds: true,
  },
};

export default config;
