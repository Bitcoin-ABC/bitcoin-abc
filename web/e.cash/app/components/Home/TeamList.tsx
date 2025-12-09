// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import { cn } from "@/app/utils/cn";
import { team } from "@/app/data/team";

// No props needed
const TeamList: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll handler for arrows
  const scrollByCard = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector(".team-card") as HTMLElement;
    if (!card) return;
    const cardWidth = card.offsetWidth + 24; // 24px = gap-6
    el.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  return (
    <section>
      <ContentContainer className="border-t-accentMedium/10 mt-20 max-w-[1400px] border-t pt-15">
        <div className="flex w-full flex-col p-8 lg:p-14">
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-[270px] flex-col items-start gap-6 lg:w-1/2 lg:max-w-[380px]">
              <PlusHeader text="Meet Bitcoin ABC" />
              <h2>
                The team behind <span className="gradient-text">eCash</span>
              </h2>
            </div>
            <div className="flex flex-col items-end justify-between gap-4 self-stretch lg:mt-0">
              <div className="hidden items-center gap-4 lg:flex">
                <span className="text-lg font-semibold text-white">
                  Interested in contributing?
                </span>
                <Button variant="ghost" href="/build">
                  Start building
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="cursor-pointer rounded p-4 transition-all select-none hover:bg-white/5"
                  onClick={() => scrollByCard("left")}
                >
                  <div className="relative h-5 w-5 rotate-180 cursor-pointer">
                    <Image
                      src="/chevron.png"
                      alt="previous"
                      fill
                      className="object-contain"
                      sizes="20px"
                    />
                  </div>
                </div>
                <div
                  className="cursor-pointer rounded p-4 transition-all hover:bg-white/5"
                  onClick={() => scrollByCard("right")}
                >
                  <div className="relative h-5 w-5">
                    <Image
                      src="/chevron.png"
                      alt="previous"
                      fill
                      className="object-contain"
                      sizes="20px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContentContainer>
      <div className="w-full">
        <div
          className="scrollx-fade flex gap-6 overflow-x-auto"
          style={{
            paddingLeft: "max(2rem, calc((100vw - 1400px) / 2 + 2rem))",
            paddingRight: "max(2rem, calc((100vw - 1400px) / 2 + 2rem))",
          }}
          ref={scrollRef}
        >
          {team.map((member, idx) => (
            <div
              key={idx}
              className="team-card custom-box group relative flex min-h-[350px] w-68 flex-shrink-0 cursor-pointer flex-col justify-between rounded-2xl bg-white/2 p-6 transition-all hover:bg-white/4"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <div className="text-secondaryText text-xs font-light tracking-wide uppercase">
                {member.title}
              </div>

              <div className="relative mt-4 h-[300px] w-full flex-grow">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className={cn(
                    "object-contain transition-all duration-300",
                    openIndex === idx ? "opacity-0" : "opacity-100",
                  )}
                  sizes="272px"
                />
                <div
                  className={cn(
                    "w-full transition-all duration-300",
                    openIndex === idx
                      ? "top-0 block opacity-100"
                      : "top-10 hidden opacity-0",
                  )}
                >
                  <h3 className="text-xl font-bold">{member.name}</h3>
                  <p className="text-sm">{member.bio}</p>
                </div>
              </div>
              <div className="mt-2 flex h-[30px] w-full items-center justify-between transition-all">
                {openIndex === idx ? (
                  <div className="relative flex h-3 w-3 rotate-45 items-center justify-center rounded-full">
                    <Image
                      src="/plus-white.png"
                      alt="plus icon"
                      fill
                      className="object-contain brightness-200"
                      sizes="12px"
                    />
                  </div>
                ) : (
                  <>
                    <div className="group-hover:text-accentMedium text-xl font-bold">
                      {member.name}
                    </div>
                    <div className="relative flex items-center justify-center rounded-full bg-white p-1">
                      <div className="relative flex h-3 w-3 items-center justify-center rounded-full">
                        <Image
                          src="/plus.png"
                          alt="plus icon"
                          fill
                          className="object-contain"
                          sizes="12px"
                        />
                      </div>
                    </div>
                  </>
                )}{" "}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamList;
