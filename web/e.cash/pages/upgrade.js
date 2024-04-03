// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import Link from 'next/link';
import ExternalLink from '/components/external-link';
import { Container, GradientSpacer } from '/components/atoms';
import pins from '/public/animations/pins.json';

const latestVersion = `0.28.4`;
const oldVersion = `0.27.15`;

function Upgrade(props) {
    return (
        <Layout>
            <SubPageHero
                image={pins}
                h2subtext="Nov 15th 2023"
                h2text="eCash Network Upgrade"
            >
                <p>
                    As part of its rapid development roadmap, the eCash network
                    undergoes periodic network upgrades. Check here to find
                    up-to-date information so you can stay informed, and be
                    prepared for the next upgrade.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <H3 text="What happened?" id="what" />
                <p>
                    The planned upgrade of the eCash network has successfully
                    been completed. The first post-upgrade block is block number{' '}
                    <ExternalLink href="https://explorer.e.cash/block/000000000000000003e79cfe757a675909fd2bffde52158ce4ec826e5ac6ae79">
                        818670
                    </ExternalLink>
                    .
                </p>
                <H3 text="Who needs to upgrade?" id="who" />
                <p>
                    All operators of a Bitcoin ABC full node must upgrade to the
                    latest major version ({latestVersion}). This is available at
                    the Bitcoin ABC{' '}
                    <Link href="https://bitcoinabc.org/releases/">
                        Releases Page
                    </Link>
                    .
                </p>
                <H3
                    text="What features are included in the Network Upgrade?"
                    id="features"
                />
                <b>Staking Rewards</b>
                <p>
                    A block policy is added that 10% of the block reward is
                    allocated as a staking reward. There is one recipient in
                    each block, chosen from the avalanche quorum. The reward is
                    sent to the Proof `payoutAddress` field, chosen
                    deterministically from the quorum based on the previous
                    block hash, with probability weighted by the Proof&apos;s
                    stake amount.
                </p>
                <p>
                    eCash miners must ensure that their mining setup is properly
                    configured to add the staking rewards to the coinbase
                    outputs. The payout address and amount are available via the
                    `getblocktemplate` RPC.
                </p>
                <b>Miner fund increase</b>
                <p>
                    The miner fund, part of the block reward that is funding
                    eCash network development, was increased from 8% of the
                    block reward to 32%.
                </p>
                <p>
                    eCash miners must ensure that their mining setup is properly
                    configured to use the proper miner fund amount. This
                    information is available via the `getblocktemplate` RPC.
                </p>
                <H3 text="Do I need to upgrade my wallet?" id="wallet" />
                <p>
                    The network upgrade only affects full nodes. Other eCash
                    software, including wallets such as{' '}
                    <Link href="https://bitcoinabc.org/electrum/">
                        Electrum ABC
                    </Link>{' '}
                    are not affected by the network upgrade.
                </p>
                <H3 text="How do I upgrade?" id="instructions" />
                <p>
                    The process of upgrading your node is straightforward:
                    simply stop the currently running node, download the new
                    version, and start the new version. Here are some example
                    instructions for upgrading from version {oldVersion} to
                    version {latestVersion} on Linux:
                </p>
                <ol>
                    <li>
                        Shut down the node:
                        <br />
                        <code>
                            ./bitcoin-abc-{oldVersion}/bin/bitcoin-cli stop
                        </code>
                    </li>
                    <li>
                        Download the new version archive from the website:{' '}
                        <br />
                        <code>
                            wget https://download.bitcoinabc.org/{latestVersion}
                            /linux/bitcoin-abc-{latestVersion}
                            -x86_64-linux-gnu.tar.gz
                        </code>
                    </li>
                    <li>
                        Extract the archive:
                        <br />
                        <code>
                            tar xzf bitcoin-abc-{latestVersion}
                            -x86_64-linux-gnu.tar.gz
                        </code>
                    </li>
                    <li>
                        Restart the node with the new version:
                        <br />
                        <code>
                            ./bitcoin-abc-{latestVersion}/bin/bitcoind -daemon
                        </code>
                    </li>
                    <li>
                        Clean up old version and archives (optional):
                        <ul>
                            <li>
                                <code>rm -rf bitcoin-abc-{oldVersion}</code>
                            </li>
                            <li>
                                <code>
                                    rm -f bitcoin-abc-{oldVersion}
                                    -x86_64-linux-gnu.tar.gz
                                </code>
                            </li>
                            <li>
                                <code>
                                    rm -f bitcoin-abc-{latestVersion}
                                    -x86_64-linux-gnu.tar.gz
                                </code>
                            </li>
                        </ul>
                    </li>
                </ol>
            </Container>
        </Layout>
    );
}

export default Upgrade;
