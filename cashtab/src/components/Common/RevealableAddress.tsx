// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import { ReactComponent as EyeIcon } from 'assets/visible.svg';
import { ReactComponent as EyeInvisibleIcon } from 'assets/hidden.svg';
import { getHighlightedAddressParts, previewAddress } from 'helpers';

const Row = styled.div<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-width: 0;
    color: ${props =>
        props.$primary ? props.theme.primaryText : props.theme.secondaryText};
    font-size: ${props => (props.$primary ? 'var(--text-base)' : '12px')};
    font-weight: ${props => (props.$primary ? 700 : 400)};
`;

const AddressText = styled.span`
    font-family: 'Roboto Mono', monospace;
    word-break: break-all;
    text-align: left;
    min-width: 0;
    line-height: 1.4;
`;

const Highlight = styled.span`
    color: ${props => props.theme.accent};
    font-weight: 700;
`;

const Toggle = styled.button<{ $primary?: boolean }>`
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: ${props => props.theme.secondaryText};
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${props => (props.$primary ? '28px' : '20px')};
    height: ${props => (props.$primary ? '28px' : '20px')};
    :hover {
        color: ${props => props.theme.accent};
    }
    svg {
        width: ${props => (props.$primary ? '20px' : '16px')};
        height: ${props => (props.$primary ? '20px' : '16px')};
        fill: currentColor;
    }
`;

interface RevealableAddressProps {
    address: string;
    /** Bolder preview, for the send-field primary line */
    primary?: boolean;
}

/**
 * Truncated cashaddr with an eye toggle to reveal the full address.
 * When revealed, the checksum and an equal-length payload prefix are
 * highlighted in ecash blue.
 */
const RevealableAddress: React.FC<RevealableAddressProps> = ({
    address,
    primary = false,
}) => {
    const [revealed, setRevealed] = useState(false);

    if (address === '') {
        return null;
    }

    const preview = previewAddress(address);
    const parts = getHighlightedAddressParts(address);

    return (
        <Row $primary={primary}>
            {revealed ? (
                <AddressText data-testid="full-address">
                    {parts.prefix}
                    <Highlight data-testid="address-leading">
                        {parts.leading}
                    </Highlight>
                    {parts.middle}
                    <Highlight data-testid="address-checksum">
                        {parts.checksum}
                    </Highlight>
                </AddressText>
            ) : (
                <AddressText>{preview}</AddressText>
            )}
            <Toggle
                type="button"
                $primary={primary}
                aria-label={
                    revealed ? 'Hide full address' : 'Show full address'
                }
                aria-pressed={revealed}
                title={revealed ? 'Hide full address' : 'Show full address'}
                onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRevealed(open => !open);
                }}
            >
                {revealed ? (
                    <EyeInvisibleIcon title="Hidden" fill="currentColor" />
                ) : (
                    <EyeIcon title="Visible" fill="currentColor" />
                )}
            </Toggle>
        </Row>
    );
};

export default RevealableAddress;
