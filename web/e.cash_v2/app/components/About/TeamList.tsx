// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React, { useState } from "react";
import Image from "next/image";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import { cn } from "@/app/utils/cn";
import { team } from "@/app/data/team";

// No props needed
const TeamList: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section>
      <ContentContainer className="mb-30 mt-10">
        <div className="mb-10 flex w-full flex-col justify-between lg:mb-20 lg:flex-row">
          <div className="flex flex-col items-start gap-6 lg:w-1/2 lg:max-w-[420px]">
            <PlusHeader text="Our team" />
            <h2>Meet our team with well over 50 years combined experience</h2>
          </div>
          <p className="mt-6 max-w-[430px] lg:mt-0 lg:w-1/2 lg:pt-12">
            Every member of our veteran team brings over 8 years of blockchain
            experience, delivering professional-grade infrastructure and tools
            that make building payment solutions faster and more intuitive than
            ever before.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {team.map((member, idx) => (
            <div
              key={idx}
              className="team-card custom-box bg-white/2 hover:bg-white/4 group relative flex min-h-[350px] w-full cursor-pointer flex-col justify-between rounded-2xl p-6 transition-all"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <div className="text-secondaryText text-xs font-light uppercase tracking-wide">
                {member.title}
              </div>

              <div className="relative mt-4 h-[300px] w-full flex-grow">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className={cn(
                    "object-contain transition-all duration-300",
                    openIndex === idx ? "opacity-0" : "opacity-100"
                  )}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div
                  className={cn(
                    "w-full transition-all duration-300",
                    openIndex === idx
                      ? "top-0 block opacity-100"
                      : "top-10 hidden opacity-0"
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
        <div className="mt-10 w-full flex-col items-center justify-center text-center">
          <h4 className="mb-6">Interested in contributing?</h4>
          <Button href="/careers" variant="white">
            View Careers
          </Button>
        </div>
      </ContentContainer>
    </section>
  );
};

export default TeamList;
