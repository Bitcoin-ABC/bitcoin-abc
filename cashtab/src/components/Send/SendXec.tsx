// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import Modal from 'components/Common/Modal';
import PrimaryButton, {
    SecondaryButton,
    CopyIconButton,
} from 'components/Common/Buttons';
import { toSatoshis, toXec, SlpDecimals } from 'wallet';
import { getSendTokenInputs, TokenInputInfo } from 'token-protocols';
import {
    getNft,
    getNftChildSendTargetOutputs,
    getSlpSendTargetOutputs,
} from 'token-protocols/slpv1';
import { getAlpSendTargetOutputs } from 'token-protocols/alp';
import { sumOneToManyXec, confirmRawTx, getFirmaRedeemFee } from './helpers';
import { Event } from 'components/Common/GoogleAnalytics';
import {
    isValidMultiSendUserInput,
    shouldSendXecBeDisabled,
    parseAddressInput,
    isValidXecSendAmount,
    getOpReturnRawError,
    CashtabParsedAddressInfo,
    isValidTokenSendOrBurnAmount,
} from 'validation';
import {
    ConvertAmount,
    Alert,
    AlertMsg,
    Info,
    TokenIdPreview,
} from 'components/Common/Atoms';
import {
    sendXec,
    getMultisendTargetOutputs,
    getMaxSendAmountSatoshis,
} from 'transactions';
import { ChronikClient } from 'chronik-client';
import {
    getCashtabMsgTargetOutput,
    getAirdropTargetOutput,
    getCashtabMsgByteCount,
    getOpreturnParamTargetOutput,
    parseOpReturnRaw,
    parseFirma,
    ParsedOpReturnRaw,
} from 'opreturn';
import ApiError from 'components/Common/ApiError';
import { formatFiatBalance, formatBalance } from 'formatting';
import styled from 'styled-components';
import { theme } from 'assets/styles/theme';
import { opReturn as opreturnConfig } from 'config/opreturn';
import { explorer } from 'config/explorer';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import appConfig from 'config/app';
import { getUserLocale } from 'helpers';
import { fiatToSatoshis } from 'wallet';
import { toast } from 'react-toastify';
import {
    InputWithScanner,
    SendXecInput,
    SendTokenInput,
    Input,
    TextArea,
} from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';
import { opReturn } from 'config/opreturn';
import { Script, payment } from 'ecash-lib';
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
    TokenType,
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
import {
    FIRMA,
    FIRMA_REDEEM_ADDRESS,
    FIRMA_REDEEM_EMPP_RAW_LENGTH,
} from 'constants/tokens';
import { FirmaIcon, TetherIcon } from 'components/Common/CustomIcons';
import Burst from 'assets/burst.png';

const OuterCtn = styled.div`
    background: ${props => props.theme.primaryBackground};
    padding: 20px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 250px);
    @media (max-width: 768px) {
        min-height: calc(100vh - 300px);
    }
`;

const SendXecForm = styled.div`
    margin: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-grow: 1;
`;
const SendXecRow = styled.div``;
const SwitchAndLabel = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
`;
const SwitchLabel = styled.div`
    color: ${props => props.theme.primaryText};
`;
const SwitchContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    color: ${props => props.theme.primaryText};
    white-space: nowrap;
    margin: 12px 0;
`;

const AmountPreviewCtn = styled.div`
    margin: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
`;
const ParsedBip21InfoRow = styled.div`
    display: flex;
    flex-direction: column;
    word-break: break-word;
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
    margin-bottom: 0;
`;

const SendToOneHolder = styled.div``;
const SendToManyHolder = styled.div``;
const SendToOneInputForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const InputModesHolder = styled.div<{ open: boolean }>`
    min-height: 9rem;
    ${SendToOneHolder} {
        overflow: hidden;
        transition: ${props =>
            props.open
                ? 'max-height 200ms ease-in, opacity 200ms ease-out'
                : 'max-height 200ms cubic-bezier(0, 1, 0, 1), opacity 200ms ease-in'};
        max-height: ${props => (props.open ? '0rem' : '12rem')};
        opacity: ${props => (props.open ? 0 : 1)};
    }
    ${SendToManyHolder} {
        overflow: hidden;
        transition: ${props =>
            props.open
                ? 'max-height 200ms ease-in, transform 200ms ease-out, opacity 200ms ease-in'
                : 'max-height 200ms cubic-bezier(0, 1, 0, 1), transform 200ms ease-out'};
        max-height: ${props => (props.open ? '12rem' : '0rem')};
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
    img {
        width: 64px;
        height: 64px;
    }
    @media (max-width: 768px) {
        img {
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
    width: 100%;
`;

const TokenSelectClearButton = styled.button`
    position: absolute;
    right: 12px;
    background: transparent;
    border: none;
    color: ${props => props.theme.secondaryText};
    cursor: pointer;
    font-size: 20px;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    &:hover {
        color: ${props => props.theme.primaryText};
    }
`;

const SelectedTokenDisplay = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 12px;
    background-color: ${props => props.theme.secondaryBackground};
    border: 1px solid ${props => props.theme.border};
    border-radius: 9px;
    width: 100%;
    position: relative;
`;

const SelectedTokenInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
`;

const SelectedTokenText = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
`;

const SelectedTokenDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
`;

const SelectedTokenBalance = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
`;

const SelectedTokenIdWrapper = styled.div`
    font-size: var(--text-xs);
    line-height: var(--text-xs--line-height);
`;

const TokenDropdownList = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: ${props => props.theme.secondaryBackground};
    border: 1px solid ${props => props.theme.border};
    border-radius: 8px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 4px;
`;

const TokenDropdownItem = styled.div`
    display: flex;
    align-items: center;
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid ${props => props.theme.border};
    &:hover {
        background: ${props => props.theme.primaryBackground};
    }
    &:last-child {
        border-bottom: none;
    }
`;

const TokenDropdownItemContent = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
`;

const TokenDropdownItemInfo = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
`;

const TokenDropdownItemTicker = styled.div`
    font-weight: bold;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
`;

const TokenDropdownItemBalance = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
`;

const TokenDropdownItemTokenId = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
    margin-top: 2px;
`;

const TokenFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 12px 0;
`;
interface CashtabTxInfo {
    address?: string;
    bip21?: string;
    value?: string;
    parseAllAsBip21?: boolean;
}
const SendXec: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const location = useLocation();
    const {
        chaintipBlockheight,
        fiatPrice,
        apiError,
        cashtabState,
        updateCashtabState,
        chronik,
        ecc,
        wallet: ecashWallet,
    } = ContextValue;
    const { settings, cashtabCache, activeWallet } = cashtabState;
    if (!activeWallet) {
        return null;
    }
    const wallet = activeWallet;
    const { balanceSats, tokens } = wallet.state;

    const [isTokenMode, setIsTokenMode] = useState<boolean>(false);
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [tokenSearch, setTokenSearch] = useState<string>('');
    const [tokensInWallet, setTokensInWallet] = useState<TokenInfoKv[]>([]);
    const [filteredTokens, setFilteredTokens] = useState<TokenInfoKv[]>([]);
    const [isOneToManyXECSend, setIsOneToManyXECSend] =
        useState<boolean>(false);
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
    }

    const emptyTokenFormData: SendTokenFormData = {
        amount: '',
        address: '',
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
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        appConfig.ticker,
    );
    const [parsedAddressInput, setParsedAddressInput] =
        useState<CashtabParsedAddressInfo>(parseAddressInput('', 0));

    // Cashtab does not yet support sending all types of tokens
    const cashtabSupportedSendTypes = [
        'ALP_TOKEN_TYPE_STANDARD',
        'SLP_TOKEN_TYPE_FUNGIBLE',
        'SLP_TOKEN_TYPE_NFT1_CHILD',
        'SLP_TOKEN_TYPE_NFT1_GROUP',
        'SLP_TOKEN_TYPE_MINT_VAULT',
    ];

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

    // Auto-close success modal after progress bar animation duration
    useEffect(() => {
        if (showSuccessModal) {
            const timer = setTimeout(() => {
                setShowSuccessModal(false);
                window.close();
            }, SUCCESS_MODAL_DURATION_MS); // Match the progress bar animation duration

            return () => clearTimeout(timer);
        }
    }, [showSuccessModal]);

    // Extension transaction handling
    const [isExtensionTransaction, setIsExtensionTransaction] =
        useState<boolean>(false);
    const [extensionTabId, setExtensionTabId] = useState<number | null>(null);
    const [isUrlBasedTransaction, setIsUrlBasedTransaction] =
        useState<boolean>(false);

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

        walletTokensKeyValueArray.sort((a, b) => {
            return a[1].genesisInfo.tokenTicker.localeCompare(
                b[1].genesisInfo.tokenTicker,
            );
        });

        setTokensInWallet(walletTokensKeyValueArray);
    }, [tokens, isTokenMode, cashtabCache]);

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

        // Check if firma is present and validate it
        if (
            typeof parsedAddressInput.firma !== 'undefined' &&
            parsedAddressInput.firma.error === false
        ) {
            const { tokenType } = cachedTokenInfo;
            const { type } = tokenType;
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
    };

    const handleTokenSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setTokenSearch(value);
    };

    const handleTokenSelect = (tokenId: string) => {
        setSelectedTokenId(tokenId);
        setTokenSearch('');
        setTokenFormData({
            ...tokenFormData,
            amount: '',
        });
        setSendTokenAmountError(false);

        // Clear any previous errors
        setSendTokenAmountError(false);
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
        const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            value,
            tokenBalance,
            decimals as SlpDecimals,
            protocol as 'ALP' | 'SLP',
        );
        setSendTokenAmountError(
            isValidAmountOrErrorMsg === true ? false : isValidAmountOrErrorMsg,
        );
        setTokenFormData(p => ({
            ...p,
            [name]: value,
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
                amount: tokenBalance,
            });
        }
    };

    const sendToken = async () => {
        // Determine if this is a BIP21 token send or form-based send
        const isBip21Send = isBip21TokenSend(parsedAddressInput);

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
            decimalizedTokenQty = tokenFormData.amount;
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
            // Get input utxos for slpv1 or ALP send tx
            // NFT send utxos are handled differently
            const tokenInputInfo =
                type === 'SLP_TOKEN_TYPE_NFT1_CHILD'
                    ? undefined
                    : getSendTokenInputs(
                          wallet.state.slpUtxos,
                          tokenId as string,
                          decimalizedTokenQty,
                          decimals as SlpDecimals,
                      );

            // Get targetOutputs for an slpv1 send tx
            const tokenSendTargetOutputs =
                type === 'SLP_TOKEN_TYPE_NFT1_CHILD'
                    ? getNftChildSendTargetOutputs(tokenId as string, address)
                    : type === 'ALP_TOKEN_TYPE_STANDARD'
                      ? getAlpSendTargetOutputs(
                            tokenInputInfo as TokenInputInfo,
                            address,
                            firma,
                        )
                      : getSlpSendTargetOutputs(
                            tokenInputInfo as TokenInputInfo,
                            address,
                            tokenType!.number,
                        );
            // Build and broadcast the tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                tokenSendTargetOutputs,
                settings.satsPerKb,
                chaintipBlockheight,
                type === 'SLP_TOKEN_TYPE_NFT1_CHILD'
                    ? getNft(tokenId as string, wallet.state.slpUtxos)
                    : (tokenInputInfo as TokenInputInfo).tokenInputs,
            );

            confirmRawTx(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
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
                await handleTransactionApproval(response.txid);
            } else if (txInfoFromUrl) {
                // Show success modal for URL-based transactions
                setSuccessTxid(response.txid);
                setShowSuccessModal(true);
            }

            // Clear form - use appropriate clear function based on send type
            if (isBip21Send) {
                clearInputForms();
                // Hide the confirmation modal if it was showing
                setShowConfirmSendModal(false);
            } else {
                _clearTokenInputForms();
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
            // For non-extension URL-based transactions, just close the window
            console.log(
                '[Cashtab] Non-extension transaction rejected, closing window',
            );
        }

        // Close the window for both cases
        window.close();
    };

    useEffect(() => {
        // Manually parse for txInfo object on page load when Send.js is loaded with a query string

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

        // Do not set txInfo in state if query strings are not present
        if (
            !window.location ||
            !window.location.hash ||
            window.location.hash === '#/send'
        ) {
            return;
        }

        // Get everything after the first ? mark
        const hashRoute = window.location.hash;
        // The "+1" is because we want to also omit the first question mark
        // So we need to slice at 1 character past it
        const txInfoStr = hashRoute.slice(hashRoute.indexOf('?') + 1);
        const txInfo: CashtabTxInfo = {};

        // Set URL-based transaction flag as soon as we detect URL parameters
        setIsUrlBasedTransaction(true);

        // If bip21 is the first param, parse the whole string as a bip21 param string
        const parseAllAsBip21 = txInfoStr.startsWith('bip21');

        if (parseAllAsBip21) {
            // Cashtab requires param string to start with bip21 if this is requesting bip21 validation
            txInfo.bip21 = txInfoStr.slice('bip21='.length);
        } else {
            // Parse for legacy amount and value params
            const legacyParams = new URLSearchParams(txInfoStr);
            // Check for duplicated params
            const duplicatedParams =
                new Set(legacyParams.keys()).size !==
                Array.from(legacyParams.keys()).length;
            if (!duplicatedParams) {
                const supportedLegacyParams = ['address', 'value'];
                // Iterate over
                for (const paramKeyValue of legacyParams) {
                    const paramKey = paramKeyValue[0];
                    if (!supportedLegacyParams.includes(paramKey)) {
                        // ignore unsupported params
                        continue;
                    }
                    txInfo[
                        paramKey as keyof Omit<CashtabTxInfo, 'parseAllAsBip21'>
                    ] = paramKeyValue[1];
                }
            }
        }
        // Only set txInfoFromUrl if you have valid legacy params or bip21
        const validUrlParams =
            (parseAllAsBip21 && 'bip21' in txInfo) ||
            // Good if we have both address and value
            ('address' in txInfo && 'value' in txInfo) ||
            // Good if we have address and no value
            ('address' in txInfo && !('value' in txInfo));
        // If we 'value' key with no address, no good
        // Note: because only the address and value keys are handled below,
        // it's not an issue if we get all kinds of other garbage params

        if (validUrlParams) {
            // This is a tx request from the URL

            // Save this flag in state var so it can be parsed in useEffect
            txInfo.parseAllAsBip21 = parseAllAsBip21;
            setTxInfoFromUrl(txInfo);

            // Check if this is an extension transaction by looking for tabId in URL parameters
            const urlParams = new URLSearchParams(txInfoStr);
            const tabId = urlParams.get('tabId');
            if (tabId) {
                setIsExtensionTransaction(true);
                setExtensionTabId(parseInt(tabId));
            }
        }
    }, []);

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

            const satoshisToSend =
                selectedCurrency === appConfig.ticker
                    ? toSatoshis(parseFloat(formData.amount))
                    : fiatToSatoshis(formData.amount, fiatPrice as number);

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

            // Build and broadcast using ecash-wallet
            // Split steps so we can get rawtx if we need to rebroadcast for paybutton
            const builtAction = ecashWallet.action(action).build();
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

        // Parse and set firma if it's in the query string
        if (
            typeof parsedAddressInput.firma !== 'undefined' &&
            typeof parsedAddressInput.firma.value === 'string' &&
            parsedAddressInput.firma.error === false
        ) {
            // If firma is valid, set it
            setParsedFirma(parseFirma(parsedAddressInput.firma.value));
        }
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
                    // Token info is already cached, validate firma parameter
                    const cachedTokenInfo = cashtabCache.tokens.get(tokenId);
                    if (
                        typeof cachedTokenInfo !== 'undefined' &&
                        typeof parsedAddressInput.firma !== 'undefined' &&
                        parsedAddressInput.firma.error === false
                    ) {
                        const { tokenType } = cachedTokenInfo;
                        const { type } = tokenType;
                        if (type !== 'ALP_TOKEN_TYPE_STANDARD') {
                            tokenRenderedError =
                                'Cannot include firma for a token type other than ALP_TOKEN_TYPE_STANDARD';
                        }
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
                amount: tokenQty,
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
        setTokenFormData(p => ({
            ...p,
            [name]: value,
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

        // Validate user input send amount
        const isValidAmountOrErrorMsg = isValidXecSendAmount(
            value,
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
            [name]: value,
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
        let maxSendSatoshis;
        try {
            // An error will be thrown if the wallet has insufficient funds to send more than dust
            maxSendSatoshis = getMaxSendAmountSatoshis(
                wallet,
                intendedTargetOutputs,
                chaintipBlockheight,
                settings.satsPerKb,
            );
        } catch {
            // Set to zero. In this case, 0 is the max amount we can send, and we know
            // this will trigger the expected dust validation error
            maxSendSatoshis = 0;
        }

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
    if (fiatPrice !== null && !isNaN(parseFloat(formData.amount))) {
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
                                fiatPrice * parseFloat(formData.amount)
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
                          toXec(fiatToSatoshis(formData.amount, fiatPrice)),
                          userLocale,
                      )
                    : formatFiatBalance(0, userLocale)
            } ${appConfig.ticker}`;
        }
    }

    const priceApiError =
        fiatPrice === null && selectedCurrency !== appConfig.ticker;

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
        priceApiError,
        isOneToManyXECSend,
    );

    // Check if token send button should be disabled
    const disableTokenSendButton =
        !selectedTokenId ||
        tokenFormData.address === '' ||
        tokenFormData.amount === '' ||
        sendTokenAmountError !== false ||
        sendAddressError !== false ||
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
                                ? `Send ${tokenFormData.amount} ${
                                      cashtabCache.tokens.get(selectedTokenId)
                                          ?.genesisInfo.tokenTicker || 'token'
                                  } to ${tokenFormData.address}`
                                : isOneToManyXECSend
                                  ? `Send
                                ${multiSendTotal.toLocaleString(userLocale, {
                                    maximumFractionDigits: 2,
                                })} 
                                XEC to multiple recipients?`
                                  : `Send ${formData.amount}${' '}
                  ${selectedCurrency} to ${parsedAddressInput.address.value}`
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
                        onClick={async () => {
                            // Close the window on any click off of the modal
                            setShowSuccessModal(false);
                            window.close();
                        }}
                    >
                        <SuccessModalContent
                            onClick={async e => {
                                // Close the window when clicking on the modal content
                                // (but not on interactive elements like copy button or link)
                                if (e.target === e.currentTarget) {
                                    setShowSuccessModal(false);
                                    window.close();
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
                                onClick={async () => {
                                    setShowSuccessModal(false);
                                    window.close();
                                }}
                            >
                                Close
                            </SuccessButton>
                        </SuccessModalContent>
                    </SuccessModalOverlay>
                )}

                <SwitchContainer>
                    <Switch
                        name="Toggle XEC/Token Mode"
                        on="Tokens"
                        off="XEC"
                        width={150}
                        right={115}
                        checked={isTokenMode}
                        bgColorOn={theme.secondaryAccent}
                        bgColorOff={theme.accent}
                        handleToggle={() => setIsTokenMode(!isTokenMode)}
                    />
                </SwitchContainer>
                {!isTokenMode && (
                    <SwitchContainer>
                        <Switch
                            name="Toggle Multisend"
                            on="Send to many"
                            off="Send to one"
                            width={150}
                            right={115}
                            checked={isOneToManyXECSend}
                            disabled={
                                txInfoFromUrl !== false ||
                                'queryString' in parsedAddressInput
                            }
                            handleToggle={() =>
                                setIsOneToManyXECSend(!isOneToManyXECSend)
                            }
                        />
                    </SwitchContainer>
                )}
                {isTokenMode ? (
                    <TokenFormContainer>
                        <TokenSelectDropdown>
                            {selectedTokenId ? (
                                <SelectedTokenDisplay>
                                    <SelectedTokenInfo>
                                        <TokenIcon
                                            size={32}
                                            tokenId={selectedTokenId}
                                        />
                                        <SelectedTokenDetails>
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
                                                    )?.[1].genesisInfo
                                                        .tokenTicker ||
                                                    ''}
                                            </SelectedTokenText>
                                            <SelectedTokenBalance>
                                                {formatBalance(
                                                    tokens.get(
                                                        selectedTokenId,
                                                    ) || '0',
                                                    userLocale,
                                                )}
                                            </SelectedTokenBalance>
                                            <SelectedTokenIdWrapper>
                                                <TokenIdPreview
                                                    tokenId={selectedTokenId}
                                                />
                                            </SelectedTokenIdWrapper>
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
                            ) : (
                                <TokenSelectInputWrapper>
                                    <Input
                                        placeholder="Start typing a token ticker or name"
                                        name="tokenSearch"
                                        value={tokenSearch}
                                        handleInput={handleTokenSearchInput}
                                    />
                                    {filteredTokens.length > 0 && (
                                        <TokenDropdownList>
                                            {filteredTokens.map(kv => (
                                                <TokenDropdownItem
                                                    key={kv[0]}
                                                    onClick={() =>
                                                        handleTokenSelect(kv[0])
                                                    }
                                                >
                                                    <TokenDropdownItemContent>
                                                        <TokenIcon
                                                            size={32}
                                                            tokenId={kv[0]}
                                                        />
                                                        <TokenDropdownItemInfo>
                                                            <TokenDropdownItemTicker>
                                                                {
                                                                    kv[1]
                                                                        .genesisInfo
                                                                        .tokenTicker
                                                                }
                                                            </TokenDropdownItemTicker>
                                                            <TokenDropdownItemBalance>
                                                                {formatBalance(
                                                                    kv[1]
                                                                        .balance,
                                                                    userLocale,
                                                                )}
                                                            </TokenDropdownItemBalance>
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
                                                        </TokenDropdownItemInfo>
                                                    </TokenDropdownItemContent>
                                                </TokenDropdownItem>
                                            ))}
                                        </TokenDropdownList>
                                    )}
                                </TokenSelectInputWrapper>
                            )}
                        </TokenSelectDropdown>
                        {selectedTokenId && (
                            <InputWithScanner
                                placeholder="Address"
                                name="address"
                                value={tokenFormData.address}
                                disabled={
                                    txInfoFromUrl !== false &&
                                    isBip21TokenSendWithTokenId(
                                        parsedAddressInput,
                                    ) &&
                                    selectedTokenId !== null &&
                                    parsedAddressInput.token_id?.value ===
                                        selectedTokenId
                                }
                                handleInput={e => {
                                    const parsed = parseAddressInput(
                                        e.target.value,
                                        balanceSats,
                                        userLocale,
                                    );
                                    handleTokenModeAddressChange(e, parsed);
                                }}
                                error={sendAddressError}
                            />
                        )}
                        {/* Show token amount input */}
                        {selectedTokenId && (
                            <SendTokenInput
                                name="amount"
                                placeholder="Amount"
                                value={tokenFormData.amount}
                                inputDisabled={
                                    isBip21TokenSendWithTokenId(
                                        parsedAddressInput,
                                    ) &&
                                    selectedTokenId !== null &&
                                    parsedAddressInput.token_id?.value ===
                                        selectedTokenId &&
                                    typeof parsedAddressInput.token_decimalized_qty !==
                                        'undefined' &&
                                    typeof parsedAddressInput
                                        .token_decimalized_qty.value ===
                                        'string' &&
                                    parsedAddressInput.token_decimalized_qty
                                        .value !== null &&
                                    parsedAddressInput.token_decimalized_qty
                                        .error === false
                                }
                                error={sendTokenAmountError}
                                handleInput={handleTokenAmountChange}
                                handleOnMax={onTokenMax}
                            />
                        )}
                        {/* Show BIP21 token send info in token mode (only if token_decimalized_qty is present) */}
                        {isBip21TokenSend(parsedAddressInput) &&
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
                                            {isValidFirmaRedeemTx(
                                                parsedAddressInput,
                                            ) ? (
                                                <ParsedTokenSend
                                                    style={{
                                                        marginBottom: '12px',
                                                    }}
                                                >
                                                    <FirmaRedeemLogoWrapper>
                                                        <FirmaIcon />
                                                        <TetherIcon />
                                                    </FirmaRedeemLogoWrapper>
                                                    <FirmaRedeemTextAndCopy>
                                                        On tx finalized,{' '}
                                                        {(
                                                            Number(
                                                                parsedAddressInput
                                                                    .token_decimalized_qty
                                                                    .value,
                                                            ) -
                                                            getFirmaRedeemFee(
                                                                Number(
                                                                    parsedAddressInput
                                                                        .token_decimalized_qty
                                                                        .value,
                                                                ),
                                                            )
                                                        ).toLocaleString(
                                                            userLocale,
                                                            {
                                                                maximumFractionDigits: 4,
                                                                minimumFractionDigits: 4,
                                                            },
                                                        )}{' '}
                                                        USDT will be sent to{' '}
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
                                                            showToast
                                                        />
                                                    </FirmaRedeemTextAndCopy>
                                                </ParsedTokenSend>
                                            ) : (
                                                <ParsedTokenSend
                                                    style={{
                                                        marginBottom: '12px',
                                                    }}
                                                >
                                                    <TokenIcon
                                                        size={64}
                                                        tokenId={
                                                            parsedAddressInput
                                                                .token_id.value
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
                            isBip21TokenSendWithTokenId(parsedAddressInput)) &&
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
                                <InputWithScanner
                                    placeholder={'Address'}
                                    name="address"
                                    value={formData.address}
                                    disabled={txInfoFromUrl !== false}
                                    handleInput={handleAddressChange}
                                    error={sendAddressError}
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
                                        name="amount"
                                        value={formData.amount}
                                        selectValue={selectedCurrency}
                                        selectDisabled={
                                            'amount' in parsedAddressInput ||
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
                                placeholder={`One address & amount per line, separated by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,500 \necash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,700`}
                                name="multiAddressInput"
                                handleInput={e => handleMultiAddressChange(e)}
                                value={formData.multiAddressInput}
                                error={multiSendAddressError}
                            />
                        </SendToManyHolder>
                    </InputModesHolder>
                )}
                {!isTokenMode && (
                    <SendXecForm>
                        <SendXecRow>
                            <SwitchAndLabel>
                                <Switch
                                    name="Toggle Cashtab Msg"
                                    on="✉️"
                                    off="✉️"
                                    checked={sendWithCashtabMsg}
                                    disabled={
                                        txInfoFromUrl !== false ||
                                        'queryString' in parsedAddressInput
                                    }
                                    handleToggle={() => {
                                        // If we are sending a Cashtab msg, toggle off op_return_raw
                                        if (
                                            !sendWithCashtabMsg &&
                                            sendWithOpReturnRaw
                                        ) {
                                            setSendWithOpReturnRaw(false);
                                        }
                                        setSendWithCashtabMsg(
                                            !sendWithCashtabMsg,
                                        );
                                    }}
                                />
                                <SwitchLabel>Cashtab Msg </SwitchLabel>
                            </SwitchAndLabel>
                        </SendXecRow>
                        {sendWithCashtabMsg && (
                            <SendXecRow>
                                <TextArea
                                    name="cashtabMsg"
                                    height={62}
                                    placeholder={`Include a public Cashtab msg with this tx ${
                                        location &&
                                        location.state &&
                                        location.state.airdropTokenId
                                            ? `(max ${
                                                  opreturnConfig.cashtabMsgByteLimit -
                                                  localAirdropTxAddedBytes
                                              } bytes)`
                                            : `(max ${opreturnConfig.cashtabMsgByteLimit} bytes)`
                                    }`}
                                    value={formData.cashtabMsg}
                                    error={cashtabMsgError}
                                    showCount
                                    customCount={getCashtabMsgByteCount(
                                        formData.cashtabMsg,
                                    )}
                                    max={
                                        location &&
                                        location.state &&
                                        location.state.airdropTokenId
                                            ? opreturnConfig.cashtabMsgByteLimit -
                                              localAirdropTxAddedBytes
                                            : opreturnConfig.cashtabMsgByteLimit
                                    }
                                    handleInput={e => handleCashtabMsgChange(e)}
                                />
                            </SendXecRow>
                        )}
                        <SendXecRow>
                            <SwitchAndLabel>
                                <Switch
                                    name="Toggle op_return_raw"
                                    checked={sendWithOpReturnRaw}
                                    disabled={
                                        txInfoFromUrl !== false ||
                                        'queryString' in parsedAddressInput
                                    }
                                    handleToggle={() => {
                                        // If we are sending with op_return_raw, toggle off CashtabMsg
                                        if (
                                            !sendWithOpReturnRaw &&
                                            sendWithCashtabMsg
                                        ) {
                                            setSendWithCashtabMsg(false);
                                        }
                                        setSendWithOpReturnRaw(
                                            !sendWithOpReturnRaw,
                                        );
                                    }}
                                />
                                <SwitchLabel>op_return_raw</SwitchLabel>
                            </SwitchAndLabel>
                        </SendXecRow>
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
                                                <TetherIcon />
                                            </FirmaRedeemLogoWrapper>
                                            <FirmaRedeemTextAndCopy>
                                                On tx finalized,{' '}
                                                {(
                                                    Number(
                                                        parsedAddressInput
                                                            .token_decimalized_qty
                                                            .value,
                                                    ) -
                                                    getFirmaRedeemFee(
                                                        Number(
                                                            parsedAddressInput
                                                                .token_decimalized_qty
                                                                .value,
                                                        ),
                                                    )
                                                ).toLocaleString(userLocale, {
                                                    maximumFractionDigits: 4,
                                                    minimumFractionDigits: 4,
                                                })}{' '}
                                                USDT will be sent to{' '}
                                                {parsedFirma.data.slice(0, 3)}
                                                ...
                                                {parsedFirma.data.slice(
                                                    -3,
                                                )}{' '}
                                                <CopyIconButton
                                                    name="Copy SOL addr"
                                                    data={parsedFirma.data}
                                                    showToast
                                                />
                                            </FirmaRedeemTextAndCopy>
                                        </ParsedTokenSend>
                                    ) : (
                                        <ParsedTokenSend>
                                            <TokenIcon
                                                size={64}
                                                tokenId={
                                                    parsedAddressInput.token_id
                                                        .value
                                                }
                                            />
                                            Sending {decimalizedTokenQty}{' '}
                                            {nameAndTicker} to {addressPreview}
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
                        {sendWithOpReturnRaw && (
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
                                            'queryString' in parsedAddressInput
                                        }
                                        showCount
                                        max={
                                            2 * opReturn.opreturnParamByteLimit
                                        }
                                        handleInput={handleOpReturnRawInput}
                                    />
                                </SendXecRow>
                                {opReturnRawError === false &&
                                    formData.opReturnRaw !== '' && (
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
                                                    parsedAddressInput.address
                                                        .value as string
                                                }
                                            >{`${(
                                                parsedAddressInput.address
                                                    .value as string
                                            ).slice(6, 12)}...${(
                                                parsedAddressInput.address
                                                    .value as string
                                            ).slice(-6)}, ${parseFloat(
                                                parsedAddressInput.amount.value,
                                            ).toLocaleString(userLocale, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} XEC`}</li>
                                            {Array.from(
                                                parsedAddressInput
                                                    .parsedAdditionalXecOutputs
                                                    .value,
                                            ).map(([addr, amount], index) => {
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
                                            })}
                                        </ol>
                                    </ParsedBip21Info>
                                </ParsedBip21InfoRow>
                            </SendXecRow>
                        )}
                    </SendXecForm>
                )}

                <AmountPreviewCtn>
                    {!priceApiError && (
                        <>
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
                                    {!isNaN(parseFloat(formData.amount))
                                        ? formatBalance(
                                              formData.amount,
                                              userLocale,
                                          ) +
                                          ' ' +
                                          selectedCurrency
                                        : ''}
                                </LocaleFormattedValue>
                            )}
                            <ConvertAmount>
                                {fiatPriceString !== '' && '='}{' '}
                                {fiatPriceString}
                            </ConvertAmount>
                        </>
                    )}
                </AmountPreviewCtn>
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
                                              parsedAddressInput.token_id.value
                                            ? tokenError !== false ||
                                              tokenIdQueryError ||
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
                                              parsedAddressInput.token_id.value
                                            ? checkForConfirmationBeforeBip21TokenSend
                                            : checkForConfirmationBeforeSendToken
                                        : isBip21TokenSend(parsedAddressInput)
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
                                    : (!isBip21TokenSend(parsedAddressInput) &&
                                          disableSendButton) ||
                                      (isBip21TokenSend(parsedAddressInput) &&
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
            </OuterCtn>
        </>
    );
};

export default SendXec;
