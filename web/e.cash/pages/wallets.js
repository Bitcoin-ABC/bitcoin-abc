// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import Image from 'next/image';
import SubPageHero from '/components/sub-page-hero';
import { Container, GradientSpacer } from '/components/atoms';
import walletAnimation from '/public/animations/wallet.json';
import { wallets, hardwareWallets } from '/data/wallets.js';
import CustomLink from '/components/custom-link';
import {
    WalletCardCtn,
    FlexCtn,
    ImageCtn,
    TextCtn,
    OuterImageCtn,
    TitleBox,
} from '/styles/pages/wallets.js';

/**
 * Return a styled content block for the wallets
 * @param {object} props the data object from the arrays in /data/wallets.js
 */
function WalletCard({ props }) {
    return (
        <CustomLink href={props.link} key={props.name}>
            <WalletCardCtn>
                <FlexCtn>
                    <OuterImageCtn>
                        <ImageCtn>
                            <Image
                                src={props.image}
                                alt={props.name}
                                fill
                                sizes="250px"
                            />
                        </ImageCtn>
                    </OuterImageCtn>
                    <TextCtn>
                        <h4>{props.name}</h4>
                        <p>{props.text}</p>
                        <h5>Check it Out</h5>
                    </TextCtn>
                </FlexCtn>
            </WalletCardCtn>
        </CustomLink>
    );
}

export default function Wallets() {
    return (
        <Layout
            metaTitle="eCash Wallets"
            metaDescription="eCash supports a number of major wallets. Here is a list of official eCash (XEC) wallets to store & manage your XEC coins."
        >
            <SubPageHero
                image={walletAnimation}
                h2subtext="Get eCash"
                h2text="Wallets"
                imagereverse
            >
                <p>
                    eCash supports a number of major wallets. Here is a list of
                    official eCash (XEC) wallets to store & manage your XEC
                    coins:
                </p>
            </SubPageHero>
            <GradientSpacer />

            <Container narrow>
                <TitleBox>Wallets</TitleBox>
                {wallets.map((wallet, index) => (
                    <WalletCard props={wallet} key={index} />
                ))}
                <TitleBox>Hardware Wallets</TitleBox>
                {hardwareWallets.map((wallet, index) => (
                    <WalletCard props={wallet} key={index} />
                ))}
            </Container>
        </Layout>
    );
}
