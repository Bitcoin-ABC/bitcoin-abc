// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Consolidated list of redirects for next.config.js and next.preview.js

export const redirects = async (): Promise<
  {
    source: string;
    destination: string;
    permanent: boolean;
  }[]
> => [
  {
    source: "/roadmap-explained",
    destination: "/roadmap",
    permanent: true,
  },
  {
    source: "/ecash-brand",
    destination: "/brand",
    permanent: true,
  },
  {
    source: "/developers",
    destination: "/build",
    permanent: true,
  },
  {
    source: "/wealth-redefined",
    destination: "/what-is-ecash",
    permanent: true,
  },
];
