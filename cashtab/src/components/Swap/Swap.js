import React from 'react';
import styled from 'styled-components';
import { SmartButton } from 'components/Common/PrimaryButton';
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
                            <SmartButton onClick={() => sideshift.show()}>
                                Open SideShift
                            </SmartButton>
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
