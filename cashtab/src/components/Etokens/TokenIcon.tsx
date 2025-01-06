// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { TypeOptions } from 'react-toastify';
import styled from 'styled-components';
import { token as tokenConfig } from 'config/token';

interface TokenIconProps {
    size: 32 | 64 | 128 | 256 | 512;
    tokenId: string;
}
const TokenIcon: React.FC<TokenIconProps> = ({ size, tokenId }) => {
    return (
        <img
            src={`${tokenConfig.tokenIconsUrl}/${size}/${tokenId}.png`}
            width={size}
            height={size}
            alt={`icon for ${tokenId}`}
        />
    );
};

// We need to match the shape expected by react-toastify
// to use this as a custom icon in notifications
interface TokenIconToastProps extends TokenIconProps {
    type: TypeOptions;
    theme: string;
}

const IconWrapper = styled.div<{
    type: TypeOptions;
    theme: string;
}>``;

export const TokenIconToast: React.FC<TokenIconToastProps> = ({
    type,
    theme,
    size,
    tokenId,
}) => {
    return (
        <IconWrapper type={type} theme={theme}>
            <TokenIcon size={size} tokenId={tokenId} />
        </IconWrapper>
    );
};

export default TokenIcon;
