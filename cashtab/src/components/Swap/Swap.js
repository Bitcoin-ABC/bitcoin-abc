// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import PrimaryButton from 'components/Common/PrimaryButton';
import { SidePaddingCtn } from 'components/Common/Atoms';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';
import { isValidSideshiftObj } from 'validation';
import { AlertMsg } from 'components/Common/Atoms';

export const SwapCtn = styled.div`
    width: 100%;
    h2 {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;

const Swap = () => {
    const sideshift = window.sideshift;
    return (
        <>
            <br />

            <SidePaddingCtn data-testid="swap-ctn">
                <CustomCollapseCtn panelHeader="SideShift">
                    {isValidSideshiftObj(sideshift) ? (
                        <>
                            <br />
                            <PrimaryButton onClick={() => sideshift.show()}>
                                Open SideShift
                            </PrimaryButton>
                        </>
                    ) : (
                        <AlertMsg>`Error: Unable to load SideShift`</AlertMsg>
                    )}
                </CustomCollapseCtn>
            </SidePaddingCtn>
        </>
    );
};

export default Swap;
