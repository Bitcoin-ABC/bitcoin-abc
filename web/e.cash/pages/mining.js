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

const minerFundBlockTemplate = `
"coinbasetxn": {
    "minerfund": {
        "addresses": [
        "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07"
        ],
        "minimumvalue": 200000327
    }
}`;

const stakingRewardBlockTemplate = `
"coinbasetxn": {
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
}`;

const rttBlockTemplate = `
"rtt": {
    "prevheadertime": [
      1727793391,
      1727790158,
      1727785595,
      1727781390
    ],
    "prevbits": "1d00ffff",
    "nodetime": 1727794761,
    "nexttarget": "1b0c2b8b"
}`;

const rttFormulae = `
uint32_t compute_next_target(gbt) {
    prevTarget = target_from_compact(gbt.rtt.prevbits);

    diffTime0 = max(1, now - gbt.rtt.prevheadertime[0]);
    target0 = prevTarget * 4.9192018423e-14 * (diffTime0 ** 5);

    diffTime1 = max(1, now - gbt.rtt.prevheadertime[1]);
    target1 = prevTarget * 4.8039080491e-17 * (diffTime1 ** 5);

    diffTime2 = max(1, now - gbt.rtt.prevheadertime[2]);
    target2 = prevTarget * 4.9192018423e-19 * (diffTime2 ** 5);

    diffTime3 = max(1, now - gbt.rtt.prevheadertime[3]);
    target3 = prevTarget * 4.6913164542e-20 * (diffTime3 ** 5);

    nextTarget = min(target0, target1, target2, target3);

    // The real time target is never higher (less difficult) than the normal
    // target.
    if (nextTarget < target_from_compact(gbt.bits)) {
        return target_to_compact(nextTarget);
    }
    
    return gbt.bits;
`;

function Mining() {
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
                        <ExternalLink href="https://letsmine.it/coin/xec">
                            letsmineit
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://www.mining-dutch.nl/pools/ecash.php?page=dashboard">
                            Mining Dutch
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
                            zpool
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://letsmine.it/pool/XECPOOL">
                            letsmineit
                        </ExternalLink>
                    </li>
                    <li>
                        <ExternalLink href="https://pool.kryptex.com/xec">
                            Kryptex
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
                <h4>General recommendations</h4>
                <ul>
                    <li>
                        The node generating the block template should have
                        avalanche enabled (it is enabled by default).
                    </li>
                    <li>
                        In order to maximize profit, a mining node can also be
                        <Link href="/staking/"> staking </Link>
                        and benefit from the staking rewards.
                    </li>
                    <li>
                        Ensure the node has good connectivity. It should accept
                        inbound connections, accept both IPv4 and IPv6, and have
                        no restriction in the number of connections (e.g. no{' '}
                        <code>maxconnection</code> config set).
                    </li>
                    <li>
                        All the rules listed below are mandatory. If any is
                        skipped your block will be rejected by the Avalanche
                        consensus layer even though your node may succeed in
                        submitting the block.
                    </li>
                    <li>
                        If you need any help to add eCash support to your mining
                        software, you can request for support in the
                        <ExternalLink href="t.me/eCashDevelopment">
                            {' '}
                            eCash Development Telegram group
                        </ExternalLink>
                        .
                    </li>
                </ul>
                <h4>Miner fund</h4>
                <p>
                    The coinbase transaction must include a &ldquo;miner
                    fund&rdquo; output. This portion of the coinbase is
                    dedicated to funding the development of eCash.
                </p>
                <CodeBlock code={minerFundBlockTemplate} />
                <p>
                    The miner fund output is a payment of at least
                    &ldquo;coinbasetxn.minerfund.minimumvalue&rdquo; (in
                    Satoshi) to the eCash address
                    &ldquo;coinbasetxn.minerfund.addresses[0]&rdquo;. This
                    amount should be subtracted from the total coinbase reward
                    value.
                    <br />
                    <br />
                    <strong>Notes:</strong>
                    <ul>
                        <li>This is a P2SH address</li>
                        <li>
                            The &ldquo;addresses&rdquo; field is an array for
                            legacy reason, but all the value is expected to go
                            to a single address and the array length is always
                            1.
                        </li>
                        <li>
                            The address might change in the future and thus
                            should not be hardcoded.
                        </li>
                    </ul>
                </p>
                <h4>Staking rewards</h4>
                <p>
                    The coinbase transaction must include a &ldquo;staking
                    reward&rdquo; output. This portion of the coinbase is going
                    to a staker who is contributing to the security of the eCash
                    network.
                </p>
                <CodeBlock code={stakingRewardBlockTemplate} />
                <p>
                    The staking reward output is a payment of at least
                    &ldquo;coinbasetxn.stakingrewards.minimumvalue&rdquo; (in
                    Satoshi) to the payout script
                    &ldquo;coinbasetxn.stakingrewards.payoutscript.hex&rdquo;.
                    This amount should be subtracted from the total coinbase
                    reward value.
                    <br />
                    <br />
                    <strong>Notes:</strong>
                    <ul>
                        <li>
                            The payout script can be any standard eCash script.
                            You should not assume it is P2PKH or any other kind
                            and use the script hex directly. The other fields
                            are informational only and might be missing from the
                            block template.
                        </li>
                        <li>
                            The payout script is updated for each block and
                            should not be hardcoded.
                        </li>
                    </ul>
                </p>
                <h4>Heartbeat</h4>
                <p>
                    The eCash network will enforce Real Time Targeting (also
                    known as Heartbeat) starting with the
                    <Link href="/upgrade">
                        {' '}
                        November 15, 2024 network upgrade
                    </Link>
                    . This feature increases the difficulty when blocks are
                    found at a faster rate than the expected 10 minutes average
                    interval. The difficulty monotonically decreases over time
                    until it reaches a plateau value. This is intended to avoid
                    spikes in the difficulty that can lead to inconsistent block
                    intervals.
                    <br />
                    Blocks with a hash that is higher than the Real Time Target
                    will be rejected by the Avalanche consensus layer.
                </p>
                <CodeBlock code={rttBlockTemplate} />
                <p>
                    Your pool software need to make sure the submitted block
                    hash complies with the Real Time Target. There are 2 options
                    to achieve this:
                    <ul>
                        <li>
                            Read the real time target from the block template.
                            The value is directly available in compact form in
                            the field &ldquo;rtt.nexttarget&rdquo;. This field
                            is updated at each call to
                            &ldquo;getblocktemplate&rdquo;.
                        </li>
                        <li>
                            Locally compute the target on the pool software. The
                            formula is below:
                            <CodeBlock code={rttFormulae} />
                        </li>
                    </ul>
                    <br />
                    <br />
                    <strong>Notes:</strong>
                    <ul>
                        <li>
                            The Real Time Target does not impact the block
                            header, in particular the difficulty bits should be
                            the ones from the block template &ldquo;bits&rdquo;
                            field.
                        </li>
                        <li>
                            If your local time differs from the
                            &ldquo;rtt.nodetime&rdquo; field, you can use this
                            value to compensate or fix you system time.
                        </li>
                        <li>
                            The node needs to accumulate 17 blocks before it is
                            able to compute the Real Time Target (the
                            &ldquo;rtt.prevheadertime&rdquo; array will contain
                            0 values otherwise). This could cause the node to
                            mine at a lower difficulty during that time and get
                            rejected blocks. In order to avoid this issue, you
                            can add the option
                            &ldquo;persistrecentheaderstime=1&rdquo; to your
                            node configuration file. This instructs the node to
                            save the reference times to disk and reload them on
                            startup. This could cause a slight overshoot of the
                            difficulty if a block is found while the node is
                            restarting, but will ensure that no block will be
                            rejected.
                        </li>
                        <li>
                            If you are using the
                            <ExternalLink href="https://github.com/Bitcoin-ABC/ecash-ckpool-solo">
                                {' '}
                                solo mining software{' '}
                            </ExternalLink>
                            from Bitcoin ABC, make sure to update with the
                            latest master that supports the new feature.
                        </li>
                    </ul>
                </p>
            </Container>
        </Layout>
    );
}

export default Mining;
