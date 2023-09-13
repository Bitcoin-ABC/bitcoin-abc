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
                    Anyone can contribute to the eCash codebase. Start today
                    with open source tools, libraries, and examples listed
                    below.
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
            </Container>
        </Layout>
    );
}

export default Developers;
