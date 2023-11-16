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
            >
                <p>
                    Stakers have an important job: to participate in the
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
                    Staking rewards will go live on the eCash network on
                    November 15th, 2023 as part of the eCash{' '}
                    <Link href="/upgrade">network upgrade</Link>. The purpose of
                    staking rewards is to incentivize running eCash avalanche
                    nodes to improve the overall security and performance of
                    eCash. As such, it is important for stakers to run high
                    quality nodes. This will help the eCash system to work well,
                    and also ensure you receive the staking rewards.
                </p>
                <H3 text="Staking Requirement" id="requirements" />
                <ul>
                    <li>
                        The node should have reliably high uptime, and be able
                        to run continuously for long periods.
                    </li>
                    <li>Must have reliable internet connection.</li>
                    <li>
                        Node should accept incoming connections from the
                        network, not be behind a restrictive firewall, and not
                        limit the number of connections (do not set the{' '}
                        <code>maxconnections</code> parameter in the{' '}
                        <code>bitcoin.conf</code> file).
                    </li>
                    <li>
                        Preferably run multiple nodes per Proof with the use of
                        Delegations.
                    </li>
                </ul>
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

                <p></p>
            </Container>
        </Layout>
    );
}

export default Staking;
