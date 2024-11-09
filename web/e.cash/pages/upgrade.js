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

const oldVersion = `0.29.13`;

function Upgrade(props) {
    const latestVersion = props.latestVersion;
    const latestMajor = latestVersion.split('.', 2).join('.').concat('.x');

    return (
        <Layout>
            <SubPageHero
                image={pins}
                h2subtext="Nov 15th 2024"
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
                <p>
                    Miners need to update their setup according to the
                    instructions on the <Link href="/mining">Mining page</Link>{' '}
                    .
                </p>
                <H3 text="Exactly when will the upgrade activate?" id="when" />
                <p>
                    In order to activate reliably at a predictable time, the
                    network upgrade uses the &ldquo;Median Time Past&rdquo;
                    mechanism. The upgrade activates when the median of the last
                    11 blocks reaches timestamp 1731672000 (12:00:00 UTC on
                    November 15th, 2024). This means that the upgrade does not
                    actually activate exactly at that time, but typically about
                    one hour later, when 6 blocks with timestamps greater than
                    the activation time have been produced.
                </p>
                <H3
                    text="What features are included in the Network Upgrade?"
                    id="features"
                />
                <p>
                    The{' '}
                    <Link href="/blog/heartbeat-upgrade-a-steady-pulse-for-ecash">
                        Heartbeat
                    </Link>{' '}
                    feature, also known as Real Time Targeting, will activate
                    with this upgrade. This is a block policy that makes it more
                    difficult to mine blocks faster than the expected 10 minutes
                    average, preventing large bumps in difficulty that can lead
                    to inconsistent block intervals. Miners need to update their
                    setup according to the instructions on the{' '}
                    <Link href="/mining">Mining page</Link> .
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
