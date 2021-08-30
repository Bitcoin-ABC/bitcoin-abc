import * as React from 'react';
import { CashLoader } from '@components/Common/CustomIcons';
import { AlertMsg } from '@components/Common/Atoms';

export const ApiError = () => {
    return (
        <>
            <AlertMsg>
                <b>API connection lost.</b>
                <br /> Re-establishing connection...
            </AlertMsg>
            <CashLoader />
        </>
    );
};
