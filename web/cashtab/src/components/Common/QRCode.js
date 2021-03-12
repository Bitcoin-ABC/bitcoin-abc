import React, { useState } from 'react';
import styled from 'styled-components';
import RawQRCode from 'qrcode.react';
import { currency } from '@components/Common/Ticker.js';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Event } from '@utils/GoogleAnalytics';

export const StyledRawQRCode = styled(RawQRCode)`
    cursor: pointer;
    border-radius: 23px;
    background: ${props => props.theme.qr.background};
    box-shadow: ${props => props.theme.qr.shadow};
    margin-bottom: 10px;
    border: 1px solid ${props => props.theme.wallet.borders.color};
    path:first-child {
        fill: ${props => props.theme.qr.background};
    }
    :hover {
        border-color: ${({ bch = 0, ...props }) =>
            bch === 1 ? props.theme.primary : props.theme.qr.token};
    }
    @media (max-width: 768px) {
        border-radius: 18px;
        width: 170px;
        height: 170px;
    }
`;

const Copied = styled.div`
    font-size: 18px;
    font-weight: bold;
    width: 100%;
    text-align: center;

    background-color: ${({ bch = 0, ...props }) =>
        bch === 1 ? props.theme.primary : props.theme.qr.token};
    color: ${props => props.theme.contrast};
    position: absolute;
    top: 65px;
    padding: 30px 0;
    @media (max-width: 768px) {
        top: 52px;
        padding: 20px 0;
    }
`;

const CustomInput = styled.div`
    font-size: 15px;
    color: ${props => props.theme.wallet.text.secondary};
    text-align: center;
    cursor: pointer;
    margin-bottom: 15px;
    padding: 10px 0;
    font-family: 'Roboto Mono', monospace;
    border-radius: 5px;

    span {
        font-weight: bold;
        color: ${props => props.theme.wallet.text.primary};
        font-size: 16px;
    }
    input {
        border: none;
        width: 100%;
        text-align: center;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;
        color: ${props => props.theme.wallet.text.primary};
        padding: 10px 0;
        background: transparent;
        margin-bottom: 15px;
        display: none;
    }
    input:focus {
        outline: none;
    }
    input::selection {
        background: transparent;
        color: ${props => props.theme.wallet.text.primary};
    }
    @media (max-width: 768px) {
        font-size: 11px;
        span {
            font-size: 12px;
        }
        input {
            font-size: 11px;
            margin-bottom: 10px;
        }
    }
    @media (max-width: 340px) {
        font-size: 10px;
        span {
            font-size: 11px;
        }
        input {
            font-size: 11px;
            margin-bottom: 10px;
        }
    }
`;

export const QRCode = ({
    address,
    size = 210,
    onClick = () => null,
    ...otherProps
}) => {
    const [visible, setVisible] = useState(false);
    const trimAmount = 6;

    const address_trim = address ? address.length - trimAmount : '';

    const txtRef = React.useRef(null);

    const handleOnClick = evt => {
        setVisible(true);
        setTimeout(() => {
            setVisible(false);
        }, 1500);
        onClick(evt);
    };

    const handleOnCopy = () => {
        // Event.("Category", "Action", "Label")
        // BCH or slp?
        let eventLabel = currency.ticker;
        if (address) {
            const isToken = address.includes(currency.tokenPrefix);
            if (isToken) {
                eventLabel = currency.tokenTicker;
            }
            // Event('Category', 'Action', 'Label')
            Event('Wallet', 'Copy Address', eventLabel);
        }

        setVisible(true);
        setTimeout(() => {
            txtRef.current.select();
        }, 100);
    };

    return (
        <CopyToClipboard
            style={{
                display: 'inline-block',
                width: '100%',
                position: 'relative',
            }}
            text={address}
            onCopy={handleOnCopy}
        >
            <div style={{ position: 'relative' }} onClick={handleOnClick}>
                <Copied
                    bch={address && address.includes('bitcoin') ? 1 : 0}
                    style={{ display: visible ? null : 'none' }}
                >
                    Copied
                </Copied>

                <StyledRawQRCode
                    id="borderedQRCode"
                    value={address || ''}
                    size={size}
                    bch={address && address.includes('bitcoin') ? 1 : 0}
                    renderAs={'svg'}
                    includeMargin
                    imageSettings={{
                        src:
                            address && address.includes('bitcoin')
                                ? currency.logo
                                : currency.tokenLogo,
                        x: null,
                        y: null,
                        height: 32,
                        width: 32,
                        excavate: true,
                    }}
                />

                {address && (
                    <CustomInput>
                        <input
                            ref={txtRef}
                            readOnly
                            value={address}
                            spellCheck="false"
                            type="text"
                        />
                        <span>
                            {address.slice(
                                address.includes('bitcoin') ? 12 : 13,
                                address.includes('bitcoin')
                                    ? 12 + trimAmount
                                    : 13 + trimAmount,
                            )}
                        </span>
                        {address.slice(
                            address.includes('bitcoin')
                                ? 12 + trimAmount
                                : 13 + trimAmount,
                            address.includes('bitcoin')
                                ? address_trim
                                : address_trim,
                        )}
                        <span>{address.slice(-trimAmount)}</span>
                    </CustomInput>
                )}
            </div>
        </CopyToClipboard>
    );
};
