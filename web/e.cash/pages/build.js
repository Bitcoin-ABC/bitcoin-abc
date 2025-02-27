// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, GradientSpacer } from '/components/atoms';
import ExternalLink from '/components/external-link';
import coinupdown from '/public/animations/coin-up-down.json';
import {
    LinkSection,
    BuildLinkCtn,
    InnerBuildLinkCtn,
    LinkArrow,
} from '/styles/pages/build.js';

const devLinks = [
    {
        sectionTitle: 'Contribute',
        anchor: 'contribute',
        links: [
            {
                title: 'Contribution guide',
                description:
                    'Learn more about contributing to the Bitcoin ABC repository',
                link: 'https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md',
            },
            {
                title: 'Source Code',
                description:
                    'Source Code for eCash Software from Bitcoin ABC - Including the Full Node, Electrum ABC wallet, and Cashtab Wallet',
                link: 'https://github.com/Bitcoin-ABC/bitcoin-abc/',
            },
        ],
    },
    {
        sectionTitle: 'Software',
        anchor: 'software',
        links: [
            {
                title: 'Bitcoin ABC Releases',
                description:
                    'Ready-to-run Binaries for the Bitcoin ABC Full Node',
                link: 'https://www.bitcoinabc.org/releases/',
            },
            {
                title: 'Chronik indexer',
                description:
                    'Chronik is a fast and reliable indexer built into the Bitcoin ABC node software',
                link: 'https://chronik.e.cash/',
            },
        ],
    },
    {
        sectionTitle: 'Libraries',
        anchor: 'libraries',
        links: [
            {
                title: 'chronik-client',
                description:
                    'Interact with the eCash blockchain through the chronik indexer',
                link: 'https://www.npmjs.com/package/chronik-client',
            },
            {
                title: 'ecash-lib',
                description:
                    'Full-featured eCash-native transaction building library',
                link: 'https://www.npmjs.com/package/ecash-lib',
            },
            {
                title: 'ecashaddrjs',
                description: 'Tools for working with eCash addresses',
                link: 'https://www.npmjs.com/package/ecashaddrjs',
            },
        ],
    },
    {
        sectionTitle: 'Examples',
        anchor: 'examples',
        links: [
            {
                title: 'Cashtab codebase',
                description: 'Public repo for the Cashtab wallet',
                link: 'https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/cashtab',
            },
        ],
    },
    {
        sectionTitle: 'Documentation',
        anchor: 'documentation',
        links: [
            {
                title: 'Bitcoin ABC',
                description:
                    'Documentation for the Bitcoin ABC Full Node Software',
                link: 'https://www.bitcoinabc.org/doc/',
            },
            {
                title: 'Chronik',
                description: 'Documentation for the Chronik Indexer',
                link: 'https://chronik.e.cash',
            },
        ],
    },
    {
        sectionTitle: 'DevHub',
        anchor: 'devhub',
        links: [
            {
                title: 'eCash Devs and Builders',
                description:
                    'Telegram group for more info, and to connect with other developers',
                link: 'https://t.me/eCashBuilders',
            },
        ],
    },
];

function Build() {
    return (
        <Layout>
            <SubPageHero
                image={coinupdown}
                h2subtext="Developers"
                h2text="Build on eCash"
            >
                <p>
                    Become a pioneer in the eCash frontier economy. The eCash
                    network&apos;s unique capabilities enable business models
                    impossible anywhere else. Micropayments, novel tokenomics
                    and on-chain trading — we&apos;re in uncharted territory.
                </p>
                <p>
                    The UTXO model of eCash gives it compelling advantages over
                    other blockchains with account-based systems. Anyone can
                    create scalable and performant products with high
                    transaction throughput and low fees. The Avalanche consensus
                    system ensures fast transaction finality, simplifying the
                    user experience and enabling apps built on eCash to be
                    snappy and responsive.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <H3 text="The eCash Advantage" />
                <p>
                    The eCash blockchain is instantly accessible to app
                    developers with simple, powerful, open-source libraries.
                    Developers can build feature-dense apps that send and
                    receive money instantly. Rapid prototyping is a key strength
                    of the eCash network and its dev tools — MVP apps can be
                    built and deployed in minutes.
                </p>
                {devLinks.map((item, index) => (
                    <LinkSection key={index}>
                        <H3 text={item.sectionTitle} id={item.anchor} />
                        {item.links.map((link, i) => (
                            <ExternalLink key={i} href={link.link}>
                                <BuildLinkCtn>
                                    <InnerBuildLinkCtn>
                                        <h4>{link.title}</h4>
                                        <p>{link.description}</p>
                                        <LinkArrow>
                                            <H3 text=">" />
                                        </LinkArrow>
                                    </InnerBuildLinkCtn>
                                </BuildLinkCtn>
                            </ExternalLink>
                        ))}
                    </LinkSection>
                ))}
            </Container>
        </Layout>
    );
}

export default Build;
