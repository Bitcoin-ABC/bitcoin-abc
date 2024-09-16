// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import Layout from '/components/layout';
import VideoBackground from '/components/videobackground';
import GlitchText from '/components/glitch-text';
import { Container } from '/components/atoms';
import {
    Hero,
    ButtonCtn,
    HeroImage,
    StoryAndWhySection,
    Overlay,
    PixelBorder,
    TilesSectionCtn,
    MarginButtonWrapper,
    HeroContentCtn,
    HeroTextCtn,
    Tagline,
    BlackGradient,
    ExchangeTileCtn,
    ExchangeTileGroup,
    ExchangeTile,
    ExchangeWrapper,
    BuildSection,
    BuildSectionCtn,
    ButtonFlagCtn,
} from '/styles/pages/homepage';
import Button from '/components/button';
import H2 from '/components/h2';
import Hand from '/public/images/hand-logo.png';
import Rockets from '/public/images/rocket.png';
import CoreTech from '/components/core-tech';
import { getScoreCardData } from '/data/scores.js';

function Home(props) {
    const ExchangeTiles = ({ reverse, set2 }) => {
        return (
            <ExchangeTileGroup reverse={reverse}>
                {props.exchanges
                    .slice(set2 ? 7 : 0, set2 ? 13 : 6)
                    .map((item, index) => {
                        const logoSrc = Array.isArray(item.attributes.logo.data)
                            ? item.attributes.logo.data[0].attributes
                            : item.attributes.logo.data.attributes;
                        return (
                            <ExchangeTile
                                key={index}
                                href={item.attributes.url}
                                target="_blank"
                            >
                                <Image
                                    src={
                                        process.env
                                            .NEXT_PUBLIC_STRAPI_SCORECARD_URL +
                                        logoSrc.url
                                    }
                                    fill
                                    sizes="12vw"
                                    alt={item.attributes.name}
                                />
                            </ExchangeTile>
                        );
                    })}
            </ExchangeTileGroup>
        );
    };
    return (
        <Layout>
            <Hero>
                <VideoBackground videoname="purple-abstract" />
                <Container>
                    <HeroContentCtn>
                        <HeroTextCtn>
                            <h1>
                                <span>Cash for the</span>
                                <GlitchText text="Internet" />
                            </h1>
                            <Tagline>Fast. Secure. Scalable.</Tagline>
                            <p>
                                Experience the revolutionary new money powered
                                by
                                <b> Avalanche</b>.
                            </p>

                            <ButtonCtn>
                                <MarginButtonWrapper>
                                    <ButtonFlagCtn>
                                        <span>Free XEC</span>
                                        <div>
                                            <Image
                                                src="/images/arrow.png"
                                                alt="arrow"
                                                fill
                                            />
                                        </div>
                                    </ButtonFlagCtn>
                                    <Button
                                        id="create_wallet_hero"
                                        text="Create Wallet"
                                        link="https://cashtab.com"
                                        openInNewTab
                                        color="white"
                                        glow
                                        corner="topLeft"
                                    />
                                </MarginButtonWrapper>
                                <Button
                                    id="get_ecash_hero"
                                    text="Get eCash"
                                    link="/get-ecash"
                                    color="accent"
                                    corner="bottomRight"
                                    glow
                                />
                            </ButtonCtn>
                        </HeroTextCtn>
                        <HeroImage>
                            <Image src={Hand} alt="eCash" fill priority />
                        </HeroImage>
                    </HeroContentCtn>
                </Container>
                <BlackGradient />
            </Hero>
            <StoryAndWhySection>
                <Overlay />
                <ExchangeWrapper>
                    <ExchangeTileCtn>
                        <ExchangeTiles />
                        <ExchangeTiles />
                    </ExchangeTileCtn>
                    <ExchangeTileCtn>
                        <ExchangeTiles reverse set2 />
                        <ExchangeTiles reverse set2 />
                    </ExchangeTileCtn>
                </ExchangeWrapper>
                <Container>
                    <TilesSectionCtn>
                        <H2 subtext="Why eCash?" text="Core Tech" center />
                    </TilesSectionCtn>
                    <CoreTech />
                </Container>
            </StoryAndWhySection>
            <PixelBorder />
            <BuildSection>
                <Container>
                    <BuildSectionCtn>
                        <div>
                            <H2 text="Build on eCash" />
                            <p>
                                eCash is programmable cash anyone can work with.
                                We’ve made it a snap to create your own eTokens,
                                develop apps, or explore the blockchain.
                            </p>
                            <Button
                                text="Start Building"
                                link="/build"
                                color="primary"
                                corner="bottomRight"
                                glow
                            />
                        </div>
                        <div>
                            <Image src={Rockets} alt="Build on eCash" fill />
                        </div>
                    </BuildSectionCtn>
                </Container>
            </BuildSection>
        </Layout>
    );
}

/**
 * Call function to fetch scorecard api data and return scored and sorted arrays.
 * This only runs at build time, and the build should fail if the api call fails
 * @returns {object} props - page props to pass to the page
 * @throws {error} on bad API call or failure to parse API result
 */
export async function getStaticProps() {
    const response = await getScoreCardData();
    return {
        props: response.props,
    };
}

export default Home;
