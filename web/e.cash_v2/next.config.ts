// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { NextConfig } from "next";

import { redirects } from "./app/data/redirects";

const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "'self' 'unsafe-inline' 'unsafe-eval' swapzone.io"
    : "'self' 'unsafe-inline' googletagmanager.com google-analytics.com swapzone.io";

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
            value: `
            default-src 'self';
            script-src ${scriptSrc};
            style-src 'self' 'unsafe-inline' fonts.googleapis.com;
            font-src 'self' fonts.gstatic.com data:;
            img-src 'self' blob: google-analytics.com https: data:;
            connect-src 'self' google-analytics.com region1.google-analytics.com;
            object-src 'none';
            base-uri 'self';
            frame-ancestors 'none';
            frame-src 'self' https://swapspace.co https://swapzone.io;
            form-action 'self';
            upgrade-insecure-requests;
          `
              .replace(/\s{2,}/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },
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
