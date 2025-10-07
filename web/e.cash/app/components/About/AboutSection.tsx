// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";

const quotes = [
  {
    quote:
      "I don't believe we shall ever have a good money again before we take the thing out of the hands of government, that is, we can't take them violently out of the hands of government, all we can do is by some sly roundabout way introduce something they can't stop.",
    author: "Friedrich Hayek",
    title: "Austrian Economist",
    image: "/hayek.png",
  },
  {
    quote:
      "I think that the internet is going to be one of the major forces for reducing the role of government. The one thing that's missing, but that will soon be developed, is a reliable eCash.",
    author: "Milton Friedman",
    title: "Nobel Prize Economist",
    image: "/milton-friedman.png",
  },
  {
    quote:
      "The computer can be used as a tool to liberate and protect people, rather than to control them.",
    author: "Hal Finney",
    title: "Cryptographer & Bitcoin Pioneer",
    image: "/finney.png",
  },
  {
    quote:
      "With e-currency based on cryptographic proof, without the need to trust a third party middleman, money can be secure and transactions effortless.",
    author: "Satoshi Nakamoto",
    title: "Bitcoin Creator",
    image: "/nakamoto.png",
  },
];

export default function AboutSection() {
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveQuoteIndex((prevIndex) =>
        prevIndex === quotes.length - 1 ? 0 : prevIndex + 1
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [activeQuoteIndex]); // Reset timer when activeQuoteIndex changes

  const handleDotClick = (index: number) => {
    setActiveQuoteIndex(index);
  };
  return (
    <div className="py-10 lg:py-16">
      <ContentContainer className="lg:mb-30 mb-24 max-w-[600px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
          viewport={{ once: true }}
        >
          <PlusHeader text="XEC" />

          <h2 className="mb-4 mt-4 text-4xl font-bold text-white lg:text-5xl">
            Cash... optimized
          </h2>

          <div className="mb-12">
            <p>
              eCash integrates the breakthrough Avalanche protocol with its core
              Nakamoto Proof-of-Work. This hybrid-consensus enables unmatched
              capacity, speed, and security.
              <br />
              <br />
              The eCash network is at the forefront of Layer 1 blockchain
              technology, delivering on the promise that set off this entire new
              crypto-industry: A peer-to-peer electronic cash system at global
              scale.
              <br />
              <br />
              This alternative Bitcoin implementation outshines crypto and
              legacy finance alike with record-breaking throughput capacity,
              lowest fees in the space, instant transaction finality, and
              bullet-proof security guarantees. No other network can match its
              feature-set and properties.
            </p>
          </div>

          <div className="flex justify-start gap-4">
            <Button href="/roadmap" variant="white" className="m-0">
              Roadmap
            </Button>
            <Button href="/tech" variant="outline" className="m-0">
              Tech
            </Button>
          </div>
        </motion.div>
      </ContentContainer>
      <ContentContainer>
        {/* Quote Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="rounded-4xl flex flex-col items-center justify-center overflow-hidden bg-gradient-to-l from-[#0D0F37] via-[#50059A] to-[#0D0F37] p-8 shadow-[inset_0px_2px_5px_0px_#50059A,inset_0px_1px_33px_0px_rgba(111,123,232,0.40)] lg:p-20"
        >
          <div className="flex h-[300px] max-w-[900px] flex-col items-start justify-center gap-8 md:h-[180px] lg:h-[250px]">
            <motion.blockquote
              key={activeQuoteIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className={cn(
                "font-bold text-white lg:text-4xl",
                activeQuoteIndex === 0 ? "text-base lg:text-3xl" : "text-xl"
              )}
            >
              “{quotes[activeQuoteIndex].quote}”
            </motion.blockquote>
            <motion.div
              key={`author-${activeQuoteIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut", delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
                <Image
                  src={quotes[activeQuoteIndex].image}
                  alt={quotes[activeQuoteIndex].author}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <div className="flex flex-col items-start justify-start">
                <span className="text-sm font-medium">
                  {quotes[activeQuoteIndex].author}
                </span>
                <span className="text-secondaryText text-sm font-light">
                  {quotes[activeQuoteIndex].title}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
        {/* Navigation Dots */}
        <div className="mt-8 flex items-center justify-center gap-3">
          {quotes.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-3 w-3 cursor-pointer rounded-full transition-all duration-300 ${
                index === activeQuoteIndex
                  ? "bg-white opacity-100"
                  : "bg-white opacity-30 hover:opacity-60"
              }`}
              aria-label={`Go to quote ${index + 1}`}
            />
          ))}
        </div>
      </ContentContainer>
    </div>
  );
}
