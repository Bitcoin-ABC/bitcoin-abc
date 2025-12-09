// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "motion/react";
import Link from "next/link";

interface UpgradeContentProps {
  oldVersion: string;
  latestVersion: string;
  latestMajor: string;
}

export default function UpgradeContent({
  oldVersion,
  latestVersion,
  latestMajor,
}: UpgradeContentProps) {
  return (
    <div className="relative w-full py-20">
      <ContentContainer className="max-w-[700px]">
        <div className="space-y-12">
          {/* What happened Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="What happened?" />
            <p>
              The planned upgrade of the eCash network has successfully been
              completed. The first post-upgrade block is block number{" "}
              <Link
                href="https://explorer.e.cash/block/00000000000000004eb0a7a410071b9ff243ed02ea61ce3d566081dd05c05576"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                923348
              </Link>
              .
            </p>
          </motion.div>

          {/* Who needs to upgrade Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="Who needs to upgrade?" />
            <p>
              All operators of a Bitcoin ABC full node must upgrade to the
              latest major version {latestMajor} (current latest version is{" "}
              {latestVersion}). This includes node operators, Avalanche staking
              nodes, Miners and Exchanges. This is available at the Bitcoin ABC{" "}
              <Link
                href="https://bitcoinabc.org/releases/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                Releases Page
              </Link>
              .
            </p>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="What features are included in the Network Upgrade?" />
            <p>This upgrade includes several new protocol features:</p>
            <h4 className="mb-2 text-lg font-semibold text-white">
              Avalanche Pre-Consensus
            </h4>
            <p>
              Pre-Consensus allows nodes to finalize transactions using the
              Avalanche protocol. Finalized transactions are protected from
              double-spending by rejecting blocks containing transactions that
              conflict with them.
            </p>
            <p>
              This means that transactions can be relied on within 2-3 seconds
              with a high degree of trust, since finalized transactions are
              protected from double spending by Avalanche-enabled eCash nodes.
              See{" "}
              <Link
                href="/blog/preconsensus-launch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                the Pre-Consensus launch announcement
              </Link>{" "}
              for more information on this new feature.
            </p>
            <h4 className="mb-2 text-lg font-semibold text-white">
              64-Bit Integers in Script
            </h4>
            <p>
              After this upgrade, 64-bit integers (63 value bits + 1 sign bit)
              are enabled. This is an increase from the 31+sign-bit range that
              was previously active on Script.
            </p>
            <p>
              This improvement allows more finely grained Script smart
              contracts, for example enabling more precise prices for large
              Agora offers.
            </p>
            <h4 className="mb-2 text-lg font-semibold text-white">
              Heartbeat Update
            </h4>
            <p>
              A 1-block window was added to the Real-Time Target calculation.
              This is a refinement to reduce an artifact in the Heartbeat
              behaviour in particular the case where two blocks are mined in
              quick succession. See the{" "}
              <Link
                href="/mining"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                eCash Mining page
              </Link>{" "}
              for more details.
            </p>
            <h4 className="mb-2 text-lg font-semibold text-white">
              Staking Rewards Pre-Consensus
            </h4>
            <p>
              With this feature, eCash staking nodes use Avalanche polling to
              come to consensus on the staking reward winner for the next block
              before it is mined. This makes the network more robust, while
              retaining the previous staking reward behavior.
            </p>
          </motion.div>

          {/* Wallet upgrade Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="Do I need to upgrade my wallet?" />
            <p>
              The network upgrade only affects full nodes. Other eCash software,
              including wallets such as{" "}
              <Link
                href="https://bitcoinabc.org/electrum/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                Electrum ABC
              </Link>{" "}
              are not affected by the network upgrade.
            </p>
          </motion.div>

          {/* How to upgrade Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="How do I upgrade?" />
            <p>
              The process of upgrading your node is straightforward: simply stop
              the currently running node, download the new version, and start
              the new version. Here are some example instructions for upgrading
              from version {oldVersion} to version {latestVersion} on Linux:
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">
                  1. Shut down the node:
                </h4>
                <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-4">
                  <code className="text-sm break-all text-gray-300">
                    ./bitcoin-abc-{oldVersion}/bin/bitcoin-cli stop
                  </code>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">
                  2. Download the new version archive:
                </h4>
                <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-4">
                  <code className="text-sm break-all text-gray-300">
                    wget https://download.bitcoinabc.org/{latestVersion}
                    /linux/bitcoin-abc-{latestVersion}-x86_64-linux-gnu.tar.gz
                  </code>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">
                  3. Extract the archive:
                </h4>
                <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-4">
                  <code className="text-sm break-all text-gray-300">
                    tar xzf bitcoin-abc-{latestVersion}-x86_64-linux-gnu.tar.gz
                  </code>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">
                  4. Restart the node with the new version:
                </h4>
                <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-4">
                  <code className="text-sm break-all text-gray-300">
                    ./bitcoin-abc-{latestVersion}/bin/bitcoind -daemon
                  </code>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">
                  5. Clean up old version and archives (optional):
                </h4>
                <div className="space-y-2">
                  <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-4">
                    <code className="text-sm break-all text-gray-300">
                      rm -rf bitcoin-abc-{oldVersion}
                    </code>
                  </div>
                  <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-4">
                    <code className="text-sm break-all text-gray-300">
                      rm -f bitcoin-abc-{oldVersion}-x86_64-linux-gnu.tar.gz
                    </code>
                  </div>
                  <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-4">
                    <code className="text-sm break-all text-gray-300">
                      rm -f bitcoin-abc-{latestVersion}-x86_64-linux-gnu.tar.gz
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Additional Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <PlusHeader text="Important Notes" />
            <div className="rounded-lg bg-gray-800/50 p-6">
              <ul className="space-y-3 text-lg text-gray-300">
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>
                    Always backup your wallet and configuration files before
                    upgrading
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>
                    Test the upgrade on a testnet or development environment
                    first if possible
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>
                    Monitor your node after upgrading to ensure it's functioning
                    correctly
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>
                    Check the{" "}
                    <Link
                      href="https://bitcoinabc.org/releases/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Bitcoin ABC releases page
                    </Link>{" "}
                    for the latest version information
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </ContentContainer>
    </div>
  );
}
