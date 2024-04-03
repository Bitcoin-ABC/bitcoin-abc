// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import Link from 'next/link';
import ExternalLink from '/components/external-link';
import { Container, GradientSpacer } from '/components/atoms';
import pins from '/public/animations/pins.json';

const latestVersion = `0.29.0`;
const oldVersion = `0.28.12`;

function Upgrade(props) {
    return (
        <Layout>
            <SubPageHero
                image={pins}
                h2subtext="May 15th 2024"
                h2text="eCash Network Upgrade"
            >
                <p>
                    As part of its rapid development roadmap, the eCash network
                    undergoes periodic network upgrades. Check here to find
                    up-to-date information so you can stay informed, and be
                    prepared for the next upgrade.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <H3 text="Who needs to upgrade?" id="who" />
                <p>
                    All operators of a Bitcoin ABC full node must upgrade to the
                    latest major version ({latestVersion}). This is available at
                    the Bitcoin ABC{' '}
                    <Link href="https://bitcoinabc.org/releases/">
                        Releases Page
                    </Link>
                    .
                </p>
                <H3 text="Exactly when will the upgrade activate?" id="when" />
                <p>
                    In order to activate reliably at a predictable time, the
                    network upgrade uses the &ldquo;Median Time Past&rdquo;
                    mechanism. The upgrade activates when the median of the last
                    11 blocks reaches timestamp 1715774400 (12:00:00 UTC on May
                    15th, 2024). This means that the upgrade does not actually
                    activate exactly at that time, but typically about one hour
                    later, when 6 blocks with timestamps greater than the
                    activation time have been produced.
                </p>
                <H3
                    text="What features are included in the Network Upgrade?"
                    id="features"
                />
                <p>
                    There are no consensus changes activating at the upgrade,
                    however the upgrade release includes the Chronik indexer as
                    an opt-in option to the Bitcoin ABC node software for Linux
                    and Windows.
                </p>
                <p>
                    Chronik gives you access to a brand new API to get notified
                    of finalized blocks, retrieve transaction history by eCash
                    address, gather eToken transaction data, and much more. To
                    enable Chronik, simply turn it on with the{' '}
                    <code>-chronik</code> option.
                </p>
                <p>
                    Take a look at the full{' '}
                    <ExternalLink href="https://docs.chronik.xyz/">
                        Setup and API documentation
                    </ExternalLink>{' '}
                    to get an overview of the features, and start building your
                    own application with the{' '}
                    <ExternalLink href="https://www.npmjs.com/package/chronik-client">
                        chronik-client
                    </ExternalLink>{' '}
                    to get an overview npm package.
                </p>

                <H3 text="Do I need to upgrade my wallet?" id="wallet" />
                <p>
                    The network upgrade only affects full nodes. Other eCash
                    software, including wallets such as{' '}
                    <Link href="https://bitcoinabc.org/electrum/">
                        Electrum ABC
                    </Link>{' '}
                    are not affected by the network upgrade.
                </p>
                <H3 text="How do I upgrade?" id="instructions" />
                <p>
                    The process of upgrading your node is straightforward:
                    simply stop the currently running node, download the new
                    version, and start the new version. Here are some example
                    instructions for upgrading from version {oldVersion} to
                    version {latestVersion} on Linux:
                </p>
                <ol>
                    <li>
                        Shut down the node:
                        <br />
                        <code>
                            ./bitcoin-abc-{oldVersion}/bin/bitcoin-cli stop
                        </code>
                    </li>
                    <li>
                        Download the new version archive from the website:{' '}
                        <br />
                        <code>
                            wget https://download.bitcoinabc.org/{latestVersion}
                            /linux/bitcoin-abc-{latestVersion}
                            -x86_64-linux-gnu.tar.gz
                        </code>
                    </li>
                    <li>
                        Extract the archive:
                        <br />
                        <code>
                            tar xzf bitcoin-abc-{latestVersion}
                            -x86_64-linux-gnu.tar.gz
                        </code>
                    </li>
                    <li>
                        Restart the node with the new version:
                        <br />
                        <code>
                            ./bitcoin-abc-{latestVersion}/bin/bitcoind -daemon
                        </code>
                    </li>
                    <li>
                        Clean up old version and archives (optional):
                        <ul>
                            <li>
                                <code>rm -rf bitcoin-abc-{oldVersion}</code>
                            </li>
                            <li>
                                <code>
                                    rm -f bitcoin-abc-{oldVersion}
                                    -x86_64-linux-gnu.tar.gz
                                </code>
                            </li>
                            <li>
                                <code>
                                    rm -f bitcoin-abc-{latestVersion}
                                    -x86_64-linux-gnu.tar.gz
                                </code>
                            </li>
                        </ul>
                    </li>
                </ol>
            </Container>
        </Layout>
    );
}

export default Upgrade;
