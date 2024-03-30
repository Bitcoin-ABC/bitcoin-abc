// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import PrimaryButton from 'components/Common/PrimaryButton';
import { isValidSideshiftObj } from 'validation';
import { AlertMsg } from 'components/Common/Atoms';

export const SwapCtn = styled.div`
    width: 100%;
    margin-top: 24px;
`;

const Swap = () => {
    const sideshift = window.sideshift;
    return (
        <SwapCtn>
            {isValidSideshiftObj(sideshift) ? (
                <PrimaryButton onClick={() => sideshift.show()}>
                    Open SideShift
                </PrimaryButton>
            ) : (
                <AlertMsg>`Error: Unable to load SideShift`</AlertMsg>
            )}
        </SwapCtn>
    );
};

export default Swap;
