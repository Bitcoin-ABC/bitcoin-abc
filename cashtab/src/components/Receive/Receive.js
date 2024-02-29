import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { WalletContext } from 'wallet/context';
import OnBoarding from 'components/OnBoarding/OnBoarding';
import { QRCode } from 'components/Receive/QRCode';
import { LoadingCtn } from 'components/Common/Atoms';
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

const ReceiveWithWalletPresent = ({ wallet }) => {
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
            {wallet && wallet.Path1899 && (
                <QrCodeCtn data-testid="qr-code-ctn">
                    <QRCode
                        id="borderedQRCode"
                        address={wallet.Path1899.cashAddress}
                        size={getQrCodeWidth(width)}
                        logoSizePx={width > 500 ? 48 : 24}
                    />
                </QrCodeCtn>
            )}
        </ReceiveCtn>
    );
};

const Receive = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, previousWallet, loading } = ContextValue;
    return (
        <>
            {loading ? (
                <LoadingCtn data-testid="rcv-loading" />
            ) : (
                <>
                    {(wallet && wallet.Path1899) ||
                    (previousWallet && previousWallet.path1899) ? (
                        <ReceiveWithWalletPresent wallet={wallet} />
                    ) : (
                        <OnBoarding />
                    )}
                </>
            )}
        </>
    );
};

ReceiveWithWalletPresent.propTypes = {
    wallet: PropTypes.object,
};

export default Receive;
