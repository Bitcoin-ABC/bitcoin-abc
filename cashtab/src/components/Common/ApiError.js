import * as React from 'react';
import { CashLoader } from 'components/Common/CustomIcons';
import { AlertMsg } from 'components/Common/Atoms';

const ApiError = () => {
    return (
        <>
            <AlertMsg>
                <b>Error in chronik connection</b>
                <br /> If not corrected by refresh,{' '}
                <a
                    href="https://t.me/eCashDevelopment"
                    target="_blank"
                    rel="noreferrer"
                >
                    notify admin
                </a>
            </AlertMsg>
            <CashLoader />
        </>
    );
};

export default ApiError;
