// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useContext, useEffect } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { QRCode } from 'components/Receive/QRCode';
import useWindowDimensions from 'components/Receive/useWindowDimensions';
import Switch from 'components/Common/Switch';
import { ReceiveCtn, ReceiveFormFlex, Row, FirmaRow } from './styled';
import { FIRMA } from 'constants/tokens';
import { getReceiveAmountError } from 'validation';
import appConfig from 'config/app';
import firmaLogo from 'assets/firma-icon.png';
import { CopyIconButton } from 'components/Common/Buttons';
import { Input } from 'components/Common/Inputs';

export const Receive: React.FC = () => {
    const contextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(contextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { cashtabState } = contextValue;
    const { wallets } = cashtabState;
    const wallet = wallets[0];
    // Get device window width
    // Size the QR code depending on device width
    const { width, height } = useWindowDimensions();

    const CASHTAB_FULLSCREEN_WIDTH = 500;

    const getQrCodeWidth = (windowWidthPx: number) => {
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

    const [receiveFirma, setReceiveFirma] = useState<boolean>(false);
    const [bip21Qty, setBip21Qty] = useState<string>('');
    const [bip21QtyError, setBip21QtyError] = useState<false | string>(false);

    const queryString = `${wallet.paths.get(1899).address}${
        receiveFirma
            ? `?token_id=${FIRMA.tokenId}&token_decimalized_qty=${bip21Qty}`
            : bip21Qty
            ? `?amount=${bip21Qty}`
            : ``
    }`;

    const handleBip21QtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;

        setBip21Qty(value);
    };

    /**
     * Update form validation whenever user toggles switch or updates
     * bip21 qty value
     */
    useEffect(() => {
        const error = receiveFirma
            ? getReceiveAmountError(bip21Qty, FIRMA.token.genesisInfo.decimals)
            : getReceiveAmountError(bip21Qty, appConfig.cashDecimals, true);

        setBip21QtyError(error);
    }, [bip21Qty, receiveFirma]);

    return (
        <ReceiveCtn title="Receive">
            <ReceiveFormFlex title="QR Code">
                <Row>
                    <QRCode
                        address={queryString}
                        size={getQrCodeWidth(width)}
                        logoSizePx={width > 500 ? 48 : 24}
                    />
                </Row>
                <Row>
                    <FirmaRow qrWidth={getQrCodeWidth(width)}>
                        <Switch
                            name="Toggle Firma"
                            bgImageOn={firmaLogo}
                            bgColorOn={`#132d35`}
                            bgImageOff={appConfig.logo}
                            width={90}
                            right={56}
                            checked={receiveFirma}
                            handleToggle={() => {
                                setReceiveFirma(prev => !prev);
                            }}
                        />

                        <Input
                            style={{
                                paddingLeft: '42px',
                                paddingRight: '72px',
                            }}
                            prefix={{
                                src: receiveFirma ? firmaLogo : appConfig.logo,
                                alt: receiveFirma ? 'Firma Logo' : 'eCash Logo',
                            }}
                            suffix={receiveFirma ? 'FIRMA' : appConfig.ticker}
                            name="bip21Qty"
                            value={bip21Qty}
                            error={bip21QtyError}
                            type="number"
                            placeholder={
                                width < CASHTAB_FULLSCREEN_WIDTH
                                    ? ''
                                    : `Enter receive amount`
                            }
                            handleInput={handleBip21QtyChange}
                        />
                    </FirmaRow>
                </Row>
                <Row>
                    Copy Cashtab Payment URL
                    <CopyIconButton
                        name="Copy Cashtab URL"
                        data={`https://cashtab.com/#/send?bip21=${queryString}`}
                        showToast
                    />
                </Row>
            </ReceiveFormFlex>
        </ReceiveCtn>
    );
};

export default Receive;
