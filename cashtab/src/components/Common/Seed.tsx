// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { CopyPasteIcon } from 'components/Common/CustomIcons';

const COPY_FEEDBACK_MS = 2000;

interface SeedProps {
    mnemonic: string;
}

const SeedContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    cursor: pointer;
`;
const SeedContent = styled.div`
    position: relative;
    flex: 1;
    min-width: 0;
`;
const SeedHolder = styled.div<{ $hidden: boolean }>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    visibility: ${props => (props.$hidden ? 'hidden' : 'visible')};
`;
const SeedRow = styled.code`
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
`;
const CopiedLabel = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    font-weight: bold;
    color: ${props => props.theme.accent};
`;
const CopyIconWrap = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    svg {
        height: 22px;
        width: 22px;
        fill: ${props => props.theme.primaryText};
        path {
            stroke: ${props => props.theme.primaryText};
        }
    }
`;

const CASHTAB_SEED_WORDCOUNT = 12;
const CASHTAB_SEED_SLICE_SIZE = 4;

const Seed: React.FC<SeedProps> = ({ mnemonic }) => {
    const [copied, setCopied] = useState(false);
    const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (copiedTimeoutRef.current !== null) {
                clearTimeout(copiedTimeoutRef.current);
            }
        };
    }, []);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(mnemonic);
        }
        if (copiedTimeoutRef.current !== null) {
            clearTimeout(copiedTimeoutRef.current);
        }
        setCopied(true);
        copiedTimeoutRef.current = setTimeout(() => {
            copiedTimeoutRef.current = null;
            setCopied(false);
        }, COPY_FEEDBACK_MS);
    };

    const seedArray = mnemonic.split(' ');
    const rowArray: string[][] = [];
    for (
        let i = 0;
        i < CASHTAB_SEED_WORDCOUNT / CASHTAB_SEED_SLICE_SIZE;
        i += 1
    ) {
        rowArray.push(
            seedArray.slice(
                i * CASHTAB_SEED_SLICE_SIZE,
                i * CASHTAB_SEED_SLICE_SIZE + CASHTAB_SEED_SLICE_SIZE,
            ),
        );
    }

    return (
        <SeedContainer
            className="no-translate"
            onClick={handleCopy}
            role="button"
            aria-label={copied ? 'Copied' : 'Copy seed phrase'}
        >
            <SeedContent>
                <SeedHolder $hidden={copied} aria-hidden={copied}>
                    {rowArray.map((row, index) => {
                        return <SeedRow key={index}>{row.join(' ')}</SeedRow>;
                    })}
                </SeedHolder>
                {copied && <CopiedLabel>Copied!</CopiedLabel>}
            </SeedContent>
            <CopyIconWrap aria-hidden="true">
                <CopyPasteIcon />
            </CopyIconWrap>
        </SeedContainer>
    );
};

export default Seed;
