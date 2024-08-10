// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import Link from 'next/link';
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, CenterImage, GradientSpacer } from '/components/atoms';
import spiningcoin from '/public/animations/spiningcoin.json';
import handslogo from '/public/images/hands-logo.png';
import rocket from '/public/images/rocket.png';
import bitcoinabc from '/public/images/bitcoinabc-logo.png';
import { TextBlock } from '/styles/pages/wealth-redefined.js';
import QuoteCarousel from '/components/quote-carousel';
import Button from '/components/button';
import { ButtonCtn, MarginButtonWrapper } from '/styles/pages/homepage';
export default function WealthRedefined() {
    return (
        <Layout>
            <SubPageHero
                image={spiningcoin}
                h2subtext="What's eCash?"
                h2text="Introduction"
            >
                <p>
                    eCash is digital cash for the internet. You can send it
                    directly to other people just like sending a text message.
                    It works through a decentralized network of computers across
                    the world, without any middlemen. If this sounds like
                    Bitcoin, that&rsquo;s because eCash is based on
                    Bitcoin&rsquo;s software and shares many of its
                    technological fundamentals.
                </p>
                <p>
                    However, eCash is specifically optimized for scalability and
                    speed, making it the ideal internet cash. It&rsquo;s also
                    easily extensible and can seamlessly interoperate with the
                    wider DeFi ecosystem.
                </p>
                <p></p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <TextBlock>
                    <H3 text="Cash, Optimized" id="wealth-redefined" />
                    <p>
                        eCash integrates the groundbreaking Avalanche protocol
                        with its core Nakamoto consensus. This hybrid-consensus
                        enables unmatched capacity, speed, and security that
                        pushes crypto forward and constitutes a viable
                        alternative to legacy finance and looming CBDCs.
                    </p>
                    <p>
                        The eCash network is at the forefront of Layer-1
                        blockchain technology, delivering on the promise that
                        set off this entire new crypto-industry: A
                        censorship-resistant electronic cash system at mass
                        scale.
                    </p>
                    <p>
                        Enter eCash. The revolutionary combination of digital
                        cash and sound money that unlocks new value. Join us and
                        take your first step on the path to financial and
                        personal freedom. Let&rsquo;s redefine money, wealth,
                        and liberty together.
                    </p>
                    <p></p>
                    <ButtonCtn>
                        <MarginButtonWrapper>
                            <Button
                                text="Roadmap"
                                link="/roadmap"
                                color="primary"
                                corner="topLeft"
                                glow
                            />
                        </MarginButtonWrapper>
                        <Button
                            text="Core Tech"
                            link="/core-tech"
                            color="accent"
                            corner="bottomRight"
                            glow
                        />
                    </ButtonCtn>
                </TextBlock>
                <TextBlock>
                    <H3 text="Our Inspiration" id="our-inspiration" />
                    <QuoteCarousel />
                </TextBlock>
                <TextBlock>
                    <H3 text="Project Development" id="project-development" />
                    <p>
                        eCash is developed and maintained by{' '}
                        <Link
                            href="https://www.bitcoinabc.org/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Bitcoin ABC
                        </Link>
                        , a team of professional industry-leading bitcoin
                        developers. Anyone is welcome to contribute directly to
                        the development of this open-source project in
                        accordance with the eCash roadmap.
                    </p>
                    <p></p>
                    <Button
                        text="Start Building"
                        link="/build"
                        color="primary"
                        corner="bottomRight"
                        glow
                    />
                    <CenterImage height="300px">
                        <Image src={bitcoinabc} alt="Bitcoin ABC" fill />
                    </CenterImage>
                </TextBlock>
            </Container>
        </Layout>
    );
}
