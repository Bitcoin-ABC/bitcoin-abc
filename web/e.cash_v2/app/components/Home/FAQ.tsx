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

// Helper function to convert URLs in text to clickable links
const renderTextWithLinks = (text: string) => {
  // URL regex pattern to match http/https URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline transition-colors hover:text-blue-300"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
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
        <div className="relative flex max-w-[430px] flex-col">
          {/* GridPattern background */}
          <GridPattern className="bottom-0 left-0 -z-10 hidden lg:absolute lg:left-[-40px]" />
          <div className="mb-6">
            <PlusHeader text="Got questions?" />
          </div>

          <h2 className="mb-6 text-4xl font-bold leading-tight text-white lg:text-5xl">
            Frequently asked questions
          </h2>

          <p className="mb-8 text-lg leading-relaxed text-gray-300">
            Excited about eCash? So are we! Here are some answers to the most
            frequently asked eCash questions.
          </p>
        </div>

        {/* Right Column - FAQ Items */}
        <div className="flex flex-col">
          {displayedFaqs.map(({ question, answer }, index) => {
            const isOpen = index === openIndex;
            return (
              <div
                key={index}
                className="border-white/15 group cursor-pointer border-b py-5 transition-all hover:border-white/100"
                onClick={() => toggleItem(index)}
              >
                <div className="flex w-full items-center justify-between focus:outline-none">
                  <h4 className="select-none pr-4 text-lg font-bold text-white lg:text-xl">
                    {question}
                  </h4>
                  <span
                    className={cn(
                      "relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1px] border-white text-current group-hover:bg-white group-hover:text-black",
                      "before:absolute before:h-[1px] before:w-[8px] before:bg-current before:transition-all before:duration-200 before:content-['']",
                      "after:absolute after:h-[8px] after:w-[1px] after:origin-center after:bg-current after:transition-all after:duration-200 after:content-['']",
                      isOpen
                        ? "after:scale-y-0"
                        : "opacity-30 after:scale-y-100 group-hover:opacity-100"
                    )}
                  />
                </div>

                <div
                  className={cn(
                    "duration-800 mt-4 select-none overflow-hidden text-left font-light text-gray-300 transition-all ease-in-out",
                    isOpen
                      ? "max-h-[600px] opacity-100"
                      : "mt-0 max-h-0 opacity-0"
                  )}
                >
                  {renderTextWithLinks(answer)}
                </div>
              </div>
            );
          })}

          {/* More/Less FAQs Button */}
          {faqs.length > 5 && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="white"
                onClick={() => setShowAllFaqs(!showAllFaqs)}
              >
                {showAllFaqs ? "Less" : "More"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </ContentContainer>
  );
}
