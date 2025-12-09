// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import { useState } from "react";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import GridPattern from "../Atoms/GridPattern";
import { cn } from "../../utils/cn";
import { faqs } from "../../data/faqs";
import { motion } from "framer-motion";

// Helper function to convert URLs in text to clickable links
const renderTextWithLinks = (text: string) => {
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    // Push text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Push the actual link
    parts.push(
      <a
        key={match[2] + match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline transition-colors hover:text-blue-300"
        onClick={(e) => e.stopPropagation()}
      >
        {match[1]}
      </a>,
    );

    lastIndex = markdownLinkRegex.lastIndex;
  }

  // Push any remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const displayedFaqs = showAllFaqs ? faqs : faqs.slice(0, 5);

  return (
    <ContentContainer className="z-30 max-w-[1300px] pb-20">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Left Column - Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="relative flex max-w-[430px] flex-col"
        >
          {/* GridPattern background */}
          <GridPattern className="bottom-0 left-0 -z-10 hidden lg:absolute lg:left-[-40px]" />
          <div className="mb-6">
            <PlusHeader text="Got questions?" />
          </div>

          <h2 className="mb-6 text-4xl leading-tight font-bold text-white lg:text-5xl">
            Frequently asked questions
          </h2>

          <p className="mb-8 text-lg leading-relaxed text-gray-300">
            Excited about eCash? So are we! Here are some answers to the most
            frequently asked eCash questions.
          </p>
        </motion.div>

        {/* Right Column - FAQ Items */}
        <div className="flex flex-col">
          {displayedFaqs.map(({ question, answer }, index) => {
            const isOpen = index === openIndex;
            return (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                  delay: index * 0.1,
                }}
                viewport={{ once: true, amount: 0.5 }}
                key={index}
                className="group cursor-pointer border-b border-white/15 py-5 transition-all hover:border-white/100"
                onClick={() => toggleItem(index)}
              >
                <div className="flex w-full items-center justify-between focus:outline-none">
                  <h4 className="pr-4 text-lg font-bold text-white select-none lg:text-xl">
                    {question}
                  </h4>
                  <span
                    className={cn(
                      "relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1px] border-white text-current group-hover:bg-white group-hover:text-black",
                      "before:absolute before:h-[1px] before:w-[8px] before:bg-current before:transition-all before:duration-200 before:content-['']",
                      "after:absolute after:h-[8px] after:w-[1px] after:origin-center after:bg-current after:transition-all after:duration-200 after:content-['']",
                      isOpen
                        ? "after:scale-y-0"
                        : "opacity-30 group-hover:opacity-100 after:scale-y-100",
                    )}
                  />
                </div>

                <div
                  className={cn(
                    "mt-4 overflow-hidden text-left font-light text-gray-300 transition-all duration-800 ease-in-out select-none",
                    isOpen
                      ? "max-h-[600px] opacity-100"
                      : "mt-0 max-h-0 opacity-0",
                  )}
                >
                  {renderTextWithLinks(answer)}
                </div>
              </motion.div>
            );
          })}

          {/* More/Less FAQs Button */}
          {faqs.length > 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                delay: 0.2,
              }}
              viewport={{ once: true, amount: 0.5 }}
              className="mt-8 flex justify-center"
            >
              <Button
                variant="white"
                onClick={() => setShowAllFaqs(!showAllFaqs)}
              >
                {showAllFaqs ? "Less" : "More"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </ContentContainer>
  );
}
