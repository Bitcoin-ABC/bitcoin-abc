// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import Image from 'next/image';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, GradientSpacer } from '/components/atoms';
import coinupdown from '/public/animations/coin-up-down.json';
import coinflip from '/public/animations/exchanges-coin-flip.json';
import services from '/public/animations/services.json';
import mining from '/public/animations/mining.json';
import {
    DescriptionBox,
    ImgCtn,
    TilesOuterCtn,
    TitleBox,
    Tile,
    TileImgCtn,
    BlankTile,
    MiningSectionCtn,
    MiningImg,
} from '/styles/pages/get-ecash.js';
import AnimateImage from '/components/animate-image';
import { getScoreCardData } from '/data/scores.js';
import Button from '/components/button';

function TileSection({ title, items }) {
    return (
        <>
            <TitleBox>{title}</TitleBox>
            <TilesOuterCtn>
                {items.map((item, index) => {
                    if (item === '') {
                        return <BlankTile key={index}></BlankTile>;
                    } else {
                        const logoSrc = Array.isArray(item.logo)
                            ? item.logo[0]
                            : item.logo;
                        return (
                            <Tile
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                key={index}
                            >
                                <TileImgCtn>
                                    <Image
                                        src={`https://api.scorecard.cash${logoSrc.url}`}
                                        fill
                                        sizes="12vw"
                                        alt={item.name}
                                    />
                                </TileImgCtn>
                            </Tile>
                        );
                    }
                })}
            </TilesOuterCtn>
        </>
    );
}

function GetEcash(props) {
    return (
        <Layout>
            <SubPageHero
                image={coinupdown}
                h2subtext="Get eCash"
                h2text="Start Today"
            >
                <p>
                    Get started today by getting your first eCash. It&rsquo;s
                    simple and there are several ways to do it. You can find out
                    how below.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <DescriptionBox>
                    <div>
                        <H3 text="Exchanges" id="exchanges" />
                        <p>
                            eCash is currently listed on most major exchanges
                            under the XEC ticker.
                        </p>
                    </div>
                    <ImgCtn height="500px">
                        <AnimateImage image={coinflip} speed={0.5} reverse />
                    </ImgCtn>
                </DescriptionBox>
                <TileSection title="Exchanges" items={props.exchanges} />
                <TileSection
                    title="Instant Exchanges"
                    items={props.instantExchanges}
                />
                <DescriptionBox>
                    <div>
                        <H3 text="Services" id="services" />
                        <p>Check out eCash service partners.</p>
                    </div>
                    <ImgCtn height="600px">
                        <AnimateImage image={services} speed={0.5} reverse />
                    </ImgCtn>
                </DescriptionBox>
                <TileSection title="Services" items={props.services} />
                <MiningSectionCtn>
                    <div>
                        <H3 text="Mining" id="mining" />
                        <p>
                            eCash is also available through mining, to learn
                            more join our ever expanding community of miners.
                        </p>
                        <Button
                            text="Get Started"
                            link="https://e.cash/blog/xec-ecash-mining"
                            corner="bottomRight"
                            color="accent"
                        />
                    </div>
                    <MiningImg height="500px">
                        <AnimateImage image={mining} reverse />
                    </MiningImg>
                </MiningSectionCtn>
            </Container>
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

export default GetEcash;
