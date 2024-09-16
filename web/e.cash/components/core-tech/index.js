// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    SectionCtn,
    Labels,
    LabelOuter,
    LabelInner,
    DescriptionCtn,
    DescriptionInner,
    CoreTechImage,
} from './styles';

const coreTech = [
    {
        title: 'Avalanche',
        text: "Avalanche is a revolutionary consensus algorithm integrated with eCash's core Proof-of-Work, enabling instant transactions, enhanced security, subnets, staking rewards for node operators, and fork-free upgrades.",
        link: '/core-tech#avalanche',
        image: '/images/avalanche-icon.png',
    },
    {
        title: 'Staking',
        text: 'Earn rewards for holding XEC. Staking rewards incentivize running eCash avalanche nodes, to improve the security and performance of eCash. Anyone can now earn while holding their XEC.',
        link: '/staking',
        image: '/images/staking-icon.png',
    },
    {
        title: 'eTokens and NFTs',
        text: 'eCash supports tokens that anyone can create and trade with a few clicks. Instantly create your own custom NFT collection, and permissionlessly offer them for sale on-chain. Or create fungible tokens with their own name, supply, decimal places, and icon.',
        link: '/core-tech#etokens',
        image: '/images/tokens-icon.png',
    },
    {
        title: 'Subnets',
        text: 'Enable customized networks such as EVM or Zero-Knowledge privacy. Powered by eCash Avalanche technology.',
        link: '/core-tech#subnets',
        image: '/images/subnets-icon.png',
    },
];

export default function CoreTech() {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <SectionCtn>
            <Labels>
                {coreTech.map((item, index) => (
                    <LabelOuter
                        key={index}
                        style={
                            activeIndex === index
                                ? { backgroundColor: '#ff21d0' }
                                : null
                        }
                        onClick={() => setActiveIndex(index)}
                    >
                        <LabelInner
                            style={
                                activeIndex === index
                                    ? { backgroundColor: '#5e005d' }
                                    : null
                            }
                        >
                            {item.title}
                        </LabelInner>
                    </LabelOuter>
                ))}
            </Labels>
            <CoreTechImage>
                <Image src="/images/core-tech.png" alt="eCash Core Tech" fill />
            </CoreTechImage>

            {coreTech.map((item, index) => (
                <DescriptionCtn
                    key={index}
                    style={
                        activeIndex === index
                            ? { display: 'flex' }
                            : { display: 'none' }
                    }
                >
                    <div
                        style={
                            activeIndex === index
                                ? { backgroundColor: '#ff21d0' }
                                : null
                        }
                    >
                        <DescriptionInner
                            style={
                                activeIndex === index
                                    ? { backgroundColor: '#5e005d' }
                                    : null
                            }
                        >
                            <div>
                                <Image src={item.image} alt={item.title} fill />
                            </div>
                            {item.text}
                            <br />

                            <Link href={item.link}>Learn More</Link>
                        </DescriptionInner>
                    </div>
                </DescriptionCtn>
            ))}
        </SectionCtn>
    );
}
