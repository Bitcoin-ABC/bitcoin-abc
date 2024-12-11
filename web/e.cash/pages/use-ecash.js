// Copyright (c) 2024 The Bitcoin developers
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
    LeftTopArrow,
    LeftDownArrow,
    RightTopArrow,
    RightDownArrow,
    Blob,
    ContentCtn,
} from '/styles/common.js';

import {
    DescriptionBox,
    ImgCtn,
    TilesOuterCtn,
    TitleBox,
    Tile,
    TileImgCtn,
    BlankTile,
} from '/styles/pages/get-ecash.js';

import {
    TextImageBlockCtn,
    TextCtn,
    ImageCtn,
} from '/styles/pages/use-ecash.js';

import AnimateImage from '/components/animate-image';
import { getScoreCardData } from '/data/scores.js';
import Button from '/components/button';

import elps from '/public/images/eLPS.png';
import paybutton from '/public/images/paybutton.png';
import ecashpoker from '/public/images/ecash-poker-logo.png';

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

function TextImageBlock({ title, image, alt, children, id }) {
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
                <Image src={image} alt={alt} fill />
            </ImageCtn>
        </TextImageBlockCtn>
    );
}

function UseEcash(props) {
    return (
        <Layout>
            <SubPageHero
                image={coinupdown}
                h2subtext="Use eCash"
                h2text="Start Today"
            >
                <p>
                    As a convenient and reliable form of electronic cash, eCash
                    is meant to be used! Whether it&apos;s sending money to a
                    friend, buying things online or paying for goods at a
                    point-of-sale. Check out the services listed below to start
                    using your eCash today.
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
                        id="ecashpoker"
                        title="eCash Poker"
                        image={ecashpoker}
                        alt="eCashPoker logo"
                    >
                        <p>
                            The slickest blockchain poker platform is back.
                            Hourly free rolls, no signup, no KYC. Play online
                            poker powered by eCash.
                        </p>
                        <Button
                            text="Play Now"
                            link="https://ecash.poker/"
                            corner="bottomRight"
                            color="accent"
                            openInNewTab
                        />
                    </TextImageBlock>
                    <TextImageBlock
                        id="paybutton"
                        title="PayButton"
                        image={paybutton}
                        alt="PayButton logo"
                    >
                        <p>
                            The easiest way to accept eCash online. Simply add a
                            few lines of code to start accepting eCash on your
                            website.
                        </p>
                        <p>
                            Use the PayButton dashboard to track transactions
                            and revenue for your business. Create wallets and
                            manage your buttons to organize payments across all
                            of your websites.
                        </p>
                        <Button
                            text="Get Started"
                            link="https://paybutton.org/"
                            corner="bottomRight"
                            color="accent"
                            openInNewTab
                        />
                    </TextImageBlock>
                    <TextImageBlock
                        id="elps"
                        title="eLPS"
                        image={elps}
                        alt="eLPS logo"
                    >
                        <p>
                            Powering the digital economy in the world&apos;s #1
                            Charter City, the eLempira (eLPS) is a stabletoken
                            built on eCash. It is used for real-world everyday
                            payments such as for rent, utilities, food, gym
                            memberships, haircuts, and more!
                        </p>
                        <Button
                            text="Learn More"
                            link="https://elpstoken.com/"
                            corner="bottomRight"
                            color="accent"
                            openInNewTab
                        />
                    </TextImageBlock>
                </Container>

                <Container narrow>
                    <DescriptionBox>
                        <div>
                            <H3 text="Services" id="services" />
                            <p>Check out eCash service partners.</p>
                        </div>
                        <ImgCtn height="600px">
                            <AnimateImage
                                image={services}
                                speed={0.5}
                                reverse
                            />
                        </ImgCtn>
                    </DescriptionBox>
                    <TileSection title="Services" items={props.services} />
                </Container>
            </ContentCtn>
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

export default UseEcash;
