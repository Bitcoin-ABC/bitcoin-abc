// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, {
    useState,
    useEffect,
    useContext,
    useCallback,
    useMemo,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import Modal from 'components/Common/Modal';
import PrimaryButton, {
    SecondaryButton,
    CopyIconButton,
} from 'components/Common/Buttons';
import ActionButtonRow from 'components/Common/ActionButtonRow';
import {
    toSatoshis,
    toXec,
    SlpDecimals,
    undecimalizeTokenAmount,
} from 'wallet';
import {
    sumOneToManyXec,
    confirmRawTx,
    getRecipientDisplayLabel,
} from './helpers';
import SendRecipientInput from './SendRecipientInput';
import { Event } from 'components/Common/GoogleAnalytics';
import {
    isValidMultiSendUserInput,
    isValidTokenMultiSendUserInput,
    shouldSendXecBeDisabled,
    parseAddressInput,
    isValidXecSendAmount,
    getOpReturnRawError,
    CashtabParsedAddressInfo,
    isValidTokenSendOrBurnAmount,
} from 'validation';
import { Alert, AlertMsg, Info } from 'components/Common/Atoms';
import { getMultisendTargetOutputs, parseTokenMultisendRows } from 'helpers';
import { ChronikClient } from 'chronik-client';
import {
    getCashtabMsgTargetOutput,
    getAirdropTargetOutput,
    getCashtabMsgByteCount,
    getOpreturnParamTargetOutput,
    parseOpReturnRaw,
    parseFirma,
    parseEmppRaw,
    parseInputDataRaw,
    ParsedOpReturnRaw,
} from 'opreturn';
import ApiError from 'components/Common/ApiError';
import {
    formatFiatBalance,
    formatBalance,
    normalizeDecimalInput,
    sanitizeAndFormatAmountInput,
} from 'formatting';
import styled from 'styled-components';
import { opReturn as opreturnConfig } from 'config/opreturn';
import { explorer } from 'config/explorer';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import appConfig from 'config/app';
import { getUserLocale } from 'helpers';
import { fiatToSatoshis } from 'wallet';
import { toast } from 'react-toastify';
import {
    SendXecInput,
    SendTokenInput,
    Input,
    TextArea,
} from 'components/Common/Inputs';
import { opReturn } from 'config/opreturn';
import { Script, payment, fromHex, TokenType, strToBytes } from 'ecash-lib';
import { isValidCashAddress } from 'ecashaddrjs';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';
import TokenIcon from 'components/Etokens/TokenIcon';
import { ExtendedCashtabCachedTokenInfo } from 'components/Etokens/TokenListItem';
import { TokenInfoKv } from 'components/Etokens/TokenList';
import { getTokenGenesisInfo } from 'chronik';
import { InlineLoader } from 'components/Common/Spinner';
import {
    AlpTokenType_Type,
    SlpTokenType_Type,
    GenesisInfo,
} from 'chronik-client';
import {
    SendButtonContainer,
    SuccessModalOverlay,
    SuccessModalContent,
    SuccessIcon,
    SuccessTitle,
    TransactionIdLink,
    SuccessButton,
    SUCCESS_MODAL_DURATION_MS,
} from './styled';
import { confirmBiometricBroadcast } from 'services/biometricLockService';
import {
    FIRMA,
    FIRMA_REDEEM_ADDRESS,
    FIRMA_REDEEM_EMPP_RAW_LENGTH,
} from 'constants/tokens';
import { FirmaIcon, UsdcIcon } from 'components/Common/CustomIcons';
import Burst from 'assets/burst.png';
import { ReactComponent as DropDownArrowIcon } from 'assets/drop-down-arrow.svg';

const OuterCtn = styled.div`
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 250px);
    @media (max-width: 768px) {
        min-height: calc(100vh - 300px);
        padding: 0 12px;
    }
`;

const SendContentWrapper = styled.div`
    width: 100%;
    padding: 0 16px;
    margin: 0 auto;
    margin-top: 40px;
    box-sizing: border-box;
    @media (max-width: 768px) {
        padding: 0 0;
        margin-top: 10px;
    }
`;

const SendXecForm = styled.div`
    margin: 2px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-grow: 1;
`;
const SendXecRow = styled.div``;

const AdvancedSection = styled.div`
    margin: 0;
    width: 100%;
`;
const AdvancedHeader = styled.button`
    display: flex;
    align-items: center;
    gap: 2px;
    width: 100%;
    background: none;
    padding: 8px 0;
    border: none;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    cursor: pointer;
    font-weight: 700;
    text-align: left;
    transition: color 0.2s ease;
    :focus-visible {
        outline: none;
    }
    :hover {
        color: ${props => props.theme.accent};
    }
`;
const AdvancedButtonsRow = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    @media (max-width: 768px) {
        gap: 6px;
    }
`;
const AdvancedButton = styled.button<{ $active?: boolean }>`
    flex: 1;
    padding: 14px 4px;
    border-radius: 8px;
    border: none;
    background-color: ${props =>
        props.$active ? props.theme.accent : props.theme.inputBackground};
    color: ${props => props.theme.primaryText};
    font-size: var(--text-sm);
    line-height: 1em;
    cursor: pointer;
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
    :hover:not(:disabled) {
        background-color: ${props =>
            props.$active ? props.theme.accent : 'rgba(255, 255, 255, 0.2)'};
    }
    :disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
`;
const AdvancedContent = styled.div`
    margin-top: 0;
`;

const AdvancedChevron = styled(DropDownArrowIcon)<{ $open?: boolean }>`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    fill: currentColor;
    margin-left: 4px;
    transform: ${props => (props.$open ? 'rotate(180deg)' : 'none')};
    transition: fill 0.2s ease;
    path {
        fill: currentColor;
    }
`;

const AmountPreviewCtn = styled.div`
    margin: 12px 0;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid ${props => props.theme.border};
    padding-top: 20px;
    /*
     * On narrow viewports the send action row is position:fixed above the bottom
     * nav (see SendButtonContainer in styled.ts). Without extra space below this
     * block, the “Sending” amount and fiat line can end up under those buttons
     * with no way to scroll them fully into view. This padding is scrollable
     * clearance only—not a measured bar height, just enough to clear typical layouts.
     */
    @media (max-width: 768px) {
        padding-bottom: 48px;
    }
`;
const AmountPreviewLabel = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-lg);
    font-weight: 700;
    flex-shrink: 0;
`;
const AmountPreviewValues = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    min-width: 0;
`;
const AmountPreviewFiat = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
`;
const ParsedBip21InfoRow = styled.div`
    display: flex;
    flex-direction: column;
    word-break: break-word;
    margin-bottom: 12px;
`;
const ParsedBip21InfoLabel = styled.div`
    color: ${props => props.theme.primaryText};
    text-align: left;
    width: 100%;
`;
const ParsedBip21Info = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: ${props => props.theme.accent};
    padding: 12px;
    text-align: left;
`;

const LocaleFormattedValue = styled.div`
    color: ${props => props.theme.primaryText};
    font-weight: bold;
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    margin-bottom: 2px;
`;

const SendToOneHolder = styled.div``;
const SendToManyHolder = styled.div``;
const SendToOneInputForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const InputModesHolder = styled.div<{ open: boolean }>`
    min-height: 9rem;
    ${SendToOneHolder} {
        overflow: hidden;
        transition: ${props =>
            props.open
                ? 'max-height 200ms ease-in, opacity 200ms ease-out'
                : 'max-height 200ms cubic-bezier(0, 1, 0, 1), opacity 200ms ease-in'};
        max-height: ${props => (props.open ? '0rem' : '20rem')};
        opacity: ${props => (props.open ? 0 : 1)};
    }
    ${SendToManyHolder} {
        overflow: hidden;
        transition: ${props =>
            props.open
                ? 'max-height 200ms ease-in, transform 200ms ease-out, opacity 200ms ease-in'
                : 'max-height 200ms cubic-bezier(0, 1, 0, 1), transform 200ms ease-out'};
        max-height: ${props => (props.open ? '20rem' : '0rem')};
        transform: ${props =>
            props.open ? 'translateY(0%)' : 'translateY(100%)'};
        opacity: ${props => (props.open ? 1 : 0)};
    }
`;
const ParsedTokenSend = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background-color: #fff2f0;
    border-radius: 12px;
    color: ${props => props.theme.accent};
    padding: 12px;
    text-align: left;
`;
export const FirmaRedeemLogoWrapper = styled.div`
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    img,
    svg {
        width: 64px;
        height: 64px;
    }
    @media (max-width: 768px) {
        img,
        svg {
            width: 32px;
            height: 32px;
        }
    }
`;
export const FirmaRedeemTextAndCopy = styled.div`
    display: flex;
`;
const TokenSelectDropdown = styled.div`
    position: relative;
    width: 100%;
`;

const TokenSelectInputWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
    width: 100%;
`;

const TokenSelectClearButton = styled.button`
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
    z-index: 10;
    &:hover {
        color: ${props => props.theme.primaryText};
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 0 0 0 12px;
    }
`;

const SelectedTokenDisplay = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0px 18px 0 12px;
    background-color: ${props => props.theme.inputBackground};
    border-radius: 10px;
    width: 100%;
    position: relative;
    height: 80px;
    margin-bottom: 18px;
    @media (max-width: 768px) {
        height: 70px;
        margin-bottom: 14px;
        padding: 0 12px 0 6px;
    }
`;

const SelectedTokenInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
`;

const SelectedTokenText = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    font-weight: 700;
`;

const SelectedTokenDetails = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    flex: 1;
    text-align: left;
`;

const SelectedTokenBalance = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    font-weight: 700;
    @media (max-width: 768px) {
        font-size: var(--text-sm);
    }
`;

const SendingTokenLabel = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-lg);
    font-weight: 700;
    margin-bottom: 8px;
    text-align: left;
`;

const SelectedTokenIdWrapper = styled.div`
    font-size: 12px;
    color: ${props => props.theme.secondaryText};
`;

const TokenDropdownList = styled.div`
    width: 100%;
    background: ${props => props.theme.inputBackground};
    border-radius: 10px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 0px;
`;

const TokenDropdownItem = styled.div`
    display: flex;
    align-items: flex-start;
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid ${props => props.theme.primaryBackground};
    &:hover {
        background: ${props => props.theme.accent};
    }
    &:last-child {
        border-bottom: none;
    }
`;

const TokenDropdownItemContent = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
`;

const TokenDropdownItemInfo = styled.div`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    text-align: left;
`;

const TokenDropdownItemTicker = styled.div`
    font-weight: bold;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
`;

const TokenDropdownItemBalance = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    font-weight: 700;
`;

const TokenDropdownItemTokenId = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: 12px;
`;

const TokenFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 12px 0;
    /*
     * Token mode does not render AmountPreviewCtn (XEC-only), which supplies mobile
     * scroll clearance above the fixed send row. Without this, Advanced and content
     * below it sit under the Send button / bottom nav (extension and narrow web).
     */
    @media (max-width: 768px), (max-height: 600px) {
        padding-bottom: 48px;
    }
`;
interface CashtabTxInfo {
    address?: string;
    bip21?: string;
    value?: string;
    parseAllAsBip21?: boolean;
    returnToBrowser?: boolean;
}

/**
 * Parses `#/send?...` for URL-driven tx state. Applies two concerns:
 * (1) `flagUrlBasedTransaction` — mirrors legacy behavior for any hash query segment
 *     except “token picker only” (`mode=token` without address/BIP21).
 * (2) `txApply` — only when legacy / BIP21 params are usable for `txInfoFromUrl`.
 */
const parseCashtabTxInfoFromSendHash = (
    hashRoute: string | undefined,
): {
    /** True when hash has `?` and callers should inspect the rest */
    hasQuerySegment: boolean;
    flagUrlBasedTransaction: boolean;
    txApply: null | {
        txInfo: CashtabTxInfo;
        extensionTabId: string | null;
    };
} => {
    if (
        typeof hashRoute === 'undefined' ||
        !hashRoute ||
        hashRoute === '#/send' ||
        hashRoute.indexOf('?') === -1
    ) {
        return {
            hasQuerySegment: false,
            flagUrlBasedTransaction: false,
            txApply: null,
        };
    }

    const txInfoStr = hashRoute.slice(hashRoute.indexOf('?') + 1);

    const urlParamsForFlag = new URLSearchParams(txInfoStr);
    const isSendTokenViewOnly =
        urlParamsForFlag.get('mode') === 'token' &&
        !urlParamsForFlag.has('address') &&
        !txInfoStr.startsWith('bip21');

    const txInfo: CashtabTxInfo = {};
    const parseAllAsBip21 = txInfoStr.startsWith('bip21');

    if (parseAllAsBip21) {
        txInfo.bip21 = txInfoStr.slice('bip21='.length);
        if (txInfo.bip21.includes('&returnToBrowser=1')) {
            txInfo.bip21 = txInfo.bip21.replace('&returnToBrowser=1', '');
            txInfo.returnToBrowser = true;
        }
    } else {
        const legacyParams = new URLSearchParams(txInfoStr);
        const duplicatedParams =
            new Set(legacyParams.keys()).size !==
            Array.from(legacyParams.keys()).length;
        if (!duplicatedParams) {
            const supportedLegacyParams = ['address', 'value'];
            for (const paramKeyValue of legacyParams) {
                const paramKey = paramKeyValue[0];
                const paramValue = paramKeyValue[1];
                if (!supportedLegacyParams.includes(paramKey)) {
                    continue;
                }
                if (paramKey === 'address') {
                    txInfo.address = paramValue;
                } else if (paramKey === 'value') {
                    txInfo.value = paramValue;
                }
            }
        }
    }

    const validUrlParams =
        (parseAllAsBip21 && 'bip21' in txInfo) ||
        ('address' in txInfo && 'value' in txInfo) ||
        ('address' in txInfo && !('value' in txInfo));

    if (!validUrlParams) {
        return {
            hasQuerySegment: true,
            flagUrlBasedTransaction: !isSendTokenViewOnly,
            txApply: null,
        };
    }

    txInfo.parseAllAsBip21 = parseAllAsBip21;
    const tabParams = new URLSearchParams(txInfoStr);

    return {
        hasQuerySegment: true,
        flagUrlBasedTransaction: !isSendTokenViewOnly,
        txApply: {
            txInfo,
            extensionTabId: tabParams.get('tabId'),
        },
    };
};

/** Held Firma Alpha / XECX stay at the top of Send Token select (then A–Z). */
const PINNED_SEND_TOKEN_IDS: readonly string[] = [
    FIRMA.tokenId,
    appConfig.vipTokens.xecx.tokenId,
];

export const compareSendTokenSelectOrder = (
    a: TokenInfoKv,
    b: TokenInfoKv,
): number => {
    const aPin = PINNED_SEND_TOKEN_IDS.indexOf(a[0]);
    const bPin = PINNED_SEND_TOKEN_IDS.indexOf(b[0]);
    if (aPin !== -1 && bPin !== -1) {
        return aPin - bPin;
    }
    if (aPin !== -1) {
        return -1;
    }
    if (bPin !== -1) {
        return 1;
    }
    return a[1].genesisInfo.tokenTicker.localeCompare(
        b[1].genesisInfo.tokenTicker,
    );
};

const SendXec: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const location = useLocation();
    const navigate = useNavigate();
    const {
        fiatPrice,
        apiError,
        cashtabState,
        updateCashtabState,
        chronik,
        ecashWallet,
    } = ContextValue;
    const { settings, cashtabCache, tokens, contactList, wallets } =
        cashtabState;
    if (!ecashWallet || !tokens) {
        return null;
    }

    const balanceSats = Number(ecashWallet.balanceSats);

    const [isTokenMode, setIsTokenMode] = useState<boolean>(
        () => new URLSearchParams(location.search).get('mode') === 'token',
    );
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [tokenSearch, setTokenSearch] = useState<string>('');
    const [tokensInWallet, setTokensInWallet] = useState<TokenInfoKv[]>([]);
    const [filteredTokens, setFilteredTokens] = useState<TokenInfoKv[]>([]);
    const [isOneToManyXECSend, setIsOneToManyXECSend] =
        useState<boolean>(false);
    const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
    const [sendWithCashtabMsg, setSendWithCashtabMsg] =
        useState<boolean>(false);
    const [sendWithOpReturnRaw, setSendWithOpReturnRaw] =
        useState<boolean>(false);
    const [opReturnRawError, setOpReturnRawError] = useState<false | string>(
        false,
    );
    const [parsedOpReturnRaw, setParsedOpReturnRaw] =
        useState<ParsedOpReturnRaw>({
            protocol: '',
            data: '',
        });
    const [parsedEmppRaw, setParsedEmppRaw] = useState<ParsedOpReturnRaw>({
        protocol: '',
        data: '',
    });
    const [parsedFirma, setParsedFirma] = useState<ParsedOpReturnRaw>({
        protocol: '',
        data: '',
    });
    const [isSending, setIsSending] = useState<boolean>(false);

    interface SendXecFormData {
        amount: string;
        address: string;
        multiAddressInput: string;
        airdropTokenId: string;
        cashtabMsg: string;
        opReturnRaw: string;
    }

    const emptyFormData: SendXecFormData = {
        amount: '',
        address: '',
        multiAddressInput: '',
        airdropTokenId: '',
        cashtabMsg: '',
        opReturnRaw: '',
    };

    const [formData, setFormData] = useState<SendXecFormData>(emptyFormData);

    interface SendTokenFormData {
        amount: string;
        address: string;
        multiAddressInput: string;
        tokenCashtabMsg: string;
        emppRaw: string;
    }

    const emptyTokenFormData: SendTokenFormData = {
        amount: '',
        address: '',
        multiAddressInput: '',
        tokenCashtabMsg: '',
        emppRaw: '',
    };

    const [tokenFormData, setTokenFormData] =
        useState<SendTokenFormData>(emptyTokenFormData);
    const [sendTokenAmountError, setSendTokenAmountError] = useState<
        false | string
    >(false);
    const [sendAddressError, setSendAddressError] = useState<false | string>(
        false,
    );
    const [multiSendAddressError, setMultiSendAddressError] = useState<
        false | string
    >(false);
    const [sendAmountError, setSendAmountError] = useState<string | false>(
        false,
    );
    const [cashtabMsgError, setCashtabMsgError] = useState<string | false>(
        false,
    );
    const [sendWithCashtabMsgToken, setSendWithCashtabMsgToken] =
        useState<boolean>(false);
    const [sendWithEmppRaw, setSendWithEmppRaw] = useState<boolean>(false);
    const [emppRawError, setEmppRawError] = useState<false | string>(false);
    const [tokenCashtabMsgError, setTokenCashtabMsgError] = useState<
        false | string
    >(false);
    const [tokenAdvancedOpen, setTokenAdvancedOpen] = useState<boolean>(false);
    const [isOneToManyTokenSend, setIsOneToManyTokenSend] =
        useState<boolean>(false);
    const [multiTokenSendError, setMultiTokenSendError] = useState<
        false | string
    >(false);
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        appConfig.ticker,
    );
    const [parsedAddressInput, setParsedAddressInput] =
        useState<CashtabParsedAddressInfo>(parseAddressInput('', 0));

    // input_data_raw is only parsed from BIP21 (URL or address field), not manually entered
    const parsedInputDataRaw = useMemo((): ParsedOpReturnRaw => {
        const inputDataRaw = parsedAddressInput.input_data_raw;
        if (
            typeof inputDataRaw !== 'undefined' &&
            inputDataRaw.error === false &&
            typeof inputDataRaw.value === 'string' &&
            inputDataRaw.value !== ''
        ) {
            return parseInputDataRaw(inputDataRaw.value);
        }
        return { protocol: '', data: '' };
    }, [parsedAddressInput.input_data_raw]);

    const inputDataRawError =
        typeof parsedAddressInput.input_data_raw !== 'undefined'
            ? parsedAddressInput.input_data_raw.error
            : false;

    // Cashtab does not yet support sending all types of tokens
    const cashtabSupportedSendTypes = [
        'ALP_TOKEN_TYPE_STANDARD',
        'SLP_TOKEN_TYPE_FUNGIBLE',
        'SLP_TOKEN_TYPE_NFT1_CHILD',
        'SLP_TOKEN_TYPE_NFT1_GROUP',
        'SLP_TOKEN_TYPE_MINT_VAULT',
    ];

    const tokenAdvancedSendToManySupported = useMemo(() => {
        if (!selectedTokenId) {
            return false;
        }
        const info = cashtabCache.tokens.get(selectedTokenId);
        if (typeof info === 'undefined') {
            return false;
        }
        const t = info.tokenType.type;
        return (
            t === 'ALP_TOKEN_TYPE_STANDARD' ||
            t === 'SLP_TOKEN_TYPE_FUNGIBLE' ||
            t === 'SLP_TOKEN_TYPE_NFT1_GROUP' ||
            t === 'SLP_TOKEN_TYPE_MINT_VAULT'
        );
    }, [selectedTokenId, cashtabCache.tokens]);

    const tokenAdvancedAlpEmppSupported = useMemo(() => {
        if (!selectedTokenId) {
            return false;
        }
        const info = cashtabCache.tokens.get(selectedTokenId);
        return info?.tokenType.type === 'ALP_TOKEN_TYPE_STANDARD';
    }, [selectedTokenId, cashtabCache.tokens]);

    /** First-line example qty in send-to-many placeholder (matches token decimals). */
    const tokenSendToManyExampleFirstQty = useMemo(() => {
        if (!selectedTokenId) {
            return '1';
        }
        const info = cashtabCache.tokens.get(selectedTokenId);
        if (typeof info === 'undefined') {
            return '1';
        }
        const decimals = Number(info.genesisInfo.decimals);
        if (!Number.isFinite(decimals) || decimals <= 0) {
            return '1';
        }
        const d = Math.min(Math.floor(decimals), 9);
        const frac = '123456789'.slice(0, d);
        return `1.${frac}`;
    }, [selectedTokenId, cashtabCache.tokens]);

    // Support cashtab button from web pages
    const [txInfoFromUrl, setTxInfoFromUrl] = useState<false | CashtabTxInfo>(
        false,
    );

    // Show a confirmation modal on transactions created by populating form from web page button
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [showConfirmSendModal, setShowConfirmSendModal] =
        useState<boolean>(false);
    const [tokenIdQueryError, setTokenIdQueryError] = useState<boolean>(false);

    // Success modal for URL-based transactions
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [successTxid, setSuccessTxid] = useState<string>('');

    // Extension transaction handling
    const [isExtensionTransaction, setIsExtensionTransaction] =
        useState<boolean>(false);
    const [extensionTabId, setExtensionTabId] = useState<number | null>(null);
    const [isUrlBasedTransaction, setIsUrlBasedTransaction] =
        useState<boolean>(false);

    // On native mobile: exitApp for PayButton (return to browser), else navigate home
    const closeOrNavigateFromUrlBasedTransaction = useCallback(() => {
        setShowSuccessModal(false);
        const shouldReturnToBrowser =
            txInfoFromUrl !== false && txInfoFromUrl.returnToBrowser === true;
        setTxInfoFromUrl(false);
        setIsUrlBasedTransaction(false);
        if (Capacitor.isNativePlatform()) {
            if (shouldReturnToBrowser) {
                CapacitorApp.exitApp();
            } else {
                navigate('/', { replace: true });
            }
        } else {
            window.close();
        }
    }, [navigate, txInfoFromUrl]);

    // Auto-close success modal after progress bar animation duration
    useEffect(() => {
        if (showSuccessModal) {
            const timer = setTimeout(() => {
                closeOrNavigateFromUrlBasedTransaction();
            }, SUCCESS_MODAL_DURATION_MS); // Match the progress bar animation duration

            return () => clearTimeout(timer);
        }
    }, [showSuccessModal, closeOrNavigateFromUrlBasedTransaction]);

    // Airdrop transactions embed the additional tokenId (32 bytes), along with prefix (4 bytes) and two pushdata (2 bytes)
    // hence setting airdrop tx message limit to 38 bytes less than opreturnConfig.cashtabMsgByteLimit
    const pushDataByteCount = 1;
    const prefixByteCount = 4;
    const tokenIdByteCount = 32;
    const localAirdropTxAddedBytes =
        pushDataByteCount +
        tokenIdByteCount +
        pushDataByteCount +
        prefixByteCount; // 38

    const [airdropFlag, setAirdropFlag] = useState<boolean>(false);

    // Typeguard for bip21 multiple outputs parsedAddressInput
    const isBip21MultipleOutputsSafe = (
        parsedAddressInput: CashtabParsedAddressInfo,
    ): parsedAddressInput is {
        address: {
            value: null | string;
            error: false | string;
        };
        parsedAdditionalXecOutputs: {
            value: [string, string][];
            error: false | string;
        };
        amount: { value: string; error: false | string };
    } => {
        return (
            typeof parsedAddressInput !== 'undefined' &&
            typeof parsedAddressInput.parsedAdditionalXecOutputs !==
                'undefined' &&
            typeof parsedAddressInput.parsedAdditionalXecOutputs.value !==
                'undefined' &&
            parsedAddressInput.parsedAdditionalXecOutputs.value !== null &&
            parsedAddressInput.parsedAdditionalXecOutputs.error === false &&
            typeof parsedAddressInput.amount !== 'undefined' &&
            typeof parsedAddressInput.amount.value !== 'undefined' &&
            parsedAddressInput.amount.value !== null
        );
    };

    // Check if this is a BIP21 token send (has token_id, may or may not have token_decimalized_qty)
    const isBip21TokenSendWithTokenId = (
        parsedAddressInput: CashtabParsedAddressInfo,
    ): boolean => {
        return (
            typeof parsedAddressInput !== 'undefined' &&
            typeof parsedAddressInput.address.value === 'string' &&
            parsedAddressInput.address.error === false &&
            typeof parsedAddressInput.token_id !== 'undefined' &&
            typeof parsedAddressInput.token_id.value === 'string' &&
            parsedAddressInput.token_id.error === false
        );
    };

    // Typeguard for a valid bip21 token send tx with token_decimalized_qty
    const isBip21TokenSend = (
        parsedAddressInput: CashtabParsedAddressInfo,
    ): parsedAddressInput is {
        address: {
            value: string;
            error: false;
        };
        token_id: {
            value: string;
            error: false | string;
        };
        token_decimalized_qty: { value: string; error: false | string };
        firma?: { value: string; error: false | string };
    } => {
        return (
            isBip21TokenSendWithTokenId(parsedAddressInput) &&
            typeof parsedAddressInput.token_decimalized_qty !== 'undefined' &&
            typeof parsedAddressInput.token_decimalized_qty.value ===
                'string' &&
            parsedAddressInput.token_decimalized_qty.error === false
        );
    };

    const isBip21TokenSendToMany = (
        parsedAddressInput: CashtabParsedAddressInfo,
    ): parsedAddressInput is {
        address: { value: string; error: false };
        token_id: { value: string; error: false | string };
        token_decimalized_qty: { value: string; error: false | string };
        parsedAdditionalTokenOutputs: {
            value: [string, string][];
            error: false | string;
        };
    } => {
        return (
            isBip21TokenSend(parsedAddressInput) &&
            typeof parsedAddressInput.parsedAdditionalTokenOutputs !==
                'undefined' &&
            parsedAddressInput.parsedAdditionalTokenOutputs.value !== null &&
            parsedAddressInput.parsedAdditionalTokenOutputs.error === false &&
            parsedAddressInput.parsedAdditionalTokenOutputs.value.length > 0
        );
    };

    const getBip21TokenSendToManyRows = (
        parsedAddressInput: CashtabParsedAddressInfo,
    ): Array<{ address: string; decimalizedQty: string }> => {
        if (!isBip21TokenSendToMany(parsedAddressInput)) {
            return [];
        }
        return [
            {
                address: parsedAddressInput.address.value,
                decimalizedQty: parsedAddressInput.token_decimalized_qty.value,
            },
            ...parsedAddressInput.parsedAdditionalTokenOutputs.value.map(
                ([address, decimalizedQty]) => ({
                    address,
                    decimalizedQty,
                }),
            ),
        ];
    };

    const isValidFirmaRedeemTx = (
        parsedAddressInput: CashtabParsedAddressInfo,
    ): parsedAddressInput is {
        address: {
            value: string;
            error: false;
        };
        token_id: {
            value: string;
            error: false;
        };
        token_decimalized_qty: { value: string; error: false };
        firma: { value: string; error: false };
    } => {
        return (
            typeof parsedAddressInput !== 'undefined' &&
            parsedAddressInput.address.value === FIRMA_REDEEM_ADDRESS &&
            parsedAddressInput.address.error === false &&
            typeof parsedAddressInput.token_id !== 'undefined' &&
            parsedAddressInput.token_id.value === FIRMA.tokenId &&
            parsedAddressInput.token_id.error === false &&
            typeof parsedAddressInput.token_decimalized_qty !== 'undefined' &&
            typeof parsedAddressInput.token_decimalized_qty.value ===
                'string' &&
            parsedAddressInput.token_decimalized_qty.error === false &&
            typeof parsedAddressInput.firma !== 'undefined' &&
            parsedAddressInput.firma.error === false &&
            typeof parsedAddressInput.firma.value === 'string' &&
            parsedAddressInput.firma.value.startsWith(
                opReturn.appPrefixesHex.solAddr,
            ) &&
            parsedAddressInput.firma.value.length ===
                FIRMA_REDEEM_EMPP_RAW_LENGTH
        );
    };

    const addTokenToCashtabCache = async (tokenId: string) => {
        let tokenInfo;
        try {
            tokenInfo = await getTokenGenesisInfo(chronik, tokenId);
        } catch (err) {
            console.error(`Error getting token details for ${tokenId}`, err);
            return setTokenIdQueryError(true);
        }
        // If we successfully get tokenInfo, update cashtabCache
        cashtabCache.tokens.set(tokenId, tokenInfo);
        updateCashtabState({ cashtabCache: cashtabCache });
        // Unset in case user is checking a new token that does exist this time
        setTokenIdQueryError(false);
    };

    // Shorthand this calc as well as it is used in multiple spots
    // Note that we must "double cover" some conditions bc typescript doesn't get it
    const bip21MultipleOutputsFormattedTotalSendXec =
        isBip21MultipleOutputsSafe(parsedAddressInput)
            ? parsedAddressInput.parsedAdditionalXecOutputs.value.reduce(
                  (accumulator, addressAmountArray) =>
                      accumulator + parseFloat(addressAmountArray[1]),
                  parseFloat(parsedAddressInput.amount.value),
              )
            : 0;

    const bip21TokenSendToManyRows =
        getBip21TokenSendToManyRows(parsedAddressInput);
    const bip21TokenSendToManyOutputCount = bip21TokenSendToManyRows.length;
    const bip21TokenSendToManyTotal = bip21TokenSendToManyRows.reduce(
        (accumulator, row) => accumulator + parseFloat(row.decimalizedQty),
        0,
    );

    const userLocale = getUserLocale(navigator);

    // Initialize tokens in wallet
    useEffect(() => {
        if (!isTokenMode) {
            return;
        }
        const tokenMapWithBalance: Map<string, ExtendedCashtabCachedTokenInfo> =
            new Map();

        tokens.forEach((tokenBalance: string, tokenId: string) => {
            const cachedToken = cashtabCache.tokens.get(tokenId);
            if (cachedToken) {
                tokenMapWithBalance.set(tokenId, {
                    ...cachedToken,
                    balance: tokenBalance,
                });
            }
        });

        const cacheKeyValueArray: TokenInfoKv[] = [...tokenMapWithBalance];
        const walletTokensKeyValueArray = cacheKeyValueArray.filter(kv =>
            tokens.has(kv[0]),
        );

        walletTokensKeyValueArray.sort(compareSendTokenSelectOrder);

        setTokensInWallet(walletTokensKeyValueArray);
    }, [tokens, isTokenMode, cashtabCache]);

    // Sync Send vs Send Token view from URL (so /send and /send?mode=token work)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setIsTokenMode(params.get('mode') === 'token');
    }, [location.search]);

    // Filter tokens based on search
    useEffect(() => {
        if (!isTokenMode || tokensInWallet.length === 0) {
            setFilteredTokens([]);
            return;
        }
        if (tokenSearch === '') {
            setFilteredTokens(tokensInWallet);
            return;
        }
        const searchString = tokenSearch.toLowerCase();
        const searchFiltered = tokensInWallet.filter(
            kv =>
                kv[1].genesisInfo.tokenName
                    .toLowerCase()
                    .includes(searchString) ||
                kv[1].genesisInfo.tokenTicker
                    .toLowerCase()
                    .includes(searchString),
        );
        setFilteredTokens(searchFiltered);
    }, [tokenSearch, tokensInWallet, isTokenMode]);

    // Validate firma parameter when token info becomes available
    useEffect(() => {
        if (
            !isTokenMode ||
            !selectedTokenId ||
            !isBip21TokenSendWithTokenId(parsedAddressInput) ||
            parsedAddressInput.token_id?.value !== selectedTokenId
        ) {
            return;
        }

        const cachedTokenInfo = cashtabCache.tokens.get(selectedTokenId);
        if (typeof cachedTokenInfo === 'undefined') {
            return;
        }

        const { tokenType } = cachedTokenInfo;
        const { type } = tokenType;

        // Check if firma is present and validate it
        if (
            typeof parsedAddressInput.firma !== 'undefined' &&
            parsedAddressInput.firma.error === false
        ) {
            if (type !== 'ALP_TOKEN_TYPE_STANDARD') {
                setSendAddressError(
                    'Cannot include firma for a token type other than ALP_TOKEN_TYPE_STANDARD',
                );
            } else {
                // Token type is correct, re-validate to get the correct error state
                // This will clear the firma error if it was previously set
                const currentError = parsedAddressInput.address.error;
                setSendAddressError(currentError);
            }
        }
    }, [cashtabCache, selectedTokenId, parsedAddressInput, isTokenMode]);

    const clearInputForms = () => {
        setFormData(emptyFormData);
        setParsedAddressInput(parseAddressInput('', 0));
        // Reset to XEC
        // Note, this ensures we never are in fiat send mode for multi-send
        setSelectedCurrency(appConfig.ticker);
    };

    const _clearTokenInputForms = () => {
        setTokenFormData(emptyTokenFormData);
        setSelectedTokenId(null);
        setTokenSearch('');
        setSendTokenAmountError(false);
        setSendAddressError(false);
        setSendWithCashtabMsgToken(false);
        setSendWithEmppRaw(false);
        setTokenCashtabMsgError(false);
        setEmppRawError(false);
        setTokenAdvancedOpen(false);
        setIsOneToManyTokenSend(false);
        setMultiTokenSendError(false);
    };

    const _clearTokenFormFields = () => {
        // Clear form fields but keep tokenId selected
        setTokenFormData({ ...emptyTokenFormData });
        setSendTokenAmountError(false);
        setSendAddressError(false);
        setSendWithCashtabMsgToken(false);
        setSendWithEmppRaw(false);
        setTokenCashtabMsgError(false);
        setEmppRawError(false);
        setIsOneToManyTokenSend(false);
        setMultiTokenSendError(false);
    };

    const handleTokenSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setTokenSearch(value);
    };

    const handleTokenSelect = (tokenId: string) => {
        setSelectedTokenId(tokenId);
        setTokenSearch('');
        setTokenFormData({ ...emptyTokenFormData });
        setSendTokenAmountError(false);
        setSendAddressError(false);
        setTokenAdvancedOpen(false);
        setIsOneToManyTokenSend(false);
        setMultiTokenSendError(false);
        setSendWithCashtabMsgToken(false);
        setSendWithEmppRaw(false);
        setTokenCashtabMsgError(false);
        setEmppRawError(false);
    };

    const handleTokenAmountChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { value, name } = e.target;
        if (!selectedTokenId) {
            return;
        }
        const tokenBalance = tokens.get(selectedTokenId);
        const cachedToken = cashtabCache.tokens.get(selectedTokenId);
        if (!cachedToken || !tokenBalance) {
            return;
        }
        const { decimals } = cachedToken.genesisInfo;
        const { protocol } = cachedToken.tokenType;
        const formatted = sanitizeAndFormatAmountInput(
            value,
            userLocale,
            decimals,
        );
        const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            formatted,
            tokenBalance,
            decimals as SlpDecimals,
            protocol as 'ALP' | 'SLP',
            userLocale,
        );
        setSendTokenAmountError(
            isValidAmountOrErrorMsg === true ? false : isValidAmountOrErrorMsg,
        );
        setTokenFormData(p => ({
            ...p,
            [name]: formatted,
        }));
    };

    const onTokenMax = () => {
        if (!selectedTokenId) {
            return;
        }
        setSendTokenAmountError(false);
        const tokenBalance = tokens.get(selectedTokenId);
        if (tokenBalance) {
            setTokenFormData({
                ...tokenFormData,
                amount: sanitizeAndFormatAmountInput(tokenBalance, userLocale),
            });
        }
    };

    const sendToken = async () => {
        const isBip21SendToMany = isBip21TokenSendToMany(parsedAddressInput);

        // BIP21 token send excludes send-to-many form mode
        const isBip21Send =
            isBip21TokenSend(parsedAddressInput) &&
            !isOneToManyTokenSend &&
            !isBip21SendToMany;

        let address: string;
        let tokenId: string;
        let decimalizedTokenQty: string;
        let eventName: string;

        if (isBip21Send) {
            // BIP21 token send - use parsedAddressInput
            address = parsedAddressInput.address.value;
            tokenId = parsedAddressInput.token_id.value;
            decimalizedTokenQty =
                parsedAddressInput.token_decimalized_qty.value;
            eventName = 'Bip21 Token Send';
        } else if (isBip21SendToMany) {
            address = '';
            tokenId = parsedAddressInput.token_id.value;
            decimalizedTokenQty = '';
            eventName = 'Bip21 Token Send To Many';
        } else if (isOneToManyTokenSend) {
            if (!selectedTokenId) {
                toast.error('No token selected');
                return;
            }
            address = '';
            tokenId = selectedTokenId;
            decimalizedTokenQty = '';
            eventName = 'Token Send To Many';
        } else {
            // Form-based token send - use tokenFormData and selectedTokenId
            if (!selectedTokenId) {
                toast.error('No token selected');
                return;
            }
            // Extract clean address from tokenFormData.address (may contain BIP21 query string)
            const addressInput = tokenFormData.address;
            address = addressInput.includes('?')
                ? addressInput.split('?')[0]
                : addressInput;
            tokenId = selectedTokenId;
            decimalizedTokenQty = normalizeDecimalInput(
                tokenFormData.amount,
                userLocale,
            );
            eventName = 'Token Send';
        }

        const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
        if (typeof cachedTokenInfo === 'undefined') {
            toast.error('Error: token info not in cache');
            return;
        }

        const { genesisInfo, tokenType } = cachedTokenInfo;
        const { decimals } = genesisInfo;
        const { type, protocol } = tokenType;

        // Check if token type is supported
        if (
            !cashtabSupportedSendTypes.includes(type) ||
            protocol === 'UNKNOWN'
        ) {
            toast.error(
                `Cashtab does not support sending this type of token (${type})`,
            );
            return;
        }

        // Extract firma parameter (from parsedAddressInput for both cases)
        const firma =
            typeof parsedAddressInput.firma?.value !== 'undefined' &&
            parsedAddressInput.firma.error === false
                ? parsedAddressInput.firma.value
                : '';

        // GA event
        Event('SendXec', eventName, tokenId);

        try {
            setIsSending(true);

            if (!ecashWallet) {
                // Typescript does not know the component only renders if ecashWallet is not null
                // We do not expect this to ever happen, prevents ts lint issues
                throw new Error('Wallet not initialized');
            }

            // Build payment.Action for ecash-wallet
            let action: payment.Action;

            if (isBip21SendToMany || isOneToManyTokenSend) {
                const rows = isBip21SendToMany
                    ? getBip21TokenSendToManyRows(parsedAddressInput)
                    : parseTokenMultisendRows(tokenFormData.multiAddressInput);
                action = {
                    outputs: [
                        { sats: 0n },
                        ...rows.map(row => ({
                            sats: BigInt(appConfig.dustSats),
                            script: Script.fromAddress(row.address),
                            tokenId,
                            atoms: BigInt(
                                undecimalizeTokenAmount(
                                    row.decimalizedQty,
                                    decimals as SlpDecimals,
                                ),
                            ),
                        })),
                    ],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId,
                            tokenType: tokenType as unknown as TokenType,
                        },
                    ],
                    feePerKb: BigInt(settings.satsPerKb),
                };
            } else {
                const sendAtoms = BigInt(
                    undecimalizeTokenAmount(
                        decimalizedTokenQty,
                        decimals as SlpDecimals,
                    ),
                );

                action = {
                    outputs: [
                        { sats: 0n },
                        {
                            sats: BigInt(appConfig.dustSats),
                            script: Script.fromAddress(address),
                            tokenId: tokenId,
                            atoms: sendAtoms,
                        },
                    ],
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: tokenId,
                            tokenType: tokenType as unknown as TokenType,
                        },
                    ],
                    feePerKb: BigInt(settings.satsPerKb),
                };
            }

            // Add DataAction for firma if present (ALP only)
            if (
                firma !== '' &&
                type === 'ALP_TOKEN_TYPE_STANDARD' &&
                action.tokenActions
            ) {
                action.tokenActions.push({
                    type: 'DATA',
                    data: fromHex(firma as string),
                });
            }

            // Add EMPP data pushes for ALP tokens (cashtab msg or empp_raw)
            if (type === 'ALP_TOKEN_TYPE_STANDARD' && action.tokenActions) {
                // Add cashtab msg EMPP push if enabled
                if (
                    sendWithCashtabMsgToken &&
                    tokenFormData.tokenCashtabMsg !== '' &&
                    tokenCashtabMsgError === false
                ) {
                    // Create EMPP push: lokad (4 bytes) + UTF-8 encoded message
                    const lokadBytes = fromHex(opReturn.appPrefixesHex.cashtab);
                    const msgBytes = strToBytes(tokenFormData.tokenCashtabMsg);
                    const emppData = new Uint8Array(
                        lokadBytes.length + msgBytes.length,
                    );
                    emppData.set(lokadBytes, 0);
                    emppData.set(msgBytes, lokadBytes.length);

                    action.tokenActions.push({
                        type: 'DATA',
                        data: emppData,
                    });
                }

                // Add empp_raw EMPP push if enabled
                if (
                    sendWithEmppRaw &&
                    tokenFormData.emppRaw !== '' &&
                    emppRawError === false
                ) {
                    action.tokenActions.push({
                        type: 'DATA',
                        data: fromHex(tokenFormData.emppRaw),
                    });
                }
            }

            // Add p2shInputData when input_data_raw is in BIP21 (token mode, SLP or ALP)
            const tokenInputDataRaw =
                typeof parsedAddressInput.input_data_raw !== 'undefined' &&
                parsedAddressInput.input_data_raw.error === false &&
                typeof parsedAddressInput.input_data_raw.value === 'string'
                    ? parsedAddressInput.input_data_raw.value
                    : '';
            const p2shInputData =
                tokenInputDataRaw !== ''
                    ? (() => {
                          const rawBytes = fromHex(tokenInputDataRaw);
                          return {
                              lokad: rawBytes.slice(0, 4),
                              data: rawBytes.slice(4),
                          };
                      })()
                    : undefined;
            if (p2shInputData) {
                action.p2shInputData = p2shInputData;
            }

            // Build and broadcast using ecash-wallet
            const builtAction = ecashWallet.action(action).build();
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize transaction',
                ))
            ) {
                setIsSending(false);
                return;
            }
            const broadcastResult = await builtAction.broadcast();

            if (!broadcastResult.success) {
                throw new Error(
                    `Transaction broadcast failed: ${broadcastResult.errors?.join(', ')}`,
                );
            }

            // Get the first txid (or the only one for single-tx actions)
            const txid = broadcastResult.broadcasted[0];

            confirmRawTx(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {type === 'SLP_TOKEN_TYPE_NFT1_CHILD'
                        ? 'NFT sent'
                        : 'eToken sent'}
                </a>,
            );

            // Handle extension transaction response
            if (isExtensionTransaction) {
                await handleTransactionApproval(txid);
            } else if (txInfoFromUrl) {
                // Show success modal for URL-based transactions
                setSuccessTxid(txid);
                setShowSuccessModal(true);
            }

            // Clear form - use appropriate clear function based on send type
            if (isBip21Send) {
                // For BIP21 token sends, clear the parsed address input but keep tokenId if it was manually selected
                setParsedAddressInput(parseAddressInput('', 0));
                // Clear token form fields but keep tokenId selected
                _clearTokenFormFields();
                // Hide the confirmation modal if it was showing
                setShowConfirmSendModal(false);
            } else {
                // Clear form fields but keep tokenId selected
                _clearTokenFormFields();
            }
            setIsSending(false);
        } catch (e) {
            console.error(
                `Error sending ${
                    type === 'SLP_TOKEN_TYPE_NFT1_CHILD' ? 'NFT' : 'token'
                }`,
                e,
            );
            toast.error(`${e}`);
            setIsSending(false);
        }
    };

    const checkForConfirmationBeforeSendToken = () => {
        if (settings.sendModal) {
            setIsModalVisible(true);
        } else {
            sendToken();
        }
    };

    const handleTokenSendOk = () => {
        setIsModalVisible(false);
        sendToken();
    };

    const checkForConfirmationBeforeSendXec = () => {
        if (settings.sendModal) {
            setIsModalVisible(settings.sendModal);
        } else {
            // if the user does not have the send confirmation enabled in settings then send directly
            send();
        }
    };

    const handleOk = () => {
        setIsModalVisible(false);
        send();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    // Extension transaction handling
    const handleTransactionApproval = async (txid: string) => {
        console.log(
            'Transaction approved, txid:',
            txid,
            'extensionTabId:',
            extensionTabId,
        );

        if (isExtensionTransaction) {
            // For extension transactions, send message to extension
            try {
                const message = {
                    type: 'FROM_CASHTAB',
                    text: 'Cashtab',
                    txResponse: {
                        approved: true,
                        txid: txid,
                    },
                    tabId: extensionTabId,
                };
                console.info(
                    '[Cashtab] Sending txResponse success message:',
                    message,
                );

                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    await chrome.runtime.sendMessage(message);
                }
            } catch (error: unknown) {
                console.error('Failed to send transaction approval:', error);
                console.error('Error details:', {
                    extensionTabId,
                    chromeAvailable: typeof chrome !== 'undefined',
                    chromeRuntimeAvailable:
                        typeof chrome !== 'undefined' && chrome.runtime,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                toast.error('Failed to send transaction approval');
            }
        } else {
            // For non-extension URL-based transactions, just close the window
            console.info(
                '[Cashtab] Non-extension transaction approved, closing window',
            );
        }

        // Show success modal for both extension and URL-based transactions
        if (isExtensionTransaction || txInfoFromUrl) {
            setSuccessTxid(txid);
            setShowSuccessModal(true);
        }
    };

    const handleTransactionRejection = async (
        reason: string = 'User rejected the transaction',
    ) => {
        console.info(
            '[Cashtab] Reject button clicked, extensionTabId:',
            extensionTabId,
        );

        if (isExtensionTransaction) {
            // For extension transactions, send message to extension
            try {
                const message = {
                    type: 'FROM_CASHTAB',
                    text: 'Cashtab',
                    txResponse: {
                        approved: false,
                        reason: reason,
                    },
                    tabId: extensionTabId,
                };
                console.log(
                    '[Cashtab] Sending txReponse rejection message:',
                    message,
                );

                // Use chrome.runtime.sendMessage like address sharing does
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    await chrome.runtime.sendMessage(message);
                    console.log('Message sent via chrome.runtime.sendMessage');
                } else {
                    console.log('Chrome runtime not available');
                }

                console.log(
                    'Rejection message sent successfully, closing window',
                );
            } catch (error: unknown) {
                console.error('Failed to send transaction rejection:', error);
                console.error('Error details:', {
                    extensionTabId,
                    chromeAvailable: typeof chrome !== 'undefined',
                    chromeRuntimeAvailable:
                        typeof chrome !== 'undefined' && chrome.runtime,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                toast.error('Failed to send transaction rejection');
            }
        } else {
            // For non-extension URL-based transactions, close or navigate home
            console.log(
                '[Cashtab] Non-extension transaction rejected, closing or navigating',
            );
            closeOrNavigateFromUrlBasedTransaction();
            return;
        }

        // For extension: close the window
        window.close();
    };

    useEffect(() => {
        // One-shot navigation state (reply / contacts / airdrop). Hash URL parsing runs in `location.search` effect below.

        // if this was routed from Wallet screen's Reply to message link then prepopulate the address and value field
        if (location && location.state && location.state.replyAddress) {
            // Populate a dust tx to the reply address
            setFormData({
                ...formData,
                address: location.state.replyAddress,
                amount: `${toXec(appConfig.dustSats)}`,
            });
            // Turn on the Cashtab Msg switch
            setSendWithCashtabMsg(true);
        }

        // if this was routed from the Contact List
        if (location && location.state && location.state.contactSend) {
            // explicitly trigger the address validation upon navigation from contact list
            handleAddressChange({
                target: {
                    name: 'address',
                    value: location.state.contactSend,
                },
            } as React.ChangeEvent<HTMLInputElement>);
        }

        // if this was routed from the Airdrop screen's Airdrop Calculator then
        // switch to multiple recipient mode and prepopulate the recipients field
        if (
            location &&
            location.state &&
            location.state.airdropRecipients &&
            location.state.airdropTokenId
        ) {
            setIsOneToManyXECSend(true);
            setFormData({
                ...formData,
                multiAddressInput: location.state.airdropRecipients,
                airdropTokenId: location.state.airdropTokenId,
                cashtabMsg: '',
            });

            // validate the airdrop outputs from the calculator
            handleMultiAddressChange({
                target: {
                    value: location.state.airdropRecipients,
                },
            } as React.ChangeEvent<HTMLTextAreaElement>);

            setAirdropFlag(true);
        }
    }, []);

    // Hash-route tx params (BIP21 / legacy) and re-parse when the route query changes
    // (e.g. a new deep link while the Send screen instance stays mounted).
    useEffect(() => {
        const { hasQuerySegment, flagUrlBasedTransaction, txApply } =
            parseCashtabTxInfoFromSendHash(window.location.hash);
        if (!hasQuerySegment) {
            return;
        }
        if (flagUrlBasedTransaction) {
            setIsUrlBasedTransaction(true);
        }
        if (!txApply) {
            return;
        }
        setTxInfoFromUrl(txApply.txInfo);
        const tabId = txApply.extensionTabId;
        if (tabId) {
            setIsExtensionTransaction(true);
            setExtensionTabId(parseInt(tabId));
        }
    }, [location.search]);

    useEffect(() => {
        if (txInfoFromUrl === false) {
            return;
        }
        if (txInfoFromUrl.parseAllAsBip21) {
            // Strip tabId from BIP21 URI before entering into address field
            let bip21Uri = txInfoFromUrl.bip21;
            if (!bip21Uri) {
                return;
            }
            if (bip21Uri.includes('&tabId=')) {
                bip21Uri = bip21Uri.replace(/&tabId=\d+/, '');
            }

            // Parse the BIP21 URI to check if it contains token_id
            const parsedAddressInput = parseAddressInput(
                bip21Uri,
                balanceSats,
                userLocale,
            );

            // Check if this is a BIP21 token send (with or without token_decimalized_qty)
            if (isBip21TokenSendWithTokenId(parsedAddressInput)) {
                // This is a BIP21 token send
                // Switch to token mode
                setIsTokenMode(true);

                // Select the tokenId
                const tokenId = parsedAddressInput.token_id?.value;
                if (tokenId) {
                    setSelectedTokenId(tokenId);

                    // Add token to cache if not already cached
                    if (
                        typeof cashtabCache.tokens.get(tokenId) === 'undefined'
                    ) {
                        addTokenToCashtabCache(tokenId);
                    }
                }

                // Parse and set firma if it's in the query string
                if (
                    typeof parsedAddressInput.firma !== 'undefined' &&
                    typeof parsedAddressInput.firma.value === 'string' &&
                    parsedAddressInput.firma.error === false
                ) {
                    // If firma is valid, set it
                    setParsedFirma(parseFirma(parsedAddressInput.firma.value));
                }

                // Put the BIP21 string into the token address input and validate
                handleTokenModeAddressChange(
                    {
                        target: {
                            name: 'address',
                            value: bip21Uri || '',
                        },
                    } as React.ChangeEvent<HTMLInputElement>,
                    parsedAddressInput,
                );
            } else {
                // Regular BIP21 XEC send
                handleAddressChange({
                    target: {
                        name: 'address',
                        value: bip21Uri,
                    },
                } as React.ChangeEvent<HTMLInputElement>);
                const xecBip21Parsed = parseAddressInput(
                    bip21Uri,
                    balanceSats,
                    userLocale,
                );
                if (
                    typeof xecBip21Parsed.op_return_raw !== 'undefined' &&
                    typeof xecBip21Parsed.op_return_raw.value === 'string'
                ) {
                    setAdvancedOpen(true);
                }
            }
        } else {
            // Enter address into input field and trigger handleAddressChange for validation
            handleAddressChange({
                target: {
                    name: 'address',
                    value: txInfoFromUrl.address,
                },
            } as React.ChangeEvent<HTMLInputElement>);
            if (
                typeof txInfoFromUrl.value !== 'undefined' &&
                !Number.isNaN(parseFloat(txInfoFromUrl.value))
            ) {
                // Only update the amount field if txInfo.value is a good input
                // Sometimes we want this field to be adjusted by the user, e.g. a donation amount

                // Do not populate the field if the value param is not parseable as a number
                // the strings 'undefined' and 'null', which PayButton passes to signify 'no amount', fail this test

                // TODO deprecate this support once PayButton and cashtab-components do not require it
                handleAmountChange({
                    target: {
                        name: 'amount',
                        value: txInfoFromUrl.value,
                    },
                } as React.ChangeEvent<HTMLInputElement>);
            }
        }
        // We re-run this when balanceSats changes because validation of send amounts depends on balanceSats
    }, [txInfoFromUrl, balanceSats, userLocale]);

    interface XecSendError {
        error?: string;
        message?: string;
    }
    function handleSendXecError(errorObj: XecSendError) {
        let message;
        if (
            errorObj.error &&
            errorObj.error.includes(
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 50] (code 64)',
            )
        ) {
            message = `The ${appConfig.ticker} you are trying to send has too many unconfirmed ancestors to send (limit 50). Sending will be possible after a block confirmation. Try again in about 10 minutes.`;
        } else {
            message =
                errorObj.message || errorObj.error || JSON.stringify(errorObj);
        }

        toast.error(`${message}`);
    }

    const checkForConfirmationBeforeBip21TokenSend = () => {
        if (settings.sendModal) {
            setShowConfirmSendModal(true);
        } else {
            // if the user does not have the send confirmation enabled in settings then send directly
            sendToken();
        }
    };

    async function send() {
        setIsSending(true);
        setFormData({
            ...formData,
        });

        // Initialize targetOutputs for this tx
        let targetOutputs = [];

        let isPaybutton = false;

        // If you have an OP_RETURN output, add it at index 0
        // Aesthetic choice, easier to see when checking on block explorer

        if (airdropFlag) {
            // Airdrop txs require special OP_RETURN handling
            targetOutputs.push(
                getAirdropTargetOutput(
                    formData.airdropTokenId,
                    formData.cashtabMsg,
                ),
            );
        } else if (sendWithCashtabMsg && formData.cashtabMsg !== '') {
            // Send this tx with a Cashtab msg if the user has the switch enabled and the input field is not empty
            targetOutputs.push(getCashtabMsgTargetOutput(formData.cashtabMsg));
        } else if (formData.opReturnRaw !== '' && opReturnRawError === false) {
            targetOutputs.push(
                getOpreturnParamTargetOutput(formData.opReturnRaw),
            );
            const parsed = parseOpReturnRaw(formData.opReturnRaw);
            console.log(
                'Sending XEC with OP_RETURN raw:',
                formData.opReturnRaw,
            );
            isPaybutton = parsed.protocol === 'PayButton';
        }

        if (isOneToManyXECSend) {
            // Handle XEC send to multiple addresses
            targetOutputs = targetOutputs.concat(
                getMultisendTargetOutputs(formData.multiAddressInput),
            );

            Event('Send.js', 'SendToMany', selectedCurrency);
        } else {
            // Handle XEC send to one address
            const cleanAddress = formData.address.split('?')[0];

            const normalizedSendAmount = normalizeDecimalInput(
                formData.amount,
                userLocale,
            );
            const satoshisToSend =
                selectedCurrency === appConfig.ticker
                    ? toSatoshis(parseFloat(normalizedSendAmount))
                    : fiatToSatoshis(normalizedSendAmount, fiatPrice as number);

            targetOutputs.push({
                script: Script.fromAddress(cleanAddress),
                sats: BigInt(satoshisToSend),
            });

            if (isBip21MultipleOutputsSafe(parsedAddressInput)) {
                parsedAddressInput.parsedAdditionalXecOutputs.value.forEach(
                    ([addr, amount]) => {
                        targetOutputs.push({
                            script: Script.fromAddress(addr),
                            sats: BigInt(toSatoshis(parseFloat(amount))),
                        });
                    },
                );
                Event('Send.js', 'SendToMany', selectedCurrency);
            } else {
                Event('Send.js', 'Send', selectedCurrency);
            }
        }

        // Send and notify
        try {
            if (!ecashWallet) {
                // Typescript does not know the component only renders if ecashWallet is not null
                // We do not expect this to ever happen, prevents ts lint issues
                throw new Error('Wallet not initialized');
            }

            // Convert targetOutputs to payment.Action format
            const action: payment.Action = {
                outputs: targetOutputs,
                feePerKb: BigInt(settings.satsPerKb),
            };

            // Add p2shInputData when input_data_raw is in BIP21 (XEC mode)
            const inputDataRaw =
                typeof parsedAddressInput.input_data_raw !== 'undefined' &&
                parsedAddressInput.input_data_raw.error === false &&
                typeof parsedAddressInput.input_data_raw.value === 'string'
                    ? parsedAddressInput.input_data_raw.value
                    : '';
            if (inputDataRaw !== '') {
                const rawBytes = fromHex(inputDataRaw);
                action.p2shInputData = {
                    lokad: rawBytes.slice(0, 4),
                    data: rawBytes.slice(4),
                };
            }

            // Build and broadcast using ecash-wallet
            // Split steps so we can get rawtx if we need to rebroadcast for paybutton
            const builtAction = ecashWallet.action(action).build();
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize transaction',
                ))
            ) {
                setIsSending(false);
                return;
            }
            const broadcastResult = await builtAction.broadcast();

            if (!broadcastResult.success) {
                throw new Error(
                    `Transaction broadcast failed: ${broadcastResult.errors?.join(', ')}`,
                );
            }

            // Handle PayButton broadcast if needed
            if (isPaybutton === true && builtAction.txs.length > 0) {
                try {
                    const paybuttonChronik = new ChronikClient([
                        'https://xec.paybutton.io',
                    ]);
                    // We don't care about the result, it's a best effort to lower
                    // the tx relay time
                    // Broadcast the first tx to PayButton node
                    const txHex = builtAction.txs[0].toHex();
                    await paybuttonChronik.broadcastTx(txHex, false);
                } catch (err) {
                    console.log(
                        'Error broadcasting to paybutton node (ignored): ',
                        err,
                    );
                }
            }

            // Get the first txid (or the only one for single-tx actions)
            const txid = broadcastResult.broadcasted[0];

            confirmRawTx(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    eCash sent
                </a>,
            );

            clearInputForms();
            setAirdropFlag(false);
            setIsSending(false);

            // Handle extension transaction response
            if (isExtensionTransaction) {
                await handleTransactionApproval(txid);
            } else if (txInfoFromUrl) {
                // Show success modal for URL-based transactions
                setSuccessTxid(txid);
                setShowSuccessModal(true);
            }
        } catch (err) {
            handleSendXecError(err as XecSendError);
            setIsSending(false);
        }
    }

    const handleTokenModeAddressChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        parsedAddressInput: CashtabParsedAddressInfo,
    ) => {
        if (tokenIdQueryError) {
            // Clear tokenIdQueryError if we have one
            setTokenIdQueryError(false);
        }
        const { value, name } = e.target;

        // Set in state as various param outputs determine app rendering
        setParsedAddressInput(parsedAddressInput);

        let tokenRenderedError = parsedAddressInput.address.error;

        // Check if this is a BIP21 string (has queryString)
        const hasQueryString = 'queryString' in parsedAddressInput;

        // Check if this is a BIP21 token send (has token_id parameter)
        const isBip21TokenSendInTokenMode =
            isBip21TokenSendWithTokenId(parsedAddressInput);

        // If BIP21 string but no token_id, show error
        if (hasQueryString && !isBip21TokenSendInTokenMode) {
            tokenRenderedError =
                'bip21 token txs must include a token_id param';
        } else if (
            hasQueryString &&
            typeof parsedAddressInput.queryString !== 'undefined'
        ) {
            // Handle query string errors
            if (typeof parsedAddressInput.queryString.error === 'string') {
                tokenRenderedError = parsedAddressInput.queryString.error;
            }
        }

        // Handle token-specific validation errors
        if (
            tokenRenderedError === false &&
            typeof parsedAddressInput.token_decimalized_qty !== 'undefined' &&
            parsedAddressInput.token_decimalized_qty.error !== false
        ) {
            tokenRenderedError = parsedAddressInput.token_decimalized_qty.error;
        }
        if (
            tokenRenderedError === false &&
            typeof parsedAddressInput.firma !== 'undefined' &&
            parsedAddressInput.firma.error !== false
        ) {
            tokenRenderedError = parsedAddressInput.firma.error;
        }
        if (
            tokenRenderedError === false &&
            typeof parsedAddressInput.empp_raw !== 'undefined' &&
            parsedAddressInput.empp_raw.error !== false
        ) {
            tokenRenderedError = parsedAddressInput.empp_raw.error;
        }
        if (
            tokenRenderedError === false &&
            typeof parsedAddressInput.input_data_raw !== 'undefined' &&
            parsedAddressInput.input_data_raw.error !== false
        ) {
            tokenRenderedError = parsedAddressInput.input_data_raw.error;
        }
        if (
            tokenRenderedError === false &&
            typeof parsedAddressInput.parsedAdditionalTokenOutputs !==
                'undefined' &&
            parsedAddressInput.parsedAdditionalTokenOutputs.error !== false
        ) {
            tokenRenderedError =
                parsedAddressInput.parsedAdditionalTokenOutputs.error;
        }

        // Parse and set firma if it's in the query string
        if (
            typeof parsedAddressInput.firma !== 'undefined' &&
            typeof parsedAddressInput.firma.value === 'string' &&
            parsedAddressInput.firma.error === false
        ) {
            // If firma is valid, set it
            setParsedFirma(parseFirma(parsedAddressInput.firma.value));
        }

        // Parse and set empp_raw if it's in the query string
        if (
            typeof parsedAddressInput.empp_raw !== 'undefined' &&
            typeof parsedAddressInput.empp_raw.value === 'string' &&
            parsedAddressInput.empp_raw.error === false
        ) {
            // Turn on sendWithEmppRaw
            setSendWithEmppRaw(true);
            // Update the empp_raw field and trigger its validation
            handleEmppRawInput({
                target: {
                    name: 'emppRaw',
                    value: parsedAddressInput.empp_raw.value,
                },
            } as React.ChangeEvent<HTMLTextAreaElement>);
        }

        // input_data_raw is parsed from BIP21 only, no manual set needed

        if (
            tokenRenderedError === false &&
            typeof parsedAddressInput.token_id !== 'undefined'
        ) {
            if (parsedAddressInput.token_id.error !== false) {
                tokenRenderedError = parsedAddressInput.token_id.error;
            } else if (
                isBip21TokenSendInTokenMode &&
                parsedAddressInput.token_id.value
            ) {
                // This is a BIP21 token send in token mode
                const tokenId = parsedAddressInput.token_id.value;

                // Select the tokenId if it's not already selected
                if (selectedTokenId !== tokenId) {
                    setSelectedTokenId(tokenId);
                }

                // Add token to cache if not already cached
                if (typeof cashtabCache.tokens.get(tokenId) === 'undefined') {
                    addTokenToCashtabCache(tokenId);
                } else {
                    // Token info is already cached, validate firma and empp_raw parameters
                    const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
                    if (typeof cachedTokenInfo !== 'undefined') {
                        const { tokenType } = cachedTokenInfo;
                        const { type } = tokenType;

                        // Validate firma parameter
                        if (
                            typeof parsedAddressInput.firma !== 'undefined' &&
                            parsedAddressInput.firma.error === false
                        ) {
                            if (type !== 'ALP_TOKEN_TYPE_STANDARD') {
                                tokenRenderedError =
                                    'Cannot include firma for a token type other than ALP_TOKEN_TYPE_STANDARD';
                            }
                        }
                        // Note: empp_raw validation is handled in useEffect when token info becomes available
                    }
                }
            }
        }

        // Set token amount from token_decimalized_qty if present and valid
        if (
            tokenRenderedError === false &&
            typeof parsedAddressInput.token_decimalized_qty !== 'undefined' &&
            typeof parsedAddressInput.token_decimalized_qty.value ===
                'string' &&
            parsedAddressInput.token_decimalized_qty.value !== null &&
            parsedAddressInput.token_decimalized_qty.error === false
        ) {
            const tokenQty = parsedAddressInput.token_decimalized_qty.value;
            setTokenFormData(p => ({
                ...p,
                amount: sanitizeAndFormatAmountInput(tokenQty, userLocale),
            }));
        }

        // Handle regular address validation (non-BIP21)
        if (
            tokenRenderedError === false &&
            !hasQueryString &&
            parsedAddressInput.address.error &&
            typeof parsedAddressInput.address.value === 'string' &&
            isValidCashAddress(parsedAddressInput.address.value, 'etoken')
        ) {
            tokenRenderedError = false;
        } else if (
            tokenRenderedError === false &&
            !hasQueryString &&
            typeof parsedAddressInput.address.value === 'string' &&
            isValidCashAddress(
                parsedAddressInput.address.value,
                appConfig.prefix,
            )
        ) {
            tokenRenderedError = false;
        }

        setSendAddressError(tokenRenderedError);
        const bip21TokenSendToManyRows = hasQueryString
            ? getBip21TokenSendToManyRows(parsedAddressInput)
            : [];
        const hasBip21TokenSendToMany = bip21TokenSendToManyRows.length > 0;

        if (hasQueryString) {
            setIsOneToManyTokenSend(hasBip21TokenSendToMany);
            setMultiTokenSendError(false);
        }

        const tokenSendToManyCsv = hasBip21TokenSendToMany
            ? bip21TokenSendToManyRows
                  .map(
                      ({ address, decimalizedQty }) =>
                          `${address},${decimalizedQty}`,
                  )
                  .join('\n')
            : '';
        setTokenFormData(p => ({
            ...p,
            [name]: value,
            ...(hasQueryString
                ? { multiAddressInput: tokenSendToManyCsv }
                : {}),
        }));
    };

    const handleAddressChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        if (tokenIdQueryError) {
            // Clear tokenIdQueryError if we have one
            setTokenIdQueryError(false);
        }
        const { value, name } = e.target;
        const parsedAddressInput = parseAddressInput(
            value,
            balanceSats,
            userLocale,
        );

        // Set in state as various param outputs determine app rendering
        // For example, a valid amount param should disable user amount input
        setParsedAddressInput(parsedAddressInput);

        let renderedSendToError = parsedAddressInput.address.error;
        if (
            typeof parsedAddressInput.queryString !== 'undefined' &&
            typeof parsedAddressInput.queryString.error === 'string'
        ) {
            // If you have a bad queryString, this should be the rendered error
            renderedSendToError = parsedAddressInput.queryString.error;
        }

        // Handle errors in op_return_raw as an address error if no other error is set
        if (
            renderedSendToError === false &&
            typeof parsedAddressInput.op_return_raw !== 'undefined' &&
            typeof parsedAddressInput.op_return_raw.error === 'string'
        ) {
            renderedSendToError = parsedAddressInput.op_return_raw.error;
        }

        // Handle errors in empp_raw as an address error if no other error is set
        if (
            renderedSendToError === false &&
            typeof parsedAddressInput.empp_raw !== 'undefined' &&
            typeof parsedAddressInput.empp_raw.error === 'string'
        ) {
            renderedSendToError = parsedAddressInput.empp_raw.error;
        }

        // Handle errors in input_data_raw as an address error if no other error is set
        if (
            renderedSendToError === false &&
            typeof parsedAddressInput.input_data_raw !== 'undefined' &&
            typeof parsedAddressInput.input_data_raw.error === 'string'
        ) {
            renderedSendToError = parsedAddressInput.input_data_raw.error;
        }

        // Handle errors in secondary addr&amount params
        if (
            renderedSendToError === false &&
            typeof parsedAddressInput.parsedAdditionalXecOutputs !==
                'undefined' &&
            typeof parsedAddressInput.parsedAdditionalXecOutputs.error ===
                'string'
        ) {
            renderedSendToError =
                parsedAddressInput.parsedAdditionalXecOutputs.error;
        }

        // Handle bip21 token errors
        if (
            renderedSendToError === false &&
            typeof parsedAddressInput.token_decimalized_qty !== 'undefined' &&
            parsedAddressInput.token_decimalized_qty.error !== false
        ) {
            // If we have an invalid token_decimalized_qty but a good bip21 query string
            renderedSendToError =
                parsedAddressInput.token_decimalized_qty.error;
        }
        if (
            renderedSendToError === false &&
            typeof parsedAddressInput.firma !== 'undefined' &&
            parsedAddressInput.firma.error !== false
        ) {
            // If we have an invalid firma but a good bip21 query string
            renderedSendToError = parsedAddressInput.firma.error;
        }
        if (
            renderedSendToError === false &&
            typeof parsedAddressInput.token_id !== 'undefined'
        ) {
            if (parsedAddressInput.token_id.error !== false) {
                // If we have an invalid token id but a good bip21 query string
                renderedSendToError = parsedAddressInput.token_id.error;
            } else {
                // We have valid token send bip21 and no error
                if (typeof parsedAddressInput.token_id.value === 'string') {
                    // Should always be true if we have error false here
                    // get and cache token info if we have a valid token ID and no renderedSendToError
                    addTokenToCashtabCache(parsedAddressInput.token_id.value);
                }
            }
        }

        setSendAddressError(renderedSendToError);

        // Set address field to user input
        if (isTokenMode) {
            // In token mode, use the dedicated handler
            handleTokenModeAddressChange(e, parsedAddressInput);
            return;
        }

        // If scanning from XEC mode and BIP21 string has token_id, switch to token mode
        // handleTokenModeAddressChange will handle token selection, caching, and firma parsing
        if (isBip21TokenSendWithTokenId(parsedAddressInput)) {
            setIsTokenMode(true);
            handleTokenModeAddressChange(e, parsedAddressInput);
            return;
        }

        // For XEC mode, continue with BIP21 parsing
        if (typeof parsedAddressInput.amount !== 'undefined') {
            // Set currency to non-fiat
            setSelectedCurrency(appConfig.ticker);

            // Use this object to mimic user input and get validation for the value
            const amountObj = {
                target: {
                    name: 'amount',
                    value: parsedAddressInput.amount.value,
                },
            };
            handleAmountChange(
                amountObj as React.ChangeEvent<HTMLInputElement>,
            );
        }

        // Set op_return_raw if it's in the query string
        if (typeof parsedAddressInput.op_return_raw !== 'undefined') {
            // In general, we want to show the op_return_raw value even if there is an error,
            // so the user can see what it is
            // However in some cases, like duplicate op_return_raw, we do not even have a value to show
            // So, only render if we have a renderable value
            if (typeof parsedAddressInput.op_return_raw.value === 'string') {
                // Turn on sendWithOpReturnRaw
                setSendWithOpReturnRaw(true);
                // Update the op_return_raw field and trigger its validation
                handleOpReturnRawInput({
                    target: {
                        name: 'opReturnRaw',
                        value: parsedAddressInput.op_return_raw.value,
                    },
                } as React.ChangeEvent<HTMLTextAreaElement>);
            }
        }

        // Set empp_raw if it's in the query string (for token mode)
        if (typeof parsedAddressInput.empp_raw !== 'undefined') {
            // In general, we want to show the empp_raw value even if there is an error,
            // so the user can see what it is
            // However in some cases, like duplicate empp_raw, we do not even have a value to show
            // So, only render if we have a renderable value
            if (typeof parsedAddressInput.empp_raw.value === 'string') {
                // Turn on sendWithEmppRaw
                setSendWithEmppRaw(true);
                // Update the empp_raw field and trigger its validation
                handleEmppRawInput({
                    target: {
                        name: 'emppRaw',
                        value: parsedAddressInput.empp_raw.value,
                    },
                } as React.ChangeEvent<HTMLTextAreaElement>);
            }
        }

        // input_data_raw is parsed from BIP21 only, no manual set needed

        // Set firma if it's in the query string
        if (typeof parsedAddressInput.firma !== 'undefined') {
            if (
                typeof parsedAddressInput.firma.value === 'string' &&
                parsedAddressInput.firma.error === false
            ) {
                // If firma is valid, set it
                setParsedFirma(parseFirma(parsedAddressInput.firma.value));
            }
        }

        // Set address field to user input
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleMultiAddressChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const { value, name } = e.target;
        const errorOrIsValid = isValidMultiSendUserInput(
            value,
            balanceSats,
            userLocale,
        );

        // If you get an error msg, set it. If validation is good, clear error msg.
        setMultiSendAddressError(
            typeof errorOrIsValid === 'string' ? errorOrIsValid : false,
        );

        // Set address field to user input
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleTokenMultiAddressChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const { value, name } = e.target;
        if (!selectedTokenId) {
            return;
        }
        const tokenBalance = tokens.get(selectedTokenId);
        const cachedToken = cashtabCache.tokens.get(selectedTokenId);
        if (!cachedToken || typeof tokenBalance === 'undefined') {
            return;
        }
        const { decimals } = cachedToken.genesisInfo;
        const { protocol } = cachedToken.tokenType;
        const errorOrIsValid = isValidTokenMultiSendUserInput(
            value,
            tokenBalance,
            decimals as SlpDecimals,
            protocol as 'ALP' | 'SLP',
            userLocale,
        );
        setMultiTokenSendError(
            typeof errorOrIsValid === 'string' ? errorOrIsValid : false,
        );
        setTokenFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleSelectedCurrencyChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setSelectedCurrency(e.target.value);
        // Clear input field to prevent accidentally sending 1 XEC instead of 1 USD
        setFormData(p => ({
            ...p,
            amount: '',
        }));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, name } = e.target;
        // Format here so bip21/max programmatic sets (bypass SendXecInput) are
        // locale-formatted; already-formatted input values are idempotent.
        const formatted = sanitizeAndFormatAmountInput(
            String(value),
            userLocale,
            selectedCurrency === appConfig.ticker
                ? appConfig.cashDecimals
                : undefined,
        );

        // Validate user input send amount
        const isValidAmountOrErrorMsg = isValidXecSendAmount(
            formatted,
            balanceSats,
            userLocale,
            selectedCurrency,
            fiatPrice as number,
        );

        setSendAmountError(
            isValidAmountOrErrorMsg !== true ? isValidAmountOrErrorMsg : false,
        );

        setFormData(p => ({
            ...p,
            [name]: formatted,
        }));
    };

    const handleOpReturnRawInput = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        // Validate input
        const error = getOpReturnRawError(value);
        setOpReturnRawError(error);
        // Update formdata
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
        // Update parsedOpReturn if we have no opReturnRawError
        if (error === false) {
            // Need to gate this for no error as parseOpReturnRaw expects a validated op_return_raw
            setParsedOpReturnRaw(parseOpReturnRaw(value));
        }
    };

    const handleCashtabMsgChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        let cashtabMsgError: false | string = false;
        const msgByteSize = getCashtabMsgByteCount(value);

        const maxSize =
            location && location.state && location.state.airdropTokenId
                ? opreturnConfig.cashtabMsgByteLimit - localAirdropTxAddedBytes
                : opreturnConfig.cashtabMsgByteLimit;
        if (msgByteSize > maxSize) {
            cashtabMsgError = `Message can not exceed ${maxSize} bytes`;
        }
        setCashtabMsgError(cashtabMsgError);
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleAdvancedHeaderClick = () => {
        if (advancedOpen && txInfoFromUrl === false) {
            const rehydrateOpReturnFromBip21 =
                !isTokenMode &&
                typeof parsedAddressInput.op_return_raw !== 'undefined' &&
                typeof parsedAddressInput.op_return_raw.value === 'string'
                    ? parsedAddressInput.op_return_raw.value
                    : '';

            setIsOneToManyXECSend(false);
            setSendWithCashtabMsg(false);
            setSendWithOpReturnRaw(rehydrateOpReturnFromBip21 !== '');
            setAirdropFlag(false);
            setFormData(p => ({
                ...p,
                multiAddressInput: '',
                cashtabMsg: '',
                opReturnRaw: rehydrateOpReturnFromBip21,
            }));
            setMultiSendAddressError(false);
            setCashtabMsgError(false);

            if (rehydrateOpReturnFromBip21 !== '') {
                const error = getOpReturnRawError(rehydrateOpReturnFromBip21);
                setOpReturnRawError(error);
                if (error === false) {
                    setParsedOpReturnRaw(
                        parseOpReturnRaw(rehydrateOpReturnFromBip21),
                    );
                } else {
                    setParsedOpReturnRaw({ protocol: '', data: '' });
                }
            } else {
                setOpReturnRawError(false);
                setParsedOpReturnRaw({ protocol: '', data: '' });
            }
        }
        setAdvancedOpen(prev => !prev);
    };

    /**
     * Toggles the token-send Advanced section open/closed.
     * When collapsing Advanced while the screen is not driven by a URL tx (`txInfoFromUrl === false`),
     * resets advanced-only state: turns off send-to-many and Cashtab msg, clears the multi-send
     * textarea and token Cashtab msg, and either re-applies `empp_raw` from parsed BIP21 input
     * (if present and valid) or clears empp toggles and fields.
     */
    const handleTokenAdvancedHeaderClick = () => {
        if (tokenAdvancedOpen && txInfoFromUrl === false) {
            const rehydrateEmppFromBip21 =
                typeof parsedAddressInput.empp_raw !== 'undefined' &&
                typeof parsedAddressInput.empp_raw.value === 'string' &&
                parsedAddressInput.empp_raw.error === false
                    ? parsedAddressInput.empp_raw.value
                    : '';

            setIsOneToManyTokenSend(false);
            setSendWithCashtabMsgToken(false);
            setMultiTokenSendError(false);
            setTokenCashtabMsgError(false);
            setTokenFormData(p => ({
                ...p,
                multiAddressInput: '',
                tokenCashtabMsg: '',
            }));

            if (rehydrateEmppFromBip21 !== '') {
                setSendWithEmppRaw(true);
                handleEmppRawInput({
                    target: {
                        name: 'emppRaw',
                        value: rehydrateEmppFromBip21,
                    },
                } as React.ChangeEvent<HTMLTextAreaElement>);
            } else {
                setSendWithEmppRaw(false);
                setEmppRawError(false);
                setParsedEmppRaw({ protocol: '', data: '' });
                setTokenFormData(p => ({
                    ...p,
                    emppRaw: '',
                }));
            }
        }
        setTokenAdvancedOpen(prev => !prev);
    };

    const handleTokenCashtabMsgChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        let tokenCashtabMsgError: false | string = false;

        // For EMPP cashtab msg: user can input up to 100 bytes
        // Total will be 104 bytes (100 user input + 4 byte lokad)
        const msgBytes = strToBytes(value).length;
        const maxBytes = 100;

        if (msgBytes > maxBytes) {
            tokenCashtabMsgError = `Message can not exceed ${maxBytes} bytes`;
        }

        setTokenCashtabMsgError(tokenCashtabMsgError);
        setTokenFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleEmppRawInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let emppRawError: false | string = false;

        // Remove whitespace from hex string
        const cleanHex = value.replace(/\s/g, '');

        // Validate hex format
        if (cleanHex !== '' && !/^[0-9a-fA-F]*$/.test(cleanHex)) {
            emppRawError = 'Invalid hex format';
        } else {
            // Validate byte length (each 2 hex chars = 1 byte)
            const byteLength = cleanHex.length / 2;
            const maxBytes = 100;

            if (byteLength > maxBytes) {
                emppRawError = `EMPP raw can not exceed ${maxBytes} bytes`;
            } else if (cleanHex.length % 2 !== 0) {
                emppRawError = 'Hex string must have even number of characters';
            }
        }

        setEmppRawError(emppRawError);
        setTokenFormData(p => ({
            ...p,
            [name]: cleanHex,
        }));
        // Update parsedEmppRaw if we have no emppRawError
        if (emppRawError === false && cleanHex !== '') {
            // Need to gate this for no error as parseEmppRaw expects a validated empp_raw
            setParsedEmppRaw(parseEmppRaw(cleanHex));
        }
    };

    const onMax = () => {
        // Clear amt error
        setSendAmountError(false);

        // Set currency to XEC
        setSelectedCurrency(appConfig.ticker);

        // Account for CashtabMsg if it is set
        const intendedTargetOutputs =
            sendWithCashtabMsg && formData.cashtabMsg !== ''
                ? [getCashtabMsgTargetOutput(formData.cashtabMsg)]
                : [];

        // Build a tx sending all non-token utxos
        // Determine the amount being sent (outputs less fee)
        // Use ecash-wallet's maxSendSats() method which accounts for fees
        const maxSendSats = ecashWallet.maxSendSats(
            intendedTargetOutputs,
            BigInt(settings.satsPerKb),
        );
        const maxSendSatoshis = Number(maxSendSats);

        // Convert to XEC to set in form
        const maxSendXec = toXec(maxSendSatoshis);

        // Update value in the send field
        // Note, if we are updating it to 0, we will get a 'dust' error
        handleAmountChange({
            target: {
                name: 'amount',
                value: maxSendXec,
            },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
    };
    // Display price in USD below input field for send amount, if it can be calculated
    let fiatPriceString = '';
    let multiSendTotal =
        typeof formData.multiAddressInput === 'string'
            ? sumOneToManyXec(formData.multiAddressInput.split('\n'))
            : 0;
    if (isNaN(multiSendTotal)) {
        multiSendTotal = 0;
    }
    const normalizedFormAmount = normalizeDecimalInput(
        formData.amount,
        userLocale,
    );
    if (fiatPrice !== null && !isNaN(parseFloat(normalizedFormAmount))) {
        if (selectedCurrency === appConfig.ticker) {
            // insert symbol and currency before/after the locale formatted fiat balance
            fiatPriceString = isOneToManyXECSend
                ? `${
                      settings
                          ? `${
                                supportedFiatCurrencies[settings.fiatCurrency]
                                    .symbol
                            } `
                          : '$ '
                  } ${(fiatPrice * multiSendTotal).toLocaleString(userLocale, {
                      minimumFractionDigits: appConfig.cashDecimals,
                      maximumFractionDigits: appConfig.cashDecimals,
                  })} ${
                      settings && settings.fiatCurrency
                          ? settings.fiatCurrency.toUpperCase()
                          : 'USD'
                  }`
                : `${
                      settings
                          ? `${
                                supportedFiatCurrencies[settings.fiatCurrency]
                                    .symbol
                            } `
                          : '$ '
                  } ${
                      isBip21MultipleOutputsSafe(parsedAddressInput)
                          ? `${(
                                fiatPrice *
                                bip21MultipleOutputsFormattedTotalSendXec
                            ).toLocaleString(userLocale, {
                                minimumFractionDigits: appConfig.cashDecimals,
                                maximumFractionDigits: appConfig.cashDecimals,
                            })}`
                          : `${(
                                fiatPrice * parseFloat(normalizedFormAmount)
                            ).toLocaleString(userLocale, {
                                minimumFractionDigits: appConfig.cashDecimals,
                                maximumFractionDigits: appConfig.cashDecimals,
                            })}`
                  } ${
                      settings && settings.fiatCurrency
                          ? settings.fiatCurrency.toUpperCase()
                          : 'USD'
                  }`;
        } else {
            fiatPriceString = `${
                formData.amount !== '0'
                    ? formatFiatBalance(
                          toXec(
                              fiatToSatoshis(normalizedFormAmount, fiatPrice),
                          ),
                          userLocale,
                      )
                    : formatFiatBalance(0, userLocale)
            } ${appConfig.ticker}`;
        }
    } else if (
        fiatPrice !== null &&
        selectedCurrency === appConfig.ticker &&
        !isOneToManyXECSend &&
        !isBip21MultipleOutputsSafe(parsedAddressInput)
    ) {
        // Show 0 fiat when amount is empty so amount preview always shows something
        fiatPriceString = `${
            settings
                ? `${supportedFiatCurrencies[settings.fiatCurrency].symbol} `
                : '$ '
        }${(0).toLocaleString(userLocale, {
            minimumFractionDigits: appConfig.cashDecimals,
            maximumFractionDigits: appConfig.cashDecimals,
        })} ${
            settings && settings.fiatCurrency
                ? settings.fiatCurrency.toUpperCase()
                : 'USD'
        }`;
    }

    const priceApiError =
        fiatPrice === null && selectedCurrency !== appConfig.ticker;
    const isBip21QueryStringPresent = 'queryString' in parsedAddressInput;
    const shouldRenderParsedOpReturnRaw =
        sendWithOpReturnRaw &&
        opReturnRawError === false &&
        formData.opReturnRaw !== '';

    const disableSendButton = shouldSendXecBeDisabled(
        formData,
        balanceSats,
        apiError,
        sendAmountError,
        sendAddressError,
        multiSendAddressError,
        sendWithCashtabMsg,
        cashtabMsgError,
        sendWithOpReturnRaw,
        opReturnRawError,
        inputDataRawError,
        priceApiError,
        isOneToManyXECSend,
    );

    // Check if token send button should be disabled
    // Check if empp_raw is present but token is not ALP (same condition as UI visibility)
    const shouldShowSlpErrorForEmppRaw =
        typeof parsedAddressInput.empp_raw !== 'undefined' &&
        parsedAddressInput.empp_raw.error === false &&
        selectedTokenId &&
        typeof cashtabCache.tokens.get(selectedTokenId) !== 'undefined' &&
        cashtabCache.tokens.get(selectedTokenId)?.tokenType.type !==
            'ALP_TOKEN_TYPE_STANDARD';

    const tokenSendOneToOneInvalid =
        tokenFormData.address === '' ||
        tokenFormData.amount === '' ||
        sendTokenAmountError !== false ||
        sendAddressError !== false;

    const tokenSendToManyInvalid =
        tokenFormData.multiAddressInput === '' || multiTokenSendError !== false;

    const disableTokenSendButton =
        !selectedTokenId ||
        (isOneToManyTokenSend
            ? tokenSendToManyInvalid
            : tokenSendOneToOneInvalid) ||
        tokenCashtabMsgError !== false ||
        emppRawError !== false ||
        inputDataRawError !== false ||
        shouldShowSlpErrorForEmppRaw ||
        apiError ||
        tokenIdQueryError ||
        isSending;

    // Send token variables
    const cachedInfo: undefined | CashtabCachedTokenInfo = isBip21TokenSend(
        parsedAddressInput,
    )
        ? cashtabCache.tokens.get(parsedAddressInput.token_id.value)
        : undefined;
    const cachedInfoLoaded = typeof cachedInfo !== 'undefined';

    let tokenType: undefined | TokenType,
        protocol: undefined | 'SLP' | 'ALP' | 'UNKNOWN',
        type: undefined | AlpTokenType_Type | SlpTokenType_Type | 'UNKNOWN',
        genesisInfo: undefined | GenesisInfo,
        tokenName: undefined | string,
        tokenTicker: undefined | string,
        decimals: undefined | number;

    let nameAndTicker = '';
    let tokenError: false | string = false;

    const addressPreview = isBip21TokenSend(parsedAddressInput)
        ? `${parsedAddressInput.address.value.slice(
              0,
              'ecash:'.length + 3,
          )}...${parsedAddressInput.address.value.slice(-3)}`
        : '';
    const decimalizedTokenQty = isBip21TokenSend(parsedAddressInput)
        ? parsedAddressInput.token_decimalized_qty.value
        : '';

    if (cachedInfoLoaded && isBip21TokenSend(parsedAddressInput)) {
        ({ tokenType, genesisInfo } = cachedInfo);
        ({ protocol, type } = tokenType);
        ({ tokenName, tokenTicker, decimals } = genesisInfo);
        nameAndTicker = `${tokenName}${
            tokenTicker !== '' ? ` (${tokenTicker})` : ''
        }`;

        const tokenBalance = tokens.get(parsedAddressInput.token_id.value);

        if (
            !cashtabSupportedSendTypes.includes(type) ||
            protocol === 'UNKNOWN'
        ) {
            tokenError = `Cashtab does not support sending this type of token (${type})`;
        } else if (typeof tokenBalance === 'undefined') {
            // User has none of this token
            tokenError = 'You do not hold any of this token.';
        } else {
            const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
                decimalizedTokenQty,
                tokenBalance,
                decimals as SlpDecimals,
                protocol,
            );
            tokenError =
                isValidAmountOrErrorMsg === true
                    ? false
                    : isValidAmountOrErrorMsg;
        }
    }

    return (
        <>
            <OuterCtn>
                <ActionButtonRow
                    variant="sendReceive"
                    activeIndex={isTokenMode ? 2 : 1}
                />
                <SendContentWrapper>
                    {showConfirmSendModal && (
                        <Modal
                            title={`Send ${decimalizedTokenQty} ${nameAndTicker} to ${addressPreview}?`}
                            handleOk={sendToken}
                            handleCancel={() => setShowConfirmSendModal(false)}
                            showCancelButton
                        />
                    )}
                    {isModalVisible && (
                        <Modal
                            title="Confirm Send"
                            description={
                                isTokenMode && selectedTokenId
                                    ? isOneToManyTokenSend
                                        ? `Send ${
                                              cashtabCache.tokens.get(
                                                  selectedTokenId,
                                              )?.genesisInfo.tokenTicker ||
                                              'token'
                                          } to multiple recipients from your list?`
                                        : `Send ${tokenFormData.amount} ${
                                              cashtabCache.tokens.get(
                                                  selectedTokenId,
                                              )?.genesisInfo.tokenTicker ||
                                              'token'
                                          } to ${getRecipientDisplayLabel(
                                              tokenFormData.address,
                                              contactList,
                                              wallets,
                                          )}`
                                    : isOneToManyXECSend
                                      ? `Send
                                ${multiSendTotal.toLocaleString(userLocale, {
                                    maximumFractionDigits: 2,
                                })} 
                                XEC to multiple recipients?`
                                      : `Send ${formData.amount}${' '}
                  ${selectedCurrency} to ${getRecipientDisplayLabel(
                      formData.address,
                      contactList,
                      wallets,
                  )}`
                            }
                            handleOk={
                                isTokenMode && selectedTokenId
                                    ? handleTokenSendOk
                                    : handleOk
                            }
                            handleCancel={handleCancel}
                            showCancelButton
                        />
                    )}
                    {showSuccessModal && (
                        <SuccessModalOverlay
                            onClick={() => {
                                // Close the window or navigate home on any click off of the modal
                                closeOrNavigateFromUrlBasedTransaction();
                            }}
                        >
                            <SuccessModalContent
                                onClick={e => {
                                    // Close when clicking on the modal content
                                    // (but not on interactive elements like copy button or link)
                                    if (e.target === e.currentTarget) {
                                        closeOrNavigateFromUrlBasedTransaction();
                                    }
                                }}
                            >
                                <SuccessIcon>
                                    <div />
                                    <img src={Burst} alt="Success" />
                                </SuccessIcon>
                                <SuccessTitle>Sent!</SuccessTitle>

                                <TransactionIdLink
                                    href={`${explorer.blockExplorerUrl}/tx/${successTxid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    // Prevent closing the window when clicking on the link
                                    onClick={e => e.stopPropagation()}
                                >
                                    View Transaction
                                </TransactionIdLink>

                                <SuccessButton
                                    onClick={() => {
                                        closeOrNavigateFromUrlBasedTransaction();
                                    }}
                                >
                                    Close
                                </SuccessButton>
                            </SuccessModalContent>
                        </SuccessModalOverlay>
                    )}

                    {isTokenMode ? (
                        <TokenFormContainer>
                            <TokenSelectDropdown>
                                {selectedTokenId ? (
                                    <>
                                        <SendingTokenLabel>
                                            Sending
                                        </SendingTokenLabel>
                                        <SelectedTokenDisplay>
                                            <SelectedTokenInfo>
                                                <TokenIcon
                                                    size={32}
                                                    tokenId={selectedTokenId}
                                                />
                                                <SelectedTokenDetails>
                                                    <div>
                                                        <SelectedTokenText>
                                                            {filteredTokens.find(
                                                                kv =>
                                                                    kv[0] ===
                                                                    selectedTokenId,
                                                            )?.[1].genesisInfo
                                                                .tokenTicker ||
                                                                tokensInWallet.find(
                                                                    kv =>
                                                                        kv[0] ===
                                                                        selectedTokenId,
                                                                )?.[1]
                                                                    .genesisInfo
                                                                    .tokenTicker ||
                                                                ''}
                                                        </SelectedTokenText>
                                                        <SelectedTokenIdWrapper>
                                                            {selectedTokenId.slice(
                                                                0,
                                                                3,
                                                            )}
                                                            ...
                                                            {selectedTokenId.slice(
                                                                -3,
                                                            )}
                                                        </SelectedTokenIdWrapper>
                                                    </div>
                                                    <SelectedTokenBalance>
                                                        {formatBalance(
                                                            tokens.get(
                                                                selectedTokenId,
                                                            ) || '0',
                                                            userLocale,
                                                        )}
                                                    </SelectedTokenBalance>
                                                </SelectedTokenDetails>
                                            </SelectedTokenInfo>
                                            <TokenSelectClearButton
                                                onClick={() => {
                                                    _clearTokenInputForms();
                                                }}
                                                title="Clear token selection"
                                            >
                                                ×
                                            </TokenSelectClearButton>
                                        </SelectedTokenDisplay>
                                    </>
                                ) : (
                                    <TokenSelectInputWrapper>
                                        <Input
                                            placeholder="Search by token ticker or name"
                                            name="tokenSearch"
                                            value={tokenSearch}
                                            handleInput={handleTokenSearchInput}
                                        />
                                        {filteredTokens.length > 0 && (
                                            <TokenDropdownList data-testid="token-select-dropdown">
                                                {filteredTokens.map(kv => (
                                                    <TokenDropdownItem
                                                        key={kv[0]}
                                                        data-testid={`token-select-option-${kv[0]}`}
                                                        onClick={() =>
                                                            handleTokenSelect(
                                                                kv[0],
                                                            )
                                                        }
                                                    >
                                                        <TokenDropdownItemContent>
                                                            <TokenIcon
                                                                size={32}
                                                                tokenId={kv[0]}
                                                            />
                                                            <TokenDropdownItemInfo>
                                                                <div>
                                                                    <TokenDropdownItemTicker>
                                                                        {
                                                                            kv[1]
                                                                                .genesisInfo
                                                                                .tokenTicker
                                                                        }
                                                                    </TokenDropdownItemTicker>
                                                                    <TokenDropdownItemTokenId>
                                                                        {kv[0].slice(
                                                                            0,
                                                                            3,
                                                                        )}
                                                                        ...
                                                                        {kv[0].slice(
                                                                            -3,
                                                                        )}
                                                                    </TokenDropdownItemTokenId>
                                                                </div>
                                                                <TokenDropdownItemBalance>
                                                                    {formatBalance(
                                                                        kv[1]
                                                                            .balance,
                                                                        userLocale,
                                                                    )}
                                                                </TokenDropdownItemBalance>
                                                            </TokenDropdownItemInfo>
                                                        </TokenDropdownItemContent>
                                                    </TokenDropdownItem>
                                                ))}
                                            </TokenDropdownList>
                                        )}
                                    </TokenSelectInputWrapper>
                                )}
                            </TokenSelectDropdown>
                            {selectedTokenId &&
                                (tokenAdvancedSendToManySupported ? (
                                    <InputModesHolder
                                        open={isOneToManyTokenSend}
                                    >
                                        <SendToOneHolder>
                                            <SendRecipientInput
                                                label="Address"
                                                placeholder="Address or contact"
                                                name="address"
                                                value={tokenFormData.address}
                                                disabled={
                                                    (txInfoFromUrl !== false &&
                                                        isBip21TokenSendWithTokenId(
                                                            parsedAddressInput,
                                                        ) &&
                                                        selectedTokenId !==
                                                            null &&
                                                        parsedAddressInput
                                                            .token_id?.value ===
                                                            selectedTokenId) ||
                                                    isOneToManyTokenSend
                                                }
                                                handleInput={
                                                    handleAddressChange
                                                }
                                                error={sendAddressError}
                                                contactList={contactList}
                                                wallets={wallets}
                                            />
                                            <SendTokenInput
                                                label="Amount"
                                                name="amount"
                                                placeholder="Amount"
                                                value={tokenFormData.amount}
                                                userLocale={userLocale}
                                                inputDisabled={
                                                    isOneToManyTokenSend ||
                                                    (isBip21TokenSendWithTokenId(
                                                        parsedAddressInput,
                                                    ) &&
                                                        selectedTokenId !==
                                                            null &&
                                                        parsedAddressInput
                                                            .token_id?.value ===
                                                            selectedTokenId &&
                                                        typeof parsedAddressInput.token_decimalized_qty !==
                                                            'undefined' &&
                                                        typeof parsedAddressInput
                                                            .token_decimalized_qty
                                                            .value ===
                                                            'string' &&
                                                        parsedAddressInput
                                                            .token_decimalized_qty
                                                            .value !== null &&
                                                        parsedAddressInput
                                                            .token_decimalized_qty
                                                            .error === false)
                                                }
                                                error={sendTokenAmountError}
                                                handleInput={
                                                    handleTokenAmountChange
                                                }
                                                handleOnMax={onTokenMax}
                                            />
                                        </SendToOneHolder>
                                        <SendToManyHolder>
                                            <TextArea
                                                label="Send to many"
                                                placeholder={`One address & token qty per line, separated by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,${tokenSendToManyExampleFirstQty} \necash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,2`}
                                                name="multiAddressInput"
                                                handleInput={
                                                    handleTokenMultiAddressChange
                                                }
                                                value={
                                                    tokenFormData.multiAddressInput
                                                }
                                                error={multiTokenSendError}
                                                disabled={
                                                    txInfoFromUrl !== false ||
                                                    'queryString' in
                                                        parsedAddressInput
                                                }
                                            />
                                        </SendToManyHolder>
                                    </InputModesHolder>
                                ) : (
                                    <>
                                        <SendRecipientInput
                                            label="Address"
                                            placeholder="Address or contact"
                                            name="address"
                                            value={tokenFormData.address}
                                            disabled={
                                                txInfoFromUrl !== false &&
                                                isBip21TokenSendWithTokenId(
                                                    parsedAddressInput,
                                                ) &&
                                                selectedTokenId !== null &&
                                                parsedAddressInput.token_id
                                                    ?.value === selectedTokenId
                                            }
                                            handleInput={handleAddressChange}
                                            error={sendAddressError}
                                            contactList={contactList}
                                            wallets={wallets}
                                        />
                                        <SendTokenInput
                                            label="Amount"
                                            name="amount"
                                            placeholder="Amount"
                                            value={tokenFormData.amount}
                                            userLocale={userLocale}
                                            inputDisabled={
                                                isBip21TokenSendWithTokenId(
                                                    parsedAddressInput,
                                                ) &&
                                                selectedTokenId !== null &&
                                                parsedAddressInput.token_id
                                                    ?.value ===
                                                    selectedTokenId &&
                                                typeof parsedAddressInput.token_decimalized_qty !==
                                                    'undefined' &&
                                                typeof parsedAddressInput
                                                    .token_decimalized_qty
                                                    .value === 'string' &&
                                                parsedAddressInput
                                                    .token_decimalized_qty
                                                    .value !== null &&
                                                parsedAddressInput
                                                    .token_decimalized_qty
                                                    .error === false
                                            }
                                            error={sendTokenAmountError}
                                            handleInput={
                                                handleTokenAmountChange
                                            }
                                            handleOnMax={onTokenMax}
                                        />
                                    </>
                                ))}
                            {selectedTokenId &&
                                tokenAdvancedSendToManySupported &&
                                !('queryString' in parsedAddressInput) && (
                                    <AdvancedSection>
                                        <AdvancedHeader
                                            type="button"
                                            onClick={
                                                handleTokenAdvancedHeaderClick
                                            }
                                        >
                                            Advanced{' '}
                                            <AdvancedChevron
                                                $open={tokenAdvancedOpen}
                                            />
                                        </AdvancedHeader>
                                        {tokenAdvancedOpen && (
                                            <>
                                                <AdvancedButtonsRow>
                                                    <AdvancedButton
                                                        type="button"
                                                        $active={
                                                            isOneToManyTokenSend
                                                        }
                                                        onClick={() =>
                                                            setIsOneToManyTokenSend(
                                                                !isOneToManyTokenSend,
                                                            )
                                                        }
                                                        disabled={
                                                            txInfoFromUrl !==
                                                            false
                                                        }
                                                    >
                                                        Send to many
                                                    </AdvancedButton>
                                                    {tokenAdvancedAlpEmppSupported && (
                                                        <>
                                                            <AdvancedButton
                                                                type="button"
                                                                $active={
                                                                    sendWithCashtabMsgToken
                                                                }
                                                                onClick={() => {
                                                                    if (
                                                                        !sendWithCashtabMsgToken &&
                                                                        sendWithEmppRaw
                                                                    ) {
                                                                        setSendWithEmppRaw(
                                                                            false,
                                                                        );
                                                                    }
                                                                    setSendWithCashtabMsgToken(
                                                                        !sendWithCashtabMsgToken,
                                                                    );
                                                                }}
                                                                disabled={
                                                                    txInfoFromUrl !==
                                                                        false ||
                                                                    'queryString' in
                                                                        parsedAddressInput
                                                                }
                                                            >
                                                                Cashtab Msg
                                                            </AdvancedButton>
                                                            <AdvancedButton
                                                                type="button"
                                                                $active={
                                                                    sendWithEmppRaw
                                                                }
                                                                onClick={() => {
                                                                    if (
                                                                        !sendWithEmppRaw &&
                                                                        sendWithCashtabMsgToken
                                                                    ) {
                                                                        setSendWithCashtabMsgToken(
                                                                            false,
                                                                        );
                                                                    }
                                                                    setSendWithEmppRaw(
                                                                        !sendWithEmppRaw,
                                                                    );
                                                                }}
                                                                disabled={
                                                                    txInfoFromUrl !==
                                                                        false ||
                                                                    'queryString' in
                                                                        parsedAddressInput
                                                                }
                                                            >
                                                                empp_raw
                                                            </AdvancedButton>
                                                        </>
                                                    )}
                                                </AdvancedButtonsRow>
                                                {tokenAdvancedAlpEmppSupported &&
                                                    sendWithCashtabMsgToken && (
                                                        <SendXecRow>
                                                            <TextArea
                                                                name="tokenCashtabMsg"
                                                                height={62}
                                                                placeholder={`Include a Cashtab msg EMPP push with this token tx (max 100 bytes)`}
                                                                value={
                                                                    tokenFormData.tokenCashtabMsg
                                                                }
                                                                error={
                                                                    tokenCashtabMsgError
                                                                }
                                                                showCount
                                                                customCount={
                                                                    strToBytes(
                                                                        tokenFormData.tokenCashtabMsg,
                                                                    ).length
                                                                }
                                                                max={100}
                                                                handleInput={
                                                                    handleTokenCashtabMsgChange
                                                                }
                                                            />
                                                        </SendXecRow>
                                                    )}
                                                {tokenAdvancedAlpEmppSupported &&
                                                    (sendWithEmppRaw ||
                                                        (typeof parsedAddressInput.empp_raw !==
                                                            'undefined' &&
                                                            parsedAddressInput
                                                                .empp_raw
                                                                .error ===
                                                                false)) && (
                                                        <>
                                                            <SendXecRow>
                                                                <TextArea
                                                                    name="emppRaw"
                                                                    height={62}
                                                                    placeholder={`(Advanced) Enter raw hex EMPP push (max 100 bytes)`}
                                                                    value={
                                                                        tokenFormData.emppRaw
                                                                    }
                                                                    error={
                                                                        emppRawError
                                                                    }
                                                                    disabled={
                                                                        txInfoFromUrl !==
                                                                            false ||
                                                                        'queryString' in
                                                                            parsedAddressInput
                                                                    }
                                                                    showCount
                                                                    max={200}
                                                                    customCount={
                                                                        tokenFormData
                                                                            .emppRaw
                                                                            .length /
                                                                        2
                                                                    }
                                                                    handleInput={
                                                                        handleEmppRawInput
                                                                    }
                                                                />
                                                            </SendXecRow>
                                                            {emppRawError ===
                                                                false &&
                                                                tokenFormData.emppRaw !==
                                                                    '' && (
                                                                    <SendXecRow>
                                                                        <ParsedBip21InfoRow>
                                                                            <ParsedBip21InfoLabel>
                                                                                Parsed
                                                                                empp_raw
                                                                            </ParsedBip21InfoLabel>
                                                                            <ParsedBip21Info>
                                                                                <b>
                                                                                    {
                                                                                        parsedEmppRaw.protocol
                                                                                    }
                                                                                </b>
                                                                                <br />
                                                                                {
                                                                                    parsedEmppRaw.data
                                                                                }
                                                                            </ParsedBip21Info>
                                                                        </ParsedBip21InfoRow>
                                                                    </SendXecRow>
                                                                )}
                                                        </>
                                                    )}
                                            </>
                                        )}
                                    </AdvancedSection>
                                )}
                            {/* Show error if empp_raw is present but token is not ALP */}
                            {shouldShowSlpErrorForEmppRaw && (
                                <SendXecRow>
                                    <Alert>
                                        <AlertMsg>
                                            empp_raw is only supported for ALP
                                            token txs
                                        </AlertMsg>
                                    </Alert>
                                </SendXecRow>
                            )}
                            {/* Parsed input_data_raw when present in BIP21 (token mode) */}
                            {selectedTokenId &&
                                (parsedInputDataRaw.protocol !== '' ||
                                    parsedInputDataRaw.data !== '') && (
                                    <SendXecRow>
                                        <ParsedBip21InfoRow>
                                            <ParsedBip21InfoLabel>
                                                Parsed input_data_raw
                                            </ParsedBip21InfoLabel>
                                            <ParsedBip21Info>
                                                <b>
                                                    {
                                                        parsedInputDataRaw.protocol
                                                    }
                                                </b>
                                                <br />
                                                {parsedInputDataRaw.data}
                                            </ParsedBip21Info>
                                        </ParsedBip21InfoRow>
                                    </SendXecRow>
                                )}
                            {/* Show BIP21 token send info in token mode */}
                            {isBip21TokenSendWithTokenId(parsedAddressInput) &&
                                selectedTokenId !== null &&
                                selectedTokenId ===
                                    parsedAddressInput.token_id.value &&
                                tokenIdQueryError === false && (
                                    <>
                                        {typeof cashtabCache.tokens.get(
                                            parsedAddressInput.token_id.value,
                                        ) !== 'undefined' ? (
                                            <>
                                                {/* Show parsed token send info */}
                                                {isBip21TokenSendToMany(
                                                    parsedAddressInput,
                                                ) ? (
                                                    <Info>
                                                        <b>
                                                            BIP21: Sending{' '}
                                                            {bip21TokenSendToManyTotal.toLocaleString(
                                                                userLocale,
                                                                {
                                                                    maximumFractionDigits: 9,
                                                                },
                                                            )}{' '}
                                                            {cashtabCache.tokens.get(
                                                                selectedTokenId,
                                                            )?.genesisInfo
                                                                .tokenTicker ||
                                                                'token'}{' '}
                                                            to{' '}
                                                            {
                                                                bip21TokenSendToManyOutputCount
                                                            }{' '}
                                                            outputs
                                                        </b>
                                                    </Info>
                                                ) : isValidFirmaRedeemTx(
                                                      parsedAddressInput,
                                                  ) ? (
                                                    <ParsedTokenSend
                                                        style={{
                                                            marginBottom:
                                                                '12px',
                                                        }}
                                                    >
                                                        <FirmaRedeemLogoWrapper>
                                                            <FirmaIcon />
                                                            <UsdcIcon />
                                                        </FirmaRedeemLogoWrapper>
                                                        <FirmaRedeemTextAndCopy>
                                                            On tx finalized,{' '}
                                                            {Number(
                                                                parsedAddressInput
                                                                    .token_decimalized_qty
                                                                    .value,
                                                            ).toLocaleString(
                                                                userLocale,
                                                                {
                                                                    maximumFractionDigits: 4,
                                                                    minimumFractionDigits: 4,
                                                                },
                                                            )}{' '}
                                                            USDC will be sent to{' '}
                                                            {parsedFirma.data.slice(
                                                                0,
                                                                3,
                                                            )}
                                                            ...
                                                            {parsedFirma.data.slice(
                                                                -3,
                                                            )}{' '}
                                                            <CopyIconButton
                                                                name="Copy SOL addr"
                                                                data={
                                                                    parsedFirma.data
                                                                }
                                                            />
                                                        </FirmaRedeemTextAndCopy>
                                                    </ParsedTokenSend>
                                                ) : (
                                                    <ParsedTokenSend
                                                        style={{
                                                            marginBottom:
                                                                '12px',
                                                        }}
                                                    >
                                                        <TokenIcon
                                                            size={64}
                                                            tokenId={
                                                                parsedAddressInput
                                                                    .token_id
                                                                    .value
                                                            }
                                                        />
                                                        Sending{' '}
                                                        {decimalizedTokenQty}{' '}
                                                        {nameAndTicker} to{' '}
                                                        {addressPreview}
                                                    </ParsedTokenSend>
                                                )}
                                            </>
                                        ) : (
                                            <InlineLoader />
                                        )}
                                    </>
                                )}
                            {/* Show parsed firma info in token mode when firma is present but not a redeem tx */}
                            {isBip21TokenSend(parsedAddressInput) &&
                                !isValidFirmaRedeemTx(parsedAddressInput) &&
                                selectedTokenId !== null &&
                                selectedTokenId ===
                                    parsedAddressInput.token_id.value &&
                                typeof parsedAddressInput.firma?.value ===
                                    'string' &&
                                parsedAddressInput.firma.error === false &&
                                parsedFirma.protocol !== '' &&
                                parsedFirma.data !== '' && (
                                    <div style={{ margin: '12px 0' }}>
                                        <ParsedBip21InfoRow>
                                            <ParsedBip21InfoLabel>
                                                Parsed firma
                                            </ParsedBip21InfoLabel>
                                            <ParsedBip21Info>
                                                <b>{parsedFirma.protocol}</b>
                                                <br />
                                                {parsedFirma.data}
                                            </ParsedBip21Info>
                                        </ParsedBip21InfoRow>
                                    </div>
                                )}
                            {(isBip21TokenSend(parsedAddressInput) ||
                                isBip21TokenSendWithTokenId(
                                    parsedAddressInput,
                                )) &&
                                selectedTokenId !== null &&
                                parsedAddressInput.token_id?.value ===
                                    selectedTokenId &&
                                tokenIdQueryError && (
                                    <Alert>
                                        Error querying token info for{' '}
                                        {parsedAddressInput.token_id?.value ||
                                            'unknown token'}
                                    </Alert>
                                )}
                        </TokenFormContainer>
                    ) : (
                        <InputModesHolder open={isOneToManyXECSend}>
                            <SendToOneHolder>
                                <SendToOneInputForm>
                                    <SendRecipientInput
                                        label="Send to"
                                        placeholder="Address or contact"
                                        name="address"
                                        value={formData.address}
                                        disabled={txInfoFromUrl !== false}
                                        handleInput={handleAddressChange}
                                        error={sendAddressError}
                                        contactList={contactList}
                                        wallets={wallets}
                                    />
                                    {isBip21MultipleOutputsSafe(
                                        parsedAddressInput,
                                    ) ? (
                                        <Info>
                                            <b>
                                                BIP21: Sending{' '}
                                                {bip21MultipleOutputsFormattedTotalSendXec.toLocaleString(
                                                    userLocale,
                                                    {
                                                        maximumFractionDigits: 2,
                                                        minimumFractionDigits: 2,
                                                    },
                                                )}{' '}
                                                XEC to{' '}
                                                {parsedAddressInput
                                                    .parsedAdditionalXecOutputs
                                                    .value.length + 1}{' '}
                                                outputs
                                            </b>
                                        </Info>
                                    ) : (
                                        <SendXecInput
                                            label="Amount"
                                            name="amount"
                                            value={formData.amount}
                                            userLocale={userLocale}
                                            selectValue={selectedCurrency}
                                            selectDisabled={
                                                'amount' in
                                                    parsedAddressInput ||
                                                txInfoFromUrl !== false
                                            }
                                            inputDisabled={
                                                priceApiError ||
                                                (txInfoFromUrl !== false &&
                                                    'value' in txInfoFromUrl &&
                                                    txInfoFromUrl.value !==
                                                        'null' &&
                                                    txInfoFromUrl.value !==
                                                        'undefined') ||
                                                'amount' in parsedAddressInput
                                            }
                                            fiatCode={settings.fiatCurrency.toUpperCase()}
                                            error={sendAmountError}
                                            handleInput={handleAmountChange}
                                            handleSelect={
                                                handleSelectedCurrencyChange
                                            }
                                            handleOnMax={onMax}
                                        />
                                    )}
                                </SendToOneInputForm>
                            </SendToOneHolder>
                            {isBip21TokenSend(parsedAddressInput) &&
                                tokenIdQueryError && (
                                    <Alert>
                                        Error querying token info for{' '}
                                        {parsedAddressInput.token_id.value}
                                    </Alert>
                                )}
                            {priceApiError && (
                                <AlertMsg>
                                    Error fetching fiat price. Setting send by{' '}
                                    {supportedFiatCurrencies[
                                        settings.fiatCurrency
                                    ].slug.toUpperCase()}{' '}
                                    disabled
                                </AlertMsg>
                            )}
                            <SendToManyHolder>
                                <TextArea
                                    label="Send to many"
                                    placeholder={`One address & amount per line, separated by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,500 \necash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,700`}
                                    name="multiAddressInput"
                                    handleInput={e =>
                                        handleMultiAddressChange(e)
                                    }
                                    value={formData.multiAddressInput}
                                    error={multiSendAddressError}
                                />
                            </SendToManyHolder>
                        </InputModesHolder>
                    )}
                    {!isTokenMode && (
                        <SendXecForm>
                            {!isBip21QueryStringPresent && (
                                <AdvancedSection>
                                    <AdvancedHeader
                                        type="button"
                                        onClick={handleAdvancedHeaderClick}
                                    >
                                        Advanced{' '}
                                        <AdvancedChevron $open={advancedOpen} />
                                    </AdvancedHeader>
                                    {advancedOpen && (
                                        <>
                                            <AdvancedButtonsRow>
                                                <AdvancedButton
                                                    type="button"
                                                    $active={isOneToManyXECSend}
                                                    onClick={() =>
                                                        setIsOneToManyXECSend(
                                                            !isOneToManyXECSend,
                                                        )
                                                    }
                                                    disabled={
                                                        txInfoFromUrl !==
                                                            false ||
                                                        isBip21QueryStringPresent
                                                    }
                                                >
                                                    Send to many
                                                </AdvancedButton>
                                                <AdvancedButton
                                                    type="button"
                                                    $active={sendWithCashtabMsg}
                                                    onClick={() => {
                                                        if (
                                                            !sendWithCashtabMsg &&
                                                            sendWithOpReturnRaw
                                                        ) {
                                                            setSendWithOpReturnRaw(
                                                                false,
                                                            );
                                                        }
                                                        setSendWithCashtabMsg(
                                                            !sendWithCashtabMsg,
                                                        );
                                                    }}
                                                    disabled={
                                                        txInfoFromUrl !==
                                                            false ||
                                                        isBip21QueryStringPresent
                                                    }
                                                >
                                                    Message
                                                </AdvancedButton>
                                                <AdvancedButton
                                                    type="button"
                                                    $active={
                                                        sendWithOpReturnRaw
                                                    }
                                                    onClick={() => {
                                                        if (
                                                            !sendWithOpReturnRaw &&
                                                            sendWithCashtabMsg
                                                        ) {
                                                            setSendWithCashtabMsg(
                                                                false,
                                                            );
                                                        }
                                                        setSendWithOpReturnRaw(
                                                            !sendWithOpReturnRaw,
                                                        );
                                                    }}
                                                    disabled={
                                                        txInfoFromUrl !==
                                                            false ||
                                                        isBip21QueryStringPresent
                                                    }
                                                >
                                                    op_return_raw
                                                </AdvancedButton>
                                            </AdvancedButtonsRow>
                                            <AdvancedContent>
                                                {sendWithCashtabMsg && (
                                                    <SendXecRow>
                                                        <TextArea
                                                            name="cashtabMsg"
                                                            height={62}
                                                            placeholder={`Include a public Cashtab msg with this tx ${
                                                                location &&
                                                                location.state &&
                                                                location.state
                                                                    .airdropTokenId
                                                                    ? `(max ${
                                                                          opreturnConfig.cashtabMsgByteLimit -
                                                                          localAirdropTxAddedBytes
                                                                      } bytes)`
                                                                    : `(max ${opreturnConfig.cashtabMsgByteLimit} bytes)`
                                                            }`}
                                                            value={
                                                                formData.cashtabMsg
                                                            }
                                                            error={
                                                                cashtabMsgError
                                                            }
                                                            showCount
                                                            customCount={getCashtabMsgByteCount(
                                                                formData.cashtabMsg,
                                                            )}
                                                            max={
                                                                location &&
                                                                location.state &&
                                                                location.state
                                                                    .airdropTokenId
                                                                    ? opreturnConfig.cashtabMsgByteLimit -
                                                                      localAirdropTxAddedBytes
                                                                    : opreturnConfig.cashtabMsgByteLimit
                                                            }
                                                            handleInput={e =>
                                                                handleCashtabMsgChange(
                                                                    e,
                                                                )
                                                            }
                                                        />
                                                    </SendXecRow>
                                                )}
                                            </AdvancedContent>
                                        </>
                                    )}
                                </AdvancedSection>
                            )}
                            {isBip21TokenSend(parsedAddressInput) &&
                                tokenIdQueryError === false && (
                                    <>
                                        {isValidFirmaRedeemTx(
                                            parsedAddressInput,
                                        ) ? (
                                            <ParsedTokenSend
                                                /** make sure the bottom is not stuck behind SEND button */
                                                style={{ marginBottom: '48px' }}
                                            >
                                                <FirmaRedeemLogoWrapper>
                                                    <FirmaIcon />
                                                    <UsdcIcon />
                                                </FirmaRedeemLogoWrapper>
                                                <FirmaRedeemTextAndCopy>
                                                    On tx finalized,{' '}
                                                    {Number(
                                                        parsedAddressInput
                                                            .token_decimalized_qty
                                                            .value,
                                                    ).toLocaleString(
                                                        userLocale,
                                                        {
                                                            maximumFractionDigits: 4,
                                                            minimumFractionDigits: 4,
                                                        },
                                                    )}{' '}
                                                    USDC will be sent to{' '}
                                                    {parsedFirma.data.slice(
                                                        0,
                                                        3,
                                                    )}
                                                    ...
                                                    {parsedFirma.data.slice(
                                                        -3,
                                                    )}{' '}
                                                    <CopyIconButton
                                                        name="Copy SOL addr"
                                                        data={parsedFirma.data}
                                                    />
                                                </FirmaRedeemTextAndCopy>
                                            </ParsedTokenSend>
                                        ) : (
                                            <ParsedTokenSend>
                                                <TokenIcon
                                                    size={64}
                                                    tokenId={
                                                        parsedAddressInput
                                                            .token_id.value
                                                    }
                                                />
                                                Sending {decimalizedTokenQty}{' '}
                                                {nameAndTicker} to{' '}
                                                {addressPreview}
                                            </ParsedTokenSend>
                                        )}
                                    </>
                                )}

                            {isBip21TokenSend(parsedAddressInput) &&
                                !isValidFirmaRedeemTx(parsedAddressInput) &&
                                typeof parsedAddressInput.firma?.value ===
                                    'string' &&
                                parsedAddressInput.firma.error === false && (
                                    <SendXecRow>
                                        <ParsedBip21InfoRow>
                                            <ParsedBip21InfoLabel>
                                                Parsed firma
                                            </ParsedBip21InfoLabel>
                                            <ParsedBip21Info>
                                                <b>{parsedFirma.protocol}</b>
                                                <br />
                                                {parsedFirma.data}
                                            </ParsedBip21Info>
                                        </ParsedBip21InfoRow>
                                    </SendXecRow>
                                )}
                            {isBip21MultipleOutputsSafe(parsedAddressInput) && (
                                <SendXecRow>
                                    <ParsedBip21InfoRow>
                                        <ParsedBip21InfoLabel>
                                            Parsed BIP21 outputs
                                        </ParsedBip21InfoLabel>
                                        <ParsedBip21Info>
                                            <ol>
                                                <li
                                                    title={
                                                        parsedAddressInput
                                                            .address
                                                            .value as string
                                                    }
                                                >{`${(
                                                    parsedAddressInput.address
                                                        .value as string
                                                ).slice(6, 12)}...${(
                                                    parsedAddressInput.address
                                                        .value as string
                                                ).slice(-6)}, ${parseFloat(
                                                    parsedAddressInput.amount
                                                        .value,
                                                ).toLocaleString(userLocale, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })} XEC`}</li>
                                                {Array.from(
                                                    parsedAddressInput
                                                        .parsedAdditionalXecOutputs
                                                        .value,
                                                ).map(
                                                    ([addr, amount], index) => {
                                                        return (
                                                            <li
                                                                key={index}
                                                                title={addr}
                                                            >{`${addr.slice(
                                                                6,
                                                                12,
                                                            )}...${addr.slice(
                                                                -6,
                                                            )}, ${parseFloat(
                                                                amount,
                                                            ).toLocaleString(
                                                                userLocale,
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                },
                                                            )} XEC`}</li>
                                                        );
                                                    },
                                                )}
                                            </ol>
                                        </ParsedBip21Info>
                                    </ParsedBip21InfoRow>
                                </SendXecRow>
                            )}
                            {advancedOpen &&
                                !isBip21QueryStringPresent &&
                                sendWithOpReturnRaw && (
                                    <>
                                        <SendXecRow>
                                            <TextArea
                                                name="opReturnRaw"
                                                height={62}
                                                placeholder={`(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`}
                                                value={formData.opReturnRaw}
                                                error={opReturnRawError}
                                                disabled={
                                                    txInfoFromUrl !== false ||
                                                    'queryString' in
                                                        parsedAddressInput
                                                }
                                                showCount
                                                max={
                                                    2 *
                                                    opReturn.opreturnParamByteLimit
                                                }
                                                handleInput={
                                                    handleOpReturnRawInput
                                                }
                                            />
                                        </SendXecRow>
                                        {shouldRenderParsedOpReturnRaw && (
                                            <SendXecRow>
                                                <ParsedBip21InfoRow>
                                                    <ParsedBip21InfoLabel>
                                                        Parsed op_return_raw
                                                    </ParsedBip21InfoLabel>
                                                    <ParsedBip21Info>
                                                        <b>
                                                            {
                                                                parsedOpReturnRaw.protocol
                                                            }
                                                        </b>
                                                        <br />
                                                        {parsedOpReturnRaw.data}
                                                    </ParsedBip21Info>
                                                </ParsedBip21InfoRow>
                                            </SendXecRow>
                                        )}
                                    </>
                                )}
                            {isBip21QueryStringPresent &&
                                shouldRenderParsedOpReturnRaw && (
                                    <SendXecRow>
                                        <ParsedBip21InfoRow>
                                            <ParsedBip21InfoLabel>
                                                Parsed op_return_raw
                                            </ParsedBip21InfoLabel>
                                            <ParsedBip21Info>
                                                <b>
                                                    {parsedOpReturnRaw.protocol}
                                                </b>
                                                <br />
                                                {parsedOpReturnRaw.data}
                                            </ParsedBip21Info>
                                        </ParsedBip21InfoRow>
                                    </SendXecRow>
                                )}
                            {/* Parsed input_data_raw when present in BIP21 (XEC mode) */}
                            {(parsedInputDataRaw.protocol !== '' ||
                                parsedInputDataRaw.data !== '') && (
                                <SendXecRow>
                                    <ParsedBip21InfoRow>
                                        <ParsedBip21InfoLabel>
                                            Parsed input_data_raw
                                        </ParsedBip21InfoLabel>
                                        <ParsedBip21Info>
                                            <b>{parsedInputDataRaw.protocol}</b>
                                            <br />
                                            {parsedInputDataRaw.data}
                                        </ParsedBip21Info>
                                    </ParsedBip21InfoRow>
                                </SendXecRow>
                            )}
                        </SendXecForm>
                    )}

                    {!priceApiError && !isTokenMode && (
                        <AmountPreviewCtn>
                            <AmountPreviewLabel>Sending</AmountPreviewLabel>
                            <AmountPreviewValues>
                                {isOneToManyXECSend ? (
                                    <LocaleFormattedValue>
                                        {formatBalance(
                                            multiSendTotal.toString(),
                                            userLocale,
                                        ) +
                                            ' ' +
                                            selectedCurrency}
                                    </LocaleFormattedValue>
                                ) : isBip21MultipleOutputsSafe(
                                      parsedAddressInput,
                                  ) ? (
                                    <LocaleFormattedValue>
                                        {bip21MultipleOutputsFormattedTotalSendXec.toLocaleString(
                                            userLocale,
                                            {
                                                maximumFractionDigits: 2,
                                                minimumFractionDigits: 2,
                                            },
                                        )}{' '}
                                        XEC
                                    </LocaleFormattedValue>
                                ) : (
                                    <LocaleFormattedValue>
                                        {!isNaN(
                                            parseFloat(normalizedFormAmount),
                                        )
                                            ? formatBalance(
                                                  normalizedFormAmount,
                                                  userLocale,
                                              ) +
                                              ' ' +
                                              selectedCurrency
                                            : `0 ${selectedCurrency}`}
                                    </LocaleFormattedValue>
                                )}
                                <AmountPreviewFiat>
                                    {fiatPriceString !== '' && '= '}
                                    {fiatPriceString}
                                </AmountPreviewFiat>
                            </AmountPreviewValues>
                        </AmountPreviewCtn>
                    )}
                    <SendButtonContainer>
                        {isUrlBasedTransaction ? (
                            <>
                                <PrimaryButton
                                    disabled={
                                        isTokenMode
                                            ? isBip21TokenSend(
                                                  parsedAddressInput,
                                              ) &&
                                              selectedTokenId !== null &&
                                              selectedTokenId ===
                                                  parsedAddressInput.token_id
                                                      .value
                                                ? tokenError !== false ||
                                                  tokenIdQueryError ||
                                                  shouldShowSlpErrorForEmppRaw ||
                                                  isSending
                                                : disableTokenSendButton
                                            : (!isBip21TokenSend(
                                                  parsedAddressInput,
                                              ) &&
                                                  disableSendButton) ||
                                              (isBip21TokenSend(
                                                  parsedAddressInput,
                                              ) &&
                                                  tokenError !== false) ||
                                              tokenIdQueryError ||
                                              isSending
                                    }
                                    onClick={
                                        isTokenMode
                                            ? isBip21TokenSend(
                                                  parsedAddressInput,
                                              ) &&
                                              selectedTokenId !== null &&
                                              selectedTokenId ===
                                                  parsedAddressInput.token_id
                                                      .value
                                                ? checkForConfirmationBeforeBip21TokenSend
                                                : checkForConfirmationBeforeSendToken
                                            : isBip21TokenSend(
                                                    parsedAddressInput,
                                                )
                                              ? checkForConfirmationBeforeBip21TokenSend
                                              : checkForConfirmationBeforeSendXec
                                    }
                                >
                                    {isSending ? <InlineLoader /> : 'Accept'}
                                </PrimaryButton>
                                <SecondaryButton
                                    disabled={isSending}
                                    onClick={() => handleTransactionRejection()}
                                    style={{
                                        marginLeft: '10px',
                                    }}
                                >
                                    Reject
                                </SecondaryButton>
                            </>
                        ) : (
                            <PrimaryButton
                                disabled={
                                    isTokenMode
                                        ? disableTokenSendButton
                                        : (!isBip21TokenSend(
                                              parsedAddressInput,
                                          ) &&
                                              disableSendButton) ||
                                          (isBip21TokenSend(
                                              parsedAddressInput,
                                          ) &&
                                              tokenError !== false) ||
                                          tokenIdQueryError
                                }
                                onClick={
                                    isTokenMode
                                        ? checkForConfirmationBeforeSendToken
                                        : isBip21TokenSend(parsedAddressInput)
                                          ? checkForConfirmationBeforeBip21TokenSend
                                          : checkForConfirmationBeforeSendXec
                                }
                            >
                                {isSending ? <InlineLoader /> : 'Send'}
                            </PrimaryButton>
                        )}
                    </SendButtonContainer>
                    {apiError && <ApiError />}
                </SendContentWrapper>
            </OuterCtn>
        </>
    );
};

export default SendXec;
