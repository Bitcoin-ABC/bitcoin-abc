// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ContentContainer from "../Atoms/ContentContainer";
import { motion } from "framer-motion";
import PlusHeader from "../Atoms/PlusHeader";
import { cn } from "../../utils/cn";
import CustomSelect from "../Atoms/CustomSelect";

interface BuildItem {
  name: string;
  description: string;
  url: string;
}

interface BuildCategory {
  id: string;
  description: string;
  items: BuildItem[];
}

const buildCategories: BuildCategory[] = [
  {
    id: "contribute",
    description: "Learn more about contributing to the Bitcoin ABC repository",
    items: [
      {
        name: "Contribution Guide",
        description:
          "Learn more about contributing to the Bitcoin ABC repository",
        url: "https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md",
      },
      {
        name: "Source Code",
        description:
          "Source code for eCash software from Bitcoin ABC - including the full node, Electrum ABC wallet, and Cashtab wallet",
        url: "https://github.com/Bitcoin-ABC/bitcoin-abc",
      },
    ],
  },
  {
    id: "software",
    description: "Ready-to-run binaries and core software",
    items: [
      {
        name: "Bitcoin ABC Releases",
        description: "Ready-to-run binaries for the Bitcoin ABC full node",
        url: "https://www.bitcoinabc.org/releases/",
      },
      {
        name: "Chronik Indexer",
        description:
          "Chronik is a fast and reliable indexer built into the Bitcoin ABC node software",
        url: "https://chronik.e.cash/",
      },
    ],
  },
  {
    id: "libraries",
    description: "Building the foundation for global payment adoption",
    items: [
      {
        name: "chronik-client",
        description:
          "Interact with the eCash blockchain through the Chronik indexer",
        url: "https://www.npmjs.com/package/chronik-client",
      },
      {
        name: "ecash-lib",
        description: "Full-featured eCash-native transaction building library",
        url: "https://www.npmjs.com/package/ecash-lib",
      },
      {
        name: "ecashaddrjs",
        description: "The eCash address format for Node.js and web browsers",
        url: "https://www.npmjs.com/package/ecashaddrjs",
      },
      {
        name: "cashtab-connect",
        description:
          "A developer-friendly API for integrating with the Cashtab browser extension",
        url: "https://www.npmjs.com/package/cashtab-connect",
      },
      {
        name: "ecash-agora",
        description: "Handle non-custodial XEC -> token swaps using Script",
        url: "https://www.npmjs.com/package/ecash-agora",
      },
      {
        name: "ecash-wallet",
        description: "The best way to build and broadcast eCash transactions",
        url: "https://www.npmjs.com/package/ecash-wallet",
      },
      {
        name: "mock-chronik-client",
        description: "Testing utility to mock the Chronik indexer client",
        url: "https://www.npmjs.com/package/mock-chronik-client",
      },
    ],
  },
  {
    id: "examples",
    description: "Real-world implementations and codebases",
    items: [
      {
        name: "Cashtab Codebase",
        description: "Public repository for the Cashtab wallet",
        url: "https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/cashtab",
      },
    ],
  },
  {
    id: "documentation",
    description: "Comprehensive guides and technical documentation",
    items: [
      {
        name: "Bitcoin ABC",
        description: "Documentation for the Bitcoin ABC full node software",
        url: "https://www.bitcoinabc.org/doc/",
      },
      {
        name: "Chronik",
        description: "Documentation for the Chronik indexer",
        url: "https://chronik.e.cash/",
      },
    ],
  },
  {
    id: "devhub",
    description: "Connect with the eCash developer community",
    items: [
      {
        name: "eCash Devs and Builders",
        description:
          "Telegram group for more info, and to connect with other developers",
        url: "https://t.me/eCashBuilders",
      },
    ],
  },
];

export default function BuildItems() {
  const [selectedCategory, setSelectedCategory] = useState("contribute");
  const router = useRouter();

  const selectedCategoryData = buildCategories.find(
    (category) => category.id === selectedCategory
  );

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the # symbol
      if (hash && buildCategories.some((cat) => cat.id === hash)) {
        setSelectedCategory(hash);
        // Scroll to the quickstart section
        setTimeout(() => {
          const quickstartSection =
            document.getElementById("quickstart-section");
          if (quickstartSection) {
            quickstartSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      }
    };

    // Check for hash on initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Update URL hash
    router.push(`#${categoryId}`, { scroll: false });
  };

  return (
    <div className="pb-30 relative w-full">
      <ContentContainer className="p-0 lg:px-4">
        <div
          id="quickstart-section"
          className="flex flex-col gap-8 border-t border-t-white/10 bg-gradient-to-br from-white/5 to-[#15172A] p-10 lg:flex-row lg:border-t-0 lg:from-transparent lg:to-transparent lg:p-0"
        >
          {/* Sidebar Navigation */}
          <motion.div
            className="flex-shrink-0 lg:w-[200px]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.5 }}
          >
            <div className="hidden lg:block">
              <PlusHeader text="Quick start" />
            </div>
            {/* Mobile Dropdown */}
            <div className="lg:hidden">
              <CustomSelect
                name="build-category"
                value={selectedCategory}
                onChange={handleCategoryChange}
                options={buildCategories.map((category: BuildCategory) => ({
                  value: category.id,
                  label:
                    category.id.charAt(0).toUpperCase() + category.id.slice(1),
                }))}
                placeholder="Select a category"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="mt-10 hidden space-y-2 lg:block">
              {buildCategories.map((category) => (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleCategoryChange(category.id);
                  }}
                  className={cn(
                    "block w-full cursor-pointer rounded-lg border-t border-t-transparent px-4 py-2 text-left text-lg font-medium capitalize transition-all duration-200",
                    selectedCategory === category.id
                      ? "border-t border-t-white/60 bg-gradient-to-t from-[#280F5C] to-[#551AA1] text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  {category.id}
                </a>
              ))}
            </nav>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
            viewport={{ once: true, amount: 0.5 }}
            className="from-white/1 to-white/1 lg:p-18 flex flex-1 flex-col items-center rounded-lg via-[#15172A] transition-all duration-200 lg:flex-row lg:gap-6 lg:border lg:border-white/10 lg:bg-gradient-to-br"
          >
            {selectedCategoryData && (
              <motion.div
                key={selectedCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="mb-8">
                  <h1 className="mb-2 text-2xl font-bold capitalize lg:text-4xl">
                    {selectedCategoryData.id}
                  </h1>
                  <p className="text-secondaryText text-base font-light lg:text-lg">
                    {selectedCategoryData.description}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-4 lg:flex-row lg:flex-wrap lg:gap-4">
                  {selectedCategoryData.items.map((item, index) => (
                    <motion.a
                      key={item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="cursor-pointer rounded-lg bg-white/10 p-6 transition-colors duration-200 hover:bg-[#551AA1] lg:w-[calc(50%-8px)]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="text-xl font-bold">{item.name}</h3>
                            <svg
                              className="text-secondaryText h-4 w-4 opacity-50"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </div>
                          <p className="text-secondaryText">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </ContentContainer>
    </div>
  );
}
