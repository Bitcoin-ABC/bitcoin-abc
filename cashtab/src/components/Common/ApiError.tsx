// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import { CashtabLoader } from 'components/Common/Spinner';
import { AlertMsg } from 'components/Common/Atoms';

const ApiError = () => {
    return (
        <>
            <AlertMsg>
                <b>Error in chronik connection</b>
                <br /> If not corrected by refresh,{' '}
                <a
                    href="https://t.me/eCashBuilders"
                    target="_blank"
                    rel="noreferrer"
                >
                    notify admin
                </a>
            </AlertMsg>
            <CashtabLoader />
        </>
    );
};

export default ApiError;
