// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import { QRCode } from 'components/Receive/QRCode';
import useWindowDimensions from 'hooks/useWindowDimensions';

const QrCodeCtn = styled.div``;

export const ReceiveCtn = styled.div`
    width: 100%;
    h2 {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
        margin-top: 10px;
    }
    ${QrCodeCtn} {
        padding-top: 12px;
    }
`;

export const Receive = () => {
    const ContextValue = React.useContext(WalletContext);
    const { cashtabState } = ContextValue;
    const { wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    // Get device window width
    // Size the QR code depending on device width
    const { width, height } = useWindowDimensions();

    const getQrCodeWidth = windowWidthPx => {
        const CASHTAB_FULLSCREEN_WIDTH = 500;
        if (windowWidthPx > CASHTAB_FULLSCREEN_WIDTH) {
            // Good width for no scrolling, taking all available space
            return 420;
        }
        // Extension or related
        /// Weird height to see normally so make this a tightly-focused condition
        if (width <= 400 && height <= 600) {
            return 250;
        }
        // Otherwise return with constant padding relative to width
        const CASHTAB_MOBILE_QR_PADDING = 75;
        return windowWidthPx - CASHTAB_MOBILE_QR_PADDING;
    };
    return (
        <ReceiveCtn data-testid="receive-ctn">
            {wallet !== false && (
                <QrCodeCtn data-testid="qr-code-ctn">
                    <QRCode
                        id="borderedQRCode"
                        address={wallet.paths.get(1899).address}
                        size={getQrCodeWidth(width)}
                        logoSizePx={width > 500 ? 48 : 24}
                    />
                </QrCodeCtn>
            )}
        </ReceiveCtn>
    );
};

export default Receive;
