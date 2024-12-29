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
    FlexButtons,
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
import pay2stay from '/public/images/Pay2Stay.png';
import xecxLogo from '/public/images/xecx-logo-white.png';

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
                        id="pay2stay"
                        title="Pay2Stay"
                        image={pay2stay}
                        alt="Pay2Stay logo"
                    >
                        <p>
                            Experience the fastest, safest, and fairest private
                            event ticketing app. Gain control of your time and
                            money as you host, join, or promote exclusive
                            events.
                        </p>
                        <p>
                            Guest list management. QR code check-ins. Time-based
                            and upfront pricing models. Instant refunds.
                            Tailored for small and medium in-person private
                            events. Sign up is free forever!
                        </p>
                        <p>Built using eCash&apos;s eToken technology.</p>
                        <Button
                            text="Get Started"
                            link="https://pay2stay.com/"
                            corner="bottomRight"
                            color="accent"
                            openInNewTab
                        />
                    </TextImageBlock>
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
                    <TextImageBlock
                        id="xecx"
                        title="XECX"
                        image={xecxLogo}
                        alt="XECX logo"
                    >
                        <p>
                            Earn crypto while you sleep with as little as $1 of
                            XECX. Holders of XECX receive daily eCash staking
                            reward payouts in XEC. Trade XECX for XEC 1:1 on the
                            Agora marketplace.
                        </p>

                        <p>Built using eCash&apos;s ALP technology.</p>
                        <FlexButtons>
                            <Button
                                text="Learn more"
                                link="https://stakedxec.com/"
                                corner="bottomRight"
                                color="accent"
                                openInNewTab
                            />
                            <Button
                                text="Get XECX"
                                link="https://cashtab.com/#/token/c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4"
                                corner="bottomRight"
                                color="white"
                                openInNewTab
                            />
                        </FlexButtons>
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
