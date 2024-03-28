// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import Button from '/components/button';
import { Container, GradientSpacer } from '/components/atoms';
import fist from '/public/animations/fist.json';
import avalanche from '/public/animations/avalanche.json';
import staking from '/public/animations/staking.json';
import etoken from '/public/animations/etoken.json';
import calculate from '/public/animations/calculate.json';
import cashfusion from '/public/animations/cashfusion.json';
import AnimateImage from '/components/animate-image';
import {
    TextImageBlockCtn,
    LeftTopArrow,
    LeftDownArrow,
    RightTopArrow,
    RightDownArrow,
    TextCtn,
    ImageCtn,
    ButtonRow,
    Blob,
    ContentCtn,
} from '/styles/pages/core-tech.js';

/**
 * Return a styled block for the coretech items
 * @param {string} title the title of the box to display
 * @param {array} image the lottie json animation data to display
 * @param {boolean} reverse defines image animation direction
 * @param {number} speed defines image animation speed
 * @param {object} children any children to display in the body
 * @param {string} id the CSS id used for anchor links
 */
function TextImageBlock({ title, image, reverse, speed, children, id }) {
    return (
        <TextImageBlockCtn id={id}>
            <LeftTopArrow />
            <LeftDownArrow />
            <RightTopArrow />
            <RightDownArrow />
            <TextCtn>
                <H3 text={title} />
                {children}
            </TextCtn>
            <ImageCtn>
                <AnimateImage image={image} reverse={reverse} speed={speed} />
            </ImageCtn>
        </TextImageBlockCtn>
    );
}

export default function CoreTech() {
    return (
        <Layout
            metaTitle="Core Tech"
            metaDescription="Welcome to the next generation of crypto. eCash combines the core tech behind Bitcoin’s success - the same fixed supply, halving schedule, and genesis block - with state of the art crypto tech (Avalanche). eCash is built by Bitcoin ABC, a team of Bitcoin developers established in 2017."
        >
            <SubPageHero
                image={fist}
                h2subtext="Core Tech"
                h2text="The power of eCash"
                imagespeed="0"
            >
                <p>
                    Welcome to the next generation of crypto. eCash combines the
                    core tech behind Bitcoin’s success - the same fixed supply,
                    halving schedule, and genesis block - with state of the art
                    crypto tech (Avalanche). eCash is built by Bitcoin ABC, a
                    team of Bitcoin developers established in 2017.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <ContentCtn>
                <Blob left="0" top="5%" />
                <Blob left="30%" top="30%" />
                <Blob left="60%" top="60%" />
                <Blob left="0" top="90%" />
                <Container>
                    <TextImageBlock
                        id="avalanche"
                        title="Avalanche"
                        image={avalanche}
                        reverse
                    >
                        <p>
                            Avalanche is a revolutionary consensus algorithm
                            that enables instant transactions, enhanced
                            security, and fork-free upgrades. Other bitcoin
                            competitors (like Bitcoin Cash) lost significant
                            value from contentious (and seemingly endless)
                            forks.
                        </p>
                        <ButtonRow>
                            <Button
                                text="Avalanche"
                                link="https://avalanche.cash/"
                                corner="bottomRight"
                                color="white"
                            />
                            <Button
                                text="Whitepaper"
                                link="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV"
                                corner="bottomRight"
                                color="accent"
                            />
                        </ButtonRow>
                    </TextImageBlock>

                    <TextImageBlock
                        id="staking"
                        title="Staking"
                        image={staking}
                        reverse
                        speed={0.6}
                    >
                        <p>
                            eCash is a technical solution to a political
                            problem: what&rsquo;s the best money? Monetary
                            ecosystems have many important stakeholders. Proof
                            of work mining has extensive empirical history and
                            ensures that some stakeholders are incentivized to
                            continue supporting the network.
                        </p>
                        <p>
                            Recent crypto developments have also proven the
                            value of holder-based staking. Because the focus of
                            eCash is on building the best money possible, rather
                            than building a Twitter religion, every technically
                            feasible solution is on the table. Avalanche staking
                            will be a critical part of eCash governance and user
                            incentivization.
                        </p>
                        <ButtonRow>
                            <Button
                                text="eCash Staking"
                                link="/staking/"
                                corner="bottomRight"
                                color="accent"
                            />
                        </ButtonRow>
                    </TextImageBlock>

                    <TextImageBlock
                        id="etokens"
                        title="eTokens"
                        image={etoken}
                        speed={0.8}
                    >
                        <p>
                            eCash supports tokens that anyone can create and
                            trade. Instantly create your own token with your own
                            name, supply, decimal places, and icon -- all for
                            the low cost and high speed of a single eCash
                            transaction (much less than $0.01).
                        </p>
                    </TextImageBlock>

                    <TextImageBlock
                        id="denomination"
                        title="Small, Convenient Denomination"
                        image={calculate}
                    >
                        <p>
                            No other money has 8 decimal places. Why should
                            eCash? Cryptocurrencies with a lower unit price also
                            enjoy higher bull market appreciation. Because the
                            eCash team is incentivized to ensure the highest
                            currency valuation possible, this change was a
                            no-brainer.
                        </p>
                    </TextImageBlock>

                    <TextImageBlock
                        id="cashfusion"
                        title="CashFusion"
                        image={cashfusion}
                    >
                        <p>
                            You can&rsquo;t always say what you think anymore.
                            More and more, Big Tech controls what you can see
                            and say. On the internet, privacy is the only way to
                            defend your individual freedom.
                        </p>
                        <p>
                            eCash is built by early Bitcoin developers who have
                            been working to solve the problem of internet and
                            financial privacy long before Satoshi&rsquo;s
                            whitepaper. Unfortunately, data analytics and
                            tracking technology have advanced while Bitcoin
                            privacy tech has remained stagnant.
                        </p>
                        <p>
                            Privacy is fundamental to sound money. This is why
                            eCash supports the CashFusion protocol. CashFusion
                            offers anonymity comparable to the top privacy coins
                            while maintaining an auditable supply cap. It can be
                            turned on or off at any time within Electrum ABC.
                        </p>
                    </TextImageBlock>
                </Container>
            </ContentCtn>
        </Layout>
    );
}
