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

const oldVersion = `0.28.12`;

function Upgrade(props) {
    const latestVersion = props.latestVersion;
    const latestMajor = latestVersion.split('.', 2).join('.').concat('.x');

    return (
        <Layout>
            <SubPageHero
                image={pins}
                h2subtext="May 15th 2024"
                h2text="eCash Network Upgrade"
                noLoop
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
                <H3 text="What happened?" id="what" />
                <p>
                    The planned upgrade of the eCash network has successfully
                    been completed. The first post-upgrade block is block number{' '}
                    <ExternalLink href="https://explorer.e.cash/block/0000000000000000053b80210677e6821a2ac0ed73b949a78667e1bfb3dfa6eb">
                        844743
                    </ExternalLink>
                    .
                </p>
                <H3 text="Who needs to upgrade?" id="who" />
                <p>
                    All operators of a Bitcoin ABC full node must upgrade to the
                    latest major version {latestMajor} (current latest version
                    is {latestVersion}). This is available at the Bitcoin ABC{' '}
                    <Link href="https://bitcoinabc.org/releases/">
                        Releases Page
                    </Link>
                    .
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
                    npm package.
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

async function getLatestVersion() {
    const response = await fetch(
        'https://api.github.com/repos/Bitcoin-abc/bitcoin-abc/releases?per_page=1',
        {
            headers: {
                accept: 'application/vnd.github.v3+json',
            },
        },
    );
    const releases = await response.json();
    return releases[0].name;
}

export async function getStaticProps() {
    const latestVersion = await getLatestVersion();
    return {
        props: {
            latestVersion: latestVersion,
        },
    };
}

export default Upgrade;
