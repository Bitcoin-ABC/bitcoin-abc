// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React, { useState } from "react";
import ContentContainer from "../Atoms/ContentContainer";
import { motion } from "motion/react";
import Image from "next/image";
import Button from "../Atoms/Button";

const wallets = [
  {
    name: "Cashtab Web",
    text: "Cashtab (Web) is an open source, highly secure, non-custodial web wallet for eCash (XEC) & eTokens. It is a fast & easy-to-use XEC wallet designed for everyday use.",
    image: "/cashtab.png",
    link: "https://cashtab.com/",
    availableOn: ["Web App"],
    features: ["eTokens", "Message Signing"],
  },
  {
    name: "Cashtab Extension",
    text: "Cashtab (Extension) is a browser-integrated version of Cashtab Web for Google Chrome and Brave browsers. No sign-in or account required. Think MetaMask for eCash.",
    image: "/cashtab-extension.png",
    link: "https://chromewebstore.google.com/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag",
    availableOn: ["Browser Extension"],
    features: ["eTokens", "Message Signing"],
  },
  {
    name: "Electrum ABC",
    text: "Electrum ABC is a fast and highly secure eCash (XEC) wallet for Windows, MacOS, and Linux. It supports mnemonic seed phrases, hardware wallets, multi-sig wallets, and importing private keys. Electrum ABC is a non-custodial XEC wallet for power users!",
    image: "/electrum.png",
    link: "https://www.bitcoinabc.org/electrum/",
    availableOn: ["Desktop"],
    features: ["Message Signing", "Multi-sig wallets", "Bip-70"],
  },
  {
    name: "RaiPay",
    text: "RaiPay is a non-custodial mobile wallet for storing & managing eCash (XEC) & eTokens. With RaiPay you can experience the power and speed of eCash (XEC) and eTokens online, in person, and everywhere else. It's available for both Android & iOS devices.",
    image: "/raipay.png",
    link: "https://www.raipay.co",
    availableOn: ["iOS", "Android"],
    features: ["eTokens", "Message Signing", "Bip-70"],
  },
  {
    name: "CoinEx Wallet",
    text: "CoinEx Wallet is a multi-chain non-custodial mobile wallet that supports eCash (XEC). With CoinEx Wallet you can send, receive and manage your XEC coins securely. CoinEx Wallet is available for both Android & iOS devices.",
    image: "/_coinex.png",
    link: "https://wallet.coinex.com/",
    availableOn: ["iOS", "Android"],
  },
  {
    name: "Arctic Wallet",
    text: "Arctic Wallet is a non-custodial crypto wallet built on the principles of decentralization and privacy supporting eCash (XEC). With Arctic Wallet, you can send, receive and store XEC safely and securely. Arctic wallet is available for desktop and mobile platforms.",
    image: "/arctic.png",
    link: "https://arcticwallet.io/",
    availableOn: ["iOS", "Android", "Desktop"],
  },
  {
    name: "Unstoppable Wallet",
    text: "A privacy-oriented non-custodial wallet for eCash (XEC). Unstoppable Wallet is a highly secure, decentralized, and open-source wallet, available for Android and iOS smartphones.",
    image: "/unstoppable.png",
    link: "https://unstoppable.money/",
    availableOn: ["iOS", "Android"],
  },
  {
    name: "Stack Wallet",
    text: "An open-source, non-custodial multichain wallet for eCash (XEC). Stack Wallet is a highly secure, privacy-first mobile wallet for XEC, available for Android and iOS smartphones as well as Windows, MacOS, and Linux.",
    image: "/stack.png",
    link: "https://stackwallet.com/",
    availableOn: ["iOS", "Android", "Desktop"],
  },
  {
    name: "Guarda Wallet",
    text: "Guarda Wallet is a secure and user-friendly multi-coin wallet for managing cryptocurrencies and tokens in a non-custodial manner. Available for web, desktop, Apple, and Android.",
    image: "/guarda.png",
    link: "https://guarda.com/coins/ecash-wallet/",
    availableOn: ["iOS", "Android", "Desktop", "Web App"],
  },
  {
    name: "Trezor",
    text: "Trezor is a leading multi-crypto hardware wallet that supports eCash (XEC) in combination with Electrum ABC. Users can also sign Avalanche stake-proofs using custom firmware provided by Bitcoin ABC on Trezor Safe 3, Safe 5, and Model T.",
    image: "/trezor.png",
    link: "https://trezor.io",
    availableOn: ["Hardware Wallet"],
    features: ["Message Signing", "Multi-sig wallets", "Bip-70"],
  },
  {
    name: "Satochip",
    text: "Satochip is an open source and super-secure multi-crypto hardware wallet that natively supports storing eCash (XEC). Satochip cold wallet offers state-of-the-art security for storing & managing your XEC coins.",
    image: "/satochip.png",
    link: "https://satochip.io/",
    availableOn: ["Hardware Wallet"],
  },
  {
    name: "D'CENT",
    text: "D'CENT is another major hardware wallet that natively supports eCash (XEC). With the D'CENT biometric hardware wallet, you can securely send, receive, and manage your XEC coins.",
    image: "/dcent.png",
    link: "https://dcentwallet.com/",
    availableOn: ["Hardware Wallet"],
  },
  {
    name: "Ballet",
    text: "Ballet is a secure non-electronic physical wallet that offers native support for eCash (XEC). Safely store and easily manage your XEC coins with the Ballet cold wallet.",
    image: "/ballet.png",
    link: "https://www.ballet.com/",
    availableOn: ["Hardware Wallet"],
  },
  {
    name: "Edge Wallet",
    text: "Edge Wallet is a user-friendly multi-coin wallet that features backup with username and password rather than seed phrase.",
    image: "/edge.png",
    link: "https://edge.app/",
    availableOn: ["iOS", "Android"],
  },
];

// Define filter options
const filterOptions = [
  { id: "all", label: "All", value: "all" },
  { id: "web", label: "Web", value: "Web App" },
  { id: "extension", label: "Extension", value: "Browser Extension" },
  { id: "ios", label: "iOS", value: "iOS" },
  { id: "android", label: "Android", value: "Android" },
  { id: "desktop", label: "Desktop", value: "Desktop" },
  { id: "hardware", label: "Hardware", value: "Hardware Wallet" },
];

function WalletCard({ wallet }: { wallet: typeof wallets[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
      viewport={{ once: true, margin: "-50px" }}
      className="custom-box hover:bg-white/8 group relative overflow-hidden rounded-2xl bg-white/5 p-4 transition-all duration-300 hover:shadow-2xl lg:p-6"
    >
      <a
        href={wallet.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        <div className="mb-6 flex items-start space-x-3 lg:space-x-4">
          <div className="bg-white/8 relative h-12 w-12 overflow-hidden rounded-xl lg:h-16 lg:w-16">
            <Image
              src={wallet.image}
              alt={wallet.name}
              fill
              className="object-contain p-2"
            />
          </div>
          <div>
            <h3 className="group-hover:text-accentLight text-xl font-bold text-white transition-colors lg:text-2xl">
              {wallet.name}
            </h3>
            <div className="mt-1 flex flex-wrap gap-2 lg:mt-2">
              {wallet.availableOn.map((platform, index) => (
                <span
                  key={index}
                  className="rounded-full bg-white/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/60"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mb-10">{wallet.text}</p>

        {wallet.features && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-bold tracking-wide">Features</h4>
            <div className="flex flex-wrap gap-2">
              {wallet.features.map((feature, index) => (
                <span
                  key={index}
                  className="bg-accentLight/20 text-accentLight rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </a>
    </motion.div>
  );
}

export default function WalletsContent() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Filter wallets based on selected filter
  const filteredWallets = wallets.filter((wallet) => {
    if (selectedFilter === "all") return true;
    return wallet.availableOn.includes(selectedFilter);
  });

  return (
    <div className="relative w-full py-20">
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="mb-6 text-3xl font-bold text-white lg:text-4xl">
            Choose Your Perfect Wallet
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-300">
            From mobile apps to hardware wallets, find the perfect solution for
            your security and convenience requirements.
          </p>
        </motion.div>

        {/* Filter Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
          viewport={{ once: true }}
          className="mb-8 flex flex-wrap justify-center gap-3"
        >
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() =>
                setSelectedFilter(
                  filter.value === selectedFilter ? "all" : filter.value
                )
              }
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${
                selectedFilter === filter.value
                  ? "bg-accentLight text-white shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWallets.map((wallet, index) => (
            <WalletCard key={index} wallet={wallet} />
          ))}
        </div>

        {/* Show message when no wallets match filter */}
        {filteredWallets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 text-center text-gray-400"
          >
            <p className="text-lg">
              No wallets found for the selected platform.
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="lg:p-18 flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-l from-[#0D0F37] via-[#50059A] to-[#0D0F37] p-8 shadow-[inset_0px_2px_5px_0px_#50059A,inset_0px_1px_33px_0px_rgba(111,123,232,0.40)]">
            <h3 className="mb-4 text-2xl font-bold">Need Help Choosing?</h3>
            <p className="mb-6">
              Check out our comprehensive wallet guide to find the best wallet
              for your needs.
            </p>
            <Button
              href="/blog/choose-the-best-ecash-xec-wallet-a-comprehensive-guide"
              variant="white"
            >
              Read Wallet Guide
            </Button>
          </div>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
