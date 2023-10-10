// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import Link from 'next/link';
import { Container, GradientSpacer } from '/components/atoms';
import pins from '/public/animations/pins.json';

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
                <H3 text="Who needs to upgrade?" id="who" />
                <p>
                    All operators of a Bitcoin ABC full node must upgrade to the
                    latest major version (0.28.x). This is available at the
                    Bitcoin ABC{' '}
                    <Link href="https://bitcoinabc.org/releases/">
                        Releases Page
                    </Link>
                    .
                </p>
                <H3 text="Exactly when will the upgrade activate?" id="when" />
                <p>
                    In order to activate reliably at a predictable time, the
                    network upgrade uses the &ldquo;Median Time Past&rdquo;
                    mechanism. The upgrade activates when the median of the last
                    11 blocks reaches timestamp 1700049600 (12:00:00 UTC on
                    November 15th, 2023). This means that the upgrade does not
                    actually activate exactly at that time, but typically about
                    one hour later, when 6 blocks with timestamps greater than
                    the activation time have been produced.
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
                    eCash network development, will increase from 8% of the
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
            </Container>
        </Layout>
    );
}

export default Upgrade;
