// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import ScanQRCode from 'components/Common/ScanQRCode';
import { WalletIcon, ContactsIcon } from 'components/Common/CustomIcons';
import { CashtabContact } from 'config/CashtabState';
import { StoredCashtabWallet } from 'wallet';
import { previewAddress } from 'helpers';
import {
    getRecipientDisplayLabel,
    looksLikeAddressInput,
    searchSendRecipients,
    RecipientSearchMatch,
} from 'components/Send/helpers/recipientResolve';

const Wrapper = styled.div`
    box-sizing: border-box;
    width: 100%;
    position: relative;
`;

const InputLabel = styled.div`
    color: ${props => props.theme.primaryText};
    margin-bottom: 6px;
    font-weight: 700;
    text-align: left;
    font-size: var(--text-lg);
    @media (max-width: 768px) {
        font-size: var(--text-base);
    }
`;

const InputRow = styled.div<{ invalid?: boolean }>`
    position: relative;
    display: flex;
    align-items: stretch;
    input,
    button {
        border: ${props =>
            props.invalid
                ? `1px solid ${props.theme.formError}`
                : `1px solid transparent`};
    }
`;

const LeftInput = styled.input<{ invalid?: boolean }>`
    ${props => props.disabled && `cursor: not-allowed`};
    background: ${props => props.theme.inputBackground};
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    padding: 18px 12px;
    border-radius: 9px 0 0 9px;
    width: 100%;
    color: ${props => props.theme.primaryText};
    :focus-visible {
        outline: none;
    }
    ${props => props.invalid && `border: 1px solid ${props.theme.formError}`};
    @media (max-width: 768px) {
        padding: 12px 12px;
    }
`;

const ErrorMsg = styled.div`
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    color: ${props => props.theme.formError};
    word-break: break-all;
    min-height: 1.25rem;
`;

const ResolvedDisplay = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 18px 0 12px;
    background-color: ${props => props.theme.inputBackground};
    border-radius: 10px;
    width: 100%;
    height: 60px;
    @media (max-width: 768px) {
        height: 52px;
        padding: 0 12px 0 6px;
    }
`;

const ResolvedInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
    gap: 2px;
`;

const ResolvedName = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
`;

const ResolvedPreview = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: 12px;
`;

const ClearButton = styled.button`
    background: transparent;
    border: none;
    color: ${props => props.theme.secondaryText};
    cursor: pointer;
    font-size: 20px;
    padding: 0 0 0 18px;
    height: 100%;
    border-left: 1px solid ${props => props.theme.primaryBackground};
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
        color: ${props => props.theme.primaryText};
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 0 0 0 12px;
    }
`;

const IconSlot = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    svg {
        width: 24px;
        height: 24px;
    }
`;

const DropdownList = styled.div`
    width: 100%;
    background: ${props => props.theme.inputBackground};
    border-radius: 10px;
    max-height: 240px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 4px;
`;

const DropdownItem = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px;
    cursor: pointer;
    border: none;
    border-bottom: 1px solid ${props => props.theme.primaryBackground};
    background: transparent;
    text-align: left;
    color: ${props => props.theme.primaryText};
    &:hover {
        background: ${props => props.theme.secondaryBackground};
    }
    &:last-child {
        border-bottom: none;
    }
`;

const DropdownItemInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
`;

const DropdownItemName = styled.div`
    font-weight: 700;
    font-size: var(--text-base);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const DropdownItemAddress = styled.div`
    font-size: 12px;
    color: ${props => props.theme.secondaryText};
`;

interface SendRecipientInputProps {
    label?: string;
    placeholder?: string;
    name?: string;
    value: string;
    disabled?: boolean;
    handleInput: React.ChangeEventHandler<HTMLInputElement>;
    error: false | string;
    contactList: CashtabContact[];
    wallets: StoredCashtabWallet[];
}

const emptyAddressEvent = (name: string): React.ChangeEvent<HTMLInputElement> =>
    ({
        target: { name, value: '' },
    }) as React.ChangeEvent<HTMLInputElement>;

const addressEvent = (
    name: string,
    value: string,
): React.ChangeEvent<HTMLInputElement> =>
    ({
        target: { name, value },
    }) as React.ChangeEvent<HTMLInputElement>;

/**
 * Send-to field with contact / wallet search and resolved recipient display.
 */
const SendRecipientInput: React.FC<SendRecipientInputProps> = ({
    label = 'Send to',
    placeholder = 'Address or contact',
    name = 'address',
    value = '',
    disabled = false,
    handleInput,
    error = false,
    contactList,
    wallets,
}) => {
    const [query, setQuery] = useState('');
    const [isEditing, setIsEditing] = useState(value === '');
    const [searchFocused, setSearchFocused] = useState(false);

    // Resolve when parent fills address (deep link / extension / contact nav),
    // or after the user leaves the field with a valid recipient. Stay in edit
    // mode while focused so BIP21 can be typed after a valid address prefix.
    useEffect(() => {
        if (searchFocused) {
            return;
        }
        if (value !== '' && error === false) {
            setIsEditing(false);
            setQuery('');
            return;
        }
        if (value !== '' && error !== false) {
            setIsEditing(true);
            setQuery(value);
            return;
        }
        if (value === '') {
            setIsEditing(true);
            setQuery('');
        }
    }, [value, error, searchFocused]);

    const matches: RecipientSearchMatch[] =
        isEditing && query.trim() !== ''
            ? searchSendRecipients(query, contactList, wallets)
            : [];

    const showDropdown =
        searchFocused && isEditing && !disabled && matches.length > 0;

    const showResolved = value !== '' && !isEditing && error === false;
    const resolvedLabel = showResolved
        ? getRecipientDisplayLabel(value, contactList, wallets)
        : '';
    const resolvedAddress = value.split('?')[0];
    const resolvedPreview =
        resolvedAddress !== '' ? previewAddress(resolvedAddress) : '';
    const isOwnWallet =
        showResolved && wallets.some(w => w.address === resolvedAddress);
    const isContact =
        showResolved && contactList.some(c => c.address === resolvedAddress);

    const selectMatch = (match: RecipientSearchMatch) => {
        setQuery('');
        setIsEditing(false);
        setSearchFocused(false);
        handleInput(addressEvent(name, match.address));
    };

    const clearRecipient = () => {
        setQuery('');
        setIsEditing(true);
        handleInput(emptyAddressEvent(name));
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setQuery(next);
        setIsEditing(true);

        if (next === '') {
            handleInput(emptyAddressEvent(name));
            return;
        }

        // Forward address / BIP21 attempts to existing validation
        if (looksLikeAddressInput(next)) {
            handleInput(e);
            return;
        }

        // Name search: clear any previously confirmed address, no validation error
        if (value !== '') {
            handleInput(emptyAddressEvent(name));
        }
    };

    const onInputBlur = () => {
        setSearchFocused(false);
    };

    const onScan = (result: string) => {
        setQuery('');
        setIsEditing(false);
        setSearchFocused(false);
        handleInput(addressEvent(name, result));
    };

    if (showResolved) {
        return (
            <Wrapper>
                {label && <InputLabel>{label}</InputLabel>}
                <ResolvedDisplay data-testid="resolved-recipient">
                    <IconSlot>
                        {isOwnWallet ? (
                            <span title="My wallet">
                                <WalletIcon />
                            </span>
                        ) : isContact ? (
                            <span title="Contact">
                                <ContactsIcon />
                            </span>
                        ) : null}
                    </IconSlot>
                    <ResolvedInfo>
                        <ResolvedName data-testid="resolved-recipient-name">
                            {resolvedLabel}
                        </ResolvedName>
                        {resolvedLabel !== resolvedPreview && (
                            <ResolvedPreview>{resolvedPreview}</ResolvedPreview>
                        )}
                    </ResolvedInfo>
                    {!disabled && (
                        <ClearButton
                            type="button"
                            title="Clear recipient"
                            onClick={clearRecipient}
                            data-testid="clear-recipient"
                        >
                            ×
                        </ClearButton>
                    )}
                </ResolvedDisplay>
                <ErrorMsg />
            </Wrapper>
        );
    }

    const showError = typeof error === 'string' && looksLikeAddressInput(query);

    return (
        <Wrapper
            onBlur={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setSearchFocused(false);
                }
            }}
        >
            {label && <InputLabel>{label}</InputLabel>}
            <InputRow invalid={showError}>
                <LeftInput
                    name={name}
                    value={query}
                    disabled={disabled}
                    placeholder={placeholder}
                    invalid={showError}
                    onChange={onInputChange}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={onInputBlur}
                    autoComplete="off"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-testid="send-recipient-input"
                />
                {!disabled && <ScanQRCode onScan={onScan} />}
            </InputRow>
            {showDropdown && (
                <DropdownList data-testid="recipient-search-results">
                    {matches.map(match => (
                        <DropdownItem
                            key={`${match.kind}-${match.address}`}
                            type="button"
                            onMouseDown={e => {
                                // Prevent input blur before click registers
                                e.preventDefault();
                            }}
                            onClick={() => selectMatch(match)}
                            data-testid={`recipient-search-${match.kind}-${match.name}`}
                        >
                            <IconSlot>
                                {match.kind === 'wallet' ? (
                                    <span title="My wallet">
                                        <WalletIcon />
                                    </span>
                                ) : match.kind === 'contact' ? (
                                    <span title="Contact">
                                        <ContactsIcon />
                                    </span>
                                ) : null}
                            </IconSlot>
                            <DropdownItemInfo>
                                <DropdownItemName>
                                    {match.name}
                                </DropdownItemName>
                                <DropdownItemAddress>
                                    {previewAddress(match.address)}
                                </DropdownItemAddress>
                            </DropdownItemInfo>
                        </DropdownItem>
                    ))}
                </DropdownList>
            )}
            <ErrorMsg>{showError ? error : ''}</ErrorMsg>
        </Wrapper>
    );
};

export default SendRecipientInput;
