// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "motion/react";

const minerFundBlockTemplate = `"coinbasetxn": {
    "minerfund": {
        "addresses": [
        "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07"
        ],
        "minimumvalue": 200000327
    }
}`;

const stakingRewardBlockTemplate = `"coinbasetxn": {
    "stakingrewards": {
      "payoutscript": {
        "asm": "OP_DUP OP_HASH160 798038c8969512b74e82124a9a73641928932371 OP_EQUALVERIFY OP_CHECKSIG",
        "hex": "76a914798038c8969512b74e82124a9a7364192893237188ac",
        "reqSigs": 1,
        "type": "pubkeyhash",
        "addresses": [
          "ecash:qpucqwxgj6239d6wsgfy4xnnvsvj3yerwynur52mwp"
        ]
      },
      "minimumvalue": 62500102
    }
}`;

const rttBlockTemplate = `"rtt": {
    "prevheadertime": [
      1727793391,
      1727790158,
      1727785595,
      1727781390
    ],
    "prevbits": "1d00ffff",
    "nodetime": 1727794761,
    "nexttarget": "1b0c2b8b"
}`;

const rttFormulae = `uint32_t compute_next_target(gbt) {
    prevTarget = target_from_compact(gbt.rtt.prevbits);

    diffTime0 = max(1, now - gbt.rtt.prevheadertime[0]);
    target0 = prevTarget * 4.9192018423e-14 * (diffTime0 ** 5);

    diffTime1 = max(1, now - gbt.rtt.prevheadertime[1]);
    target1 = prevTarget * 4.8039080491e-17 * (diffTime1 ** 5);

    diffTime2 = max(1, now - gbt.rtt.prevheadertime[2]);
    target2 = prevTarget * 4.9192018423e-19 * (diffTime2 ** 5);

    diffTime3 = max(1, now - gbt.rtt.prevheadertime[3]);
    target3 = prevTarget * 4.6913164542e-20 * (diffTime3 ** 5);

    nextTarget = min(target0, target1, target2, target3);

    // The real time target is never higher (less difficult) than the normal
    // target.
    if (nextTarget < target_from_compact(gbt.bits)) {
        return target_to_compact(nextTarget);
    }
    
    return gbt.bits;
}`;

export default function MiningContent() {
  return (
    <div className="relative w-full py-20">
      <ContentContainer className="max-w-[700px]">
        <div className="space-y-12">
          {/* Introduction Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <p>
              Mining is a specialized industry that uses purpose-built machines
              called mining rigs. These machines contain custom ASIC chips, and
              must be purchased specifically for crypto mining. Mining
              operations vary in scale from large industrial operations with
              full data-center warehouses with thousands of mining rigs, to
              hobbyists who run a small number of mining rigs at home.
            </p>
            <p>
              Different cryptocurrencies may use different mining algorithms
              requiring different hardware. In the case of eCash, it uses the
              same SHA256 mining algorithm as Bitcoin, and thus BTC miners can
              also be used to mine eCash.
            </p>
            <p>
              Once you have a mining rig set up, you have two options to start
              mining. You can point your hash power to a mining service
              provider, or you can set up infrastructure to mine on your own.
            </p>
          </motion.div>

          {/* Mining Service Providers Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <PlusHeader text="Using a mining service provider" />
            <p>
              Using a service provider has the advantage that it will handle
              technical setup for you, typically in exchange for a fee.
            </p>

            <div className="space-y-6">
              <div>
                <h4 className="mb-4 text-xl font-semibold text-white">
                  Solo mining with a service provider
                </h4>
                <p className="mb-4">
                  One option is to "solo mine", while outsourcing the block
                  template construction. This means the miner can point their
                  hash power at a stratum endpoint, and they will receive the
                  full miner portion of the block reward when their miners find
                  a block.
                </p>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://xec.solopool.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Solopool
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://xec.molepool.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Molepool
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://letsmine.it/coin/xec"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      letsmineit
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.mining-dutch.nl/pools/ecash.php?page=dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Mining Dutch
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 text-xl font-semibold text-white">
                  Using a mining pool
                </h4>
                <p className="mb-4">
                  Many mining services offer mining "pools", which smooth out
                  mining rewards to make payouts steadier and more predictable.
                  There are several pools for mining eCash. Some options are
                  listed here:
                </p>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://support.viabtc.com/hc/en-us/articles/7207444931599"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      ViaBTC
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.mining-dutch.nl/pools/ecash.php?page=dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Mining Dutch
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://beta.zulupool.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Zulupool
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://zergpool.com/site/block?coin=XEC"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Zergpool
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://zpool.ca/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      zpool
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://letsmine.it/pool/XECPOOL"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      letsmineit
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://pool.kryptex.com/xec"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      Kryptex
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Running Your Own Mining Setup Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <PlusHeader text="Running your own mining setup" />
            <p>
              Rather than relying on a service provider, a miner can take on the
              responsibility of handling their own technical setup. The
              advantage is that you retain privacy, and full control of the
              operation by not relying on a third party.
            </p>

            <div className="space-y-6">
              <div>
                <h4 className="mb-4 text-xl font-semibold text-white">
                  Solo mining
                </h4>
                <p>
                  Solo mining requires running an eCash node along with
                  specialized mining software. Such mining software is available{" "}
                  <a
                    href="https://github.com/Bitcoin-ABC/ecash-ckpool-solo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 transition-colors hover:text-blue-300"
                  >
                    here
                  </a>
                  .
                </p>
              </div>

              <div>
                <h4 className="mb-4 text-xl font-semibold text-white">
                  Operating a mining pool
                </h4>
                <p>
                  Adding eCash to a mining pool can be an attractive option.
                  Because eCash uses the same SHA256 mining algorithm as
                  Bitcoin, the technical requirements are similar. One aspect to
                  keep in mind, however, is that miners need to be aware of the
                  avalanche consensus layer on eCash, to ensure that the blocks
                  they produce will be accepted by the avalanche validators.
                </p>
              </div>

              <div>
                <h4 className="mb-4 text-xl font-semibold text-white">
                  General recommendations
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    The node generating the block template should have avalanche
                    enabled (it is enabled by default).
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    <span>
                      In order to maximize profit, a mining node can also be{" "}
                      <a
                        href="/staking"
                        className="text-blue-400 transition-colors hover:text-blue-300"
                      >
                        staking
                      </a>{" "}
                      and benefit from the staking rewards.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    <span>
                      Ensure the node has good connectivity. It should accept
                      inbound connections, accept both IPv4 and IPv6, and have
                      no restriction in the number of connections (e.g. no{" "}
                      <code className="rounded bg-gray-800 px-2 py-1 text-sm">
                        maxconnection
                      </code>{" "}
                      config set).
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    All the rules listed below are mandatory. If any is skipped
                    your block will be rejected by the Avalanche consensus layer
                    even though your node may succeed in submitting the block.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    <span>
                      If you need any help to add eCash support to your mining
                      software, you can request for support in the{" "}
                      <a
                        href="https://t.me/eCashNode"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 transition-colors hover:text-blue-300"
                      >
                        eCash Node Support group
                      </a>
                      .
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Miner Fund Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h4 className="text-xl font-semibold text-white">Miner fund</h4>
            <p>
              The coinbase transaction must include a "miner fund" output. This
              portion of the coinbase is dedicated to funding the development of
              eCash.
            </p>
            <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-6">
              <pre className="overflow-x-auto text-sm text-gray-300">
                <code>{minerFundBlockTemplate}</code>
              </pre>
            </div>
            <p>
              The miner fund output is a payment of at least
              "coinbasetxn.minerfund.minimumvalue" (in Satoshi) to the eCash
              address "coinbasetxn.minerfund.addresses[0]". This amount should
              be subtracted from the total coinbase reward value.
            </p>
            <div className="rounded-lg bg-gray-800/50 p-6">
              <p className="mb-4 text-lg leading-relaxed text-gray-300">
                <strong className="text-white">Notes:</strong>
              </p>
              <ul className="space-y-2 text-lg text-gray-300">
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  This is a P2SH address
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  The "addresses" field is an array for legacy reason, but all
                  the value is expected to go to a single address and the array
                  length is always 1.
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  The address might change in the future and thus should not be
                  hardcoded.
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Staking Rewards Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h4 className="text-xl font-semibold text-white">
              Staking rewards
            </h4>
            <p>
              The coinbase transaction must include a "staking reward" output.
              This portion of the coinbase is going to a staker who is
              contributing to the security of the eCash network.
            </p>
            <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-6">
              <pre className="overflow-x-auto text-sm text-gray-300">
                <code>{stakingRewardBlockTemplate}</code>
              </pre>
            </div>
            <p>
              The staking reward output is a payment of at least
              "coinbasetxn.stakingrewards.minimumvalue" (in Satoshi) to the
              payout script "coinbasetxn.stakingrewards.payoutscript.hex". This
              amount should be subtracted from the total coinbase reward value.
            </p>
            <div className="rounded-lg bg-gray-800/50 p-6">
              <p className="mb-4 text-lg leading-relaxed text-gray-300">
                <strong className="text-white">Notes:</strong>
              </p>
              <ul className="space-y-2 text-lg text-gray-300">
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  The payout script can be any standard eCash script. You should
                  not assume it is P2PKH or any other kind and use the script
                  hex directly. The other fields are informational only and
                  might be missing from the block template.
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  The payout script is updated for each block and should not be
                  hardcoded.
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Heartbeat Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h4 className="text-xl font-semibold text-white">Heartbeat</h4>
            <p>
              The eCash network will enforce Real Time Targeting (also known as
              Heartbeat) starting with the{" "}
              <a
                href="/upgrade"
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                November 15, 2024 network upgrade
              </a>
              . This feature increases the difficulty when blocks are found at a
              faster rate than the expected 10 minutes average interval. The
              difficulty monotonically decreases over time until it reaches a
              plateau value. This is intended to avoid spikes in the difficulty
              that can lead to inconsistent block intervals.
            </p>
            <p>
              Blocks with a hash that is higher than the Real Time Target will
              be rejected by the Avalanche consensus layer.
            </p>
            <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-6">
              <pre className="overflow-x-auto text-sm text-gray-300">
                <code>{rttBlockTemplate}</code>
              </pre>
            </div>
            <p>
              Your pool software needs to make sure the submitted block hash
              complies with the Real Time Target. There are 2 options to achieve
              this:
            </p>
            <ul className="space-y-3 text-lg text-gray-300">
              <li className="flex items-start">
                <span className="mr-2 text-blue-400">•</span>
                Read the real time target from the block template. The value is
                directly available in compact form in the field
                "rtt.nexttarget". This field is updated at each call to
                "getblocktemplate".
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-400">•</span>
                Locally compute the target on the pool software. The formula is
                below:
              </li>
            </ul>
            <div className="rounded-lg bg-gradient-to-bl from-[#120D1C] to-black/60 p-6">
              <pre className="overflow-x-auto text-sm text-gray-300">
                <code>{rttFormulae}</code>
              </pre>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-6">
              <p className="mb-4 text-lg leading-relaxed text-gray-300">
                <strong className="text-white">Notes:</strong>
              </p>
              <ul className="space-y-3 text-lg text-gray-300">
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  The Real Time Target does not impact the block header, in
                  particular the difficulty bits should be the ones from the
                  block template "bits" field.
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  If your local time differs from the "rtt.nodetime" field, you
                  can use this value to compensate or fix you system time.
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  The node needs to accumulate 17 blocks before it is able to
                  compute the Real Time Target (the "rtt.prevheadertime" array
                  will contain 0 values otherwise). This could cause the node to
                  mine at a lower difficulty during that time and get rejected
                  blocks. In order to avoid this issue, you can add the option
                  "persistrecentheaderstime=1" to your node configuration file.
                  This instructs the node to save the reference times to disk
                  and reload them on startup. This could cause a slight
                  overshoot of the difficulty if a block is found while the node
                  is restarting, but will ensure that no block will be rejected.
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>
                    If you are using the{" "}
                    <a
                      href="https://github.com/Bitcoin-ABC/ecash-ckpool-solo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 transition-colors hover:text-blue-300"
                    >
                      solo mining software
                    </a>{" "}
                    from Bitcoin ABC, make sure to update with the latest master
                    that supports the new feature.
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
