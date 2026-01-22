// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import appConfig from 'config/app';
import firmaLogo from 'assets/firma-icon.png';
import { previewAddress } from 'helpers';

export const CustomQRCode = styled(QRCodeSVG)`
    cursor: pointer;
    border-radius: 10px;
    background: ${props => props.theme.qrBackground};
    margin: 12px;
    path:first-child {
        fill: ${props => props.theme.qrBackground};
    }
    @media (max-width: 768px) {
        border-radius: 18px;
    }
`;

const Copied = styled.div`
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
    font-family: 'Roboto Mono', monospace;
    font-weight: bold;
    width: 100%;
    text-align: center;
    background-color: ${props => props.theme.accent};
    border: 1px solid;
    border-color: ${props => props.theme.accent};
    color: ${props => props.theme.primaryText};
    position: absolute;
    top: 65px;
    padding: 30px 0;
`;
const PrefixLabel = styled.span`
    text-align: right;
    color: ${props => props.theme.accent};
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
`;
const AddressHighlightTrim = styled.span`
    color: ${props => props.theme.primaryText};
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
`;

const FirstCharHighlight = styled.span`
    color: ${props => props.theme.accent};
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
`;

const ReceiveAddressHolder = styled.div`
    width: 100%;
    font-size: var(--text-3xl);
    line-height: var(--text-3xl--line-height);
    font-weight: bold;
    color: ${props => props.theme.secondaryText};
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
        color: ${props => props.theme.primaryText};
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
        color: ${props => props.theme.primaryText};
    }
`;

const DisplayCopiedAddress = styled.span`
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
    word-wrap: break-word;
`;

interface QrCodeProps {
    address: string;
    size: number;
    logoSizePx: number;
}
export const QRCode: React.FC<QrCodeProps> = ({
    address = '',
    size = 210,
    logoSizePx = 36,
}) => {
    const isBip21 = address.includes('?');
    const isToken = address.includes('token_id');

    const addressOnly = isBip21 ? address.split('?')[0] : address;

    const [visible, setVisible] = useState(false);

    const handleClick = () => {
        setVisible(true);
        setTimeout(() => {
            setVisible(false);
        }, 1500);
    };

    const getCopiedAddressBlocks = (address: string, sliceSize: number) => {
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
                <div style={{ position: 'relative' }} onClick={handleClick}>
                    {isBip21 ? (
                        <Copied
                            style={{ display: visible ? undefined : 'none' }}
                        >
                            bip21 query string copied to clipboard
                        </Copied>
                    ) : (
                        <Copied
                            style={{ display: visible ? undefined : 'none' }}
                        >
                            Address Copied to Clipboard
                            <br />
                            <DisplayCopiedAddress>
                                {getCopiedAddressBlocks(addressOnly, 6)}
                            </DisplayCopiedAddress>
                        </Copied>
                    )}

                    <CustomQRCode
                        title="Raw QR Code"
                        value={address || ''}
                        size={size}
                        marginSize={4}
                        imageSettings={{
                            src: isToken ? firmaLogo : appConfig.logo,
                            x: undefined,
                            y: undefined,
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
                            <PrefixLabel>{appConfig.prefix}:</PrefixLabel>
                            <AddressHighlightTrim>
                                {(() => {
                                    const preview = previewAddress(addressOnly);
                                    const firstChar = preview.charAt(0);
                                    const rest = preview.slice(1);
                                    return (
                                        <>
                                            <FirstCharHighlight>
                                                {firstChar}
                                            </FirstCharHighlight>
                                            {rest}
                                        </>
                                    );
                                })()}
                            </AddressHighlightTrim>
                        </ReceiveAddressHolder>
                    )}
                </div>
            </div>
        </CopyToClipboard>
    );
};
