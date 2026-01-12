// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { NextConfig } from "next";

import { redirects } from "./app/data/redirects";

const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com 'unsafe-eval'";

const strapi = new URL(process.env.NEXT_PUBLIC_STRAPI_URL!);
const strapiScorecard = new URL(process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL!);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [strapi, strapiScorecard],
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
            script-src-elem ${scriptSrc};
            style-src 'self' 'unsafe-inline' fonts.googleapis.com;
            font-src 'self' fonts.gstatic.com data:;
            img-src 'self' blob: https://www.google-analytics.com https://www.googletagmanager.com https: data:;
            connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://avalanche.cash;
            object-src 'none';
            base-uri 'self';
            frame-ancestors 'none';
            frame-src 'self' https://www.youtube.com;
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
