// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export type NavbarLink = {
  title: string;
  href: string;
  category:
    | "main"
    | "about"
    | "tools"
    | "get-ecash"
    | "more"
    | "actions"
    | "social";
};

export const navbarLinks: NavbarLink[] = [
  // Main
  { title: "Build", href: "/build", category: "main" },
  { title: "Tech", href: "/tech", category: "main" },

  // About
  { title: "About", href: "/about", category: "about" },
  { title: "Blog", href: "/blog", category: "about" },
  { title: "Roadmap", href: "/roadmap", category: "about" },
  { title: "Careers", href: "/careers", category: "about" },
  { title: "Brand", href: "/brand", category: "about" },
  { title: "Wallets", href: "/wallets", category: "about" },

  // Tools
  { title: "Cashtab", href: "https://cashtab.com", category: "tools" },
  { title: "PayButton", href: "https://paybutton.org", category: "tools" },
  { title: "XECX", href: "https://stakedxec.com/", category: "tools" },
  { title: "Firma", href: "https://firma.cash/", category: "tools" },
  { title: "Explorer", href: "https://explorer.e.cash/", category: "tools" },

  // Get eCash
  { title: "Mining", href: "/mining", category: "get-ecash" },
  { title: "Staking", href: "/staking", category: "get-ecash" },
  { title: "Exchanges", href: "/get-ecash", category: "get-ecash" },
  { title: "Use eCash", href: "/use-ecash", category: "get-ecash" },

  // More
  { title: "GNC", href: "https://gnc.e.cash", category: "more" },
  {
    title: "Avalanche on eCash",
    href: "https://avalanche.cash",
    category: "more",
  },
  {
    title: "eCash Scorecard",
    href: "https://scorecard.cash",
    category: "more",
  },
  { title: "eCash Supply", href: "https://ecash.supply", category: "more" },
  {
    title: "eCash Community",
    href: "https://ecash.community",
    category: "more",
  },

  // Actions
  { title: "Create wallet", href: "https://cashtab.com", category: "actions" },
  { title: "Start building", href: "/build", category: "actions" },

  // Social
  {
    title: "Facebook",
    href: "https://www.facebook.com/ecashofficial",
    category: "social",
  },
  { title: "X", href: "https://x.com/eCash", category: "social" },
  {
    title: "LinkedIn",
    href: "https://www.linkedin.com/company/ecashofficial/",
    category: "social",
  },
  {
    title: "YouTube",
    href: "https://www.youtube.com/eCashOfficial",
    category: "social",
  },
  {
    title: "Instagram",
    href: "https://www.instagram.com/ecashnetwork/",
    category: "social",
  },
  {
    title: "GitHub",
    href: "https://github.com/bitcoin-abc/",
    category: "social",
  },
  { title: "Telegram", href: "https://t.me/ecash", category: "social" },
  {
    title: "Discord",
    href: "https://discord.gg/ecash-official-852595915159896114",
    category: "social",
  },
  {
    title: "Reddit",
    href: "https://reddit.com/r/ecash",
    category: "social",
  },
  {
    title: "CoinMarketCap",
    href: "https://coinmarketcap.com/community/profile/eCash/",
    category: "social",
  },
];
