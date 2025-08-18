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

export interface TeamMember {
  name: string;
  title: string;
  image: string;
  bio: string;
}

// No props needed
const TeamList: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const team: TeamMember[] = [
    {
      name: "Amaury Séchet",
      title: "Founder Bitcoin ABC",
      image: "/amaury.png",
      bio: "Amaury Séchet is the founder of Bitcoin ABC and creator of Bitcoin Cash (BCH) and eCash (XEC). He specialized in scaling large-system architecture and was the lead developer at the Snazzy D Compiler. Amaury worked for Facebook researching digital cash solutions before his direct involvement in crypto in 2016.",
    },
    {
      name: "Joey King",
      title: "eCash Dev",
      image: "/joey.png",
      bio: "Joey King is a senior full stack dev for Bitcoin ABC, where he works on JS toolkits and eCash products. He is the lead developer of Cashtab.com. A mechanical engineer, Joey worked for 10 years at ExxonMobil and Samsung before transitioning to crypto full time in 2017.",
    },
    {
      name: "PiRK",
      title: "eCash Dev",
      image: "/pirk.png",
      bio: "PiRK started as a geophysicist in the oil and gas prospection industry with a passion for programming his own data processing tools. He transitioned to software engineering for data analysis in 2016, working at a synchrotron facility on a science toolkit/library. Since 2020, he is maintaining node software and eCash-related open source tools and wallet software as full stack developer.",
    },
    {
      name: "Fabcien",
      title: "eCash Lead Dev",
      image: "/fabcien.png",
      bio: "Fabcien is an electronics and software engineer with over 15 years of experience. Former lead developer in the medical devices industry, he transitioned to crypto and joined the Bitcoin ABC team to work on Bitcoin Cash and later eCash from 2018.",
    },
    {
      name: "Antony Zegers",
      title: "CEO Bitcoin ABC",
      image: "/antony.png",
      bio: "Antony holds a master's degree in Electrical Engineering and has 12 years of experience in operational research and analysis. He fell down the Bitcoin rabbit hole in 2012. Since 2017, he has been directly involved in crypto, organizing and developing cryptocurrency projects. He is chief executive officer of Bitcoin ABC since 2020.",
    },
    {
      name: "David Klakurka",
      title: "eCash Management & Strategy",
      image: "/david.png",
      bio: "David has 13 years of experience in the software industry. He founded Blockchain Ventures, a software company creating bespoke Bitcoin applications. He and his team have been working with Bitcoin ABC since 2017 and currently maintains a number of services including paybutton.org & coin.dance.",
    },
    {
      name: "Kousha",
      title: "Biz-Dev Bitcoin ABC",
      image: "/kousha.png",
      bio: "Kousha has an education as communications IT specialist and media designer. He began researching Bitcoin in 2013 and has been actively involved in crypto for over 8 years. He has been working as community lead, copywriter, and business developer for Bitcoin ABC since 2023.",
    },
    {
      name: "AK",
      title: "Social Media Manager",
      image: "/ak.png",
      bio: "AK is a freelance digital marketing consultant with 9 years of experience in digital marketing, content creation, and community building. He has been working as a social media manager for Bitcoin ABC since 2022.",
    },
  ];

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
      <ContentContainer className="border-t-accentMedium/10 pt-15 mt-20 max-w-[1400px] border-t">
        <div className="flex w-full flex-col p-8 lg:p-14">
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-[270px] flex-col items-start gap-6 lg:w-1/2 lg:max-w-[380px]">
              <PlusHeader text="Meet the team" />
              <h2>Core members of the eCash team</h2>
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
                  className="cursor-pointer select-none rounded p-4 transition-all hover:bg-white/5"
                  onClick={() => scrollByCard("left")}
                >
                  <div className="relative h-5 w-5 rotate-180 cursor-pointer">
                    <Image
                      src="/chevron.png"
                      alt="previous"
                      fill
                      className="object-contain"
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
              className="team-card custom-box w-68 bg-white/2 hover:bg-white/4 group relative flex min-h-[350px] flex-shrink-0 cursor-pointer flex-col justify-between rounded-2xl p-6 transition-all"
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
