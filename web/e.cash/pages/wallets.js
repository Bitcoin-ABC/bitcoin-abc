// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import Image from 'next/image';
import SubPageHero from '/components/sub-page-hero';
import { Container, GradientSpacer } from '/components/atoms';
import walletAnimation from '/public/animations/wallet.json';
import { wallets } from '/data/wallets.js';
import ExternalLink from '/components/external-link';
import Button from '/components/button';
import { ButtonCtn, MarginButtonWrapper } from '/styles/pages/homepage';
import {
    WalletListCtn,
    WalletCardCtn,
    TextCtn,
    ImageCtn,
    DetailsTitle,
    DetailsCtn,
} from '/styles/pages/wallets.js';

/**
 * Return a styled content block for the wallets
 * @param {object} props the data object from the arrays in /data/wallets.js
 */
function WalletCard({ props }) {
    return (
        <WalletCardCtn>
            <ExternalLink href={props.link} key={props.name}>
                <ImageCtn>
                    <Image
                        src={props.image}
                        alt={props.name}
                        fill
                        sizes="250px"
                    />
                </ImageCtn>
                <TextCtn>{props.text}</TextCtn>
                {props.features && (
                    <>
                        <DetailsTitle accent>Supports</DetailsTitle>
                        <DetailsCtn accent>
                            {props.features.map((item, index) => (
                                <div key={index}>{item}</div>
                            ))}
                        </DetailsCtn>
                    </>
                )}
                {props.availableOn && (
                    <>
                        <DetailsTitle>Available on</DetailsTitle>
                        <DetailsCtn>
                            {props.availableOn.map((item, index) => (
                                <div key={index}>{item}</div>
                            ))}
                        </DetailsCtn>
                    </>
                )}
            </ExternalLink>
        </WalletCardCtn>
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
                    Here are the best eCash (XEC) wallets to store & manage your
                    coins. You can also check out our detailed guide to find the
                    best wallet for your needs:
                </p>
                <p></p>
                <Button
                    text="Wallet Guide"
                    link="/blog/choose-the-best-ecash-xec-wallet-a-comprehensive-guide"
                    color="primary"
                    corner="bottomRight"
                    glow
                />
            </SubPageHero>
            <GradientSpacer />

            <Container>
                <WalletListCtn>
                    {wallets.map((wallet, index) => (
                        <WalletCard props={wallet} key={index} />
                    ))}
                </WalletListCtn>
            </Container>
        </Layout>
    );
}
