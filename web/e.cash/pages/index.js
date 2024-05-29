// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import Link from 'next/link';
import Layout from '/components/layout';
import VideoBackground from '/components/videobackground';
import GlitchText from '/components/glitch-text';
import { Container } from '/components/atoms';
import { socials } from '/data/socials';
import {
    Hero,
    ButtonCtn,
    HeroImage,
    GradientSpacer,
    StoryAndWhySection,
    Overlay,
    StorySection,
    YouTubeVideo,
    PixelBorder,
    RoadmapSection,
    TilesSectionCtn,
    MarginButtonWrapper,
} from '/styles/pages/homepage';
import Button from '/components/button';
import H2 from '/components/h2';
import Hand from '/public/images/hand.png';
import HomepageTiles from '/components/homepage-tiles';
import Roadmap from '/components/roadmap';

export default function Home() {
    return (
        <Layout>
            <VideoBackground videoname="purple-abstract" />
            <Hero>
                <Container>
                    <h1>
                        <span>WEALTH</span>
                        <GlitchText text="REDEFINED" />
                    </h1>
                    <p>
                        Simple. Instant. Secure.
                        <br />
                        Experience the revolutionary new money powered by
                        Avalanche.
                    </p>
                    <HeroImage>
                        <Image src={Hand} alt="eCash" fill priority />
                    </HeroImage>
                    <ButtonCtn>
                        <Button
                            text="About eCash"
                            link="#about-ecash"
                            corner="topLeft"
                        />
                        <MarginButtonWrapper>
                            <Button
                                text="Avalanche Consensus"
                                link="https://avalanche.cash/"
                                color="white"
                                glow
                            />
                        </MarginButtonWrapper>
                        <Button
                            text="Get eCash"
                            link="/get-ecash"
                            color="accent"
                            corner="bottomRight"
                        />
                    </ButtonCtn>
                    <div className="social-ctn">
                        {socials.map(social => (
                            <Link
                                className="social-icon-ctn"
                                href={social.link}
                                target="_blank"
                                rel="noreferrer"
                                key={social.name}
                            >
                                <Image
                                    src={`/images/${social.name}.svg`}
                                    alt={social.name}
                                    fill
                                />
                            </Link>
                        ))}
                    </div>
                </Container>
            </Hero>
            <GradientSpacer />
            <StoryAndWhySection>
                <Overlay />
                <Container>
                    <StorySection>
                        <div id="about-ecash">
                            <H2 subtext="The eCash Story" text="GET STARTED" />
                            <p>
                                The battle-tested cryptocurrency forged from
                                centuries of economic theory and over a decade
                                of real-world crypto experience. This
                                groundbreaking network is the realization of
                                tech-secured sound money, as envisioned by
                                luminaries of free-market philosophy.
                            </p>
                            <p>
                                With eCash, sending money is now as simple as
                                sending an email.
                            </p>
                        </div>
                        <div>
                            <YouTubeVideo>
                                <div>
                                    <iframe
                                        src="https://www.youtube.com/embed/tAl6sPRFQgk?rel=1&amp;controls=0&amp;autoplay=0&amp;mute=0&amp;start=0"
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                        title="eCash - Wealth Redefined"
                                    ></iframe>
                                </div>
                            </YouTubeVideo>
                        </div>
                    </StorySection>
                    <TilesSectionCtn>
                        <H2
                            subtext="Why eCash? Key Features"
                            text="What makes eCash unique?"
                            center
                        />
                    </TilesSectionCtn>
                    <HomepageTiles />
                </Container>
            </StoryAndWhySection>
            <PixelBorder />
            <RoadmapSection>
                <Container>
                    <div id="roadmap" />
                    <H2 subtext="Now & Future" text="ROADMAP" center />
                    <Roadmap />
                </Container>
            </RoadmapSection>
        </Layout>
    );
}
