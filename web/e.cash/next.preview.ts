// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Preview config distinct from production config
// For now, the only difference is the absence of async headers() {

import type { NextConfig } from "next";

import { redirects } from "./app/data/redirects";

const strapi = new URL(process.env.NEXT_PUBLIC_STRAPI_URL!);
const strapiScorecard = new URL(process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL!);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [strapi, strapiScorecard],
  },
  redirects,
  async rewrites() {
    return [
      {
        source: "/build",
        destination: "/build-on-ecash",
      },
    ];
  },
};

export default nextConfig;
