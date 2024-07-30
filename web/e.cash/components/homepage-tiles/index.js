// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Link from 'next/link';
import Image from 'next/image';
import GlitchText from '/components/glitch-text';
import { GridCtn } from './styles.js';

const tiles = [
    {
        title: 'Avalanche',
        text: "Avalanche is a revolutionary consensus algorithm integrated with eCash's core Proof-of-Work, enabling instant transactions, enhanced security, subnets, staking rewards for node operators and fork-free upgrades.",
        link: '/core-tech#avalanche',
        image: '/images/tile1.png',
    },
    {
        title: 'Staking',
        text: 'Earn rewards for holding XEC. Staking rewards incentivize running eCash avalanche nodes, to improve the security and performance of eCash. Anyone can now earn while holding their XEC.',
        link: '/staking',
        image: '/images/tile2.png',
    },
    {
        title: 'eTokens and NFTs',
        text: 'eCash supports tokens that anyone can create and trade with a few clicks. Instantly create your own custom NFT collection, and permissionlessly offer them for sale on-chain. Or create fungible tokens with their own name, supply, decimal places and icon.',
        link: '/core-tech#etokens',
        image: '/images/tile3.png',
    },
    {
        title: 'Subnets',
        text: 'Enable customized networks such as EVM or Zero-Knowledge privacy. Powered by eCash Avalanche technology.',
        link: '/core-tech#subnets',
        image: '/images/tile4.png',
    },
];

export default function HomepageTiles() {
    return (
        <GridCtn>
            {tiles.map((tile, index) => (
                <Link className="grid-item" href={tile.link} key={index}>
                    <h4>{tile.title}</h4>
                    <p>{tile.text}</p>
                    <div className="tile-image-ctn">
                        <Image
                            src={tile.image}
                            alt={tile.title}
                            fill
                            sizes="20vw"
                        />
                    </div>
                </Link>
            ))}
        </GridCtn>
    );
}
