// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import { IconButton } from 'components/Common/Buttons';
import { QuestionIcon } from 'components/Common/CustomIcons';
import Modal from 'components/Common/Modal';

export const ALPSWAP_EXPERIMENTAL_COPY =
    'AlpSwap is new technology where two ALP tokens can trade against each other. Price is set by the available inventory on a server and adjusts with buys and sells just like token swaps on Uniswap. It may not necessarily reflect other market prices. The fee may change near the minimum trades. Large trades may experience price slippage.';

const ExperimentalRow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const ExperimentalBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 9999px;
    background: #454111;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-sm);
    font-weight: 700;
    line-height: var(--text-sm--line-height);
    letter-spacing: 0.02em;
    text-transform: uppercase;
`;

/**
 * Compact Experimental flare with an info modal for AlpSwap.
 */
const AlpSwapExperimentalNotice: React.FC = () => {
    const [showInfo, setShowInfo] = useState(false);
    const closeInfo = () => setShowInfo(false);

    return (
        <>
            {showInfo && (
                <Modal
                    title="AlpSwap is experimental"
                    description={ALPSWAP_EXPERIMENTAL_COPY}
                    handleOk={closeInfo}
                    handleCancel={closeInfo}
                />
            )}
            <ExperimentalRow>
                <ExperimentalBadge>Experimental</ExperimentalBadge>
                <IconButton
                    name="AlpSwap experimental info"
                    icon={<QuestionIcon />}
                    onClick={() => setShowInfo(true)}
                />
            </ExperimentalRow>
        </>
    );
};

export default AlpSwapExperimentalNotice;
