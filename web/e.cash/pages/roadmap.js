// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, GradientSpacer } from '/components/atoms';
import Roadmap from '/components/roadmap';
import pins from '/public/animations/pins.json';
import { RoadmapCtn, PixelBorder, ListItem } from '/styles/pages/roadmap.js';

export default function RoadmapPage() {
    return (
        <Layout metaTitle="Roadmap">
            <SubPageHero
                image={pins}
                h2subtext="Roadmap"
                h2text="Introduction"
                noLoop
            >
                <p>
                    The goal for eCash is to become sound money that is usable
                    by everyone in the world. This is a civilization-changing
                    technology which will dramatically increase human freedom
                    and prosperity.
                </p>
            </SubPageHero>
            <GradientSpacer />

            <Container narrow>
                <H3 text="eCash Roadmap Explained" />
                <p>
                    The roadmap provides a high level overview of the technical
                    direction of the eCash protocol. This enables different
                    technical teams to work together toward the common goal of
                    advancing the project. eCash developers produce high quality
                    professional software that serves the needs of its users,
                    miners, and merchants. Continuous technical improvement is
                    the eCash standard.
                </p>
                <p>
                    Software advances through constant incremental improvements.
                    The optimizations and protocol upgrades outlined in the
                    roadmap allow eCash to scale by orders of magnitude.
                </p>
                <h4>There are three main categories of improvements:</h4>
                <ol>
                    <ListItem>
                        Scaling transaction throughput (from about 100
                        transactions per second to more than 5 million
                        transactions per second).
                    </ListItem>
                    <ListItem>
                        Improving the payment experience. Instant and reliable
                        is the baseline. All transactions should arrive
                        instantly and be secure within 3 seconds.
                    </ListItem>
                    <ListItem>
                        Extending the protocol & establishing fork-free future
                        upgrades to support tomorrow&apos;s economy.
                    </ListItem>
                </ol>
                <p>
                    The eCash network currently upgrades every year on May 15th
                    and Nov 15th. These upgrades are required for all node
                    operators. To support business planning, the upgrades are
                    based on a timestamp and not a specific blockheight.
                </p>
            </Container>
            <PixelBorder />
            <RoadmapCtn>
                <Container>
                    <H3 text="Roadmap" center />
                    <Roadmap />
                </Container>
            </RoadmapCtn>
        </Layout>
    );
}
