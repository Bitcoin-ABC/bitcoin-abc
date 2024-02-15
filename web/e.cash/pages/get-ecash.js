// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import Script from 'next/script';
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
    SwapZoneCtn,
} from '/styles/pages/get-ecash.js';
import AnimateImage from '/components/animate-image';
import { getScoreCardData } from '/data/scores.js';
import Button from '/components/button';

function TileSection({ title, items, children }) {
    return (
        <>
            <TitleBox>{title}</TitleBox>
            {children}
            <TilesOuterCtn>
                {items.map((item, index) => {
                    if (item === '') {
                        return <BlankTile key={index}></BlankTile>;
                    } else {
                        const logoSrc = Array.isArray(item.attributes.logo.data)
                            ? item.attributes.logo.data[0].attributes
                            : item.attributes.logo.data.attributes;
                        return (
                            <Tile
                                href={item.attributes.url}
                                target="_blank"
                                rel="noreferrer"
                                key={index}
                            >
                                <TileImgCtn>
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
                >
                    <SwapZoneCtn id="swapzone">
                        <p>
                            Swap your crypto into XEC quickly with the Swapzone
                            aggregator or chose your preferred instant exchange
                            from the list below.
                        </p>
                        <div
                            id="swapzoneExchangeWidget"
                            data-logo="true"
                            data-size="full"
                            data-refid="68y-3PwW6z"
                            data-from="eth"
                            data-to="xec"
                        />
                    </SwapZoneCtn>
                </TileSection>
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
                            link="/mining"
                            corner="bottomRight"
                            color="accent"
                        />
                    </div>
                    <MiningImg height="500px">
                        <AnimateImage image={mining} reverse />
                    </MiningImg>
                </MiningSectionCtn>
            </Container>
            <Script
                src="https://swapzone.io/script/exchange-widget.js"
                id="swapzone"
                strategy="lazyOnload"
            />
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
