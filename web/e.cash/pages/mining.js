// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import Link from 'next/link';
import ExternalLink from '/components/external-link';
import { Container, GradientSpacer } from '/components/atoms';
import CodeBlock from '/components/code-block';
import mining from '/public/animations/mining.json';

const getblocktemplateExample = `"coinbasetxn": {
    "minerfund": {
      "addresses": [
        "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07"
      ],
      "minimumvalue": 200000327
    },
    "stakingrewards": {
      "payoutscript": {
        "asm": "OP_DUP OP_HASH160 798038c8969512b74e82124a9a73641928932371 OP_EQUALVERIFY OP_CHECKSIG",
        "hex": "76a914798038c8969512b74e82124a9a7364192893237188ac",
        "reqSigs": 1,
        "type": "pubkeyhash",
        "addresses": [
          "ecash:qpucqwxgj6239d6wsgfy4xnnvsvj3yerwynur52mwp"
        ]
      },
      "minimumvalue": 62500102
    }
  },
`;

function Mining(props) {
    return (
        <Layout>
            <SubPageHero
                image={mining}
                h2subtext="Nakamoto Consensus powered by SHA256 Proof-of-Work "
                h2text="Mining"
                noLoop
            >
                <p>
                    eCash blocks are produced through a process called mining.
                    Mining involves performing resource-intensive computations
                    to produce Proof-of-Work, which powers eCash’s Nakamoto
                    consensus system, similar to Bitcoin.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <p>
                    Mining is a specialized industry that uses purpose-built
                    machines called mining rigs. These machines contain custom
                    ASIC chips, and must be purchased specifically for crypto
                    mining. Mining operations vary in scale from large
                    industrial operations with full data-center warehouses with
                    thousands of mining rigs, to hobbyists who run a small
                    number of mining rigs at home.
                </p>
                <p>
                    Different cryptocurrencies may use different mining
                    algorithms requiring different hardware. In the case of
                    eCash, it uses the same SHA256 mining algorithm as Bitcoin,
                    and thus BTC miners can also be used to mine eCash.
                </p>
                <p>
                    Once you have a mining rig set up, you have two options to
                    start mining. You can point your hash power to a mining
                    service provider, or you can set up infrastructure to mine
                    on your own.
                </p>
                <H3 text="Using a mining service provider" />
                <p>
                    Using a service provider has the advantage that it will
                    handle technical setup for you, typically in exchange for a
                    fee.
                </p>
                <h4>Solo mining with a service provider</h4>
                <p>
                    One option is to &ldquo;solo mine&rdquo;, while outsourcing
                    the block template contruction. This means the miner can
                    point their hash power at a stratum endpoint, and they will
                    receive the full miner portion of the block reward when
                    their miners find a block.
                </p>
                <ul>
                    <li>
                        <ExternalLink href="https://xec.solopool.org/">
                            Solopool
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://xec.molepool.com/">
                            Molepool
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://solo.minemine.online/">
                            MineMine
                        </ExternalLink>
                    </li>
                </ul>
                <h4>Using a mining pool</h4>
                <p>
                    Many mining services offer mining &ldquo;pools&rdquo;, which
                    smooth out mining rewards to make payouts steadier and more
                    predictable. There are several pools for mining eCash. Some
                    options are listed here:
                </p>
                <ul>
                    <li>
                        <ExternalLink href="https://support.viabtc.com/hc/en-us/articles/7207444931599">
                            ViaBTC
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://www.mining-dutch.nl/pools/ecash.php?page=dashboard">
                            Mining Dutch
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://beta.zulupool.com/">
                            Zulupool
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://zergpool.com/site/block?coin=XEC">
                            Zergpool
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://zpool.ca/">
                            Zpool
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://pool.minemine.online/">
                            MineMine
                        </ExternalLink>
                    </li>
                </ul>

                <H3 text="Running your own mining setup" id="setup" />
                <p>
                    Rather than relying on a service provider, a miner can take
                    on the responsibility of handling their own technical setup.
                    The advantage is that you retain privacy, and full control
                    of the operation by not relying on a third party.
                </p>
                <h4>Solo mining</h4>
                <p>
                    Solo mining requires running an eCash node along with
                    specialized mining software. Such mining software is
                    available{' '}
                    <ExternalLink href="https://github.com/Bitcoin-ABC/ecash-ckpool-solo">
                        {' '}
                        here
                    </ExternalLink>
                    .
                </p>
                <h4>Operating a mining pool</h4>
                <p>
                    Adding eCash to a mining pool can be an attractive option.
                    Because eCash uses the same SHA256 mining algorithm as
                    Bitcoin, the technical requirements are similar. One aspect
                    to keep in mind, however, is that miners need to be aware of
                    the avalanche consensus layer on eCash, to ensure that the
                    blocks they produce will be accepted by the avalanche
                    validators.
                </p>
                <h4>Technical recommendations</h4>
                <ul>
                    <li>
                        The node generating the block template should have
                        avalanche enabled (it is enabled by default).
                    </li>
                    <li>
                        In order to maximize profit, a mining node can also be{' '}
                        <Link href="/staking/">staking</Link> and benefit from
                        the staking rewards.
                    </li>
                    <li>
                        Ensure the node has good connectivity. It should accept
                        inbound connections, accept both IPv4 and IPv6, and have
                        no restriction in the number of connections (e.g. no{' '}
                        <code>maxconnection</code> config set).
                    </li>
                    <li>
                        The coinbase transaction must include the &ldquo;miner
                        fund&rdquo; and staking reward outputs. Best practice is
                        to use the values from the &ldquo;coinbasetxn&rdquo;
                        field returned by <code>getblocktemplate</code>. For
                        example:
                        <CodeBlock code={getblocktemplateExample} />
                    </li>
                </ul>
            </Container>
        </Layout>
    );
}

export default Mining;
