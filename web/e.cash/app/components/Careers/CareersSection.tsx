// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import { motion } from "motion/react";
import { careers } from "../../data/careers";
import Button from "../Atoms/Button";

export default function CareersSection() {
  return (
    <div className="pb-30">
      <ContentContainer className="max-w-[800px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-white">
            Career opportunities
          </h2>
          <p className="mx-auto max-w-2xl text-gray-300">
            Join our team and help build the infrastructure for the future of
            digital payments. We're looking for passionate developers who want
            to make a difference.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
          className="grid grid-cols-1 gap-4"
        >
          {careers.map((job, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
                delay: 0.6 + index * 0.1,
              }}
              className="custom-box rounded-xl bg-white/5 p-8"
            >
              <h3 className="mb-3 text-2xl font-bold text-white">
                {job.title}
              </h3>

              <div className="text-secondaryText mb-4 flex items-center gap-2">
                <div className="bg-accentLight h-2 w-2 rounded-full"></div>
                <span className="text-sm">{job.location}</span>
              </div>

              <p>{job.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Apply Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
          className="mt-20 text-center"
        >
          <h3 className="mb-6 text-2xl font-bold text-white">
            Ready to join our team?
          </h3>
          <p className="mx-auto mb-8 max-w-2xl text-gray-300">
            If you think you could be a fit, please send your resume (or
            LinkedIn URL) along with something you've built to careers@e.cash.
          </p>
          <Button href="mailto:careers@e.cash?subject=eCash Careers">
            Apply Now
          </Button>
        </motion.div>
      </ContentContainer>
    </div>
  );
}
