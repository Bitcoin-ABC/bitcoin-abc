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
        text: 'A consensus protocol to enhance blockchain security, enable near-instant confirmation times, and streamline future network upgrades.',
        link: '/core-tech#avalanche',
        image: '/images/tile1.png',
    },
    {
        title: 'Staking',
        text: 'Decentralized governance by incentivized stakeholders.',
        link: '/staking',
        image: '/images/tile2.png',
    },
    {
        title: 'eTokens',
        text: 'eCash supports tokens and dividend payments. Create your own token with customized name, supply, decimal places, and icon.',
        link: '/core-tech#etokens',
        image: '/images/tile3.png',
    },
    {
        title: 'Subnets',
        text: 'Enable customized networks such as EVM or Zero-Knowledge privacy. Powered by eCash Avalanche technology.',
        link: '/core-tech#subnets',
        image: '/images/tile4.png',
    },
    {
        title: 'Learn More',
        link: '/core-tech',
        image: '/images/tile5.png',
        featured: true,
    },
];

export default function HomepageTiles() {
    return (
        <GridCtn>
            {tiles.map((tile, index) => {
                if (tile.featured) {
                    return (
                        <Link
                            className="grid-item-feature"
                            href={tile.link}
                            key={index}
                        >
                            <div className="feature-tile-image-ctn">
                                <Image
                                    src={tile.image}
                                    alt={tile.title}
                                    fill
                                    sizes="20vw"
                                />
                            </div>
                            <h3>
                                <GlitchText text="Learn More" />
                            </h3>
                        </Link>
                    );
                } else
                    return (
                        <Link
                            className="grid-item"
                            href={tile.link}
                            key={index}
                        >
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
                    );
            })}
        </GridCtn>
    );
}
