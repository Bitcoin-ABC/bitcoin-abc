// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import Link from 'next/link';
import { Container, GradientSpacer } from '/components/atoms';
import coinupdown from '/public/animations/coin-up-down.json';

function Developers(props) {
    return (
        <Layout>
            <SubPageHero
                image={coinupdown}
                h2subtext="Developers"
                h2text="Build on eCash"
            >
                <p>
                    &ldquo;Building&rdquo; is one of the great filters in
                    cryptocurrency. In eCash, it&apos;s also uniquely
                    accessible. You can start right away, and make meaningful
                    contributions in days.
                </p>
                <p>
                    There are many good reasons to start creating software.
                    Leverage is one of the best. A single app written by a
                    single dev can reach millions of customers overnight.
                </p>
                <p>
                    A good strategy to make an app successful is to go though a
                    process of trial, error, feedback, and iteration. Reducing
                    the cycle time of this process is critical. This is called
                    rapid prototyping.
                </p>
                <p>
                    eCash has some of the most impressive rapid prototyping on
                    the market. Today, interested developers can build powerful
                    apps that send and receive money instantly. It can take less
                    than a few hours to get an MVP online and available to
                    users.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <H3 text="How to contribute" id="contributions" />
                <ul>
                    <li>
                        <Link
                            href="https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Contributions guide
                        </Link>
                    </li>
                </ul>
                <H3 text="Libraries" id="libraries" />
                <ul>
                    <li>
                        <Link
                            href="https://www.npmjs.com/package/chronik-client"
                            target="_blank"
                            rel="noreferrer"
                        >
                            chronik-client
                        </Link>
                        , interact with the eCash blockchain through the chronik
                        indexer
                    </li>
                    <li>
                        <Link
                            href="https://www.npmjs.com/package/@bitgo/utxo-lib"
                            target="_blank"
                            rel="noreferrer"
                        >
                            BitGo utxo-lib
                        </Link>
                        , create a wallet, build eCash transactions, manage
                        utxos
                    </li>
                    <li>
                        <Link
                            href="https://www.npmjs.com/package/ecashaddrjs"
                            target="_blank"
                            rel="noreferrer"
                        >
                            ecashaddrjs
                        </Link>
                        , tools for working with eCash addresses
                    </li>
                    <li>
                        <Link
                            href="https://www.npmjs.com/package/ecash-script"
                            target="_blank"
                            rel="noreferrer"
                        >
                            ecash-script
                        </Link>
                        , tools for parsing OP_RETURN transactions
                    </li>
                </ul>
                <H3 text="Examples" id="examples" />
                <ul>
                    <li>
                        <Link
                            href="https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/apps/examples"
                            target="_blank"
                            rel="noreferrer"
                        >
                            App dev examples
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/cashtab"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Cashtab codebase
                        </Link>
                    </li>
                </ul>
                <H3 text="DevHub" id="devhub" />
                <ul>
                    <li>
                        Join the{' '}
                        <Link
                            href="https://t.me/eCashBuilders"
                            target="_blank"
                            rel="noreferrer"
                        >
                            eCash Devs and Builders
                        </Link>{' '}
                        Telegram group for more info, and to connect with other
                        developers.
                    </li>
                </ul>
            </Container>
        </Layout>
    );
}

export default Developers;
