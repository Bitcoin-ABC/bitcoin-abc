// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import Link from 'next/link';
import ExternalLink from '/components/external-link';
import { Container, GradientSpacer, WarningBox } from '/components/atoms';
import staking from '/public/animations/staking.json';

function Staking(props) {
    return (
        <Layout>
            <SubPageHero
                image={staking}
                h2subtext="Avalanche Consensus powered by eCash Stakers"
                h2text="Staking"
                noLoop
            >
                <p>
                    Stakers have an important job: to participate in
                    eCash&apos;s avalanche consensus system, enabling eCash to
                    be a fast and reliable electronic cash system. eCash
                    avalanche participants should run reliable high-availability
                    nodes in order to provide good quality of service. In
                    exchange for providing this valuable service to the network,
                    eCash stakers can earn staking rewards.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <WarningBox>
                    <b>WARNING</b> There are fake eCash staking guides that
                    attempt to steal your coins. To stake on eCash, you must run
                    a fully-validating node with avalanche enabled. There is no
                    &ldquo;wallet only&rdquo; staking option. Use extreme
                    caution with any third party staking service.
                </WarningBox>
                <p>
                    Staking rewards went live on the eCash network on November
                    15th, 2023 as part of the eCash{' '}
                    <Link href="/upgrade">network upgrade</Link>. The purpose of
                    staking rewards is to incentivize running eCash avalanche
                    nodes to improve the overall security and performance of
                    eCash. As such, it is important for stakers to run high
                    quality nodes. This will help the eCash system to work well,
                    and also ensure you receive the staking rewards.
                </p>
                <H3 text="Staking Requirements" id="requirements" />
                <ul>
                    <li>
                        The coins to be staked must be a minimum of
                        100,000,000.00 XEC per UTXO.
                    </li>
                    <li>
                        The stake UTXOs must have 2016 or more block
                        confirmations. This means the coins must not have moved
                        for approximately two weeks.
                    </li>
                    <li>
                        The stake UTXOs must be of type Pay To Public Key Hash
                        (P2PKH).
                    </li>
                    <li>
                        Staking nodes should have reliably high uptime, and be
                        able to run continuously for long periods.
                    </li>
                    <li>
                        Staking nodes must have reliable, always-on internet
                        connection.
                    </li>
                    <li>
                        Node should accept incoming connections from the
                        network, not be behind a restrictive firewall, and not
                        limit the number of connections (do not set the{' '}
                        <code>maxconnections</code> parameter in the{' '}
                        <code>bitcoin.conf</code> file).
                    </li>
                    <li>
                        It is advisable to run multiple nodes per Proof with the
                        use of Delegations. For best redundancy, the nodes
                        should be geographically distributed, in different data
                        centres and with different providers. This will help
                        provide better service to the avalanche network, and
                        ease in upgrading nodes one at a time to ensure no
                        staking downtime.
                    </li>
                    <li>
                        Do not use Tor for your staking node. Using Tor results
                        in an unreliable connection to the rest of the network.
                        It provides worse service to the avalanche network, and
                        increases the chance of losing your staking rewards.
                    </li>
                </ul>
                <H3 text="Frequently Asked Questions" id="faq" />
                <h4>How is the staking reward recipient determined?</h4>
                <p>
                    The staking reward winner is determined by generating a
                    ranking value for each Proof in the quorum, and then
                    selecting the smallest as the winner for that block. This
                    ranking value is generated by hashing the Proof ID together
                    with the previous block hash, and then scaling the result
                    appropriately based on the staked amount.
                </p>
                <h4>
                    If I have many stakes instead of one single stake in the
                    proof with the same amount of coins, will it lower my chance
                    of winning the reward?
                </h4>
                <p>
                    No, the expected rewards are the same in either case. The
                    probability of winning staking rewards is directly
                    proportional to the stake amount.
                </p>
                <H3 text="Further Reading" id="further-reading" />
                <ul>
                    <li>
                        <Link href="/blog/ecash-avalanche-tutorial">
                            eCash Avalanche Tutorial
                        </Link>
                    </li>
                    <li>
                        <ExternalLink href="https://proofofwriting.com/184/">
                            Everything you want to know about eCash staking
                            rewards
                        </ExternalLink>
                    </li>
                </ul>
            </Container>
        </Layout>
    );
}

export default Staking;
