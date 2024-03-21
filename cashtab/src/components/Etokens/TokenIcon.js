// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import { token as tokenConfig } from 'config/token';

const TokenIcon = ({ size, tokenId }) => {
    return (
        <img
            src={`${tokenConfig.tokenIconsUrl}/${size}/${tokenId}.png`}
            width={size}
            height={size}
        />
    );
};

TokenIcon.propTypes = {
    size: PropTypes.oneOf([32, 64, 128, 256, 512]),
    tokenId: PropTypes.string,
};

export default TokenIcon;
