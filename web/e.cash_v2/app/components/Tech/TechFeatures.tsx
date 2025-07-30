// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import { motion } from "motion/react";
import Image from "next/image";

export default function TechFeatures() {
  const features = [
    {
      icon: "/code-snippet.png",
      title: "Agile Development",
      description:
        "eCash has already implemented features Bitcoin is still debating",
    },
    {
      icon: "/share.png",
      title: "Fork-Free Upgrades",
      description:
        "Nodes upgrade independently while maintaining network consensus",
    },
    {
      icon: "/cube.png",
      title: "Flexible Funding Model",
      description: "Infrastructure funding is coordinated through miner policy",
    },
    {
      icon: "/users-check.png",
      title: "Adaptable Governance",
      description:
        "Recipients and funding amounts can be modified based on network consensus.",
    },
  ];

  return (
    <div className="relative w-full py-4 lg:py-20">
      <ContentContainer>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: "easeOut",
              }}
              className="m-auto flex max-w-[300px] flex-col items-center text-center lg:m-0"
            >
              {/* Icon Container */}
              <div className="bg-white/4 mb-6 flex items-center justify-center rounded-full border-t border-t-white/10 p-6 shadow-lg lg:p-8">
                <div className="relative h-8 w-8 lg:h-10 lg:w-10">
                  <Image src={feature.icon} alt={feature.title} fill />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white lg:mb-4">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-secondaryText text-sm leading-relaxed lg:text-base">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </ContentContainer>
    </div>
  );
}
