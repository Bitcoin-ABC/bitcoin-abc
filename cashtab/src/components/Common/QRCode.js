import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import QRCodeSVG from 'qrcode.react';
import { convertToEcashPrefix } from 'utils/cashMethods';
import CopyToClipboard from './CopyToClipboard';
import appConfig from 'config/app';

export const CustomQRCode = styled(QRCodeSVG)`
    cursor: pointer;
    border-radius: 10px;
    background: ${props => props.theme.qr.background};
    margin: 12px;
    path:first-child {
        fill: ${props => props.theme.qr.background};
    }
    :hover {
        border-color: ${props => props.theme.qr.eCashBlue};
    }
    @media (max-width: 768px) {
        border-radius: 18px;
    }
`;

const Copied = styled.div`
    font-size: 24px;
    font-family: 'Roboto Mono', monospace;
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
`;
const PrefixLabel = styled.span`
    text-align: right;
    color: ${props => props.theme.eCashBlue};
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
`;
const AddressHighlightTrim = styled.span`
    color: ${props => props.theme.contrast};
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
`;

const ReceiveAddressHolder = styled.div`
    width: 100%;
    font-size: 30px;
    font-weight: bold;
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
`;

const DisplayCopiedAddress = styled.span`
    font-size: 24px;
    word-wrap: break-word;
`;

export const QRCode = ({
    address,
    size = 210,
    logoSizePx = 36,
    onClick = () => null,
}) => {
    address = address ? convertToEcashPrefix(address) : '';

    const [visible, setVisible] = useState(false);
    const trimAmount = 3;
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

    const getCopiedAddressBlocks = (address, sliceSize) => {
        const lineCount = Math.ceil(address.length / sliceSize);
        const lines = [];
        for (let i = 0; i < lineCount; i += 1) {
            const thisLine = (
                <div style={{ display: 'block' }} key={`address_slice_${i}`}>
                    {address.slice(i * sliceSize, i * sliceSize + sliceSize)}
                </div>
            );
            lines.push(thisLine);
        }
        return lines;
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
                        Address Copied to Clipboard
                        <br />
                        <DisplayCopiedAddress>
                            {getCopiedAddressBlocks(address, 6)}
                        </DisplayCopiedAddress>
                    </Copied>

                    <CustomQRCode
                        data-testid="raw-qr-code"
                        id="borderedQRCode"
                        value={address || ''}
                        size={size}
                        renderAs={'svg'}
                        includeMargin
                        imageSettings={{
                            src: appConfig.logo,
                            x: null,
                            y: null,
                            height: logoSizePx,
                            width: logoSizePx,
                            excavate: true,
                        }}
                    />

                    {address && (
                        <ReceiveAddressHolder className="notranslate">
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
                            {'...'}
                            <AddressHighlightTrim>
                                {address.slice(-trimAmount)}
                            </AddressHighlightTrim>
                        </ReceiveAddressHolder>
                    )}
                </div>
            </div>
        </CopyToClipboard>
    );
};

QRCode.propTypes = {
    address: PropTypes.string,
    size: PropTypes.number,
    logoSizePx: PropTypes.number,
    onClick: PropTypes.func,
};
