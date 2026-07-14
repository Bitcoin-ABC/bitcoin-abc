// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import PrimaryButton, {
    SecondaryButton,
    IconButton,
    CopyIconButton,
} from 'components/Common/Buttons';
import { Info, Alert } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import { Event } from 'components/Common/GoogleAnalytics';
import ApiError from 'components/Common/ApiError';
import {
    isValidTokenSendOrBurnAmount,
    parseAddressInput,
    isValidTokenMintAmount,
    getXecListPriceError,
    getAgoraPartialListPriceError,
    NANOSAT_DECIMALS,
    isValidTokenId,
    getAgoraMinBuyError,
} from 'validation';
import BigNumber from 'bignumber.js';
import {
    formatDate,
    getFormattedFiatPrice,
    getAgoraSpotPriceXec,
    decimalizedTokenQtyToLocaleFormat,
    toFormattedXec,
} from 'formatting';
import TokenIcon from 'components/Etokens/TokenIcon';
import { explorer } from 'config/explorer';
import { token as tokenConfig } from 'config/token';
import { isValidCashAddress } from 'ecashaddrjs';
import appConfig from 'config/app';
import { getUserLocale } from 'helpers';
import { getMintBatons } from 'token-protocols/slpv1';
import { getMaxDecimalizedQty } from 'token-protocols';
import {
    decimalizeTokenAmount,
    toSatoshis,
    toXec,
    undecimalizeTokenAmount,
    xecToNanoSatoshis,
    TokenUtxo,
    SlpDecimals,
    ScriptUtxoWithToken,
} from 'wallet';
import Modal from 'components/Common/Modal';
import { toast } from 'react-toastify';
import { confirmBiometricBroadcast } from 'services/biometricLockService';
import {
    InputWithScanner,
    SendTokenInput,
    ModalInput,
    InputFlex,
    ListPriceInput,
    Slider,
    LabelAndInputFlex,
    SliderLabel,
} from 'components/Common/Inputs';
import { QuestionIcon } from 'components/Common/CustomIcons';
import { ReactComponent as DownArrow } from 'assets/drop-down-arrow.svg';
import {
    DataAndQuestionButton,
    TokenIconExpandButton,
    SendTokenForm,
    SendTokenFormRow,
    InputRow,
    SectionCtn,
    SectionLabel,
    TokenStatsTable,
    TokenStatsRow,
    TokenStatsCol,
    TokenUrlCol,
    TokenStatsTableRow,
    TokenInfoRow,
    NftTitle,
    NftTable,
    NftRow,
    NftCol,
    NftTokenIdAndCopyIcon,
    NftNameTitle,
    NftCollectionTitle,
    ListPricePreview,
    AgoraPreviewParagraph,
    AgoraPreviewTable,
    AgoraPreviewRow,
    AgoraPreviewLabel,
    AgoraPreviewCol,
    TokenScreenWrapper,
    NftOfferWrapper,
    OuterCtn,
    TokenStatsRowCtn,
    TokenActionBar,
    TokenActionBtn,
    TokenActionMoreWrap,
    TokenActionDropdown,
    TokenActionDropdownItem,
} from 'components/Etokens/Token/styled';
import CreateTokenForm from 'components/Etokens/CreateTokenForm';
import {
    getAllTxHistoryByTokenId,
    getChildNftsFromParent,
    getTokenGenesisInfo,
} from 'chronik';
import { GenesisInfo } from 'chronik-client';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import {
    slpSend,
    SLP_NFT1_CHILD,
    SLP_TOKEN_TYPE_NFT1_CHILD,
    Script,
    payment,
    TokenType,
} from 'ecash-lib';
import { InlineLoader } from 'components/Common/Spinner';
import { AgoraOneshot, AgoraPartial, getAgoraPaymentAction } from 'ecash-agora';
import OrderBook from 'components/Agora/OrderBook';
import Collection, {
    OneshotSwiper,
    OneshotOffer,
} from 'components/Agora/Collection';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { confirmRawTx } from 'components/Send/helpers';
import {
    FIRMA,
    XECX_SWEEPER_ADDRESS,
    FIRMA_REDEEM_ADDRESS,
} from 'constants/tokens';
import {
    FIRMA_DISPLAY_NAME,
    FIRMA_DISPLAY_TICKER,
    applyTokenDisplayOverrides,
} from 'constants/tokenDisplayOverrides';
import UncontrolledLink from 'components/Common/UncontrolledLink';

const Token: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const {
        apiError,
        cashtabState,
        updateCashtabState,
        chronik,
        agora,
        fiatPrice,
        ecashWallet,
    } = ContextValue;
    const { settings, cashtabCache, tokens } = cashtabState;
    if (!ecashWallet || !tokens) {
        return null;
    }
    // Get token UTXOs from ecashWallet.utxos
    const tokenUtxos = ecashWallet.utxos.filter(
        (utxo): utxo is TokenUtxo => utxo.token !== undefined,
    );
    const balanceSats = Number(ecashWallet.balanceSats);

    const { tokenId } = useParams();

    if (typeof tokenId === 'undefined') {
        // We can't render this component without tokenId, any tokenId
        return null;
    }

    const validTokenId = isValidTokenId(tokenId);

    const tokenBalance = tokens.get(tokenId);
    const cachedInfo: undefined | CashtabCachedTokenInfo =
        cashtabCache.tokens.get(tokenId);
    const cachedInfoLoaded = typeof cachedInfo !== 'undefined';

    let tokenType: undefined | TokenType,
        protocol: undefined | 'SLP' | 'ALP' | 'UNKNOWN',
        genesisInfo: undefined | GenesisInfo,
        genesisSupply: undefined | string,
        tokenName: undefined | string,
        tokenTicker: undefined | string,
        url: undefined | string,
        hash: undefined | string,
        decimals: undefined | number;

    if (cachedInfoLoaded) {
        ({ tokenType, genesisInfo, genesisSupply } = cachedInfo);
        tokenType = tokenType as unknown as TokenType | undefined;
        ({ protocol } = tokenType as any);
        const displayGenesisInfo = applyTokenDisplayOverrides(
            tokenId,
            genesisInfo,
        );
        ({ tokenName, tokenTicker, url, hash, decimals } = displayGenesisInfo);
    }

    let isSupportedToken = false;
    let isNftParent = false;
    let isNftChild = false;
    let isAlp = false;

    // Assign default values which will be presented for any token without explicit support
    let renderedTokenType =
        typeof tokenType !== 'undefined'
            ? `${protocol} ${tokenType.number} ${tokenType.type}`
            : 'Loading token info...';
    let renderedTokenDescription =
        'This token is not yet supported by Cashtab.';
    switch (protocol) {
        case 'SLP': {
            switch (tokenType?.type) {
                case 'SLP_TOKEN_TYPE_FUNGIBLE': {
                    renderedTokenType = 'SLP';
                    renderedTokenDescription =
                        'SLP 1 fungible token. Token may be of fixed supply if no mint batons exist. If you have a mint baton, you can mint more of this token at any time. May have up to 9 decimal places.';
                    isSupportedToken = true;
                    break;
                }
                case 'SLP_TOKEN_TYPE_NFT1_GROUP': {
                    renderedTokenType = 'NFT Collection';
                    renderedTokenDescription =
                        'The parent tokens for an NFT collection. Can be used to mint NFTs. No decimal places. The supply of this token is the potential quantity of NFTs which could be minted. If no mint batons exist, the supply is fixed.';
                    isSupportedToken = true;
                    isNftParent = true;
                    break;
                }
                case 'SLP_TOKEN_TYPE_NFT1_CHILD': {
                    renderedTokenType = 'NFT';
                    renderedTokenDescription =
                        'eCash NFT. NFT supply is always 1. This NFT may belong to an NFT collection.';
                    isSupportedToken = true;
                    isNftChild = true;
                    break;
                }
                case 'SLP_TOKEN_TYPE_MINT_VAULT': {
                    renderedTokenType = 'SLP 2';
                    renderedTokenDescription =
                        'SLP 2 mint vault token. Any utxo at the mint vault address may mint additional supply.';
                    isSupportedToken = true;
                    break;
                }
                default: {
                    // leave renderedTokenType and renderedTokenDescription as defaults
                    break;
                }
            }
            break;
        }
        case 'ALP': {
            renderedTokenType = 'ALP';
            switch (tokenType?.type) {
                case 'ALP_TOKEN_TYPE_STANDARD': {
                    renderedTokenType = 'ALP';
                    renderedTokenDescription =
                        'ALP v1 fungible token. Token may be of fixed or variable supply. If you have a mint baton, you can mint more of this token at any time. May have up to 9 decimal places. ALP tokens use EMPP technology, which supports more token actions compared to SLP and more complex combinations of token and app actions. ALP token txs may have up to 127 outputs, though current OP_RETURN size de facto limits a single tx to 29 outputs.';
                    isSupportedToken = true;
                    isAlp = true;
                    break;
                }
                default: {
                    // leave renderedTokenType and renderedTokenDescription as defaults
                    break;
                }
            }
            break;
        }
        default: {
            // leave renderedTokenType and renderedTokenDescription as defaults
            break;
        }
    }

    const [isBlacklisted, setIsBlacklisted] = useState<null | boolean>(null);
    const [chronikQueryError, setChronikQueryError] = useState<boolean>(false);
    const [nftTokenIds, setNftTokenIds] = useState<string[]>([]);
    const ownedNftTokenIdsInCollection = useMemo(() => {
        if (!isNftParent) {
            return [];
        }
        const ownedNftTokenIds = new Set<string>();
        tokens.forEach((balance, ownedTokenId) => {
            if (new BigNumber(balance).lte(0)) {
                return;
            }
            const cachedTokenInfo = cashtabCache.tokens.get(ownedTokenId);
            if (
                cachedTokenInfo?.tokenType.type ===
                    'SLP_TOKEN_TYPE_NFT1_CHILD' &&
                cachedTokenInfo.groupTokenId === tokenId
            ) {
                ownedNftTokenIds.add(ownedTokenId);
            }
        });
        for (const childNftTokenId of nftTokenIds) {
            const balance = tokens.get(childNftTokenId);
            if (
                typeof balance !== 'undefined' &&
                new BigNumber(balance).gt(0)
            ) {
                ownedNftTokenIds.add(childNftTokenId);
            }
        }
        return [...ownedNftTokenIds];
    }, [isNftParent, tokenId, tokens, nftTokenIds, cashtabCache.tokens]);
    const [availableNftInputs, setAvailableNftInputs] = useState<number>(0);
    const [showTokenTypeInfo, setShowTokenTypeInfo] = useState<boolean>(false);
    const [showAgoraPartialInfo, setShowAgoraPartialInfo] =
        useState<boolean>(false);
    const [sendTokenAddressError, setSendTokenAddressError] = useState<
        false | string
    >(false);
    const [sendTokenAmountError, setSendTokenAmountError] = useState<
        false | string
    >(false);
    const [showConfirmBurnEtoken, setShowConfirmBurnEtoken] =
        useState<boolean>(false);
    const [burnTokenAmountError, setBurnTokenAmountError] = useState<
        false | string
    >(false);
    const [mintAmountError, setMintAmountError] = useState<false | string>(
        false,
    );
    const [burnConfirmationError, setBurnConfirmationError] = useState<
        false | string
    >(false);
    const [confirmationOfEtokenToBeBurnt, setConfirmationOfEtokenToBeBurnt] =
        useState<string>('');
    const [isBurning, setIsBurning] = useState<boolean>(false);
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        appConfig.ticker,
    );
    const [nftListPriceError, setNftListPriceError] = useState<false | string>(
        false,
    );
    const [tokenListPriceError, setTokenListPriceError] = useState<
        false | string
    >(false);
    const [showConfirmListNft, setShowConfirmListNft] =
        useState<boolean>(false);
    const [showConfirmListPartialSlp, setShowConfirmListPartialSlp] =
        useState<boolean>(false);
    const [agoraPartialTokenQty, setAgoraPartialTokenQty] =
        useState<string>('');
    const [agoraPartialTokenQtyError, setAgoraPartialTokenQtyError] = useState<
        false | string
    >(false);
    const [agoraPartialMin, setAgoraPartialMin] = useState<string>('');
    const [agoraPartialMinError, setAgoraPartialMinError] = useState<
        false | string
    >(false);
    // We need to build an agora partial and keep it in state so the user is able
    // to confirm the actual offer is reasonable vs their inputs, which are approximations
    const [previewedAgoraPartial, setPreviewedAgoraPartial] =
        useState<null | AgoraPartial>(null);

    const [
        previewedAgoraPartialUnacceptable,
        setPreviewedAgoraPartialUnacceptable,
    ] = useState<boolean>(false);
    const [nftActiveOffer, setNftActiveOffer] = useState<null | OneshotOffer[]>(
        null,
    );
    const [nftOfferAgoraQueryError, setNftOfferAgoraQueryError] =
        useState<boolean>(false);
    const [firmaBidPrice, setFirmaBidPrice] = useState<null | number>(null);
    const [tokenDetailsExpanded, setTokenDetailsExpanded] =
        useState<boolean>(false);

    // By default, we load the app with all switches disabled
    // For SLP v1 tokens, we want showSend to be enabled by default
    // But we may not want this to be default for other token types in the future
    interface TokenScreenSwitches {
        showRedeemXecx: boolean;
        showRedeemFirma: boolean;
        showSend: boolean;
        showAirdrop: boolean;
        showBurn: boolean;
        showMint: boolean;
        showMintNft: boolean;
        showSellNft: boolean;
        showSellSlp: boolean;
    }
    const switchesOff: TokenScreenSwitches = {
        showRedeemXecx: false,
        showRedeemFirma: false,
        showSend: false,
        showAirdrop: false,
        showBurn: false,
        showMint: false,
        showMintNft: false,
        showSellNft: false,
        showSellSlp: false,
    };
    const [switches, setSwitches] = useState<TokenScreenSwitches>(switchesOff);

    type TokenActionType =
        | 'buy'
        | 'sell'
        | 'send'
        | 'airdrop'
        | 'burn'
        | 'redeemXecx'
        | 'redeemFirma'
        | 'sellNft'
        | 'sellSlp'
        | 'mintNft'
        | 'mint';
    const [activeTokenAction, setActiveTokenAction] =
        useState<TokenActionType>('buy');
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const moreDropdownRef = useRef<HTMLDivElement>(null);

    const setAction = (action: TokenActionType) => {
        setActiveTokenAction(action);
        setMoreDropdownOpen(false);
        if (action === 'buy') {
            setSwitches(switchesOff);
            return;
        }
        setSwitches({
            ...switchesOff,
            ...(action === 'redeemXecx' && { showRedeemXecx: true }),
            ...(action === 'redeemFirma' && { showRedeemFirma: true }),
            ...(action === 'send' && { showSend: true }),
            ...(action === 'airdrop' && { showAirdrop: true }),
            ...(action === 'burn' && { showBurn: true }),
            ...(action === 'sellNft' && { showSellNft: true }),
            ...(action === 'sellSlp' && { showSellSlp: true }),
            ...(action === 'mintNft' && { showMintNft: true }),
            ...(action === 'mint' && { showMint: true }),
        });
    };
    const [showLargeIconModal, setShowLargeIconModal] =
        useState<boolean>(false);
    const [showLargeNftIcon, setShowLargeNftIcon] = useState<string>('');
    interface UncachedTokenInfo {
        circulatingSupply: null | string;
        mintBatons: null | number;
    }
    const defaultUncachedTokenInfo: UncachedTokenInfo = {
        circulatingSupply: null,
        mintBatons: null,
    };
    const [uncachedTokenInfo, setUncachedTokenInfo] =
        useState<UncachedTokenInfo>(defaultUncachedTokenInfo);
    const [uncachedTokenInfoError, setUncachedTokenInfoError] =
        useState<boolean>(false);

    // Check if the user has mint batons for this token
    // If they don't, disable the mint switch and label why
    const mintBatons = getMintBatons(tokenUtxos, tokenId as string);

    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [confirmMintModalVisible, setConfirmMintModalVisible] =
        useState<boolean>(false);

    interface TokenScreenFormData {
        amount: string;
        address: string;
        burnAmount: string;
        mintAmount: string;
        nftListPrice: string;
        tokenListPrice: string;
    }
    const emptyFormData: TokenScreenFormData = {
        amount: '',
        address: '',
        burnAmount: '',
        mintAmount: '',
        nftListPrice: '',
        tokenListPrice: '',
    };

    const [formData, setFormData] =
        useState<TokenScreenFormData>(emptyFormData);

    const [isCalculatingRedeemFirma, setIsCalculatingRedeemFirma] =
        useState<boolean>(false);

    const [xecxSweeperBalanceSats, setXecxSweeperBalanceSats] = useState<
        null | bigint
    >(null);

    const [maxFirmaRedeemSats, setMaxFirmaRedeemSats] = useState<null | bigint>(
        null,
    );

    const userLocale = getUserLocale(navigator);

    const isRedeemingFirma =
        tokenId === FIRMA.tokenId && switches.showRedeemFirma;

    const canRedeemFirma =
        maxFirmaRedeemSats !== null &&
        previewedAgoraPartial !== null &&
        maxFirmaRedeemSats >
            previewedAgoraPartial.askedSats(
                previewedAgoraPartial.offeredAtoms(),
            );

    const firmaRedeemErrorMsg =
        maxFirmaRedeemSats === null
            ? `Unable to fetch $${FIRMA_DISPLAY_TICKER} redeem hot wallet balance`
            : `Hot wallet balance cannot support redemptions of more than ${toXec(
                  maxFirmaRedeemSats,
              ).toLocaleString(userLocale, {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
              })} XEC worth of $${FIRMA_DISPLAY_TICKER}. Top-up pending.`;

    const getAgoraPartialActualPrice = () => {
        if (previewedAgoraPartial === null) {
            return;
        }
        // Due to encoding limitations of agora offers, the actual price may vary depending on how
        // much of an offer the buyer accepts
        // Calculate the actual price by determining the price per token for the minimum buy of the created preview offer

        // Get min accepted tokens
        // Note this value is in token satoshis
        const minAcceptedTokenSatoshis =
            previewedAgoraPartial.minAcceptedAtoms();
        // Get the cost for accepting the min offer
        // Note this price is in satoshis (per token satoshi)
        const minAcceptPriceSats = previewedAgoraPartial.askedSats(
            minAcceptedTokenSatoshis,
        );
        const minAcceptedPriceXec = toXec(Number(minAcceptPriceSats));
        // Decimalize token amount
        const minAcceptedTokens = decimalizeTokenAmount(
            minAcceptedTokenSatoshis.toString(),
            decimals as SlpDecimals,
        );
        // Get the unit price
        // Use BigNumber because this could be less than 1 satoshi
        const actualPricePerToken = new BigNumber(minAcceptedPriceXec).div(
            new BigNumber(minAcceptedTokens),
        );
        // Get formatted price in XEC
        const renderedActualPrice = getAgoraSpotPriceXec(
            actualPricePerToken.toNumber(),
            userLocale,
        );

        return renderedActualPrice;
    };

    const getAgoraPartialTargetPriceXec = () => {
        if (formData.tokenListPrice === '') {
            return;
        }
        // Get the price per token, in XEC, based on the user's input settings
        // Used for a visual comparison with the calculated actual price in XEC
        // from the created Agora Partial (which we get from getAgoraPartialActualPrice())

        const targetPriceXec =
            selectedCurrency === appConfig.ticker
                ? formData.tokenListPrice
                : // NB for selectedCurrency to be fiat fiatPrice is not null
                  parseFloat(formData.tokenListPrice) / (fiatPrice as number);

        return getAgoraSpotPriceXec(targetPriceXec, userLocale);
    };

    /**
     * Get price preview of per-token agora partial pricing
     * Depends on user currency selection and locale
     */
    const getAgoraPartialPricePreview = () => {
        // Make sure you have the state fields you need to render
        if (
            typeof userLocale !== 'string' ||
            typeof formData === 'undefined' ||
            formData.tokenListPrice === '' ||
            typeof settings !== 'object' ||
            typeof fiatPrice === 'undefined'
        ) {
            return;
        }
        let inputPrice = formData.tokenListPrice;
        if (inputPrice === '') {
            inputPrice = '0';
        }
        return selectedCurrency === appConfig.ticker
            ? `${getAgoraSpotPriceXec(
                  inputPrice,
                  userLocale,
              )} (${getFormattedFiatPrice(
                  settings.fiatCurrency,
                  userLocale,
                  inputPrice,
                  fiatPrice,
              )}) per token`
            : `${supportedFiatCurrencies[settings.fiatCurrency].symbol}${
                  parseFloat(inputPrice) > 1
                      ? parseFloat(inputPrice).toLocaleString(userLocale)
                      : inputPrice
              } ${selectedCurrency.toUpperCase()} (${getAgoraSpotPriceXec(
                  parseFloat(inputPrice) / (fiatPrice as number),
                  userLocale,
              )}) per token`;
    };

    const getTokenBlacklistStatus = async () => {
        // Fetch server-maintained blacklist
        let blacklistStatus;
        try {
            blacklistStatus = (
                await (
                    await fetch(
                        `${tokenConfig.blacklistServerUrl}/blacklist/${tokenId}`,
                    )
                ).json()
            ).isBlacklisted;
            setIsBlacklisted(blacklistStatus);
            if (blacklistStatus) {
                const defaultAction: TokenActionType = isNftParent
                    ? 'mintNft'
                    : isNftChild
                      ? 'send'
                      : 'burn';
                setAction(defaultAction);
            }
        } catch (err) {
            console.error(
                `Error fetching blacklistStatus from ${tokenConfig.blacklistServerUrl}/blacklist/${tokenId}`,
                err,
            );
            // Assume it's ok
            setIsBlacklisted(false);
        }
    };

    const getUncachedTokenInfo = async () => {
        let tokenUtxos;
        try {
            tokenUtxos = await chronik.tokenId(tokenId).utxos();
            let undecimalizedBigIntCirculatingSupply = 0n;
            let mintBatons = 0;
            for (const utxo of tokenUtxos.utxos) {
                // getting utxos by tokenId returns only token utxos
                const { token } = utxo as ScriptUtxoWithToken;
                const { atoms, isMintBaton } = token;
                undecimalizedBigIntCirculatingSupply += atoms;
                if (isMintBaton) {
                    mintBatons += 1;
                }
            }
            const circulatingSupply = decimalizeTokenAmount(
                undecimalizedBigIntCirculatingSupply.toString(),
                decimals as SlpDecimals,
            );

            setUncachedTokenInfo({ circulatingSupply, mintBatons });
        } catch (err) {
            console.error(`Error in chronik.tokenId(${tokenId}).utxos()`, err);
            setUncachedTokenInfoError(true);
        }
    };

    const addTokenToCashtabCache = async (tokenId: string) => {
        try {
            const cachedInfoWithGroupTokenId = await getTokenGenesisInfo(
                chronik,
                tokenId,
            );
            cashtabCache.tokens.set(tokenId, cachedInfoWithGroupTokenId);
            updateCashtabState({ cashtabCache: cashtabCache });
        } catch (err) {
            console.error(`Error getting token details for ${tokenId}`, err);
            setChronikQueryError(true);
        }
    };

    const getXecxSweeperBalance = async () => {
        let sweeperUtxos;
        try {
            sweeperUtxos = (await chronik.address(XECX_SWEEPER_ADDRESS).utxos())
                .utxos;
            const balanceSats = sweeperUtxos
                .map(utxo => utxo.sats)
                .reduce((prev, curr) => prev + curr, 0n);
            setXecxSweeperBalanceSats(balanceSats);
        } catch (err) {
            // If there is some error in getting the utxo set of the sweeper address,
            // we will not be able to get the balance, and Cashtab will simply not show
            // this information
            console.error(`Error getting XECX Sweeper balance`, err);
        }
    };

    const getFirmaRedeemBalance = async () => {
        let utxos;
        try {
            utxos = (await chronik.address(FIRMA_REDEEM_ADDRESS).utxos()).utxos;
            const maxFirmaRedeemSats = utxos
                .map(utxo => utxo.sats)
                .reduce((prev, curr) => prev + curr, 0n);
            console.log(`maxFirmaRedeemSats`, maxFirmaRedeemSats);
            setMaxFirmaRedeemSats(maxFirmaRedeemSats);
        } catch (err) {
            // If there is some error in getting the utxo set of the sweeper address,
            // we will not be able to get the balance, and Cashtab will simply not show
            // this information
            console.error(`Error getting FIRMA Sweeper balance`, err);
        }
    };

    const getFirmaBidPrice = async () => {
        try {
            const firmaBidPriceResp = await fetch(
                `https://firmaprotocol.com/api/bid`,
            );
            const firmaBidPriceJson = await firmaBidPriceResp.json();
            const bidPrice = firmaBidPriceJson.bid;
            console.info(`FIRMA buys at: ${bidPrice} XEC`);
            setFirmaBidPrice(bidPrice);
        } catch (err) {
            console.error(`Error fetching FIRMA bid price`, err);
            // Don't show error to user, just log it
            // The warning will simply not show if we can't fetch the price
        }
    };

    useEffect(() => {
        if (tokenId === appConfig.vipTokens.xecx.tokenId) {
            // Get XECX sweeper balance when user is on xecx token page
            getXecxSweeperBalance();
        } else if (tokenId === FIRMA.tokenId) {
            // Get balance of the FIRMA redeem hot wallet when user is on firma token page
            getFirmaRedeemBalance();
            // Get FIRMA bid price for listing price validation
            getFirmaBidPrice();
        }
    }, [tokenId]);

    useEffect(() => {
        if (
            typeof tokenId === 'undefined' ||
            typeof tokenType === 'undefined' ||
            !cachedInfoLoaded
        ) {
            return;
        }
        if (tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
            // Check if we have its groupTokenId
            if (typeof cachedInfo.groupTokenId === 'undefined') {
                // If this is an NFT and its groupTokenId is not cached
                // Update this tokens cached info
                // Note, use of "tokenId" here and not "groupTokenId" is not an error
                // cashtabCache used to not track groupTokenIds, now it does, so we update it
                addTokenToCashtabCache(tokenId);
            } else {
                // If we do have a groupTokenId, check if we have cached token info about the group
                const nftCollectionCachedInfo = cashtabCache.tokens.get(
                    cachedInfo.groupTokenId,
                );
                if (typeof nftCollectionCachedInfo === 'undefined') {
                    // If we do not have the NFT collection token info in cache, add it
                    addTokenToCashtabCache(cachedInfo.groupTokenId);
                }
            }
        }
    }, [tokenId, cachedInfo]);

    useEffect(() => {
        if (!validTokenId) {
            // No need to ask chronik for an expected error
            return;
        }
        if (typeof cashtabCache.tokens.get(tokenId) === 'undefined') {
            // If we do not have this token's info, get it
            addTokenToCashtabCache(tokenId as string);
        } else {
            // Get token info that is not practical to cache as it is subject to change
            // Note that we need decimals from cache for supply to be accurate
            getUncachedTokenInfo();

            // Get token blacklist status
            getTokenBlacklistStatus();
        }
    }, [tokenId, cashtabCache.tokens.get(tokenId)]);

    useEffect(() => {
        setIsBlacklisted(null);
        setActiveTokenAction('buy');
        setSwitches(switchesOff);
    }, [tokenId]);

    useEffect(() => {
        if (formData.tokenListPrice === '' || agoraPartialTokenQty === '') {
            // If we have no price or no offered qty, do nothing
            // Min buy is the last field entered
            return;
        }

        const isRedeemingXecx =
            tokenId === appConfig.vipTokens.xecx.tokenId &&
            switches.showRedeemXecx;

        let agoraPartialMinToValidate = agoraPartialMin;
        // If the user has not yet entered the min quantity, enter THE MINIMUM ALLOWED min qty as default
        if (agoraPartialMin === '' || isRedeemingXecx) {
            // If agoraPartialMin is unset OR if we are redeeming XECX
            // Then we must update agoraPartialMin when agoraPartialTokenQty changes
            if (parseFloat(formData.tokenListPrice) === 0) {
                // We can get here if the user is typing, e.g. 0.0001
                // We do not want to setAgoraPartialMin(Infinity)
                return;
            }

            const requiredMinBuyTokenQty = isRedeemingXecx
                ? // If this is XECX and the user is trying to redeem, the min is the total offered
                  agoraPartialTokenQty
                : // Otherwise it is the value that would be worth dust if sold
                  new BigNumber(toXec(appConfig.dustSats))
                      .div(formData.tokenListPrice)
                      .decimalPlaces(
                          decimals as SlpDecimals,
                          BigNumber.ROUND_UP,
                      )
                      .toString();

            // Set it as the min
            // "return" as this change will trigger validation, we will re-enter this useEffect
            // "should" always be valid tho
            setAgoraPartialMin(requiredMinBuyTokenQty);

            // We want to validate this here because the calculated min could be higher than the
            // total offered qty
            agoraPartialMinToValidate = requiredMinBuyTokenQty;
        }

        // Normal validation, there may be some other reason agoraPartialMin is still invalid
        const agoraMinBuyError = getAgoraMinBuyError(
            formData.tokenListPrice as string,
            selectedCurrency,
            fiatPrice,
            agoraPartialMinToValidate,
            agoraPartialTokenQty,
            decimals as SlpDecimals,
            // Component does not render until token info is defined
            protocol as 'ALP' | 'SLP',
            tokenBalance as string, // we do not render the slide without tokenBalance
            userLocale,
        );
        setAgoraPartialMinError(agoraMinBuyError);
    }, [formData.tokenListPrice, agoraPartialTokenQty]);

    const getNftOffer = async () => {
        try {
            const thisNftOffer = await agora.activeOffersByTokenId(tokenId);
            // Note we only expect an array of length 0 or 1 here
            // We only call this function on NFTs so we only expect OneshotOffer[]
            setNftActiveOffer(thisNftOffer as OneshotOffer[]);
        } catch {
            console.error(
                `Error querying agora.activeOffersByTokenId(${tokenId})`,
            );
            setNftOfferAgoraQueryError(true);
        }
    };

    useEffect(() => {
        if (!isSupportedToken || typeof tokenType === 'undefined') {
            return;
        }
        // Load NFT offer data when viewing an NFT child token (for sell UI)
        if (isNftChild) {
            getNftOffer();
        }
    }, [isSupportedToken, isNftParent, isNftChild]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                moreDropdownRef.current &&
                !moreDropdownRef.current.contains(e.target as Node)
            ) {
                setMoreDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (switches.showRedeemXecx) {
            // If the user is redeeming XECX

            // Set selected currency to XEC
            setSelectedCurrency(appConfig.ticker);

            // Set the listing price to 1 XEC
            setFormData({
                ...formData,
                tokenListPrice: '1',
            });
        }
    }, [switches]);

    useEffect(() => {
        if (fiatPrice === null && selectedCurrency !== appConfig.ticker) {
            // Clear NFT and Token list prices and de-select fiat currency if rate is unavailable
            handleSelectedCurrencyChange({
                target: { value: appConfig.ticker },
            } as React.ChangeEvent<HTMLSelectElement>);
        }
    }, [fiatPrice]);

    const getNfts = async (tokenId: string) => {
        const nftParentTxHistory = await getAllTxHistoryByTokenId(
            chronik,
            tokenId,
        );
        const childNfts = getChildNftsFromParent(tokenId, nftParentTxHistory);
        setNftTokenIds(childNfts);
    };

    useEffect(() => {
        // On change of wallet token utxo set

        if (isNftParent) {
            // If this is an SLP1 NFT Parent
            // Update the child NFTs
            getNfts(tokenId as string);
            // Get total amount of available parent token UTXOs (any qty >= 1)
            // ecash-wallet will automatically create qty-1 inputs if needed
            const availableNftMintInputs = tokenUtxos.filter(
                (slpUtxo: TokenUtxo) =>
                    slpUtxo?.token?.tokenId === tokenId &&
                    slpUtxo?.token?.atoms >= 1n,
            );
            setAvailableNftInputs(availableNftMintInputs.length);
        }
    }, [tokenUtxos, isNftParent]);

    useEffect(() => {
        if (isNftParent && availableNftInputs > 0) {
            // If we have any parent token UTXOs (any qty >= 1), default action should be Mint NFT
            // ecash-wallet automatically handles creating qty-1 inputs if needed
            setSwitches({
                ...switchesOff,
                showMintNft: true,
            });
        }
        // Otherwise all switches are off
    }, [isNftParent, availableNftInputs]);

    useEffect(() => {
        if (previewedAgoraPartial === null) {
            // Hide the confirm modal if the user cancels the listing
            // This happens
            // 1 - on screen load
            // 2 - on user canceling an SLP listing at confirmation modal
            return setShowConfirmListPartialSlp(false);
        }

        // Is this an unacceptable offer?
        // Note: we need to catch these in library validation, but it's
        // important to make sure they stop getting created rightnow
        const isUnacceptableOffer =
            previewedAgoraPartial.minAcceptedAtoms() >
            previewedAgoraPartial.offeredAtoms();
        setPreviewedAgoraPartialUnacceptable(isUnacceptableOffer);

        // Show the Agora Partial summary and confirm modal when we have a non-null previewedAgoraPartial
        setShowConfirmListPartialSlp(true);
    }, [previewedAgoraPartial]);

    // Clears address and amount fields following a send token notification
    const clearInputForms = () => {
        setFormData(emptyFormData);
    };

    async function sendToken() {
        // GA event
        Event('SendToken.js', 'Send', tokenId as string);

        const { address, amount } = formData;

        const cleanAddress = address.split('?')[0];

        try {
            if (!ecashWallet) {
                // We do not render the component with ecashWallet, so we do not expect this to happen
                // Helps typescript clarity
                throw new Error('Wallet not initialized');
            }

            // Build payment.Action for token send
            // ecash-wallet handles UTXO selection and token change automatically
            const sendAtoms = isNftChild
                ? 1n
                : BigInt(
                      undecimalizeTokenAmount(amount, decimals as SlpDecimals),
                  );

            // All token sends are the same in the ecash-wallet API
            // ecash-wallet deals with differing token specs
            const action: payment.Action = {
                outputs: [
                    { sats: 0n }, // OP_RETURN at outIdx 0
                    {
                        sats: BigInt(appConfig.dustSats),
                        script: Script.fromAddress(cleanAddress),
                        tokenId: tokenId as string,
                        atoms: sendAtoms,
                    },
                ],
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenId as string,
                        tokenType: tokenType as unknown as TokenType,
                    },
                ],
                feePerKb: BigInt(settings.satsPerKb),
            };

            // Build and broadcast using ecash-wallet
            const builtAction = ecashWallet.action(action).build();
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize transaction',
                ))
            ) {
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
                    {isNftChild ? 'NFT sent' : 'eToken sent'}
                </a>,
            );
            clearInputForms();
        } catch (e) {
            console.error(`Error sending ${isNftChild ? 'NFT' : 'token'}`, e);
            toast.error(`${e}`);
        }
    }

    const handleTokenOfferedSlide = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const amount = e.target.value;

        const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            amount,
            tokenBalance as string, // we do not render the slide without tokenBalance
            decimals as SlpDecimals,
            // Component does not render until token info is defined
            protocol as 'ALP' | 'SLP',
        );

        // For XECX redemptions, we have the price, so validate for this
        const isRedeemingXecx =
            tokenId === appConfig.vipTokens.xecx.tokenId &&
            switches.showRedeemXecx;
        const xecxRedeemError =
            isRedeemingXecx && Number(amount) < toXec(appConfig.dustSats);

        // For Firma redemptions, use 0.01 min
        const FIRMA_MINIMUM_REDEMPTION = 0.01; // 1 cent
        const isRedeemingFirma =
            tokenId === FIRMA.tokenId && switches.showRedeemFirma;
        const firmaRedeemError =
            isRedeemingFirma && Number(amount) < FIRMA_MINIMUM_REDEMPTION;

        setAgoraPartialTokenQtyError(
            isValidAmountOrErrorMsg === true
                ? xecxRedeemError
                    ? `Cannot redeem less than 5.46 XECX`
                    : firmaRedeemError
                      ? `Cannot redeem less than ${FIRMA_MINIMUM_REDEMPTION} ${FIRMA_DISPLAY_TICKER}`
                      : false
                : isValidAmountOrErrorMsg,
        );

        setAgoraPartialTokenQty(amount);
    };

    const handleTokenMinSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
        const amount = e.target.value;

        const agoraMinBuyError = getAgoraMinBuyError(
            formData.tokenListPrice as string,
            selectedCurrency,
            fiatPrice,
            amount,
            agoraPartialTokenQty,
            decimals as SlpDecimals,
            // Component does not render until token info is defined
            protocol as 'ALP' | 'SLP',
            tokenBalance as string, // we do not render the slide without tokenBalance
            userLocale,
        );

        setAgoraPartialMinError(agoraMinBuyError);

        setAgoraPartialMin(amount);
    };

    const handleTokenAmountChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { value, name } = e.target;
        const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            value,
            tokenBalance as string, // we do not render token actions without tokenBalance
            decimals as SlpDecimals,
            // Component does not render until token info is defined
            protocol as 'ALP' | 'SLP',
        );
        setSendTokenAmountError(
            isValidAmountOrErrorMsg === true ? false : isValidAmountOrErrorMsg,
        );
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleTokenAddressChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { value, name } = e.target;
        // validate for token address
        // validate for parameters
        // show warning that query strings are not supported

        const parsedAddressInput = parseAddressInput(
            value,
            balanceSats,
            userLocale,
        );
        const address = parsedAddressInput.address.value;
        let renderedError = parsedAddressInput.address.error;

        if ('queryString' in parsedAddressInput) {
            // Token sends do not support a queryString
            // If you have one, this is the address validation error
            renderedError = 'eToken sends do not support bip21 query strings';
        } else if (
            parsedAddressInput.address.error &&
            typeof address === 'string' &&
            isValidCashAddress(address, 'etoken')
        ) {
            // If address is a valid eToken address, no error
            // We support sending to etoken: addresses on SendToken screen
            renderedError = false;
        }

        setSendTokenAddressError(renderedError);

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const onMax = async () => {
        // Clear this error before updating field
        setSendTokenAmountError(false);
        try {
            setFormData({
                ...formData,
                amount: tokenBalance as string, // we do not render token actions without tokenBalance
            });
        } catch (err) {
            console.error(`Error in onMax:`);
            console.error(err);
        }
    };

    const onMaxMint = () => {
        const maxMintAmount = getMaxDecimalizedQty(
            decimals as SlpDecimals,
            protocol as 'ALP' | 'SLP',
        );

        handleMintAmountChange({
            target: {
                name: 'mintAmount',
                value: maxMintAmount,
            },
        } as React.ChangeEvent<HTMLInputElement>);
    };

    const checkForConfirmationBeforeSendEtoken = () => {
        if (settings.sendModal) {
            setIsModalVisible(settings.sendModal);
        } else {
            // if the user does not have the send confirmation enabled in settings then send directly
            sendToken();
        }
    };

    const mintOrShowConfirmationModal = () => {
        if (settings.sendModal) {
            // If the user has enabled send confirmations,
            // show a modal before the tx is sent
            setConfirmMintModalVisible(settings.sendModal);
        } else {
            // Mint
            handleMint();
        }
    };

    const handleOk = () => {
        setIsModalVisible(false);
        sendToken();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleEtokenBurnAmountChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { name, value } = e.target;
        const isValidBurnAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            value,
            tokenBalance as string, // we do not render token actions without tokenBalance
            decimals as SlpDecimals,
            // Component does not render until token info is defined
            protocol as 'ALP' | 'SLP',
        );
        setBurnTokenAmountError(
            isValidBurnAmountOrErrorMsg === true
                ? false
                : isValidBurnAmountOrErrorMsg,
        );
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleMintAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isValidMintAmountOrErrorMsg = isValidTokenMintAmount(
            value,
            decimals as SlpDecimals,
            // Component does not render until token info is defined
            protocol as 'ALP' | 'SLP',
        );
        setMintAmountError(
            isValidMintAmountOrErrorMsg === true
                ? false
                : isValidMintAmountOrErrorMsg,
        );
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const onMaxBurn = () => {
        // trigger validation on the inserted max value
        handleEtokenBurnAmountChange({
            target: {
                name: 'burnAmount',
                value: tokenBalance,
            },
        } as React.ChangeEvent<HTMLInputElement>);
    };

    async function burn() {
        if (burnConfirmationError || formData.burnAmount === '') {
            return;
        }

        Event('SendToken.js', 'Burn eToken', tokenId as string);

        setIsBurning(true);

        try {
            if (!ecashWallet) {
                // We do not render the component with ecashWallet, so we do not expect this to happen
                // Helps typescript clarity
                throw new Error('Wallet not initialized');
            }

            // Calculate burnAtoms from decimal amount
            const burnAtoms = BigInt(
                undecimalizeTokenAmount(
                    formData.burnAmount,
                    decimals as SlpDecimals,
                ),
            );

            // Build payment.Action for token burn
            // ecash-wallet handles UTXO selection automatically
            const action: payment.Action = {
                outputs: [
                    { sats: 0n }, // OP_RETURN at outIdx 0
                ],
                tokenActions: [
                    {
                        type: 'BURN',
                        tokenId: tokenId as string,
                        tokenType: tokenType as unknown as TokenType,
                        burnAtoms,
                    },
                ],
                feePerKb: BigInt(settings.satsPerKb),
            };

            // Build and broadcast using ecash-wallet
            // Note: ecash-wallet automatically infers SEND action for ALP burns when exact atoms aren't available
            const builtAction = ecashWallet.action(action).build();
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize token burn',
                ))
            ) {
                setIsBurning(false);
                setShowConfirmBurnEtoken(false);
                setConfirmationOfEtokenToBeBurnt('');
                return;
            }
            const broadcastResult = await builtAction.broadcast();

            if (!broadcastResult.success) {
                throw new Error(
                    `Transaction broadcast failed: ${broadcastResult.errors?.join(', ')}`,
                );
            }

            // Get the last txid (for chained transactions, this is the actual burn tx)
            const txid =
                broadcastResult.broadcasted[
                    broadcastResult.broadcasted.length - 1
                ];

            confirmRawTx(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🔥 Burn successful
                </a>,
            );
            clearInputForms();
            setShowConfirmBurnEtoken(false);
            setConfirmationOfEtokenToBeBurnt('');
            // Refresh token supply after successful burn
            getUncachedTokenInfo();
        } catch (e) {
            setShowConfirmBurnEtoken(false);
            setConfirmationOfEtokenToBeBurnt('');
            toast.error(`${e}`);
        } finally {
            setIsBurning(false);
        }
    }

    async function handleMint() {
        Event('SendToken.js', 'Mint eToken', tokenId as string);

        try {
            if (!ecashWallet) {
                // We do not render the component with ecashWallet, so we do not expect this to happen
                // Helps typescript clarity
                throw new Error('Wallet not initialized');
            }

            // Note: Minting is not currently supported for SLP_TOKEN_TYPE_MINT_VAULT tokens.
            // MINT_VAULT tokens don't have mint batons (they use a different mechanism where any UTXO
            // at the mint vault address can mint). Since getMintBatons() filters for isMintBaton === true,
            // it returns an empty array for MINT_VAULT tokens, so the mint switch (which only appears
            // when mintBatons.length > 0) will never be shown for these tokens in the UI.

            // We should not be able to get here without at least one mint baton,
            // as the mint switch would be disabled
            // Still, handle
            if (mintBatons.length < 1) {
                throw new Error(`Unable to find mint baton for ${tokenName}`);
            }

            // Calculate minted atoms (undecimalized)
            const mintedAtoms = BigInt(
                undecimalizeTokenAmount(
                    formData.mintAmount,
                    decimals as SlpDecimals,
                ),
            );

            // Build payment.Action for token mint
            // ecash-wallet handles UTXO selection automatically, including finding mint batons
            const action: payment.Action = {
                outputs: [
                    { sats: 0n }, // OP_RETURN at outIdx 0
                    {
                        sats: BigInt(appConfig.dustSats),
                        script: ecashWallet.script,
                        tokenId: tokenId as string,
                        atoms: mintedAtoms,
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                        script: ecashWallet.script,
                        tokenId: tokenId as string,
                        atoms: 0n,
                        isMintBaton: true,
                    },
                ],
                tokenActions: [
                    {
                        type: 'MINT',
                        tokenId: tokenId as string,
                        tokenType: tokenType as unknown as TokenType,
                    },
                ],
                feePerKb: BigInt(settings.satsPerKb),
            };

            // Build and broadcast using ecash-wallet
            const builtAction = ecashWallet.action(action).build();
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize token mint',
                ))
            ) {
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
                    ⚗️ Minted {formData.mintAmount} {tokenTicker}
                </a>,
            );
            clearInputForms();
            // Refresh token supply after successful mint
            getUncachedTokenInfo();
        } catch (e) {
            toast.error(`${e}`);
        }
    }

    const handleBurnConfirmationInput = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { value } = e.target;

        if (value && value === `burn ${tokenTicker}`) {
            setBurnConfirmationError(false);
        } else {
            setBurnConfirmationError(
                `Input must exactly match "burn ${tokenTicker}"`,
            );
        }
        setConfirmationOfEtokenToBeBurnt(value);
    };

    const handleBurnAmountInput = () => {
        if (!burnTokenAmountError) {
            setShowConfirmBurnEtoken(true);
        }
    };

    const handleSelectedCurrencyChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setSelectedCurrency(e.target.value);
        // Clear SLP and NFT price input fields to prevent unit confusion
        // User must re-specify price in new units
        setFormData(p => ({
            ...p,
            nftListPrice: '',
            tokenListPrice: '',
        }));
    };

    const handleNftListPriceChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { name, value } = e.target;
        setNftListPriceError(
            getXecListPriceError(value, selectedCurrency, fiatPrice),
        );
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleTokenListPriceChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { name, value } = e.target;

        setTokenListPriceError(
            getAgoraPartialListPriceError(
                value,
                selectedCurrency,
                fiatPrice,
                decimals as SlpDecimals,
            ),
        );

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const listNft = async () => {
        if (typeof tokenId !== 'string') {
            // Should never happen
            toast.error(`Error listing NFT: tokenId is undefined`);
            return;
        }
        if (!ecashWallet) {
            // Should never happen
            toast.error(`Error listing NFT: wallet not initialized`);
            return;
        }

        const listPriceSatoshis =
            selectedCurrency === appConfig.ticker
                ? toSatoshis(Number(formData.nftListPrice))
                : toSatoshis(
                      parseFloat(
                          (
                              parseFloat(formData.nftListPrice as string) /
                              (fiatPrice as number)
                          ).toFixed(2),
                      ),
                  );
        const satsPerKb = settings.satsPerKb;

        // Build the agora oneshot offer
        const enforcedOutputs = [
            {
                sats: 0n,
                script: slpSend(tokenId as string, SLP_NFT1_CHILD, [0n, 1n]),
            },
            {
                sats: BigInt(listPriceSatoshis),
                script: Script.p2pkh(ecashWallet.pkh),
            },
        ];

        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs,
            cancelPk: ecashWallet.pk,
        });

        try {
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize Agora listing',
                ))
            ) {
                return;
            }
            // Use the list method from AgoraOneshot
            const broadcastResult = await agoraOneshot.list({
                wallet: ecashWallet,
                tokenId: tokenId as string,
                tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                feePerKb: BigInt(satsPerKb),
            });

            if (!broadcastResult.success) {
                throw new Error(
                    `Listing failed: ${broadcastResult.errors?.join(', ')}`,
                );
            }

            // Show confirmation for ad setup tx
            if (broadcastResult.broadcasted.length > 0) {
                confirmRawTx(
                    <a
                        href={`${explorer.blockExplorerUrl}/tx/${broadcastResult.broadcasted[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Created NFT ad
                    </a>,
                );
            }

            // Show success notification for offer tx
            if (broadcastResult.broadcasted.length > 1) {
                toast(
                    <a
                        href={`${explorer.blockExplorerUrl}/tx/${broadcastResult.broadcasted[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        NFT listed for{' '}
                        {toXec(listPriceSatoshis).toLocaleString(userLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}{' '}
                        XEC
                    </a>,
                    {
                        icon: (
                            <TokenIcon size={32} tokenId={tokenId as string} />
                        ),
                    },
                );
            }

            // Hide the confirmation modal
            setShowConfirmListNft(false);
            // Update nft offers
            getNftOffer();
        } catch (err) {
            console.error(`Error listing NFT`, err);
            toast.error(`Error listing NFT: ${err}`);
        }
    };

    const previewAgoraPartial = async () => {
        // We can't expect users to enter numbers that exactly fit the encoding requirements of
        // agora partial offers
        // So, we build offers with agora.selectParams(), which calls AgoraPartial.approximateParams()
        // These are not guaranteed to be ideal.
        // So, the user should review the actual offer before it is created.

        // Convert formData price input to nanosats per token
        // note this is nanosats per token sat
        // So, you must account for token decimals
        const priceInXec =
            selectedCurrency === appConfig.ticker
                ? parseFloat(formData.tokenListPrice as string)
                : new BigNumber(
                      new BigNumber(
                          parseFloat(formData.tokenListPrice as string) /
                              (fiatPrice as number),
                      ).toFixed(NANOSAT_DECIMALS),
                  );
        const priceNanoSatsPerDecimalizedToken = xecToNanoSatoshis(priceInXec);

        // Adjust for token satoshis
        // e.g. a 9-decimal token, the user sets the the price for 1.000000000 tokens
        // but you must create the offer with priceNanoSatsPerToken for 1 token satoshi
        // i.e. 0.000000001 token
        const priceNanoSatsPerTokenSatoshi =
            priceNanoSatsPerDecimalizedToken /
            BigInt(Math.pow(10, decimals as SlpDecimals));

        // Convert formData list qty (a decimalized token qty) to BigInt token sats
        const userSuggestedOfferedTokens = BigInt(
            undecimalizeTokenAmount(
                agoraPartialTokenQty,
                decimals as SlpDecimals,
            ),
        );

        // Convert formData min buy qty to BigInt
        const minAcceptedAtoms = BigInt(
            undecimalizeTokenAmount(agoraPartialMin, decimals as SlpDecimals),
        );

        let agoraPartial;

        try {
            agoraPartial = await agora.selectParams({
                tokenId: tokenId,
                // We cannot render the Token screen until tokenType is defined
                tokenType: (tokenType as TokenType).number,
                // We cannot render the Token screen until protocol is defined
                tokenProtocol: protocol as 'ALP' | 'SLP',
                offeredAtoms: userSuggestedOfferedTokens,
                priceNanoSatsPerAtom: priceNanoSatsPerTokenSatoshi,
                makerPk: ecashWallet.pk,
                minAcceptedAtoms,
            });
            return setPreviewedAgoraPartial(agoraPartial);
        } catch (err) {
            // We can run into errors trying to create an agora partial
            // Most of these are prevented by validation in Cashtab
            // However some are a bit testier, e.g.
            // "Parameters cannot be represented in Script"
            // "minAcceptedTokens too small, got truncated to 0"
            // Catch and give a generic error
            console.error(`Error creating AgoraPartial`, err);
            toast.error(
                `Unable to create Agora offer with these parameters, try increasing the min buy.`,
            );
            // Do not show the preview modal
            return;
        }
    };

    const getFirmaPartialUnitPrice = (firmaPartial: AgoraPartial) => {
        const offeredAtoms = firmaPartial.offeredAtoms();
        const acceptPriceSats = firmaPartial.askedSats(offeredAtoms);
        const acceptPriceXec = toXec(Number(acceptPriceSats));

        // Convert atoms to FIRMA
        const minAcceptedTokens = decimalizeTokenAmount(
            offeredAtoms.toString(),
            decimals as SlpDecimals,
        );

        // Get the unit price
        // For FIRMA, we expect this to be > 1 XEC
        // So, limit to 2 decimal places
        const actualPricePerToken = new BigNumber(acceptPriceXec)
            .div(minAcceptedTokens)
            .dp(2);

        // Return price as a number
        return actualPricePerToken.toNumber();
    };

    /**
     * Firma redemption has a dynamic price which must be fetched from an API endpoint
     * We want to sell for as close as we can get to the bid price (due to discrete values
     * of agora offers, it is unlikely we can get the exact bid price)
     */
    const previewFirmaPartial = async () => {
        // Set spinner on button
        setIsCalculatingRedeemFirma(true);
        // Get the bid price

        let firmaBidPrice;
        try {
            const firmaBidPriceResp = await fetch(
                `https://firmaprotocol.com/api/bid`,
            );
            const firmaBidPriceJson = await firmaBidPriceResp.json();
            firmaBidPrice = firmaBidPriceJson.bid;
            console.info(`FIRMA buys at: ${firmaBidPrice} XEC`);
        } catch (err) {
            console.error(`Error fetching FIRMA bid price`, err);
            toast.error(`Error determining FIRMA bid price: ${err}`);
            setIsCalculatingRedeemFirma(false);
            return;
        }

        const priceNanoSatsPerDecimalizedToken =
            xecToNanoSatoshis(firmaBidPrice);

        // Adjust for atoms
        // e.g. a 9-decimal token, the user sets the the price for 1.000000000 tokens
        // but you must create the offer with priceNanoSatsPerToken for 1 atom
        // i.e. 0.000000001 token
        let priceNanoSatsPerAtom =
            priceNanoSatsPerDecimalizedToken /
            BigInt(Math.pow(10, decimals as SlpDecimals));

        // Convert formData list qty (a decimalized token qty) to BigInt token sats
        const userSuggestedOfferedTokens = BigInt(
            undecimalizeTokenAmount(
                agoraPartialTokenQty,
                decimals as SlpDecimals,
            ),
        );

        let firmaPartial;
        try {
            const firmaPartialParams = {
                tokenId: tokenId,
                // We cannot render the Token screen until tokenType is defined
                tokenType: (tokenType as TokenType).number,
                // We cannot render the Token screen until protocol is defined
                tokenProtocol: protocol as 'ALP' | 'SLP',
                offeredAtoms: userSuggestedOfferedTokens,
                priceNanoSatsPerAtom: priceNanoSatsPerAtom,
                makerPk: ecashWallet.pk,
                minAcceptedAtoms: userSuggestedOfferedTokens,
            };
            firmaPartial = await agora.selectParams(firmaPartialParams);

            let actualPrice = getFirmaPartialUnitPrice(firmaPartial);
            // Keep making firmaPartials until we have one that is acceptable
            // Reduce price by 50 XEC at a time
            // In practice, this usually takes 2 or 3 iterations, though I have observed up to 11
            // The quanta are such that we get "the next tick down", we won't
            // skip it
            const NANOSATS_PER_ATOM_REDUCTION_PER_ITERATION = 500000000n;

            // Counter to prevent infinite loop
            let attempts = 0;
            const MAX_ATTEMPTS = 25;
            // IMPORTANT: We use >= instead of > to ensure we always price STRICTLY BELOW the bid price.
            // This is necessary because:
            // 1. The bid API rounds to 2 decimals, which can round up
            // 2. firma-mint uses Math.floor() when calculating acceptablePriceSats, which can be slightly lower
            // 3. Offers priced exactly at the bid can be rejected as "too expensive"
            // By ensuring actualPrice < firmaBidPrice, we avoid this edge case.
            while (actualPrice >= firmaBidPrice && attempts < MAX_ATTEMPTS) {
                priceNanoSatsPerAtom -=
                    NANOSATS_PER_ATOM_REDUCTION_PER_ITERATION;
                // This time we only update the price, we do not need to update locktime
                try {
                    firmaPartial = await agora.selectParams({
                        ...firmaPartialParams,
                        priceNanoSatsPerAtom,
                    });
                    actualPrice = getFirmaPartialUnitPrice(firmaPartial);
                    // loop repeats until actualPrice <= firmaBidPrice
                    attempts += 1;
                } catch {
                    // If reducing the price makes it invalid (e.g., minAcceptedTokens too small),
                    // break and use the last valid partial. This can happen when we're already
                    // at or very close to the minimum valid price.
                    break;
                }
            }
            if (attempts >= MAX_ATTEMPTS) {
                // If we try more than MAX_ATTEMPTS times, there is probably something wrong
                // or weird about this specific request
                // Maybe some quantities are difficult to price properly
                toast.error(
                    'Unable to create partial at or below FIRMA redemption price. Try a different quantity.',
                );
                setIsCalculatingRedeemFirma(false);
                return;
            }
            setIsCalculatingRedeemFirma(false);
            return setPreviewedAgoraPartial(firmaPartial);
        } catch (err) {
            // We can run into errors trying to create an agora partial
            // Most of these are prevented by validation in Cashtab
            // However some are a bit testier, e.g.
            // "Parameters cannot be represented in Script"
            // "minAcceptedTokens too small, got truncated to 0"
            // Catch and give a generic error
            console.error(`Error creating AgoraPartial`, err);
            toast.error(
                `Unable to create Agora offer with these parameters, try increasing the min buy.`,
            );
            setIsCalculatingRedeemFirma(false);
            // Do not show the preview modal
            return;
        }
    };

    /**
     * Note that listing ALP tokens is simpler than listing SLP tokens
     * Thanks to EMPP, can be done in a single tx, instead of the required
     * chained 2 txs for SLP
     *
     * Means we need a distinct function for this operation
     */
    const listAlpPartial = async () => {
        if (previewedAgoraPartial === null) {
            // Should never happen
            toast.error(
                `Error listing ALP partial: Agora preview is undefined`,
            );
            return;
        }
        if (typeof tokenId !== 'string') {
            // Should never happen
            toast.error(`Error listing ALP partial: tokenId is undefined`);
            return;
        }
        if (!tokenType) {
            // Should never happen
            toast.error(`Error listing ALP partial: tokenType is undefined`);
            return;
        }
        if (!ecashWallet) {
            // Should never happen
            toast.error(`Error listing ALP partial: wallet not initialized`);
            return;
        }

        // offeredTokens is in units of token satoshis
        const offeredTokens = previewedAgoraPartial.offeredAtoms();

        let offerTxid;
        try {
            // Build payment.Action for Agora ALP partial listing using ecash-agora helper
            const agoraListAction = getAgoraPaymentAction({
                type: 'LIST',
                tokenType,
                variant: { type: 'PARTIAL', params: previewedAgoraPartial },
            });

            // Add feePerKb to the action
            agoraListAction.feePerKb = BigInt(settings.satsPerKb);

            // Build and broadcast using ecash-wallet
            // ecash-wallet automatically handles token UTXO selection and change
            const builtAction = ecashWallet.action(agoraListAction).build();
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize Agora listing',
                ))
            ) {
                return;
            }
            const broadcastResult = await builtAction.broadcast();

            if (!broadcastResult.success) {
                throw new Error(
                    `Transaction broadcast failed: ${broadcastResult.errors?.join(', ')}`,
                );
            }

            // Get the first txid (ALP partial listings are single-tx)
            offerTxid = broadcastResult.broadcasted[0];

            // Calculate decimalized total offered amount for notifications
            const decimalizedOfferedTokens = decimalizeTokenAmount(
                offeredTokens.toString(),
                decimals as SlpDecimals,
            );

            // Maintain this notification as we do not parse listing prices in websocket
            toast(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${offerTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {`${decimalizedTokenQtyToLocaleFormat(
                        decimalizedOfferedTokens,
                        userLocale,
                    )} ${tokenName} listed for ${getAgoraPartialActualPrice()} per token`}
                </a>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId as string} />,
                },
            );

            // We stay on this token page as, unlike with NFTs, we may still have more of this token
        } catch (err) {
            console.error(`Error listing ALP Partial`, err);
            toast.error(`Error listing ALP Partial: ${err}`);
        }

        // Clear the offer
        // Note this will also clear the confirmation modal
        setPreviewedAgoraPartial(null);
    };

    const listSlpPartial = async () => {
        if (previewedAgoraPartial === null) {
            // Should never happen
            toast.error(
                `Error listing SLP partial: Agora preview is undefined`,
            );
            return;
        }
        if (typeof tokenId !== 'string') {
            // Should never happen
            toast.error(`Error listing SLP partial: tokenId is undefined`);
            return;
        }
        if (!ecashWallet) {
            // Should never happen
            toast.error(`Error listing SLP partial: wallet not initialized`);
            return;
        }

        const agoraPartial = previewedAgoraPartial as AgoraPartial;
        const satsPerKb = settings.satsPerKb;

        // Calculate decimalized total offered amount for notifications
        const offeredTokens = agoraPartial.offeredAtoms();
        const decimalizedOfferedTokens = decimalizeTokenAmount(
            offeredTokens.toString(),
            decimals as SlpDecimals,
        );

        try {
            if (
                !(await confirmBiometricBroadcast(
                    settings,
                    'Authorize Agora listing',
                ))
            ) {
                return;
            }
            // Use the list method from AgoraPartial
            const broadcastResult = await agoraPartial.list({
                wallet: ecashWallet,
                feePerKb: BigInt(satsPerKb),
            });

            if (!broadcastResult.success) {
                throw new Error(
                    `Listing failed: ${broadcastResult.errors?.join(', ')}`,
                );
            }

            // Show confirmation for ad setup tx
            if (broadcastResult.broadcasted.length > 0) {
                confirmRawTx(
                    <a
                        href={`${explorer.blockExplorerUrl}/tx/${broadcastResult.broadcasted[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {`Successful ad setup tx to offer ${decimalizedOfferedTokens} ${tokenName} for ${getAgoraPartialActualPrice()} per token`}
                    </a>,
                );
            }

            // Show success notification for offer tx
            if (broadcastResult.broadcasted.length > 1) {
                toast(
                    <a
                        href={`${explorer.blockExplorerUrl}/tx/${broadcastResult.broadcasted[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {`${decimalizedTokenQtyToLocaleFormat(
                            decimalizedOfferedTokens,
                            userLocale,
                        )} ${tokenName} listed for ${getAgoraPartialActualPrice()} per token`}
                    </a>,
                    {
                        icon: (
                            <TokenIcon size={32} tokenId={tokenId as string} />
                        ),
                    },
                );
            }

            // We stay on this token page as, unlike with NFTs, we may still have more of this token
        } catch (err) {
            console.error(`Error listing SLP Partial`, err);
            toast.error(`Error listing SLP Partial: ${err}`);
        }

        // Clear the offer
        // Note this will also clear the confirmation modal
        setPreviewedAgoraPartial(null);
    };

    const renderNftCollectionGrid = (collectionNftTokenIds: string[]) => (
        <NftTable>
            {collectionNftTokenIds.map(nftTokenId => {
                const cachedNftInfo = cashtabCache.tokens.get(nftTokenId);
                return (
                    <NftCol key={nftTokenId}>
                        <NftRow>
                            <TokenIconExpandButton
                                onClick={() => setShowLargeNftIcon(nftTokenId)}
                            >
                                <TokenIcon size={64} tokenId={nftTokenId} />
                            </TokenIconExpandButton>
                        </NftRow>
                        <NftRow>
                            <NftTokenIdAndCopyIcon>
                                <a
                                    href={`#/token/${nftTokenId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {nftTokenId.slice(0, 3)}...
                                    {nftTokenId.slice(-3)}
                                </a>
                                <CopyIconButton
                                    name={`Copy Token ID`}
                                    data={nftTokenId}
                                />
                            </NftTokenIdAndCopyIcon>
                        </NftRow>
                        {typeof cachedNftInfo !== 'undefined' && (
                            <NftRow>
                                {typeof tokens.get(nftTokenId) !==
                                'undefined' ? (
                                    <Link to={`/token/${nftTokenId}`}>
                                        {cachedNftInfo.genesisInfo.tokenName}
                                    </Link>
                                ) : (
                                    cachedNftInfo.genesisInfo.tokenName
                                )}
                            </NftRow>
                        )}
                    </NftCol>
                );
            })}
        </NftTable>
    );

    return (
        <OuterCtn>
            {typeof cashtabCache.tokens.get(tokenId) === 'undefined' ? (
                <>
                    <TokenScreenWrapper title="Token Info">
                        {chronikQueryError ? (
                            <Alert>
                                Error querying token info. Please try again
                                later.
                            </Alert>
                        ) : !validTokenId ? (
                            <Alert>Invalid tokenId {tokenId}</Alert>
                        ) : (
                            <Spinner />
                        )}
                        {typeof tokenBalance === 'undefined' &&
                            validTokenId && (
                                <Info>You do not hold this token.</Info>
                            )}
                    </TokenScreenWrapper>
                </>
            ) : (
                <>
                    {showTokenTypeInfo && (
                        <Modal
                            title={renderedTokenType}
                            description={renderedTokenDescription}
                            handleOk={() => setShowTokenTypeInfo(false)}
                            handleCancel={() => setShowTokenTypeInfo(false)}
                        />
                    )}
                    {showAgoraPartialInfo && (
                        <Modal
                            title={`Sell Tokens`}
                            description={`List tokens for sale with Agora Partial offers. Decide how many tokens you would like to sell, the minimum amount a user must buy to accept an offer, and the price per token. Due to encoding, input values here are approximate. The actual offer may have slightly different parameters. Price can be set lower than 1 XEC per token (no lower than 1 nanosat per 1 token satoshi). To ensure accurate pricing, the minimum buy should be set to at least 0.1% of the total tokens offered.`}
                            handleOk={() => setShowAgoraPartialInfo(false)}
                            handleCancel={() => setShowAgoraPartialInfo(false)}
                        />
                    )}
                    {showLargeIconModal && (
                        <Modal
                            showButtons={false}
                            handleCancel={() => setShowLargeIconModal(false)}
                        >
                            <TokenIcon size={256} tokenId={tokenId} />
                        </Modal>
                    )}
                    {showLargeNftIcon !== '' && (
                        <Modal
                            showButtons={false}
                            handleCancel={() => setShowLargeNftIcon('')}
                        >
                            <TokenIcon size={256} tokenId={showLargeNftIcon} />
                        </Modal>
                    )}
                    {isModalVisible && (
                        <Modal
                            title="Confirm Send"
                            description={`Send ${formData.amount}${' '}
                                ${tokenTicker} to ${formData.address}?`}
                            handleOk={handleOk}
                            handleCancel={handleCancel}
                            showCancelButton
                        >
                            <p>
                                Are you sure you want to send {formData.amount}{' '}
                                {tokenTicker} to {formData.address}?
                            </p>
                        </Modal>
                    )}
                    {confirmMintModalVisible && (
                        <Modal
                            title="Confirm Mint"
                            description={`Are you sure you want to mint ${formData.mintAmount} ${tokenTicker}?`}
                            handleOk={() => {
                                handleMint();
                                setConfirmMintModalVisible(false);
                            }}
                            handleCancel={() =>
                                setConfirmMintModalVisible(false)
                            }
                            showCancelButton
                        />
                    )}
                    {showConfirmBurnEtoken && (
                        <Modal
                            title={`Confirm ${tokenTicker} burn`}
                            description={`Burn ${formData.burnAmount} ${tokenTicker}?`}
                            handleOk={burn}
                            handleCancel={() =>
                                !isBurning && setShowConfirmBurnEtoken(false)
                            }
                            showCancelButton
                            isConfirmLoading={isBurning}
                        >
                            <ModalInput
                                placeholder={`Type "burn ${tokenTicker}" to confirm`}
                                name="etokenToBeBurnt"
                                value={confirmationOfEtokenToBeBurnt}
                                error={burnConfirmationError}
                                handleInput={handleBurnConfirmationInput}
                            />
                        </Modal>
                    )}
                    {showConfirmListNft &&
                        formData.nftListPrice !== '' &&
                        formData.nftListPrice !== null && (
                            <Modal
                                title={`List ${tokenTicker} for ${
                                    selectedCurrency === appConfig.ticker
                                        ? `${parseFloat(
                                              formData.nftListPrice,
                                          ).toLocaleString(userLocale)}
                                                        XEC ${getFormattedFiatPrice(
                                                            settings.fiatCurrency,
                                                            userLocale,
                                                            formData.nftListPrice,
                                                            fiatPrice,
                                                        )}?`
                                        : `${
                                              supportedFiatCurrencies[
                                                  settings.fiatCurrency
                                              ].symbol
                                          }${parseFloat(
                                              formData.nftListPrice,
                                          ).toLocaleString(userLocale)} ${
                                              settings && settings.fiatCurrency
                                                  ? settings.fiatCurrency.toUpperCase()
                                                  : 'USD'
                                          } (${(
                                              parseFloat(
                                                  formData.nftListPrice,
                                              ) / (fiatPrice as number)
                                          ).toLocaleString(userLocale, {
                                              minimumFractionDigits:
                                                  appConfig.cashDecimals,
                                              maximumFractionDigits:
                                                  appConfig.cashDecimals,
                                          })}
                                                        XEC)?`
                                }`}
                                handleOk={listNft}
                                handleCancel={() =>
                                    setShowConfirmListNft(false)
                                }
                                showCancelButton
                                description={`This will create a sell offer. Your NFT is only transferred if your full price is paid. The price is fixed in XEC. If your NFT is not purchased, you can cancel or renew your listing at any time.`}
                            />
                        )}
                    {showConfirmListPartialSlp &&
                        tokenId === appConfig.vipTokens.xecx.tokenId &&
                        switches.showRedeemXecx &&
                        previewedAgoraPartial !== null && (
                            <Modal
                                title={`Redeem ${decimalizedTokenQtyToLocaleFormat(
                                    decimalizeTokenAmount(
                                        previewedAgoraPartial
                                            .offeredAtoms()
                                            .toString(),
                                        decimals as SlpDecimals,
                                    ),
                                    userLocale,
                                )} XECX?`}
                                disabled={previewedAgoraPartialUnacceptable}
                                handleOk={listAlpPartial}
                                handleCancel={() => {
                                    setPreviewedAgoraPartial(null);
                                }}
                                showCancelButton
                            >
                                {decimalizeTokenAmount(
                                    previewedAgoraPartial
                                        .offeredAtoms()
                                        .toString(),
                                    decimals as SlpDecimals,
                                ) !==
                                    Number(agoraPartialTokenQty).toFixed(2) && (
                                    <AgoraPreviewTable>
                                        <AgoraPreviewRow>
                                            <AgoraPreviewLabel>
                                                Requested qty:{' '}
                                            </AgoraPreviewLabel>
                                            <AgoraPreviewCol>
                                                {Number(
                                                    agoraPartialTokenQty,
                                                ).toLocaleString(userLocale, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                                XECX
                                            </AgoraPreviewCol>
                                        </AgoraPreviewRow>
                                        <AgoraPreviewRow>
                                            <AgoraPreviewLabel>
                                                Actual qty:{' '}
                                            </AgoraPreviewLabel>
                                            <AgoraPreviewCol>
                                                {decimalizedTokenQtyToLocaleFormat(
                                                    decimalizeTokenAmount(
                                                        previewedAgoraPartial
                                                            .offeredAtoms()
                                                            .toString(),
                                                        decimals as SlpDecimals,
                                                    ),
                                                    userLocale,
                                                )}{' '}
                                                XECX
                                            </AgoraPreviewCol>
                                        </AgoraPreviewRow>
                                        <AgoraPreviewRow>
                                            <AgoraPreviewLabel>
                                                Delta:{' '}
                                            </AgoraPreviewLabel>
                                            <AgoraPreviewCol>
                                                {(
                                                    Number(
                                                        agoraPartialTokenQty,
                                                    ) -
                                                    Number(
                                                        decimalizeTokenAmount(
                                                            previewedAgoraPartial
                                                                .offeredAtoms()
                                                                .toString(),
                                                            decimals as SlpDecimals,
                                                        ),
                                                    )
                                                ).toFixed(2)}
                                            </AgoraPreviewCol>
                                        </AgoraPreviewRow>
                                        <Info>
                                            Note: Actual qty does not exactly
                                            match requested qty due to agora
                                            encoding.
                                        </Info>
                                    </AgoraPreviewTable>
                                )}

                                <AgoraPreviewTable>
                                    {previewedAgoraPartialUnacceptable && (
                                        <Alert noWordBreak>
                                            Error in agora encoding:
                                            unacceptable offer created. Adjust
                                            redeem amount.
                                        </Alert>
                                    )}

                                    <AgoraPreviewRow>
                                        <AgoraPreviewLabel>
                                            You receive:{' '}
                                        </AgoraPreviewLabel>
                                        <AgoraPreviewCol>
                                            {decimalizedTokenQtyToLocaleFormat(
                                                decimalizeTokenAmount(
                                                    previewedAgoraPartial
                                                        .offeredAtoms()
                                                        .toString(),
                                                    decimals as SlpDecimals,
                                                ),
                                                userLocale,
                                            )}{' '}
                                            XEC
                                        </AgoraPreviewCol>
                                    </AgoraPreviewRow>
                                    {xecxSweeperBalanceSats !== null &&
                                        previewedAgoraPartial.offeredAtoms() >
                                            xecxSweeperBalanceSats && (
                                            <Alert noWordBreak>
                                                ⚠️ XECX redemption larger than
                                                hot wallet balance of{' '}
                                                {toFormattedXec(
                                                    Number(
                                                        xecxSweeperBalanceSats,
                                                    ),
                                                    userLocale,
                                                )}{' '}
                                                XEC. Execution may take up to 24
                                                hours.
                                            </Alert>
                                        )}
                                </AgoraPreviewTable>
                            </Modal>
                        )}
                    {showConfirmListPartialSlp &&
                        !switches.showRedeemXecx &&
                        (formData.tokenListPrice !== '' ||
                            tokenId === FIRMA.tokenId) &&
                        previewedAgoraPartial !== null &&
                        (() => {
                            // Check if listing FIRMA below bid price
                            let isListingFirmaBelowBid = false;
                            if (
                                tokenId === FIRMA.tokenId &&
                                !isRedeemingFirma &&
                                firmaBidPrice !== null &&
                                previewedAgoraPartial !== null
                            ) {
                                const minAcceptedTokenSatoshis =
                                    previewedAgoraPartial.minAcceptedAtoms();
                                const minAcceptPriceSats =
                                    previewedAgoraPartial.askedSats(
                                        minAcceptedTokenSatoshis,
                                    );
                                const minAcceptedPriceXec = toXec(
                                    Number(minAcceptPriceSats),
                                );
                                const minAcceptedTokens = decimalizeTokenAmount(
                                    minAcceptedTokenSatoshis.toString(),
                                    decimals as SlpDecimals,
                                );
                                const actualPricePerToken = new BigNumber(
                                    minAcceptedPriceXec,
                                ).div(new BigNumber(minAcceptedTokens));
                                const actualPriceNumber =
                                    actualPricePerToken.toNumber();
                                isListingFirmaBelowBid =
                                    actualPriceNumber < firmaBidPrice;
                            }
                            return (
                                <Modal
                                    title={
                                        isRedeemingFirma
                                            ? `Redeem $${FIRMA_DISPLAY_TICKER} for XEC?`
                                            : `List ${tokenTicker}?`
                                    }
                                    disabled={
                                        previewedAgoraPartialUnacceptable ||
                                        (isRedeemingFirma && !canRedeemFirma) ||
                                        isListingFirmaBelowBid
                                    }
                                    handleOk={
                                        isAlp ? listAlpPartial : listSlpPartial
                                    }
                                    handleCancel={() =>
                                        setPreviewedAgoraPartial(null)
                                    }
                                    showCancelButton
                                >
                                    {isRedeemingFirma ? (
                                        <>
                                            <AgoraPreviewTable>
                                                <AgoraPreviewRow>
                                                    <AgoraPreviewLabel>
                                                        You sell:{' '}
                                                    </AgoraPreviewLabel>
                                                    <AgoraPreviewCol>
                                                        {decimalizedTokenQtyToLocaleFormat(
                                                            decimalizeTokenAmount(
                                                                previewedAgoraPartial
                                                                    .offeredAtoms()
                                                                    .toString(),
                                                                decimals as SlpDecimals,
                                                            ),
                                                            userLocale,
                                                        )}{' '}
                                                        ${FIRMA_DISPLAY_TICKER}
                                                    </AgoraPreviewCol>
                                                </AgoraPreviewRow>
                                                <AgoraPreviewRow>
                                                    <AgoraPreviewLabel>
                                                        You receive:{' '}
                                                    </AgoraPreviewLabel>
                                                    <AgoraPreviewCol>
                                                        {toXec(
                                                            Number(
                                                                previewedAgoraPartial.askedSats(
                                                                    previewedAgoraPartial.offeredAtoms(),
                                                                ),
                                                            ),
                                                        ).toLocaleString(
                                                            userLocale,
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2,
                                                            },
                                                        )}{' '}
                                                        XEC
                                                    </AgoraPreviewCol>
                                                </AgoraPreviewRow>
                                                <AgoraPreviewRow>
                                                    <AgoraPreviewLabel>
                                                        ${FIRMA_DISPLAY_TICKER}{' '}
                                                        price:{' '}
                                                    </AgoraPreviewLabel>
                                                    <AgoraPreviewCol>
                                                        {getAgoraPartialActualPrice()}
                                                    </AgoraPreviewCol>
                                                </AgoraPreviewRow>
                                                {!canRedeemFirma && (
                                                    <Alert noWordBreak>
                                                        {firmaRedeemErrorMsg}
                                                    </Alert>
                                                )}
                                                {previewedAgoraPartialUnacceptable && (
                                                    <Alert noWordBreak>
                                                        This offer cannot be
                                                        accepted because the min
                                                        buy is higher than the
                                                        total offered tokens.
                                                        Cashtab does not support
                                                        creating this type of
                                                        offer. Please update
                                                        your params and try
                                                        again.
                                                    </Alert>
                                                )}
                                            </AgoraPreviewTable>
                                        </>
                                    ) : (
                                        <>
                                            <AgoraPreviewParagraph>
                                                Agora offers require special
                                                encoding and may not match your
                                                input.
                                            </AgoraPreviewParagraph>
                                            <AgoraPreviewParagraph>
                                                Create the following sell offer?
                                            </AgoraPreviewParagraph>
                                            <AgoraPreviewTable>
                                                <AgoraPreviewRow>
                                                    <AgoraPreviewLabel>
                                                        Offered qty:{' '}
                                                    </AgoraPreviewLabel>
                                                    <AgoraPreviewCol>
                                                        {decimalizedTokenQtyToLocaleFormat(
                                                            decimalizeTokenAmount(
                                                                previewedAgoraPartial
                                                                    .offeredAtoms()
                                                                    .toString(),
                                                                decimals as SlpDecimals,
                                                            ),
                                                            userLocale,
                                                        )}
                                                    </AgoraPreviewCol>
                                                </AgoraPreviewRow>
                                                <AgoraPreviewRow>
                                                    <AgoraPreviewLabel>
                                                        Min qty:{' '}
                                                    </AgoraPreviewLabel>
                                                    <AgoraPreviewCol>
                                                        {decimalizedTokenQtyToLocaleFormat(
                                                            decimalizeTokenAmount(
                                                                previewedAgoraPartial
                                                                    .minAcceptedAtoms()
                                                                    .toString(),
                                                                decimals as SlpDecimals,
                                                            ),
                                                            userLocale,
                                                        )}
                                                    </AgoraPreviewCol>
                                                </AgoraPreviewRow>
                                                {previewedAgoraPartialUnacceptable && (
                                                    <Alert noWordBreak>
                                                        This offer cannot be
                                                        accepted because the min
                                                        buy is higher than the
                                                        total offered tokens.
                                                        Cashtab does not support
                                                        creating this type of
                                                        offer. Please update
                                                        your params and try
                                                        again.
                                                    </Alert>
                                                )}

                                                <AgoraPreviewRow>
                                                    <AgoraPreviewLabel>
                                                        Actual price:{' '}
                                                    </AgoraPreviewLabel>
                                                    <AgoraPreviewCol>
                                                        {getAgoraPartialActualPrice()}
                                                    </AgoraPreviewCol>
                                                </AgoraPreviewRow>

                                                <AgoraPreviewRow>
                                                    <AgoraPreviewLabel>
                                                        Target price:{' '}
                                                    </AgoraPreviewLabel>
                                                    <AgoraPreviewCol>
                                                        {getAgoraPartialTargetPriceXec()}
                                                    </AgoraPreviewCol>
                                                </AgoraPreviewRow>
                                                {isListingFirmaBelowBid && (
                                                    <Alert noWordBreak>
                                                        ⚠️ Warning: You are
                                                        listing{' '}
                                                        {FIRMA_DISPLAY_TICKER}{' '}
                                                        for{' '}
                                                        {(() => {
                                                            const minAcceptedTokenSatoshis =
                                                                previewedAgoraPartial.minAcceptedAtoms();
                                                            const minAcceptPriceSats =
                                                                previewedAgoraPartial.askedSats(
                                                                    minAcceptedTokenSatoshis,
                                                                );
                                                            const minAcceptedPriceXec =
                                                                toXec(
                                                                    Number(
                                                                        minAcceptPriceSats,
                                                                    ),
                                                                );
                                                            const minAcceptedTokens =
                                                                decimalizeTokenAmount(
                                                                    minAcceptedTokenSatoshis.toString(),
                                                                    decimals as SlpDecimals,
                                                                );
                                                            const actualPricePerToken =
                                                                new BigNumber(
                                                                    minAcceptedPriceXec,
                                                                ).div(
                                                                    new BigNumber(
                                                                        minAcceptedTokens,
                                                                    ),
                                                                );
                                                            return getAgoraSpotPriceXec(
                                                                actualPricePerToken.toNumber(),
                                                                userLocale,
                                                            );
                                                        })()}{' '}
                                                        per token, which is
                                                        below{' '}
                                                        {FIRMA_DISPLAY_TICKER}'s
                                                        current buy price of{' '}
                                                        {getAgoraSpotPriceXec(
                                                            firmaBidPrice as number,
                                                            userLocale,
                                                        )}{' '}
                                                        per token. You should
                                                        redeem{' '}
                                                        {FIRMA_DISPLAY_TICKER}{' '}
                                                        instead to get the best
                                                        price.
                                                    </Alert>
                                                )}
                                            </AgoraPreviewTable>
                                            <AgoraPreviewParagraph>
                                                If actual price is not close to
                                                target price, increase your min
                                                buy.
                                            </AgoraPreviewParagraph>
                                            <AgoraPreviewParagraph>
                                                You can cancel this listing at
                                                any time.
                                            </AgoraPreviewParagraph>
                                        </>
                                    )}
                                </Modal>
                            );
                        })()}
                    {renderedTokenType === 'NFT' && (
                        <>
                            <NftNameTitle>{tokenName}</NftNameTitle>
                            {typeof cachedInfo?.groupTokenId !== 'undefined' &&
                                typeof cashtabCache.tokens.get(
                                    cachedInfo.groupTokenId,
                                ) !== 'undefined' && (
                                    <NftCollectionTitle>
                                        NFT from collection &ldquo;
                                        <Link
                                            to={`/token/${cachedInfo.groupTokenId}`}
                                        >
                                            {
                                                (
                                                    cashtabCache.tokens.get(
                                                        cachedInfo.groupTokenId,
                                                    ) as CashtabCachedTokenInfo
                                                ).genesisInfo.tokenName
                                            }
                                        </Link>
                                        &rdquo;
                                    </NftCollectionTitle>
                                )}
                        </>
                    )}

                    <TokenStatsTable title="Token Stats">
                        <TokenStatsCol>
                            <TokenIconExpandButton
                                onClick={() => setShowLargeIconModal(true)}
                            >
                                <TokenIcon size={128} tokenId={tokenId} />
                            </TokenIconExpandButton>
                            {renderedTokenType !== 'NFT' && (
                                <div>
                                    {tokenName !== undefined && (
                                        <h2>{tokenName}</h2>
                                    )}
                                    {tokenTicker !== undefined && (
                                        <span>{tokenTicker}</span>
                                    )}
                                </div>
                            )}
                        </TokenStatsCol>
                        <TokenStatsRowCtn>
                            <TokenInfoRow>
                                <label>Your Balance</label>
                                <div>
                                    {decimalizedTokenQtyToLocaleFormat(
                                        typeof tokenBalance === 'string'
                                            ? tokenBalance
                                            : '0',
                                        userLocale,
                                    )}
                                    {tokenTicker !== undefined &&
                                        tokenTicker !== '' &&
                                        ` ${tokenTicker}`}
                                </div>
                            </TokenInfoRow>
                            <TokenInfoRow
                                expand
                                role="button"
                                onClick={() =>
                                    setTokenDetailsExpanded(prev => !prev)
                                }
                                aria-expanded={tokenDetailsExpanded}
                            >
                                <label>Token Details</label>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transform: tokenDetailsExpanded
                                            ? 'rotate(180deg)'
                                            : 'none',
                                    }}
                                >
                                    <DownArrow />
                                </div>
                            </TokenInfoRow>
                            {tokenDetailsExpanded && (
                                <>
                                    <TokenStatsTableRow
                                        style={{ marginTop: '10px' }}
                                    >
                                        <label>Type</label>
                                        <div>
                                            <DataAndQuestionButton>
                                                {renderedTokenType}{' '}
                                                <IconButton
                                                    name={`Click for more info about this token type`}
                                                    icon={<QuestionIcon />}
                                                    onClick={() =>
                                                        setShowTokenTypeInfo(
                                                            true,
                                                        )
                                                    }
                                                />
                                            </DataAndQuestionButton>
                                        </div>
                                    </TokenStatsTableRow>
                                    <TokenStatsTableRow>
                                        <label>Token Id</label>
                                        <div>
                                            <a
                                                href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {(tokenId as string).slice(
                                                    0,
                                                    3,
                                                )}
                                                ...
                                                {(tokenId as string).slice(-3)}
                                            </a>
                                            <CopyIconButton
                                                name={`Copy Token ID`}
                                                data={tokenId as string}
                                            />
                                        </div>
                                    </TokenStatsTableRow>
                                    {renderedTokenType !== 'NFT' &&
                                        renderedTokenType !==
                                            'NFT Collection' && (
                                            <TokenStatsTableRow>
                                                <label>Decimals</label>
                                                <div>{decimals}</div>
                                            </TokenStatsTableRow>
                                        )}
                                    {url !== '' && (
                                        <TokenStatsTableRow>
                                            <label>URL</label>
                                            <TokenUrlCol>
                                                <UncontrolledLink
                                                    url={
                                                        url?.startsWith(
                                                            'https://',
                                                        ) ||
                                                        url?.startsWith(
                                                            'http://',
                                                        )
                                                            ? url
                                                            : `https://${url}`
                                                    }
                                                />
                                            </TokenUrlCol>
                                        </TokenStatsTableRow>
                                    )}
                                    <TokenStatsTableRow>
                                        <label>Created</label>
                                        <div>
                                            {typeof cachedInfo?.block !==
                                            'undefined'
                                                ? formatDate(
                                                      cachedInfo.block.timestamp.toString(),
                                                      navigator.language,
                                                  )
                                                : formatDate(
                                                      (
                                                          cachedInfo?.timeFirstSeen as number
                                                      ).toString(),
                                                      navigator.language,
                                                  )}
                                        </div>
                                    </TokenStatsTableRow>
                                    {renderedTokenType !== 'NFT' && (
                                        <TokenStatsTableRow>
                                            <label>Genesis Qty</label>
                                            <div>
                                                {typeof genesisSupply ===
                                                'string' ? (
                                                    decimalizedTokenQtyToLocaleFormat(
                                                        genesisSupply,
                                                        userLocale,
                                                    )
                                                ) : (
                                                    <InlineLoader />
                                                )}
                                            </div>
                                        </TokenStatsTableRow>
                                    )}
                                    {renderedTokenType !== 'NFT' && (
                                        <TokenStatsTableRow>
                                            <label>Supply</label>
                                            <div>
                                                {typeof uncachedTokenInfo.circulatingSupply ===
                                                'string' ? (
                                                    `${decimalizedTokenQtyToLocaleFormat(
                                                        uncachedTokenInfo.circulatingSupply,
                                                        userLocale,
                                                    )}${
                                                        uncachedTokenInfo.mintBatons ===
                                                            0 &&
                                                        tokenType!.type !==
                                                            'SLP_TOKEN_TYPE_MINT_VAULT'
                                                            ? ' (fixed)'
                                                            : ' (var.)'
                                                    }`
                                                ) : uncachedTokenInfoError ? (
                                                    'Error fetching supply'
                                                ) : (
                                                    <InlineLoader />
                                                )}
                                            </div>
                                        </TokenStatsTableRow>
                                    )}
                                </>
                            )}
                            {typeof hash !== 'undefined' && hash !== '' && (
                                <TokenStatsTableRow>
                                    <label>Hash</label>
                                    <div>
                                        {hash.slice(0, 3)}...
                                        {hash.slice(-3)}
                                        <CopyIconButton
                                            name={`Copy Token ID`}
                                            data={hash}
                                        />
                                    </div>
                                </TokenStatsTableRow>
                            )}
                        </TokenStatsRowCtn>
                    </TokenStatsTable>
                    {isBlacklisted && (
                        <Alert>
                            Cashtab does not support trading this token
                        </Alert>
                    )}
                    {isSupportedToken && isBlacklisted !== null && (
                        <>
                            <TokenActionBar>
                                {isBlacklisted === false && (
                                    <>
                                        <TokenActionBtn
                                            $active={
                                                activeTokenAction === 'buy'
                                            }
                                            disabled={isNftParent || isNftChild}
                                            onClick={() => setAction('buy')}
                                        >
                                            + Buy
                                        </TokenActionBtn>
                                        <TokenActionBtn
                                            $active={
                                                tokenId ===
                                                    appConfig.vipTokens.xecx
                                                        .tokenId ||
                                                tokenId === FIRMA.tokenId
                                                    ? activeTokenAction ===
                                                          'redeemXecx' ||
                                                      activeTokenAction ===
                                                          'redeemFirma'
                                                    : [
                                                          'sellSlp',
                                                          'sellNft',
                                                      ].includes(
                                                          activeTokenAction,
                                                      )
                                            }
                                            disabled={
                                                typeof tokenBalance ===
                                                'undefined'
                                            }
                                            onClick={() => {
                                                if (
                                                    typeof tokenBalance ===
                                                    'undefined'
                                                )
                                                    return;
                                                if (
                                                    tokenId ===
                                                    appConfig.vipTokens.xecx
                                                        .tokenId
                                                )
                                                    setAction('redeemXecx');
                                                else if (
                                                    tokenId === FIRMA.tokenId
                                                )
                                                    setAction('redeemFirma');
                                                else if (isNftChild)
                                                    setAction('sellNft');
                                                else if (
                                                    tokenType?.type ===
                                                        'SLP_TOKEN_TYPE_FUNGIBLE' ||
                                                    tokenType?.type ===
                                                        'SLP_TOKEN_TYPE_MINT_VAULT' ||
                                                    isAlp
                                                )
                                                    setAction('sellSlp');
                                            }}
                                        >
                                            {tokenId ===
                                                appConfig.vipTokens.xecx
                                                    .tokenId ||
                                            tokenId === FIRMA.tokenId
                                                ? '− Redeem'
                                                : '− Sell'}
                                        </TokenActionBtn>
                                    </>
                                )}
                                <TokenActionMoreWrap ref={moreDropdownRef}>
                                    <TokenActionBtn
                                        $active={[
                                            'send',
                                            'airdrop',
                                            'burn',
                                            'mint',
                                            'mintNft',
                                        ].includes(activeTokenAction)}
                                        onClick={() =>
                                            setMoreDropdownOpen(o => !o)
                                        }
                                    >
                                        ⋯
                                    </TokenActionBtn>
                                    <TokenActionDropdown
                                        $open={moreDropdownOpen}
                                    >
                                        {!isNftParent && (
                                            <TokenActionDropdownItem
                                                $disabled={
                                                    typeof tokenBalance ===
                                                    'undefined'
                                                }
                                                onClick={() =>
                                                    setAction('send')
                                                }
                                            >
                                                Send
                                            </TokenActionDropdownItem>
                                        )}
                                        {isNftParent && (
                                            <TokenActionDropdownItem
                                                onClick={() =>
                                                    setAction('mintNft')
                                                }
                                            >
                                                Mint NFT
                                            </TokenActionDropdownItem>
                                        )}
                                        {!isNftChild && (
                                            <TokenActionDropdownItem
                                                $disabled={
                                                    typeof tokenBalance ===
                                                    'undefined'
                                                }
                                                onClick={() =>
                                                    setAction('airdrop')
                                                }
                                            >
                                                Airdrop
                                            </TokenActionDropdownItem>
                                        )}
                                        {!isNftParent && !isNftChild && (
                                            <TokenActionDropdownItem
                                                $disabled={
                                                    typeof tokenBalance ===
                                                    'undefined'
                                                }
                                                onClick={() =>
                                                    setAction('burn')
                                                }
                                            >
                                                Burn
                                            </TokenActionDropdownItem>
                                        )}
                                        {mintBatons.length > 0 && (
                                            <TokenActionDropdownItem
                                                $disabled={
                                                    typeof tokenBalance ===
                                                    'undefined'
                                                }
                                                onClick={() =>
                                                    setAction('mint')
                                                }
                                            >
                                                Mint
                                            </TokenActionDropdownItem>
                                        )}
                                        {isBlacklisted === false &&
                                            isNftChild && (
                                                <TokenActionDropdownItem
                                                    $disabled={
                                                        typeof tokenBalance ===
                                                        'undefined'
                                                    }
                                                    onClick={() =>
                                                        setAction('sellNft')
                                                    }
                                                >
                                                    Sell NFT
                                                </TokenActionDropdownItem>
                                            )}
                                        {isBlacklisted === false &&
                                            (tokenId ===
                                                appConfig.vipTokens.xecx
                                                    .tokenId ||
                                                tokenId === FIRMA.tokenId) && (
                                                <TokenActionDropdownItem
                                                    $disabled={
                                                        typeof tokenBalance ===
                                                        'undefined'
                                                    }
                                                    onClick={() =>
                                                        setAction('sellSlp')
                                                    }
                                                >
                                                    List token
                                                </TokenActionDropdownItem>
                                            )}
                                    </TokenActionDropdown>
                                </TokenActionMoreWrap>
                            </TokenActionBar>
                            {isBlacklisted === false && isNftChild && (
                                <>
                                    {nftActiveOffer === null &&
                                    !nftOfferAgoraQueryError ? (
                                        <InlineLoader />
                                    ) : nftOfferAgoraQueryError ? (
                                        <Alert>Error querying NFT offers</Alert>
                                    ) : // Note that nftActiveOffer will not be null here
                                    (
                                          nftActiveOffer as unknown as OneshotOffer[]
                                      ).length === 0 ? (
                                        <NftOfferWrapper>
                                            <Info>
                                                This NFT is not for sale
                                            </Info>
                                        </NftOfferWrapper>
                                    ) : (
                                        <NftOfferWrapper>
                                            <OneshotSwiper
                                                offers={
                                                    nftActiveOffer as unknown as OneshotOffer[]
                                                }
                                                ecashWallet={ecashWallet}
                                                cashtabCache={cashtabCache}
                                                userLocale={userLocale}
                                                fiatPrice={fiatPrice}
                                                settings={settings}
                                                setOffers={setNftActiveOffer}
                                            />
                                        </NftOfferWrapper>
                                    )}
                                </>
                            )}
                            {isBlacklisted === false &&
                                activeTokenAction === 'buy' &&
                                !isNftParent &&
                                !isNftChild && (
                                    <OrderBook
                                        tokenId={tokenId as string}
                                        noIcon
                                        userLocale={userLocale}
                                        priceInFiat={tokenId === FIRMA.tokenId}
                                    />
                                )}
                        </>
                    )}
                    {isNftParent && (
                        <>
                            <NftTitle>Your NFTs in this Collection</NftTitle>
                            {ownedNftTokenIdsInCollection.length > 0 ? (
                                renderNftCollectionGrid(
                                    ownedNftTokenIdsInCollection,
                                )
                            ) : (
                                <Info>
                                    You do not own any NFTs in this collection.
                                </Info>
                            )}
                            {nftTokenIds.length > 0 && (
                                <>
                                    <NftTitle>NFTs in this Collection</NftTitle>
                                    {renderNftCollectionGrid(nftTokenIds)}
                                    <NftTitle>
                                        Listings in this Collection
                                    </NftTitle>
                                    <Collection
                                        groupTokenId={tokenId as string}
                                        agora={agora}
                                        chronik={chronik}
                                        cashtabCache={cashtabCache}
                                        settings={settings}
                                        fiatPrice={fiatPrice}
                                        userLocale={userLocale}
                                        ecashWallet={ecashWallet}
                                        noCollectionInfo
                                    />
                                </>
                            )}
                        </>
                    )}
                    {apiError && <ApiError />}
                    {typeof tokenBalance === 'undefined' && (
                        <Info>You do not hold this token.</Info>
                    )}
                    {isSupportedToken && activeTokenAction !== 'buy' && (
                        <SendTokenForm>
                            {tokenId === appConfig.vipTokens.xecx.tokenId && (
                                <>
                                    {switches.showRedeemXecx && (
                                        <>
                                            <SectionCtn>
                                                <SectionLabel>
                                                    Quantity
                                                </SectionLabel>
                                                <SendTokenFormRow>
                                                    <InputRow>
                                                        <Slider
                                                            name={'Total qty'}
                                                            value={
                                                                agoraPartialTokenQty
                                                            }
                                                            handleSlide={
                                                                handleTokenOfferedSlide
                                                            }
                                                            error={
                                                                agoraPartialTokenQtyError
                                                            }
                                                            min={0}
                                                            max={tokenBalance}
                                                            step={parseFloat(
                                                                `1e-${decimals}`,
                                                            )}
                                                            allowTypedInput
                                                        />
                                                    </InputRow>
                                                </SendTokenFormRow>

                                                {!tokenListPriceError &&
                                                    formData.tokenListPrice !==
                                                        '' &&
                                                    formData.tokenListPrice !==
                                                        null &&
                                                    fiatPrice !== null && (
                                                        <ListPricePreview title="Token List Price">
                                                            {getAgoraPartialPricePreview()}
                                                        </ListPricePreview>
                                                    )}
                                                <SendTokenFormRow>
                                                    <PrimaryButton
                                                        style={{
                                                            marginTop: '12px',
                                                        }}
                                                        disabled={
                                                            apiError ||
                                                            agoraPartialTokenQtyError !==
                                                                false ||
                                                            agoraPartialMinError !==
                                                                false ||
                                                            tokenListPriceError !==
                                                                false ||
                                                            formData.tokenListPrice ===
                                                                '' ||
                                                            formData.tokenListPrice ===
                                                                null ||
                                                            agoraPartialTokenQty ===
                                                                '' ||
                                                            agoraPartialMin ===
                                                                ''
                                                        }
                                                        onClick={
                                                            previewAgoraPartial
                                                        }
                                                    >
                                                        Redeem XECX for XEC
                                                    </PrimaryButton>
                                                </SendTokenFormRow>
                                            </SectionCtn>
                                        </>
                                    )}
                                </>
                            )}
                            {tokenId === FIRMA.tokenId && (
                                <>
                                    {switches.showRedeemFirma && (
                                        <>
                                            <SectionCtn>
                                                <SectionLabel>
                                                    Quantity
                                                </SectionLabel>
                                                <SendTokenFormRow>
                                                    <InputRow>
                                                        <Slider
                                                            name={'Total qty'}
                                                            value={
                                                                agoraPartialTokenQty
                                                            }
                                                            handleSlide={
                                                                handleTokenOfferedSlide
                                                            }
                                                            error={
                                                                agoraPartialTokenQtyError
                                                            }
                                                            min={0}
                                                            max={tokenBalance}
                                                            step={parseFloat(
                                                                `1e-${decimals}`,
                                                            )}
                                                            allowTypedInput
                                                        />
                                                    </InputRow>
                                                </SendTokenFormRow>

                                                {!tokenListPriceError &&
                                                    formData.tokenListPrice !==
                                                        '' &&
                                                    formData.tokenListPrice !==
                                                        null &&
                                                    fiatPrice !== null && (
                                                        <ListPricePreview title="Token List Price">
                                                            {getAgoraPartialPricePreview()}
                                                        </ListPricePreview>
                                                    )}
                                                <SendTokenFormRow>
                                                    <PrimaryButton
                                                        style={{
                                                            marginTop: '12px',
                                                        }}
                                                        disabled={
                                                            apiError ||
                                                            agoraPartialTokenQtyError !==
                                                                false ||
                                                            agoraPartialTokenQty ===
                                                                '0' ||
                                                            agoraPartialTokenQty ===
                                                                '' ||
                                                            isCalculatingRedeemFirma
                                                        }
                                                        onClick={
                                                            previewFirmaPartial
                                                        }
                                                    >
                                                        {isCalculatingRedeemFirma ? (
                                                            <InlineLoader />
                                                        ) : (
                                                            `Redeem ${FIRMA_DISPLAY_NAME} for XEC`
                                                        )}
                                                    </PrimaryButton>
                                                </SendTokenFormRow>
                                            </SectionCtn>
                                        </>
                                    )}
                                </>
                            )}
                            {isNftChild ? (
                                <>
                                    {switches.showSellNft && (
                                        <SectionCtn>
                                            <SendTokenFormRow>
                                                <InputRow>
                                                    <ListPriceInput
                                                        name="nftListPrice"
                                                        placeholder="Enter NFT list price"
                                                        value={
                                                            formData.nftListPrice
                                                        }
                                                        selectValue={
                                                            selectedCurrency
                                                        }
                                                        selectDisabled={
                                                            fiatPrice === null
                                                        }
                                                        fiatCode={settings.fiatCurrency.toUpperCase()}
                                                        error={
                                                            nftListPriceError
                                                        }
                                                        handleInput={
                                                            handleNftListPriceChange
                                                        }
                                                        handleSelect={
                                                            handleSelectedCurrencyChange
                                                        }
                                                    ></ListPriceInput>
                                                </InputRow>
                                            </SendTokenFormRow>
                                            {!nftListPriceError &&
                                                formData.nftListPrice !== '' &&
                                                formData.nftListPrice !==
                                                    null &&
                                                fiatPrice !== null && (
                                                    <ListPricePreview title="NFT List Price">
                                                        {selectedCurrency ===
                                                        appConfig.ticker
                                                            ? `${parseFloat(
                                                                  formData.nftListPrice,
                                                              ).toLocaleString(
                                                                  userLocale,
                                                              )}
                                                        XEC = ${
                                                            settings
                                                                ? `${
                                                                      supportedFiatCurrencies[
                                                                          settings
                                                                              .fiatCurrency
                                                                      ].symbol
                                                                  } `
                                                                : '$ '
                                                        }${(
                                                            parseFloat(
                                                                formData.nftListPrice,
                                                            ) * fiatPrice
                                                        ).toLocaleString(
                                                            userLocale,
                                                            {
                                                                minimumFractionDigits:
                                                                    appConfig.cashDecimals,
                                                                maximumFractionDigits:
                                                                    appConfig.cashDecimals,
                                                            },
                                                        )} ${
                                                            settings &&
                                                            settings.fiatCurrency
                                                                ? settings.fiatCurrency.toUpperCase()
                                                                : 'USD'
                                                        }`
                                                            : `${
                                                                  settings
                                                                      ? `${
                                                                            supportedFiatCurrencies[
                                                                                settings
                                                                                    .fiatCurrency
                                                                            ]
                                                                                .symbol
                                                                        } `
                                                                      : '$ '
                                                              }${parseFloat(
                                                                  formData.nftListPrice,
                                                              ).toLocaleString(
                                                                  userLocale,
                                                              )} ${
                                                                  settings &&
                                                                  settings.fiatCurrency
                                                                      ? settings.fiatCurrency.toUpperCase()
                                                                      : 'USD'
                                                              } = ${(
                                                                  parseFloat(
                                                                      formData.nftListPrice,
                                                                  ) / fiatPrice
                                                              ).toLocaleString(
                                                                  userLocale,
                                                                  {
                                                                      minimumFractionDigits:
                                                                          appConfig.cashDecimals,
                                                                      maximumFractionDigits:
                                                                          appConfig.cashDecimals,
                                                                  },
                                                              )}
                                                        XEC`}
                                                    </ListPricePreview>
                                                )}
                                            <SendTokenFormRow>
                                                <PrimaryButton
                                                    style={{
                                                        marginTop: '12px',
                                                    }}
                                                    disabled={
                                                        apiError ||
                                                        nftListPriceError !==
                                                            false ||
                                                        formData.nftListPrice ===
                                                            ''
                                                    }
                                                    onClick={() =>
                                                        setShowConfirmListNft(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    List {tokenName}
                                                </PrimaryButton>
                                            </SendTokenFormRow>
                                        </SectionCtn>
                                    )}
                                </>
                            ) : (
                                (tokenType?.type ===
                                    'SLP_TOKEN_TYPE_FUNGIBLE' ||
                                    tokenType?.type ===
                                        'SLP_TOKEN_TYPE_MINT_VAULT' ||
                                    isAlp) && (
                                    <>
                                        {switches.showSellSlp && (
                                            <SectionCtn>
                                                <SectionLabel>
                                                    Quantity
                                                </SectionLabel>
                                                <SendTokenFormRow>
                                                    <InputRow>
                                                        <Slider
                                                            name={'Total qty'}
                                                            value={
                                                                agoraPartialTokenQty
                                                            }
                                                            handleSlide={
                                                                handleTokenOfferedSlide
                                                            }
                                                            error={
                                                                agoraPartialTokenQtyError
                                                            }
                                                            min={0}
                                                            max={tokenBalance}
                                                            // Step is 1 smallets supported decimal point of the given token
                                                            step={parseFloat(
                                                                `1e-${decimals}`,
                                                            )}
                                                            allowTypedInput
                                                        />
                                                    </InputRow>
                                                </SendTokenFormRow>
                                                <SendTokenFormRow>
                                                    <InputRow>
                                                        <LabelAndInputFlex>
                                                            <SliderLabel>
                                                                Price:
                                                            </SliderLabel>
                                                            <ListPriceInput
                                                                name="tokenListPrice"
                                                                placeholder="Enter list price (per token)"
                                                                inputDisabled={
                                                                    agoraPartialTokenQty ===
                                                                    ''
                                                                }
                                                                value={
                                                                    formData.tokenListPrice
                                                                }
                                                                selectValue={
                                                                    selectedCurrency
                                                                }
                                                                selectDisabled={
                                                                    fiatPrice ===
                                                                    null
                                                                }
                                                                fiatCode={settings.fiatCurrency.toUpperCase()}
                                                                error={
                                                                    tokenListPriceError
                                                                }
                                                                handleInput={
                                                                    handleTokenListPriceChange
                                                                }
                                                                handleSelect={
                                                                    handleSelectedCurrencyChange
                                                                }
                                                            ></ListPriceInput>
                                                        </LabelAndInputFlex>
                                                    </InputRow>
                                                </SendTokenFormRow>
                                                <SendTokenFormRow>
                                                    <InputRow>
                                                        <Slider
                                                            name={
                                                                'agoraPartialMin'
                                                            }
                                                            disabled={
                                                                formData.tokenListPrice ===
                                                                    '' ||
                                                                tokenListPriceError !==
                                                                    false
                                                            }
                                                            label="Min qty"
                                                            value={
                                                                agoraPartialMin
                                                            }
                                                            handleSlide={
                                                                handleTokenMinSlide
                                                            }
                                                            error={
                                                                agoraPartialMinError
                                                            }
                                                            min={0}
                                                            max={
                                                                agoraPartialTokenQty
                                                            }
                                                            // Step is 1 smallets supported decimal point of the given token
                                                            step={parseFloat(
                                                                `1e-${decimals}`,
                                                            )}
                                                            allowTypedInput
                                                        />
                                                    </InputRow>
                                                </SendTokenFormRow>

                                                {!tokenListPriceError &&
                                                    formData.tokenListPrice !==
                                                        '' &&
                                                    formData.tokenListPrice !==
                                                        null &&
                                                    fiatPrice !== null && (
                                                        <ListPricePreview title="Token List Price">
                                                            {getAgoraPartialPricePreview()}
                                                        </ListPricePreview>
                                                    )}
                                                <SendTokenFormRow>
                                                    <PrimaryButton
                                                        style={{
                                                            marginTop: '12px',
                                                        }}
                                                        disabled={
                                                            apiError ||
                                                            agoraPartialTokenQtyError !==
                                                                false ||
                                                            agoraPartialMinError !==
                                                                false ||
                                                            tokenListPriceError !==
                                                                false ||
                                                            formData.tokenListPrice ===
                                                                '' ||
                                                            agoraPartialTokenQty ===
                                                                '' ||
                                                            agoraPartialMin ===
                                                                ''
                                                        }
                                                        onClick={
                                                            previewAgoraPartial
                                                        }
                                                    >
                                                        List {tokenName}
                                                    </PrimaryButton>
                                                </SendTokenFormRow>
                                            </SectionCtn>
                                        )}
                                    </>
                                )
                            )}
                            {!isNftParent && (
                                <>
                                    {switches.showSend && (
                                        <>
                                            <SectionCtn>
                                                <SendTokenFormRow>
                                                    <InputRow>
                                                        <InputWithScanner
                                                            label="Address"
                                                            placeholder={`Address`}
                                                            name="address"
                                                            value={
                                                                formData.address
                                                            }
                                                            handleInput={
                                                                handleTokenAddressChange
                                                            }
                                                            error={
                                                                sendTokenAddressError
                                                            }
                                                        />
                                                    </InputRow>
                                                </SendTokenFormRow>
                                                {!isNftChild && (
                                                    <SendTokenFormRow>
                                                        <SendTokenInput
                                                            label="Amount"
                                                            name="amount"
                                                            value={
                                                                formData.amount
                                                            }
                                                            error={
                                                                sendTokenAmountError
                                                            }
                                                            placeholder="Amount"
                                                            handleInput={
                                                                handleTokenAmountChange
                                                            }
                                                            handleOnMax={onMax}
                                                        />
                                                    </SendTokenFormRow>
                                                )}
                                                <SendTokenFormRow>
                                                    <PrimaryButton
                                                        style={{
                                                            marginTop: '12px',
                                                        }}
                                                        disabled={
                                                            apiError ||
                                                            sendTokenAmountError !==
                                                                false ||
                                                            sendTokenAddressError !==
                                                                false ||
                                                            formData.address ===
                                                                '' ||
                                                            (!isNftChild &&
                                                                formData.amount ===
                                                                    '')
                                                        }
                                                        onClick={() =>
                                                            checkForConfirmationBeforeSendEtoken()
                                                        }
                                                    >
                                                        Send {tokenTicker}
                                                    </PrimaryButton>
                                                </SendTokenFormRow>
                                            </SectionCtn>
                                        </>
                                    )}
                                </>
                            )}
                            {isNftParent && switches.showMintNft && (
                                <SectionCtn>
                                    <CreateTokenForm groupTokenId={tokenId} />
                                </SectionCtn>
                            )}
                            {!isNftChild && switches.showAirdrop && (
                                <SectionCtn>
                                    <TokenStatsRow>
                                        <Link
                                            style={{
                                                width: '100%',
                                            }}
                                            to="/airdrop"
                                            state={{
                                                airdropEtokenId: tokenId,
                                            }}
                                        >
                                            <SecondaryButton
                                                style={{
                                                    marginTop: '12px',
                                                }}
                                            >
                                                Airdrop Calculator
                                            </SecondaryButton>
                                        </Link>
                                    </TokenStatsRow>
                                </SectionCtn>
                            )}
                            {!isNftParent &&
                                !isNftChild &&
                                switches.showBurn && (
                                    <SectionCtn>
                                        <TokenStatsRow>
                                            <InputFlex>
                                                <SendTokenInput
                                                    label="Amount"
                                                    name="burnAmount"
                                                    value={formData.burnAmount}
                                                    error={burnTokenAmountError}
                                                    placeholder="Burn Amount"
                                                    handleInput={
                                                        handleEtokenBurnAmountChange
                                                    }
                                                    handleOnMax={onMaxBurn}
                                                />

                                                <SecondaryButton
                                                    onClick={
                                                        handleBurnAmountInput
                                                    }
                                                    disabled={
                                                        burnTokenAmountError !==
                                                            false ||
                                                        formData.burnAmount ===
                                                            ''
                                                    }
                                                >
                                                    Burn {tokenTicker}
                                                </SecondaryButton>
                                            </InputFlex>
                                        </TokenStatsRow>
                                    </SectionCtn>
                                )}
                            {mintBatons.length > 0 && switches.showMint && (
                                <SectionCtn>
                                    <TokenStatsRow>
                                        <InputFlex>
                                            <SendTokenInput
                                                label="Amount"
                                                name="mintAmount"
                                                value={formData.mintAmount}
                                                error={mintAmountError}
                                                placeholder="Mint Amount"
                                                handleInput={
                                                    handleMintAmountChange
                                                }
                                                handleOnMax={onMaxMint}
                                            />

                                            <SecondaryButton
                                                onClick={
                                                    mintOrShowConfirmationModal
                                                }
                                                disabled={
                                                    mintAmountError !== false ||
                                                    formData.mintAmount === ''
                                                }
                                            >
                                                Mint {tokenTicker}
                                            </SecondaryButton>
                                        </InputFlex>
                                    </TokenStatsRow>
                                </SectionCtn>
                            )}
                        </SendTokenForm>
                    )}
                </>
            )}
        </OuterCtn>
    );
};

export default Token;
