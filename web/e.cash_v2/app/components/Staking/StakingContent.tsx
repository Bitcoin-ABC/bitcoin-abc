// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "motion/react";
import Link from "next/link";

export default function StakingContent() {
  return (
    <div className="relative w-full py-20">
      <ContentContainer className="max-w-[700px]">
        <div className="space-y-12">
          {/* Warning Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-400">
                    WARNING
                  </h3>
                  <p className="mt-2 text-red-200">
                    There are fake eCash staking guides that attempt to steal
                    your coins. To stake on eCash, you must run a
                    fully-validating node with avalanche enabled. There is no
                    "wallet only" staking option. Use extreme caution with any
                    third party staking service.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Introduction Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <p>
              Staking rewards went live on the eCash network on November 15th,
              2023 as part of the eCash{" "}
              <Link
                href="/upgrade"
                className="text-blue-400 underline hover:text-blue-300"
              >
                network upgrade
              </Link>
              . The purpose of staking rewards is to incentivize running eCash
              avalanche nodes to improve the overall security and performance of
              eCash. As such, it is important for stakers to run high quality
              nodes. This will help the eCash system to work well, and also
              ensure you receive the staking rewards.
            </p>
          </motion.div>

          {/* Staking Requirements Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="Staking Requirements" />
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  The coins to be staked must be a minimum of{" "}
                  <strong>100,000,000.00 XEC</strong> per UTXO.
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  The stake UTXOs must have{" "}
                  <strong>2016 or more block confirmations</strong>. This means
                  the coins must not have moved for approximately two weeks.
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  The stake UTXOs must be of type{" "}
                  <strong>Pay To Public Key Hash (P2PKH)</strong>.
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  Staking nodes should have reliably high uptime, and be able to
                  run continuously for long periods.
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  Staking nodes must have reliable, always-on internet
                  connection.
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  Node should accept incoming connections from the network, not
                  be behind a restrictive firewall, and not limit the number of
                  connections (do not set the{" "}
                  <code className="rounded bg-gray-800 px-1">
                    maxconnections
                  </code>
                  parameter in the{" "}
                  <code className="rounded bg-gray-800 px-1">bitcoin.conf</code>{" "}
                  file).
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  It is advisable to run multiple nodes per Proof with the use
                  of Delegations. For best redundancy, the nodes should be
                  geographically distributed, in different data centres and with
                  different providers. This will help provide better service to
                  the avalanche network, and ease in upgrading nodes one at a
                  time to ensure no staking downtime.
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  Do not use Tor for your staking node. Using Tor results in an
                  unreliable connection to the rest of the network. It provides
                  worse service to the avalanche network, and increases the
                  chance of losing your staking rewards.
                </span>
              </li>
            </ul>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="Frequently Asked Questions" />

            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-xl font-semibold text-white">
                  How is the staking reward recipient determined?
                </h4>
                <p className="text-gray-300">
                  The staking reward winner is determined by generating a
                  ranking value for each Proof in the quorum, and then selecting
                  the smallest as the winner for that block. This ranking value
                  is generated by hashing the Proof ID together with the
                  previous block hash, and then scaling the result appropriately
                  based on the staked amount.
                </p>
              </div>

              <div>
                <h4 className="mb-3 text-xl font-semibold text-white">
                  If I have many stakes instead of one single stake in the proof
                  with the same amount of coins, will it lower my chance of
                  winning the reward?
                </h4>
                <p className="text-gray-300">
                  No, the expected rewards are the same in either case. The
                  probability of winning staking rewards is directly
                  proportional to the stake amount.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Further Reading Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="Further Reading" />
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  <Link
                    href="/blog/ecash-avalanche-tutorial"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    eCash Avalanche Tutorial
                  </Link>
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  <a
                    href="https://proofofwriting.com/184/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    Everything you want to know about eCash staking rewards
                  </a>
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  <a
                    href="https://ecashstaking.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    eCashStaking - Earn eCash staking rewards without running
                    your own node
                  </a>
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                </div>
                <span>
                  <a
                    href="https://stakedxec.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    stakedXec.com - tokenized staking with XECX
                  </a>
                </span>
              </li>
            </ul>
          </motion.div>
        </div>
      </ContentContainer>
    </div>
  );
}
