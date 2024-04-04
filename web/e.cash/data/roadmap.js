// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import rocket from '/public/images/rocket.svg';
import award from '/public/images/award.svg';

export const roadmap = [
    {
        title: 'SCALING',
        description:
            'Enable eCash to scale from ~100 tx/s to over 5,000,000 tx/s. Mass-parallelization is necessary to achieve mankind scale.',
        items: [
            {
                title: 'Canonical Transaction Ordering',
                description: 'scalable block processing',
                status: 'complete',
            },
            {
                title: 'Schnorr Signatures',
                description: 'batched signature validation',
                status: 'complete',
            },
            {
                title: 'UTXO Commitments',
                description: 'blockchain pruning, faster initial sync',
                status: 'underway',
            },
            {
                title: 'Faster Block Propagation',
                description: 'graphene or other',
                status: 'planning',
            },
            {
                title: 'Merklix-Metadata Tree',
                description: 'scalable block processing',
                status: 'planning',
            },
            {
                title: 'Adaptive Block Size',
                description: 'market driven growth to 1TB blocks',
                status: 'planning',
            },
        ],
        tagline: 'Mankind Scale',
        tagline_description: '50 transactions / day for 10 billion humans',
        tagline_icon: rocket,
    },
    {
        title: 'USABILITY',
        description:
            'Improve the eCash payment experience to ensure that it is instant and reliable. Transactions must be received instantly and be completely secure within seconds.',
        items: [
            {
                title: 'CashAddr',
                description: 'easier & safer to use',
                status: 'complete',
            },
            {
                title: 'Sighash',
                description: 'hardware wallet security',
                status: 'complete',
            },
            {
                title: 'Convenient Units',
                description: '2 decimal places',
                status: 'complete',
            },
            {
                title: 'Avalanche Post-consensus',
                description: 'enhanced security & 1-block finality',
                status: 'complete',
            },
            {
                title: 'CashFusion',
                description: 'opt-in privacy',
                status: 'complete',
            },
            {
                title: 'Blockchain Indexer',
                description: 'powerful application API',
                status: 'complete',
            },
            {
                title: 'Regular Heartbeat',
                description: 'more consistent block times',
                status: 'underway',
            },
            {
                title: 'Avalanche Pre-consensus',
                description: 'instant transactions & real-time processing',
                status: 'underway',
            },
            {
                title: 'Zero-Knowledge Subnet',
                description: 'bulletproof privacy',
                status: 'planning',
            },
            {
                title: 'Fractional Satoshis',
                description: 'fees low forever',
                status: 'planning',
            },
        ],
        tagline: 'Best Money',
        tagline_description:
            'secure within 3 seconds - transaction fees forever low',
        tagline_icon: award,
    },
    {
        title: 'EXTENSIBILITY',
        description:
            'Make eCash extensible. An extensible protocol makes future improvements less disruptive, providing a solid base for businesses and developers to build on.',
        items: [
            {
                title: 'Foundational Opcodes',
                description: 'functional script capability',
                status: 'complete',
            },
            {
                title: 'Larger OP_RETURN',
                description: 'tokens on chain',
                status: 'complete',
            },
            {
                title: 'OP_CHECKDATASIG',
                description: 'oracles and covenants',
                status: 'complete',
            },
            {
                title: 'EVM Subnet',
                description: 'scalable smart contracts & improved privacy',
                status: 'planning',
            },
            {
                title: 'Advanced Opcodes',
                description: 'enhanced script capability',
                status: 'planning',
            },
            {
                title: 'New Transaction Format',
                description: 'more capable & compact',
                status: 'planning',
            },
        ],
        tagline: 'Agile Blockchain',
        tagline_description: "supporting tomorrow's economy",
        tagline_icon: award,
    },
];

export const getRoadmapStatuses = () => {
    const statusValues = new Set();
    roadmap.forEach(obj => {
        obj.items.forEach(item => {
            statusValues.add(item.status);
        });
    });
    return Array.from(statusValues);
};
