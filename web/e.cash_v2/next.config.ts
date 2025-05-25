// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { NextConfig } from "next";

import { redirects } from "./app/data/redirects";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.scorecard.cash",
      },
      {
        protocol: "https",
        hostname: "strapi.fabien.cash",
      },
    ],
  },
  redirects,
  async headers() {
    return [
      {
        source: "/(.*?)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              process.env.NODE_ENV === "development"
                ? `default-src 'self' https: wss: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data:;`
                : `default-src https: wss: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data:;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
