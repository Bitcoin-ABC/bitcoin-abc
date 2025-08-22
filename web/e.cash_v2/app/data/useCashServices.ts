// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface ServiceContent {
  id: string;
  title: string;
  image: string;
  content: {
    paragraphs: string[];
    disclaimer?: string;
    buttons: {
      text: string;
      href: string;
      variant: "gradient" | "white";
    }[];
  };
}

export const useCashServices: ServiceContent[] = [
  {
    id: "TUSDT",
    title: "Tinian U.S. Dollar Token",
    image: "/musd.png",
    content: {
      paragraphs: [
        "TUSDT is the first fully-reserved, fiat-backed stable token issued by a public entity in the United States. Exclusively issued on the eCash blockchain.",
        "TUSDT provides the foundation for blockchain development and distribution of the functions for government such as identity, finance, safety, and administration. Ecosystem development partners can quickly build financial services, standards, and applications with direct access to the TUSDT API.",
      ],
      buttons: [
        {
          text: "Learn More",
          href: "https://dollar.mp",
          variant: "gradient",
        },
      ],
    },
  },
  {
    id: "tixtown",
    title: "TixTown",
    image: "/tixtown.png",
    content: {
      paragraphs: [
        "Experience the fastest, safest, and fairest private event ticketing app. Gain control of your time and money as you host, join, or promote exclusive events.",
        "Guest list management. QR code check-ins. Time-based and upfront pricing models. Instant refunds. Tailored for small and medium in-person private events. Sign up is free forever!",
        "Built using eCash's eToken technology.",
      ],
      buttons: [
        {
          text: "Get Started",
          href: "https://www.tixtown.com/",
          variant: "gradient",
        },
      ],
    },
  },
  {
    id: "paybutton",
    title: "PayButton",
    image: "/paybutton.png",
    content: {
      paragraphs: [
        "The easiest way to accept eCash online. Simply add a few lines of code to start accepting eCash on your website.",
        "Use the PayButton dashboard to track transactions and revenue for your business. Create wallets and manage your buttons to organize payments across all of your websites.",
      ],
      buttons: [
        {
          text: "Get Started",
          href: "https://paybutton.org/",
          variant: "gradient",
        },
      ],
    },
  },
  {
    id: "elps",
    title: "eLPS",
    image: "/elps.png",
    content: {
      paragraphs: [
        "Powering the digital economy in the world's #1 Charter City, the eLempira (eLPS) is a stabletoken built on eCash. It is used for real-world everyday payments such as for rent, utilities, food, gym memberships, haircuts, and more!",
      ],
      buttons: [
        {
          text: "Learn More",
          href: "https://elpstoken.com/",
          variant: "gradient",
        },
      ],
    },
  },
  {
    id: "xecx",
    title: "XECX",
    image: "/xecx.png",
    content: {
      paragraphs: [
        "Earn crypto while you sleep with as little as $1 of XECX. Holders of XECX receive daily eCash staking reward payouts in XEC. Trade XECX for XEC 1:1 on the Agora marketplace.",
        "Built using eCash's ALP technology.",
      ],
      disclaimer:
        "XECX is not XEC. It is a token project built on XEC by a third-party. The 1:1 peg of XECX to XEC is based on trust in XECX operators and their incentives. It is not risk-free.",
      buttons: [
        {
          text: "Learn more",
          href: "https://stakedxec.com/",
          variant: "gradient",
        },
        {
          text: "Get XECX",
          href: "https://cashtab.com/#/token/c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4",
          variant: "white",
        },
      ],
    },
  },
  {
    id: "firma",
    title: "Firma",
    image: "/firma.png",
    content: {
      paragraphs: [
        "Firma is a stablecoin that pays daily yield. Firma can be instantly bought or sold for XEC on the Agora marketplace. Users can also buy Firma with USDT or USDC (Solana) and redeem Firma for USDT (Solana) at firma.cash.",
        "Built using eCash's ALP technology.",
      ],
      disclaimer:
        "Firma is a token project built on XEC by a third-party. Firma's US dollar peg, and operation of it's Solana USDT/USDC bridge, are based on trust in the operators and their incentives. It is not risk-free.",
      buttons: [
        {
          text: "Learn more",
          href: "https://firma.cash/",
          variant: "gradient",
        },
        {
          text: "Get Firma",
          href: "https://cashtab.com/#/token/0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0",
          variant: "white",
        },
      ],
    },
  },
  {
    id: "localecash",
    title: "LocaleCash",
    image: "/localecash.png",
    content: {
      paragraphs: [
        "Trade your XEC against fiat, crypto, or goods using a non-custodial escrow. Make public or private offers and engage with your counterparty in direct trades.",
        "Built with eCash-native smart contracts.",
      ],
      disclaimer:
        "LocaleCash is a P2P DEX where trades are initiated by locking XEC in escrow. In case of a dispute, arbitrators can be called in. The contract is designed so that arbitrators can only forward funds to either the buyer or the seller without ever taking custody of the funds.",
      buttons: [
        {
          text: "Get Started",
          href: "https://localecash.com/",
          variant: "gradient",
        },
      ],
    },
  },
  {
    id: "epos",
    title: "ePOS",
    image: "/epos.png",
    content: {
      paragraphs: [
        "Use ePOS to create eCash payment requests. The free webapp allows for multiple cashiers to create requests without access to the underlying wallet. General point-of-sale functionality like calculating a list of items and applying discounts makes it a useful tool for brick and mortar businesses that want to accept eCash directly.",
      ],
      disclaimer:
        "The ePOS webapp runs locally and is non-custodial. Simply set your wallet address and start receiving XEC, no signup required. 28 fiat currency conversion rates are supported with more to come.",
      buttons: [
        {
          text: "Get Started",
          href: "https://epos.cash/",
          variant: "gradient",
        },
      ],
    },
  },
];
