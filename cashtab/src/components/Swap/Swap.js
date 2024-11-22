// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import PrimaryButton from 'components/Common/Buttons';
import { isValidSideshiftObj } from 'validation';
import { AlertMsg, PageHeader } from 'components/Common/Atoms';
import { SwapIcon } from 'components/Common/CustomIcons';

export const SwapCtn = styled.div`
    width: 100%;
    margin-top: 24px;
    h2 {
        margin-bottom: 20px;
    }
`;

const Swap = () => {
    const sideshift = window.sideshift;
    return (
        <SwapCtn>
            <PageHeader>
                Swap <SwapIcon />
            </PageHeader>
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
