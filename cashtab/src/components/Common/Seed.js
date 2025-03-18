// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const SeedHolder = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
`;
const SeedRow = styled.code`
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
`;

const CASHTAB_SEED_WORDCOUNT = 12;
const CASHTAB_SEED_SLICE_SIZE = 4;

const Seed = ({ mnemonic }) => {
    const seedArray = mnemonic.split(' ');
    const rowArray = [];
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
        <SeedHolder className="no-translate">
            {rowArray.map((row, index) => {
                return <SeedRow key={index}>{row.join(' ')}</SeedRow>;
            })}
        </SeedHolder>
    );
};

Seed.propTypes = {
    mnemonic: PropTypes.string.isRequired,
};

export default Seed;
