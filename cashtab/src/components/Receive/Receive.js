import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { WalletContext } from 'utils/context';
import OnBoarding from 'components/OnBoarding/OnBoarding';
import { QRCode } from 'components/Common/QRCode';
import { LoadingCtn } from 'components/Common/Atoms';

const QrCodeCtn = styled.div``;

export const ReceiveCtn = styled.div`
    width: 100%;
    h2 {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
        margin-top: 10px;
    }
    ${QrCodeCtn} {
        margin-top: 12%;
        @media (max-width: 1000px) {
            margin-top: 8%;
        }
    }
`;

const ReceiveWithWalletPresent = ({ wallet }) => {
    return (
        <ReceiveCtn>
            {wallet && wallet.Path1899 && (
                <QrCodeCtn>
                    <QRCode
                        id="borderedQRCode"
                        address={wallet.Path1899.cashAddress}
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
                <LoadingCtn />
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
