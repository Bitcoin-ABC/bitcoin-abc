// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export type NavbarLink = {
  title: string;
  href: string;
  category: "main" | "tools" | "more" | "getEcash" | "actions" | "social";
};

export const navbarLinks: NavbarLink[] = [
  // Main
  { title: "Build", href: "/build", category: "main" },
  { title: "Tech", href: "/tech", category: "main" },
  { title: "About", href: "/about", category: "main" },

  // Tools
  { title: "Cashtab", href: "https://cashtab.com", category: "tools" },
  { title: "PayButton", href: "https://paybutton.org", category: "tools" },
  { title: "XECX", href: "https://stakedxec.com/", category: "tools" },
  { title: "Firma", href: "https://firma.cash/", category: "tools" },

  // More
  { title: "Blog", href: "/blog", category: "more" },
  { title: "Roadmap", href: "/roadmap", category: "more" },
  { title: "Explorer", href: "https://explorer.e.cash/", category: "more" },
  { title: "Brand", href: "/brand", category: "more" },

  // Get eCash
  { title: "Mining", href: "/mining", category: "getEcash" },
  { title: "Staking", href: "/staking", category: "getEcash" },
  { title: "Exchanges", href: "/get-ecash", category: "getEcash" },
  { title: "Wallets", href: "/wallets", category: "getEcash" },
  { title: "Use eCash", href: "/use-ecash", category: "getEcash" },

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
];
