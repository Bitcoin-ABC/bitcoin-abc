import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import RawQRCode from 'qrcode.react';
import { convertToEcashPrefix } from 'utils/cashMethods';
import CopyToClipboard from './CopyToClipboard';
import appConfig from 'config/app';

export const StyledRawQRCode = styled(RawQRCode)`
    cursor: pointer;
    border-radius: 10px;
    background: ${props => props.theme.qr.background};
    margin: 24px;
    path:first-child {
        fill: ${props => props.theme.qr.background};
    }
    :hover {
        border-color: ${props => props.theme.qr.eCashBlue};
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
    background-color: ${props => props.theme.eCashBlue};
    border: 1px solid;
    border-color: ${props => props.theme.eCashBlue};
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
    color: ${props => props.theme.eCashBlue};
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
    padding: 0;
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

export const QRCode = ({ address, size = 210, onClick = () => null }) => {
    address = address ? convertToEcashPrefix(address) : '';

    const [visible, setVisible] = useState(false);
    const trimAmount = 8;
    const address_trim = address ? address.length - trimAmount : '';
    const addressSplit = address ? address.split(':') : [''];
    const addressPrefix = addressSplit[0];
    const prefixLength = addressPrefix.length + 1;

    const handleOnClick = evt => {
        setVisible(true);
        setTimeout(() => {
            setVisible(false);
        }, 1500);
        onClick(evt);
    };

    return (
        <CopyToClipboard data={address}>
            <div
                style={{
                    display: 'inline-block',
                    width: '100%',
                    position: 'relative',
                }}
            >
                <div style={{ position: 'relative' }} onClick={handleOnClick}>
                    <Copied style={{ display: visible ? null : 'none' }}>
                        Copied <br />
                        <span style={{ fontSize: '12px' }}>{address}</span>
                    </Copied>

                    <StyledRawQRCode
                        id="borderedQRCode"
                        value={address || ''}
                        size={size}
                        renderAs={'svg'}
                        includeMargin
                        imageSettings={{
                            src: appConfig.logo,
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
                                readOnly
                                value={address}
                                spellCheck="false"
                                type="text"
                            />
                            <PrefixLabel>
                                {address.slice(0, prefixLength)}
                            </PrefixLabel>
                            <AddressHighlightTrim>
                                {address.slice(
                                    prefixLength,
                                    prefixLength + trimAmount,
                                )}
                            </AddressHighlightTrim>
                            {address.slice(
                                prefixLength + trimAmount,
                                address_trim,
                            )}
                            <AddressHighlightTrim>
                                {address.slice(-trimAmount)}
                            </AddressHighlightTrim>
                        </CustomInput>
                    )}
                </div>
            </div>
        </CopyToClipboard>
    );
};

QRCode.propTypes = {
    address: PropTypes.string,
    size: PropTypes.number,
    onClick: PropTypes.func,
};
