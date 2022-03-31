import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import RawQRCode from 'qrcode.react';
import { currency } from 'components/Common/Ticker.js';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Event } from 'utils/GoogleAnalytics';
import { convertToEcashPrefix } from 'utils/cashMethods';

export const StyledRawQRCode = styled(RawQRCode)`
    cursor: pointer;
    border-radius: 10px;
    background: ${props => props.theme.qr.background};
    margin-bottom: 10px;
    path:first-child {
        fill: ${props => props.theme.qr.background};
    }
    :hover {
        border-color: ${({ xec = 0, ...props }) =>
            xec === 1 ? props.theme.eCashBlue : props.theme.eCashPurple};
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
    background-color: ${({ xec = 0, ...props }) =>
        xec === 1 ? props.theme.eCashBlue : props.theme.eCashPurple};
    border: 1px solid;
    border-color: ${({ xec = 0, ...props }) =>
        xec === 1 ? props.theme.eCashBlue : props.theme.eCashPurple};
    color: ${props => props.theme.contrast};
    position: absolute;
    top: 65px;
    padding: 30px 0;
    @media (max-width: 768px) {
        top: 52px;
        padding: 20px 0;
    }
`;
const PrefixLabel = styled.span`
    text-align: right;
    font-weight: bold;
    color: ${({ xec = 0, ...props }) =>
        xec === 1 ? props.theme.eCashBlue : props.theme.eCashPurple};
    @media (max-width: 768px) {
        font-size: 12px;
    }
    @media (max-width: 400px) {
        font-size: 10px;
    }
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
`;
const AddressHighlightTrim = styled.span`
    font-weight: bold;
    color: ${props => props.theme.contrast};
    @media (max-width: 768px) {
        font-size: 12px;
    }
    @media (max-width: 400px) {
        font-size: 10px;
    }
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
`;

const CustomInput = styled.div`
    font-size: 14px;
    color: ${props => props.theme.lightWhite};
    text-align: center;
    cursor: pointer;
    margin-bottom: 10px;
    padding: 6px 0;
    font-family: 'Roboto Mono', monospace;
    border-radius: 5px;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    input {
        border: none;
        width: 100%;
        text-align: center;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;
        color: ${props => props.theme.contrast};
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
        color: ${props => props.theme.contrast};
    }
    @media (max-width: 768px) {
        font-size: 10px;
        input {
            font-size: 10px;
            margin-bottom: 10px;
        }
    }
    @media (max-width: 400px) {
        font-size: 7px;
        input {
            font-size: 10px;
            margin-bottom: 10px;
        }
    }
`;

export const QRCode = ({
    address,
    isCashAddress,
    size = 210,
    onClick = () => null,
}) => {
    address = address ? convertToEcashPrefix(address) : '';

    const [visible, setVisible] = useState(false);
    const trimAmount = 8;
    const address_trim = address ? address.length - trimAmount : '';
    const addressSplit = address ? address.split(':') : [''];
    const addressPrefix = addressSplit[0];
    const prefixLength = addressPrefix.length + 1;

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
        // xec or etoken?
        let eventLabel = currency.ticker;
        if (address && !isCashAddress) {
            eventLabel = currency.tokenTicker;
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
                    xec={address && isCashAddress ? 1 : 0}
                    style={{ display: visible ? null : 'none' }}
                >
                    Copied <br />
                    <span style={{ fontSize: '12px' }}>{address}</span>
                </Copied>

                <StyledRawQRCode
                    id="borderedQRCode"
                    value={address || ''}
                    size={size}
                    xec={address && isCashAddress ? 1 : 0}
                    renderAs={'svg'}
                    includeMargin
                    imageSettings={{
                        src:
                            address && isCashAddress
                                ? currency.logo
                                : currency.tokenLogo,
                        x: null,
                        y: null,
                        height: 24,
                        width: 24,
                        excavate: true,
                    }}
                />

                {address && (
                    <CustomInput className="notranslate">
                        <input
                            ref={txtRef}
                            readOnly
                            value={address}
                            spellCheck="false"
                            type="text"
                        />
                        <PrefixLabel xec={address && isCashAddress ? 1 : 0}>
                            {address.slice(0, prefixLength)}
                        </PrefixLabel>
                        <AddressHighlightTrim>
                            {address.slice(
                                prefixLength,
                                prefixLength + trimAmount,
                            )}
                        </AddressHighlightTrim>
                        {address.slice(prefixLength + trimAmount, address_trim)}
                        <AddressHighlightTrim>
                            {address.slice(-trimAmount)}
                        </AddressHighlightTrim>
                    </CustomInput>
                )}
            </div>
        </CopyToClipboard>
    );
};

QRCode.propTypes = {
    address: PropTypes.string,
    isCashAddress: PropTypes.bool,
    size: PropTypes.number,
    onClick: PropTypes.func,
};
