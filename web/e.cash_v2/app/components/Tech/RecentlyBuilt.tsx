// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";
import Button from "../Atoms/Button";
import TrustedBy from "../Home/TrustedBy";
import { motion } from "motion/react";

interface Project {
  name: string;
  logo: string;
  href: string;
}

interface ProjectTileProps {
  project: Project;
}

const ProjectTile: React.FC<ProjectTileProps> = ({ project }) => (
  <a
    href={project.href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex w-[160px] flex-shrink-0 flex-col items-start justify-center"
  >
    <div className="group-hover:bg-accentLight/10 flex h-[110px] w-full items-center justify-center rounded-xl border-t border-t-white/30 bg-white/5 transition-all duration-300">
      <div className="relative h-[50%] w-[50%] lg:h-[60%] lg:w-[60%]">
        <Image
          src={project.logo}
          alt={project.name}
          fill
          className="object-contain"
        />
      </div>
    </div>
    <div className="group-hover:text-accentLight mt-2 text-xs font-light uppercase tracking-wide transition-all duration-300">
      {project.name}
    </div>
  </a>
);

const projects: Project[] = [
  { name: "Cashtab", logo: "/cashtab-icon.png", href: "https://cashtab.com" },
  {
    name: "PayButton",
    logo: "/paybutton-icon.png",
    href: "https://paybutton.org",
  },
  { name: "XECX", logo: "/xecx-icon.png", href: "https://stakedxec.com" },
  { name: "FIRMA", logo: "/firma-icon.png", href: "https://firma.cash" },
  {
    name: "BlitzChips",
    logo: "/blitz-icon.png",
    href: "https://blitzchips.com",
  },
  {
    name: "Electrum ABC",
    logo: "/electrum-icon.png",
    href: "https://www.bitcoinabc.org/electrum/",
  },
  { name: "eLPS", logo: "/elps-icon.png", href: "https://elpstoken.com/" },
  { name: "TixTown", logo: "/tixtown-icon.png", href: "https://tixtown.com" },
];

export default function RecentlyBuilt() {
  return (
    <div className="relative w-full pb-20">
      <ContentContainer className="p-0 lg:p-4">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.9 }}
          className="custom-box mb-30 from-white/1 to-white/1 relative flex flex-col-reverse items-center border border-white/10 bg-gradient-to-br via-[#15172A] lg:flex-row lg:gap-6 lg:rounded-lg"
        >
          {/* Left side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut", delay: 0.6 }}
            viewport={{ once: true, amount: 0.8 }}
            className="flex w-full flex-col items-start justify-between self-stretch p-8 lg:w-1/2 lg:p-16 lg:pr-0"
          >
            <div>
              <h2 className="mb-4 text-2xl font-bold tracking-tighter text-white lg:text-3xl">
                Recently built on eCash
              </h2>
              <p>
                As a convenient and reliable form of electronic cash, eCash is
                meant to be used! There is already a healthy ecosystem of
                real-world projects built on eCash, and more coming.
              </p>
            </div>
            <Button
              variant="outline"
              className="m-0 mt-10 self-start"
              href="/build/#products"
            >
              See what else is being built
            </Button>
          </motion.div>

          {/* Right side - Scrolling tiles */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut", delay: 1.2 }}
            viewport={{ once: true, amount: 0.8 }}
            className="relative h-[320px] w-full self-stretch overflow-hidden lg:h-[420px] lg:w-1/2"
          >
            <div className="absolute right-0 top-0 hidden h-full w-full bg-gradient-to-l from-purple-500/5 to-transparent lg:block" />
            {/* First column - scrolling up */}
            <div className="scroll-vertical-up absolute top-8 flex gap-4 lg:right-[275px] lg:top-0 lg:h-full lg:flex-col">
              {[...projects.slice(0, 4), ...projects.slice(0, 4)].map(
                (project, index) => (
                  <ProjectTile key={`up-${index}`} project={project} />
                )
              )}
            </div>

            {/* Second column - scrolling down */}
            <div className="scroll-vertical-down absolute top-[180px] flex gap-4 lg:right-[80px] lg:top-0 lg:h-full lg:flex-col">
              {[...projects.slice(4, 8), ...projects.slice(4, 8)].map(
                (project, index) => (
                  <ProjectTile key={`down-${index}`} project={project} />
                )
              )}
            </div>
          </motion.div>
        </motion.div>
        <TrustedBy />
      </ContentContainer>
    </div>
  );
}
