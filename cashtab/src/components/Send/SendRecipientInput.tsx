// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import ScanQRCode from 'components/Common/ScanQRCode';
import {
    WalletIcon,
    ContactsIcon,
    FirmaLogoIcon,
} from 'components/Common/CustomIcons';
import { CashtabContact } from 'config/CashtabState';
import { StoredCashtabWallet } from 'wallet';
import { previewAddress } from 'helpers';
import RevealableAddress from 'components/Common/RevealableAddress';
import { useFirmaUsernameSearch } from 'hooks/useFirmaUsernameSearch';
import { FIRMA_USERNAME_TOKEN_ONLY } from 'config/firma';
import {
    getAddressFromRecipientInput,
    getFirmaHandleForRecipient,
    getRecipientDisplayLabel,
    isExplicitFirmaUsernameInput,
    looksLikeAddressInput,
    looksLikeFirmaUsernameInput,
    searchSendRecipients,
    shouldResolveFirmaUsername,
    RecipientSearchMatch,
    ResolvedFirmaRecipient,
} from 'components/Send/helpers/recipientResolve';

const Wrapper = styled.div`
    box-sizing: border-box;
    width: 100%;
    position: relative;
`;

const InputLabel = styled.label`
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
    padding: 8px 18px 8px 12px;
    background-color: ${props => props.theme.inputBackground};
    border-radius: 10px;
    width: 100%;
    min-height: 60px;
    @media (max-width: 768px) {
        min-height: 52px;
        padding: 8px 12px 8px 6px;
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
    svg,
    img {
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
    /** Handle + cashaddr when this recipient was resolved from Firma */
    firmaResolved?: ResolvedFirmaRecipient | null;
    onFirmaResolvedChange?: (resolved: ResolvedFirmaRecipient | null) => void;
    /**
     * Selected Send Token id, or null on XEC send.
     * Patron lookup only for FIRMA / fCHF / fEUR (or those token_ids in BIP21).
     */
    firmaUsernameTokenId?: string | null;
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
    label,
    placeholder = 'Address or contact',
    name = 'address',
    value = '',
    disabled = false,
    handleInput,
    error = false,
    contactList,
    wallets,
    firmaResolved = null,
    onFirmaResolvedChange,
    firmaUsernameTokenId = null,
}) => {
    const [query, setQuery] = useState('');
    const [isEditing, setIsEditing] = useState(value === '');
    const [searchFocused, setSearchFocused] = useState(false);

    const setFirmaResolved = (
        handle: string | null,
        addressOrBip21?: string,
    ) => {
        if (handle === null || typeof addressOrBip21 !== 'string') {
            onFirmaResolvedChange?.(null);
            return;
        }
        const address = getAddressFromRecipientInput(addressOrBip21);
        if (address === '') {
            onFirmaResolvedChange?.(null);
            return;
        }
        onFirmaResolvedChange?.({ handle, address });
    };

    const localMatches: RecipientSearchMatch[] =
        isEditing && query.trim() !== ''
            ? searchSendRecipients(query, contactList, wallets)
            : [];

    const allowFirmaResolve = shouldResolveFirmaUsername(
        firmaUsernameTokenId,
        query,
    );

    // Explicit @… always looks up. Bare usernames only if nothing local matches,
    // so typing a contact/wallet name is not sent to Patron.
    const firmaSearch = useFirmaUsernameSearch({
        query,
        enabled:
            allowFirmaResolve &&
            isEditing &&
            !disabled &&
            (isExplicitFirmaUsernameInput(query) ||
                (looksLikeFirmaUsernameInput(query) &&
                    localMatches.length === 0)),
    });

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
            // Do not setQuery('') here: that wipes an in-progress @username
            // when the field blurs before Patron resolves.
        }
    }, [value, error, searchFocused]);

    const firmaMatch: RecipientSearchMatch | null =
        firmaSearch.status === 'found' &&
        !localMatches.some(match => match.address === firmaSearch.address)
            ? {
                  kind: 'firma',
                  name: `@${firmaSearch.handle}`,
                  address: firmaSearch.address,
              }
            : null;

    const matches: RecipientSearchMatch[] = firmaMatch
        ? [...localMatches, firmaMatch]
        : localMatches;

    const showDropdown =
        searchFocused &&
        isEditing &&
        !disabled &&
        (matches.length > 0 ||
            (isExplicitFirmaUsernameInput(query) &&
                (firmaSearch.status === 'checking' ||
                    firmaSearch.status === 'found')));

    const showResolved = value !== '' && !isEditing && error === false;
    const resolvedForLabel = allowFirmaResolve ? firmaResolved : null;
    const displayFirmaHandle = getFirmaHandleForRecipient(
        value,
        resolvedForLabel,
    );
    const resolvedLabel = showResolved
        ? getRecipientDisplayLabel(
              value,
              contactList,
              wallets,
              resolvedForLabel,
          )
        : '';
    const resolvedAddress = value.split('?')[0];
    const resolvedPreview =
        resolvedAddress !== '' ? previewAddress(resolvedAddress) : '';
    const isOwnWallet =
        showResolved &&
        displayFirmaHandle === null &&
        wallets.some(w => w.address === resolvedAddress);
    const isContact =
        showResolved &&
        displayFirmaHandle === null &&
        contactList.some(c => c.address === resolvedAddress);
    const isFirma = showResolved && displayFirmaHandle !== null;

    const applyRecipient = (
        nextAddress: string,
        nextFirmaHandle: string | null,
    ) => {
        setQuery('');
        setIsEditing(false);
        setSearchFocused(false);
        setFirmaResolved(nextFirmaHandle, nextAddress);
        handleInput(addressEvent(name, nextAddress));
    };

    const selectMatch = (match: RecipientSearchMatch) => {
        const queryString = query.includes('?') ? query.split('?')[1] : '';
        const nextAddress =
            queryString !== '' && match.kind === 'firma'
                ? `${match.address}?${queryString}`
                : match.address;
        applyRecipient(
            nextAddress,
            match.kind === 'firma' ? match.name.replace(/^@/, '') : null,
        );
    };

    // Explicit @username: apply as soon as Patron resolves (apps/firma continue).
    useEffect(() => {
        if (!isEditing || disabled) {
            return;
        }
        if (!isExplicitFirmaUsernameInput(query)) {
            return;
        }
        if (firmaSearch.status !== 'found') {
            return;
        }
        const queryString = query.includes('?') ? query.split('?')[1] : '';
        const nextAddress =
            queryString !== ''
                ? `${firmaSearch.address}?${queryString}`
                : firmaSearch.address;
        applyRecipient(nextAddress, firmaSearch.handle);
    }, [firmaSearch, query, isEditing, disabled]);

    const clearRecipient = () => {
        setQuery('');
        setIsEditing(true);
        setFirmaResolved(null);
        handleInput(emptyAddressEvent(name));
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setQuery(next);
        setIsEditing(true);

        if (next === '') {
            setFirmaResolved(null);
            handleInput(emptyAddressEvent(name));
            return;
        }

        // Username (optional @ / BIP21) — wait for Patron only for FIRMA / fCHF / fEUR
        if (looksLikeFirmaUsernameInput(next)) {
            if (value !== '') {
                setFirmaResolved(null);
                handleInput(emptyAddressEvent(name));
            }
            return;
        }

        // Forward address / BIP21 attempts to existing validation
        if (looksLikeAddressInput(next)) {
            setFirmaResolved(null);
            handleInput(e);
            return;
        }

        // Name search: clear any previously confirmed address, no validation error
        if (value !== '') {
            setFirmaResolved(null);
            handleInput(emptyAddressEvent(name));
        }
    };

    const onInputBlur = () => {
        setSearchFocused(false);
    };

    /**
     * Keyboard confirm for the suggestion dropdown.
     *
     * Enter / Tab both select the first match. That calls selectMatch(), which
     * sets isEditing=false and unmounts this <input> in favor of the resolved
     * recipient UI — so native Tab traversal cannot finish (the focused node
     * is gone). We therefore preventDefault and place focus ourselves.
     *
     * - Enter / Tab: Amount (Tab also skips the QR button in between).
     * - Shift+Tab: the previous focusable. Without this, focus falls to
     *   <body> after the input unmounts.
     *
     * setTimeout(0): selectMatch only schedules a React state update. Focus
     * must run after that commit, once the search input is actually gone and
     * Amount is queryable in the DOM. A sync .focus() here races the unmount.
     */
    const focusAmountInput = () => {
        window.setTimeout(() => {
            const amountInput = document.querySelector<HTMLInputElement>(
                'input[name="amount"]',
            );
            amountInput?.focus();
        }, 0);
    };

    const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || matches.length === 0) {
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            selectMatch(matches[0]);
            focusAmountInput();
            return;
        }
        if (e.key !== 'Tab') {
            return;
        }

        e.preventDefault();
        const match = matches[0];

        if (e.shiftKey) {
            const current = e.currentTarget;
            const focusables = Array.from(
                document.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            );
            const currentIndex = focusables.indexOf(current);
            const previous =
                currentIndex > 0 ? focusables[currentIndex - 1] : null;
            selectMatch(match);
            window.setTimeout(() => {
                previous?.focus();
            }, 0);
            return;
        }

        selectMatch(match);
        focusAmountInput();
    };

    const onScan = (result: string) => {
        applyRecipient(result, null);
    };

    if (showResolved) {
        return (
            <Wrapper>
                {label && <InputLabel>{label}</InputLabel>}
                <ResolvedDisplay
                    role="status"
                    aria-label={`Recipient ${resolvedLabel}`}
                >
                    <IconSlot>
                        {isFirma ? (
                            <span title="Firma username">
                                <FirmaLogoIcon />
                            </span>
                        ) : isOwnWallet ? (
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
                        {resolvedLabel !== resolvedPreview ? (
                            <>
                                <ResolvedName>{resolvedLabel}</ResolvedName>
                                <RevealableAddress address={resolvedAddress} />
                            </>
                        ) : (
                            <RevealableAddress
                                address={resolvedAddress}
                                primary
                            />
                        )}
                    </ResolvedInfo>
                    {!disabled && (
                        <ClearButton
                            type="button"
                            aria-label="Clear recipient"
                            title="Clear recipient"
                            onClick={clearRecipient}
                        >
                            ×
                        </ClearButton>
                    )}
                </ResolvedDisplay>
                <ErrorMsg />
            </Wrapper>
        );
    }

    const firmaTokenOnlyError =
        isExplicitFirmaUsernameInput(query) &&
        !shouldResolveFirmaUsername(firmaUsernameTokenId, query)
            ? FIRMA_USERNAME_TOKEN_ONLY
            : false;
    const firmaError =
        firmaTokenOnlyError !== false
            ? firmaTokenOnlyError
            : isExplicitFirmaUsernameInput(query) &&
                (firmaSearch.status === 'none' ||
                    firmaSearch.status === 'invalid' ||
                    firmaSearch.status === 'error')
              ? firmaSearch.message
              : false;
    const displayError =
        firmaError !== false
            ? firmaError
            : typeof error === 'string' && looksLikeAddressInput(query)
              ? error
              : '';
    const showError = displayError !== '';
    const inputId = `${name}-input`;

    return (
        <Wrapper
            onBlur={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setSearchFocused(false);
                }
            }}
        >
            {label && <InputLabel htmlFor={inputId}>{label}</InputLabel>}
            <InputRow invalid={showError}>
                <LeftInput
                    id={inputId}
                    name={name}
                    value={query}
                    disabled={disabled}
                    placeholder={placeholder}
                    invalid={showError}
                    onChange={onInputChange}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={onInputBlur}
                    onKeyDown={onInputKeyDown}
                    autoComplete="off"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                />
                {!disabled && <ScanQRCode onScan={onScan} />}
            </InputRow>
            {showDropdown && (
                <DropdownList aria-label="Matching recipients">
                    {firmaSearch.status === 'checking' &&
                        isExplicitFirmaUsernameInput(query) && (
                            <DropdownItem
                                type="button"
                                disabled
                                aria-label={`Resolving @${firmaSearch.handle}`}
                            >
                                <IconSlot>
                                    <span title="Firma username">
                                        <FirmaLogoIcon />
                                    </span>
                                </IconSlot>
                                <DropdownItemInfo>
                                    <DropdownItemName>
                                        Resolving @{firmaSearch.handle}...
                                    </DropdownItemName>
                                </DropdownItemInfo>
                            </DropdownItem>
                        )}
                    {matches.map(match => (
                        <DropdownItem
                            key={`${match.kind}-${match.address}`}
                            type="button"
                            aria-label={match.name}
                            onMouseDown={e => {
                                // Prevent input blur before click registers
                                e.preventDefault();
                            }}
                            onClick={() => selectMatch(match)}
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
                                ) : match.kind === 'firma' ? (
                                    <span title="Firma username">
                                        <FirmaLogoIcon />
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
            <ErrorMsg>{showError ? displayError : ''}</ErrorMsg>
        </Wrapper>
    );
};

export default SendRecipientInput;
