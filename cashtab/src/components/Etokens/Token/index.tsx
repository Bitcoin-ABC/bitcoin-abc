// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import PrimaryButton, {
    SecondaryButton,
    IconButton,
    CopyIconButton,
} from 'components/Common/Buttons';
import { SwitchLabel, Info, Alert } from 'components/Common/Atoms';
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
import { getMintBatons, getAgoraAdFuelSats } from 'token-protocols/slpv1';
import { getMaxDecimalizedQty, getSendTokenInputs } from 'token-protocols';
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
import Switch from 'components/Common/Switch';
import {
    DataAndQuestionButton,
    TokenIconExpandButton,
    SendTokenForm,
    SendTokenFormRow,
    InputRow,
    TokenStatsTable,
    TokenStatsRow,
    TokenStatsCol,
    TokenUrlCol,
    TokenStatsTableRow,
    SwitchHolder,
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
    fromHex,
    toHex,
    shaRmd160,
    payment,
    TokenType,
    TxBuilder,
} from 'ecash-lib';
import { InlineLoader } from 'components/Common/Spinner';
import {
    AgoraOneshot,
    AgoraOneshotAdSignatory,
    AgoraPartialAdSignatory,
    AgoraPartial,
    getAgoraPaymentAction,
} from 'ecash-agora';
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
    const { settings, cashtabCache, activeWallet } = cashtabState;
    if (!activeWallet || !ecashWallet) {
        return null;
    }
    const wallet = activeWallet;
    // We get sk/pk/hash when wallet changes

    const { tokens, balanceSats } = wallet.state;

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
        ({ tokenName, tokenTicker, url, hash, decimals } = genesisInfo);
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
    const mintBatons = getMintBatons(wallet.state.slpUtxos, tokenId as string);

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
            ? `Unable to fetch $FIRMA redeem hot wallet balance`
            : `Cannot redeem more than ${toXec(
                  maxFirmaRedeemSats,
              ).toLocaleString(userLocale, {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
              })} XEC worth of $FIRMA. Visit firma.cash to redeem for $USDT.`;

    /**
     * Convenience method to compartmentalize comparison of state
     * variables that require calculations
     *
     * TODO dynamically size modals
     */
    const getRedeemXecxModalHeight = () => {
        const askedQtyStr = Number(agoraPartialTokenQty).toFixed(2);
        const actualQtyStr = decimalizeTokenAmount(
            previewedAgoraPartial!.offeredAtoms().toString(),
            decimals as SlpDecimals,
        );
        const offeredXecxSats = previewedAgoraPartial!.offeredAtoms();

        let baseHeight = 175;
        if (
            xecxSweeperBalanceSats !== null &&
            offeredXecxSats > xecxSweeperBalanceSats
        ) {
            // If we need to show the "redemption may take 24 hrs" notice
            baseHeight += 125;
        }
        if (askedQtyStr !== actualQtyStr) {
            // If we need to show the "agora values differ" notice
            baseHeight += 125;
        }
        return baseHeight;
    };

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
            // Do nothing for unsupported tokens
            // Do nothing if we haven't loaded the cached info yet
            return;
        }
        // This useEffect block works as a de-facto "on load" block,
        // for after we have the tokenId from the url params of this page
        if (!isNftParent) {
            if (tokenId === appConfig.vipTokens.xecx.tokenId) {
                // If this is the XECX token page, default option is redeeming XECX
                // i.e. selling XECX for XEC, 1:1
                setSwitches({ ...switchesOff, showRedeemXecx: true });
            } else if (tokenId === FIRMA.tokenId) {
                // If this is the Firma token page, default option is redeeming Firma
                // i.e. selling Firma for XEC at the Firma bid price
                setSwitches({ ...switchesOff, showRedeemFirma: true });
            } else if (isNftChild) {
                // Default action is list
                setSwitches({ ...switchesOff, showSellNft: true });
                // Check if it is listed
                getNftOffer();
            } else if (
                tokenType.type === 'SLP_TOKEN_TYPE_FUNGIBLE' ||
                tokenType.type === 'SLP_TOKEN_TYPE_MINT_VAULT' ||
                isAlp
            ) {
                // Default action is List for non-NFT tokens
                setSwitches({ ...switchesOff, showSellSlp: true });
            } else {
                // Default action is send
                setSwitches({ ...switchesOff, showSend: true });
            }
        }
    }, [isSupportedToken, isNftParent, isNftChild]);

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
            const availableNftMintInputs = wallet.state.slpUtxos.filter(
                (slpUtxo: TokenUtxo) =>
                    slpUtxo?.token?.tokenId === tokenId &&
                    slpUtxo?.token?.atoms >= 1n,
            );
            setAvailableNftInputs(availableNftMintInputs.length);
        }
    }, [wallet.state.slpUtxos, isNftParent]);

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
                      ? `Cannot redeem less than ${FIRMA_MINIMUM_REDEMPTION} FIRMA`
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
            console.log(`rawTx: ${builtAction.txs[0].toHex()}`);
            console.log(`txid: ${builtAction.txs[0].txid()}`);
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

        // Build the ad tx
        // The advertisement tx is an SLP send tx of the listed NFT to the seller's wallet

        const enforcedOutputs = [
            {
                sats: 0n,
                script: slpSend(tokenId as string, SLP_NFT1_CHILD, [0n, 1n]),
            },
            {
                sats: BigInt(listPriceSatoshis),
                script: Script.p2pkh(fromHex(wallet.hash)),
            },
        ];

        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs,
            cancelPk: fromHex(activeWallet.pk),
        });
        const agoraAdScript = agoraOneshot.adScript();
        const agoraAdP2sh = Script.p2sh(shaRmd160(agoraAdScript.bytecode));

        // We need to calculate the fee of the offer tx before we build the
        // "ad prep" tx

        // Determine the offerTx parameters before building txs, so we can
        // accurately calculate its fee
        const agoraScript = agoraOneshot.script();
        const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));

        const offerTargetOutputs = [
            {
                sats: 0n,
                script: slpSend(tokenId as string, SLP_NFT1_CHILD, [1n]),
            },
            { sats: BigInt(appConfig.dustSats), script: agoraP2sh },
        ];
        const offerTxFuelSats = getAgoraAdFuelSats(
            agoraAdScript,
            AgoraOneshotAdSignatory(fromHex(wallet.sk)),
            offerTargetOutputs,
            BigInt(satsPerKb),
        );

        // So, the ad prep tx must include an output with an input that covers this fee
        // This will be dust + fee
        const adFuelOutputSats = appConfig.dustSats + offerTxFuelSats;

        // Broadcast the ad setup tx using ecash-wallet
        let adSetupTxid;
        try {
            // Build payment.Action for ad setup transaction
            // This sends the NFT to the P2SH address with fuel for the offer tx
            // Output 0: OP_RETURN (ecash-wallet will build the script from tokenActions)
            // Output 1: P2SH output with NFT (for the offer tx)
            // ecash-wallet will automatically select the NFT UTXO based on the token send action
            const adSetupOutputs: payment.PaymentOutput[] = [
                { sats: 0n }, // OP_RETURN - ecash-wallet will build the script
                {
                    sats: BigInt(adFuelOutputSats),
                    script: agoraAdP2sh,
                    tokenId: tokenId as string,
                    atoms: 1n, // NFT quantity is always 1
                },
            ];

            const adSetupAction: payment.Action = {
                outputs: adSetupOutputs,
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenId as string,
                        tokenType: SLP_TOKEN_TYPE_NFT1_CHILD,
                    },
                ],
                feePerKb: BigInt(satsPerKb),
            };

            // Build and broadcast using ecash-wallet
            const builtAdSetupAction = ecashWallet
                .action(adSetupAction)
                .build();
            const adSetupBroadcastResult = await builtAdSetupAction.broadcast();

            if (!adSetupBroadcastResult.success) {
                throw new Error(
                    `Ad setup transaction broadcast failed: ${adSetupBroadcastResult.errors?.join(', ')}`,
                );
            }

            adSetupTxid = adSetupBroadcastResult.broadcasted[0];

            confirmRawTx(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${adSetupTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Created NFT ad
                </a>,
            );
        } catch (err) {
            console.error(`Error creating NFT listing ad`, err);
            toast.error(`Error creating NFT listing ad: ${err}`);
            // Do not attempt to list the NFT if the ad tx fails
            return;
        }

        // Build and broadcast the offer transaction
        // This uses a P2SH input with custom signatory, so we build it manually with TxBuilder
        let offerTxid;
        try {
            const offerInputs = [
                {
                    input: {
                        prevOut: {
                            // Since we just broadcast the ad tx and know how it was built,
                            // this prevOut will always look like this
                            txid: adSetupTxid,
                            outIdx: 1,
                        },
                        signData: {
                            sats: BigInt(adFuelOutputSats),
                            redeemScript: agoraAdScript,
                        },
                    },
                    signatory: AgoraOneshotAdSignatory(fromHex(wallet.sk)),
                },
            ];

            // Build the offer transaction using TxBuilder
            const offerTxBuilder = new TxBuilder({
                inputs: offerInputs,
                outputs: offerTargetOutputs,
            });

            const offerTx = offerTxBuilder.sign({
                feePerKb: BigInt(satsPerKb),
                dustSats: BigInt(appConfig.dustSats),
            });

            // Broadcast using ecash-wallet's chronik
            const { txid } = await ecashWallet.chronik.broadcastTx(
                toHex(offerTx.ser()),
            );
            offerTxid = txid;

            // Maintain this notification as we do not parse listing prices in websocket
            toast(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${offerTxid}`}
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
                    icon: <TokenIcon size={32} tokenId={tokenId as string} />,
                },
            );

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
            agoraPartial = await agora.selectParams(
                {
                    tokenId: tokenId,
                    // We cannot render the Token screen until tokenType is defined
                    tokenType: (tokenType as TokenType).number,
                    // We cannot render the Token screen until protocol is defined
                    tokenProtocol: protocol as 'ALP' | 'SLP',
                    offeredAtoms: userSuggestedOfferedTokens,
                    priceNanoSatsPerAtom: priceNanoSatsPerTokenSatoshi,
                    makerPk: fromHex(wallet.pk),
                    minAcceptedAtoms,
                },
                appConfig.scriptIntegerBits,
            );
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
                makerPk: fromHex(wallet.pk),
                minAcceptedAtoms: userSuggestedOfferedTokens,
            };
            firmaPartial = await agora.selectParams(
                firmaPartialParams,
                appConfig.scriptIntegerBits,
            );

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
            while (actualPrice > firmaBidPrice && attempts < MAX_ATTEMPTS) {
                priceNanoSatsPerAtom -=
                    NANOSATS_PER_ATOM_REDUCTION_PER_ITERATION;
                // This time we only update the price, we do not need to update locktime
                firmaPartial = await agora.selectParams({
                    ...firmaPartialParams,
                    priceNanoSatsPerAtom,
                });
                actualPrice = getFirmaPartialUnitPrice(firmaPartial);
                // loop repeats until actualPrice <= firmaBidPrice
                attempts += 1;
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
        if (!tokenType) {
            // Should never happen
            toast.error(`Error listing SLP partial: tokenType is undefined`);
            return;
        }
        if (!ecashWallet) {
            // Should never happen
            toast.error(`Error listing SLP partial: wallet not initialized`);
            return;
        }

        // offeredTokens is in units of token satoshis
        const offeredTokens = (
            previewedAgoraPartial as AgoraPartial
        ).offeredAtoms();

        const satsPerKb = settings.satsPerKb;

        const agoraAdScript = (
            previewedAgoraPartial as AgoraPartial
        ).adScript();
        const agoraAdP2sh = Script.p2sh(shaRmd160(agoraAdScript.bytecode));

        // Get enough token utxos to cover the listing
        // Note that getSendTokenInputs expects decimalized tokens as a string and decimals as a param
        // Because we have undecimalized tokens in token sats from the AgoraPartial object,
        // We pass this and "0" as decimals
        const slpInputsInfo = getSendTokenInputs(
            wallet.state.slpUtxos,
            tokenId as string,
            // This is already in units of token sats
            offeredTokens.toString(),
            0, // offeredTokens is already undecimalized
        );

        const { sendAmounts } = slpInputsInfo;

        // Seller finishes offer setup + sends tokens to the advertised P2SH
        const agoraScript = (previewedAgoraPartial as AgoraPartial).script();
        const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));

        const offerTargetOutputs = [
            {
                sats: 0n,
                // We will not have any token change for the tx that creates the offer
                // This is bc the ad setup tx sends the exact amount of tokens we need
                // for the ad tx (the offer)
                script: slpSend(tokenId as string, tokenType.number, [
                    sendAmounts[0],
                ]),
            },
            { sats: BigInt(appConfig.dustSats), script: agoraP2sh },
        ];

        const adSetupSatoshis = getAgoraAdFuelSats(
            agoraAdScript,
            AgoraPartialAdSignatory(fromHex(wallet.sk)),
            offerTargetOutputs,
            BigInt(satsPerKb),
        );

        // The ad setup tx itself is sending tokens to a dust output
        // So, the fuel input must be adSetupSatoshis more than dust
        const agoraAdFuelInputSats = appConfig.dustSats + adSetupSatoshis;

        // Calculate decimalized total offered amount for notifications
        const decimalizedOfferedTokens = decimalizeTokenAmount(
            offeredTokens.toString(),
            decimals as SlpDecimals,
        );

        // Broadcast the ad setup tx using ecash-wallet
        let adSetupTxid;
        try {
            // Build payment.Action for ad setup transaction
            // This sends tokens to the P2SH address with fuel for the offer tx
            // Output 0: OP_RETURN (ecash-wallet will build the script from tokenActions)
            // Output 1: P2SH output with tokens (for the offer tx)
            // Output 2 (if change): Token change output
            const adSetupOutputs: payment.PaymentOutput[] = [
                { sats: 0n }, // OP_RETURN - ecash-wallet will build the script
                {
                    sats: BigInt(agoraAdFuelInputSats),
                    script: agoraAdP2sh,
                    tokenId: tokenId as string,
                    atoms: sendAmounts[0], // The amount being sent to P2SH
                },
            ];

            // Include token change output for the ad setup tx if we have change
            if (sendAmounts.length > 1) {
                adSetupOutputs.push({
                    sats: BigInt(appConfig.dustSats),
                    script: ecashWallet.script,
                    tokenId: tokenId as string,
                    atoms: sendAmounts[1],
                });
            }

            // ecash-wallet will automatically select the required token UTXOs based on the token send action
            const adSetupAction: payment.Action = {
                outputs: adSetupOutputs,
                tokenActions: [
                    {
                        type: 'SEND',
                        tokenId: tokenId as string,
                        tokenType,
                    },
                ],
                feePerKb: BigInt(satsPerKb),
            };

            // Build and broadcast using ecash-wallet
            const builtAdSetupAction = ecashWallet
                .action(adSetupAction)
                .build();
            const adSetupBroadcastResult = await builtAdSetupAction.broadcast();

            if (!adSetupBroadcastResult.success) {
                throw new Error(
                    `Ad setup transaction broadcast failed: ${adSetupBroadcastResult.errors?.join(', ')}`,
                );
            }

            adSetupTxid = adSetupBroadcastResult.broadcasted[0];

            confirmRawTx(
                <a
                    href={`${explorer.blockExplorerUrl}/tx/${adSetupTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {`Successful ad setup tx to offer ${decimalizedOfferedTokens} ${tokenName} for ${getAgoraPartialActualPrice()} per token`}
                </a>,
            );
        } catch (err) {
            console.error(`Error creating SLP Partial listing ad`, err);
            toast.error(`Error creating SLP Partial listing ad: ${err}`);
            // Do not attempt to list the SLP Partial if the ad tx fails
            return;
        }

        // Build and broadcast the offer transaction
        // This uses a P2SH input with custom signatory, so we build it manually with TxBuilder
        let offerTxid;
        try {
            const offerInputs = [
                {
                    input: {
                        prevOut: {
                            // Since we just broadcast the ad tx and know how it was built,
                            // this prevOut will always look like this
                            txid: adSetupTxid,
                            outIdx: 1,
                        },
                        signData: {
                            sats: BigInt(agoraAdFuelInputSats),
                            redeemScript: agoraAdScript,
                        },
                    },
                    signatory: AgoraPartialAdSignatory(fromHex(wallet.sk)),
                },
            ];

            // Build the offer transaction using TxBuilder
            const offerTxBuilder = new TxBuilder({
                inputs: offerInputs,
                outputs: offerTargetOutputs,
            });

            const offerTx = offerTxBuilder.sign({
                feePerKb: BigInt(satsPerKb),
                dustSats: BigInt(appConfig.dustSats),
            });

            // Broadcast using ecash-wallet's chronik
            const { txid } = await ecashWallet.chronik.broadcastTx(
                toHex(offerTx.ser()),
            );
            offerTxid = txid;

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
            console.error(`Error listing SLP Partial`, err);
            toast.error(`Error listing SLP Partial: ${err}`);
        }

        // Clear the offer
        // Note this will also clear the confirmation modal
        setPreviewedAgoraPartial(null);
    };

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
                            height={275}
                            showButtons={false}
                            handleCancel={() => setShowLargeIconModal(false)}
                        >
                            <TokenIcon size={256} tokenId={tokenId} />
                        </Modal>
                    )}
                    {showLargeNftIcon !== '' && (
                        <Modal
                            height={275}
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
                            handleCancel={() => setShowConfirmBurnEtoken(false)}
                            showCancelButton
                            height={250}
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
                                height={275}
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
                                height={getRedeemXecxModalHeight()}
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
                                            ? `Redeem $FIRMA for XEC?`
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
                                    height={isRedeemingFirma ? 290 : 450}
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
                                                        $FIRMA
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
                                                        $FIRMA price:{' '}
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
                                                        listing FIRMA for{' '}
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
                                                        below FIRMA's current
                                                        buy price of{' '}
                                                        {getAgoraSpotPriceXec(
                                                            firmaBidPrice as number,
                                                            userLocale,
                                                        )}{' '}
                                                        per token. You should
                                                        redeem FIRMA instead to
                                                        get the best price.
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
                                        NFT from collection &quot;
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
                                        &quot;
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
                                <>
                                    {tokenName !== undefined && (
                                        <h2>{tokenName}</h2>
                                    )}
                                    {tokenTicker !== undefined && (
                                        <span>{tokenTicker}</span>
                                    )}
                                </>
                            )}
                        </TokenStatsCol>
                        <TokenStatsRowCtn>
                            {typeof tokenBalance === 'string' && (
                                <TokenStatsTableRow balance>
                                    <label>Your Balance</label>
                                    <div>
                                        {decimalizedTokenQtyToLocaleFormat(
                                            tokenBalance,
                                            userLocale,
                                        )}
                                        {tokenTicker !== undefined &&
                                            tokenTicker !== '' &&
                                            ` ${tokenTicker}`}
                                    </div>
                                </TokenStatsTableRow>
                            )}
                            <TokenStatsTableRow>
                                <label>Type</label>
                                <div>
                                    <DataAndQuestionButton>
                                        {renderedTokenType}{' '}
                                        <IconButton
                                            name={`Click for more info about this token type`}
                                            icon={<QuestionIcon />}
                                            onClick={() =>
                                                setShowTokenTypeInfo(true)
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
                                        {(tokenId as string).slice(0, 3)}...
                                        {(tokenId as string).slice(-3)}
                                    </a>
                                    <CopyIconButton
                                        name={`Copy Token ID`}
                                        data={tokenId as string}
                                        showToast
                                        customMsg={`Token ID "${tokenId}" copied to clipboard`}
                                    />
                                </div>
                            </TokenStatsTableRow>
                            {renderedTokenType !== 'NFT' &&
                                renderedTokenType !== 'NFT Collection' && (
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
                                                url?.startsWith('https://') ||
                                                url?.startsWith('http://')
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
                                    {typeof cachedInfo?.block !== 'undefined'
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
                                        {typeof genesisSupply === 'string' ? (
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
                            {typeof hash !== 'undefined' && hash !== '' && (
                                <TokenStatsTableRow>
                                    <label>Hash</label>
                                    <div>
                                        {hash.slice(0, 3)}...
                                        {hash.slice(-3)}
                                        <CopyIconButton
                                            name={`Copy Token ID`}
                                            data={hash}
                                            showToast
                                            customMsg={`Token document hash "${hash}" copied to clipboard`}
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
                    {isSupportedToken &&
                        isBlacklisted !== null &&
                        !isBlacklisted &&
                        isNftChild && (
                            <>
                                {nftActiveOffer === null &&
                                !nftOfferAgoraQueryError ? (
                                    <InlineLoader />
                                ) : nftOfferAgoraQueryError ? (
                                    <Alert>Error querying NFT offers</Alert>
                                ) : // Note that nftActiveOffer will not be null here
                                (nftActiveOffer as unknown as OneshotOffer[])
                                      .length === 0 ? (
                                    <NftOfferWrapper>
                                        <Info>This NFT is not for sale</Info>
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
                    {isSupportedToken &&
                        isBlacklisted !== null &&
                        !isBlacklisted &&
                        !isNftParent &&
                        !isNftChild && (
                            <OrderBook
                                tokenId={tokenId as string}
                                noIcon
                                userLocale={userLocale}
                                priceInFiat={tokenId === FIRMA.tokenId}
                            />
                        )}
                    {isNftParent && nftTokenIds.length > 0 && (
                        <>
                            <NftTitle>NFTs in this Collection</NftTitle>
                            <NftTable>
                                {nftTokenIds.map(nftTokenId => {
                                    const cachedNftInfo =
                                        cashtabCache.tokens.get(nftTokenId);
                                    return (
                                        <NftCol key={nftTokenId}>
                                            <NftRow>
                                                <TokenIconExpandButton
                                                    onClick={() =>
                                                        setShowLargeNftIcon(
                                                            nftTokenId,
                                                        )
                                                    }
                                                >
                                                    <TokenIcon
                                                        size={64}
                                                        tokenId={nftTokenId}
                                                    />
                                                </TokenIconExpandButton>
                                            </NftRow>
                                            <NftRow>
                                                <NftTokenIdAndCopyIcon>
                                                    <a
                                                        href={`#/token/${nftTokenId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {nftTokenId.slice(0, 3)}
                                                        ...
                                                        {nftTokenId.slice(-3)}
                                                    </a>
                                                    <CopyIconButton
                                                        name={`Copy Token ID`}
                                                        data={nftTokenId}
                                                        showToast
                                                        customMsg={`NFT Token ID "${nftTokenId}" copied to clipboard`}
                                                    />
                                                </NftTokenIdAndCopyIcon>
                                            </NftRow>
                                            {typeof cachedNftInfo !==
                                                'undefined' && (
                                                <>
                                                    <NftRow>
                                                        {typeof tokens.get(
                                                            nftTokenId,
                                                        ) !== 'undefined' ? (
                                                            <Link
                                                                to={`/token/${nftTokenId}`}
                                                            >
                                                                {
                                                                    cachedNftInfo
                                                                        .genesisInfo
                                                                        .tokenName
                                                                }
                                                            </Link>
                                                        ) : (
                                                            cachedNftInfo
                                                                .genesisInfo
                                                                .tokenName
                                                        )}
                                                    </NftRow>
                                                </>
                                            )}
                                        </NftCol>
                                    );
                                })}
                            </NftTable>
                            <NftTitle>Listings in this Collection</NftTitle>
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
                    {apiError && <ApiError />}
                    {typeof tokenBalance === 'undefined' ? (
                        <Info>You do not hold this token.</Info>
                    ) : (
                        <>
                            {isSupportedToken && (
                                <SendTokenForm title="Token Actions">
                                    {tokenId ===
                                        appConfig.vipTokens.xecx.tokenId && (
                                        <>
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Redeem XECX"
                                                    on="🤳"
                                                    off="🤳"
                                                    checked={
                                                        switches.showRedeemXecx
                                                    }
                                                    handleToggle={() => {
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showRedeemXecx:
                                                                !switches.showRedeemXecx,
                                                        });
                                                    }}
                                                />
                                                <SwitchLabel>
                                                    Redeem {tokenName} (
                                                    {tokenTicker}) 1:1 for XEC
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showRedeemXecx && (
                                                <>
                                                    <SendTokenFormRow>
                                                        <InputRow>
                                                            <Slider
                                                                name={
                                                                    'agoraPartialTokenQty'
                                                                }
                                                                label={`Offered qty`}
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
                                                                max={
                                                                    tokenBalance
                                                                }
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
                                                                marginTop:
                                                                    '12px',
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
                                                </>
                                            )}
                                        </>
                                    )}
                                    {tokenId === FIRMA.tokenId && (
                                        <>
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Redeem FIRMA"
                                                    on="🤳"
                                                    off="🤳"
                                                    checked={
                                                        switches.showRedeemFirma
                                                    }
                                                    handleToggle={() => {
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showRedeemFirma:
                                                                !switches.showRedeemFirma,
                                                        });
                                                    }}
                                                />
                                                <SwitchLabel>
                                                    Redeem {tokenName}
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showRedeemFirma && (
                                                <>
                                                    <SendTokenFormRow>
                                                        <InputRow>
                                                            <Slider
                                                                name={
                                                                    'agoraPartialTokenQty'
                                                                }
                                                                label={`Offered qty`}
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
                                                                max={
                                                                    tokenBalance
                                                                }
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
                                                                marginTop:
                                                                    '12px',
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
                                                                `Redeem FIRMA for XEC`
                                                            )}
                                                        </PrimaryButton>
                                                    </SendTokenFormRow>
                                                </>
                                            )}
                                        </>
                                    )}
                                    {isNftChild ? (
                                        <>
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Sell NFT"
                                                    on="💰"
                                                    off="💰"
                                                    checked={
                                                        switches.showSellNft
                                                    }
                                                    handleToggle={() => {
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showSellNft:
                                                                !switches.showSellNft,
                                                        });
                                                    }}
                                                />
                                                <SwitchLabel>
                                                    Sell {tokenName} (
                                                    {tokenTicker})
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showSellNft && (
                                                <>
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
                                                                    fiatPrice ===
                                                                    null
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
                                                        formData.nftListPrice !==
                                                            '' &&
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
                                                                          ) /
                                                                          fiatPrice
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
                                                                marginTop:
                                                                    '12px',
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
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        (tokenType?.type ===
                                            'SLP_TOKEN_TYPE_FUNGIBLE' ||
                                            tokenType?.type ===
                                                'SLP_TOKEN_TYPE_MINT_VAULT' ||
                                            isAlp) && (
                                            <>
                                                <SwitchHolder>
                                                    <Switch
                                                        name="Toggle Sell Token"
                                                        on="💰"
                                                        off="💰"
                                                        checked={
                                                            switches.showSellSlp
                                                        }
                                                        handleToggle={() => {
                                                            // We turn everything else off, whether we are turning this one on or off
                                                            setSwitches({
                                                                ...switchesOff,
                                                                showSellSlp:
                                                                    !switches.showSellSlp,
                                                            });
                                                        }}
                                                    />
                                                    <SwitchLabel>
                                                        Sell {tokenName} (
                                                        {tokenTicker})
                                                    </SwitchLabel>
                                                    <IconButton
                                                        name={`Click for more info about agora partial sales`}
                                                        icon={<QuestionIcon />}
                                                        onClick={() =>
                                                            setShowAgoraPartialInfo(
                                                                true,
                                                            )
                                                        }
                                                    />
                                                </SwitchHolder>

                                                {switches.showSellSlp && (
                                                    <>
                                                        <SendTokenFormRow>
                                                            <InputRow>
                                                                <Slider
                                                                    name={
                                                                        'agoraPartialTokenQty'
                                                                    }
                                                                    label={`Offered qty`}
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
                                                                    max={
                                                                        tokenBalance
                                                                    }
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
                                                                    label={`Min qty`}
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
                                                            fiatPrice !==
                                                                null && (
                                                                <ListPricePreview title="Token List Price">
                                                                    {getAgoraPartialPricePreview()}
                                                                </ListPricePreview>
                                                            )}
                                                        <SendTokenFormRow>
                                                            <PrimaryButton
                                                                style={{
                                                                    marginTop:
                                                                        '12px',
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
                                                    </>
                                                )}
                                            </>
                                        )
                                    )}
                                    {!isNftParent && (
                                        <>
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Send"
                                                    on="➡️"
                                                    off="➡️"
                                                    checked={switches.showSend}
                                                    handleToggle={() => {
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showSend:
                                                                !switches.showSend,
                                                        });
                                                    }}
                                                />
                                                <SwitchLabel>
                                                    Send {tokenName} (
                                                    {tokenTicker})
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showSend && (
                                                <>
                                                    <SendTokenFormRow>
                                                        <InputRow>
                                                            <InputWithScanner
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
                                                                handleOnMax={
                                                                    onMax
                                                                }
                                                            />
                                                        </SendTokenFormRow>
                                                    )}
                                                    <SendTokenFormRow>
                                                        <PrimaryButton
                                                            style={{
                                                                marginTop:
                                                                    '12px',
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
                                                </>
                                            )}
                                        </>
                                    )}
                                    {isNftParent && (
                                        <>
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Mint NFT"
                                                    checked={
                                                        switches.showMintNft
                                                    }
                                                    handleToggle={() =>
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showMintNft:
                                                                !switches.showMintNft,
                                                        })
                                                    }
                                                />
                                                <SwitchLabel>
                                                    Mint NFT
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showMintNft && (
                                                <CreateTokenForm
                                                    groupTokenId={tokenId}
                                                />
                                            )}
                                        </>
                                    )}
                                    {!isNftChild && (
                                        <>
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Airdrop"
                                                    on="🪂"
                                                    off="🪂"
                                                    checked={
                                                        switches.showAirdrop
                                                    }
                                                    handleToggle={() =>
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showAirdrop:
                                                                !switches.showAirdrop,
                                                        })
                                                    }
                                                />
                                                <SwitchLabel>
                                                    Airdrop XEC to {tokenTicker}{' '}
                                                    holders
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showAirdrop && (
                                                <TokenStatsRow>
                                                    <Link
                                                        style={{
                                                            width: '100%',
                                                        }}
                                                        to="/airdrop"
                                                        state={{
                                                            airdropEtokenId:
                                                                tokenId,
                                                        }}
                                                    >
                                                        <SecondaryButton
                                                            style={{
                                                                marginTop:
                                                                    '12px',
                                                            }}
                                                        >
                                                            Airdrop Calculator
                                                        </SecondaryButton>
                                                    </Link>
                                                </TokenStatsRow>
                                            )}
                                        </>
                                    )}
                                    {!isNftParent && !isNftChild && (
                                        <>
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Burn"
                                                    on="🔥"
                                                    off="🔥"
                                                    checked={switches.showBurn}
                                                    handleToggle={() =>
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showBurn:
                                                                !switches.showBurn,
                                                        })
                                                    }
                                                />
                                                <SwitchLabel>
                                                    Burn {tokenTicker}
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showBurn && (
                                                <TokenStatsRow>
                                                    <InputFlex>
                                                        <SendTokenInput
                                                            name="burnAmount"
                                                            value={
                                                                formData.burnAmount
                                                            }
                                                            error={
                                                                burnTokenAmountError
                                                            }
                                                            placeholder="Burn Amount"
                                                            handleInput={
                                                                handleEtokenBurnAmountChange
                                                            }
                                                            handleOnMax={
                                                                onMaxBurn
                                                            }
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
                                            )}
                                        </>
                                    )}
                                    {mintBatons.length > 0 && (
                                        <SwitchHolder>
                                            <Switch
                                                name="Toggle Mint"
                                                on="⚗️"
                                                off="⚗️"
                                                checked={switches.showMint}
                                                handleToggle={() =>
                                                    // We turn everything else off, whether we are turning this one on or off
                                                    setSwitches({
                                                        ...switchesOff,
                                                        showMint:
                                                            !switches.showMint,
                                                    })
                                                }
                                            />
                                            <SwitchLabel>Mint</SwitchLabel>
                                        </SwitchHolder>
                                    )}
                                    {switches.showMint && (
                                        <TokenStatsRow>
                                            <InputFlex>
                                                <SendTokenInput
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
                                                        mintAmountError !==
                                                            false ||
                                                        formData.mintAmount ===
                                                            ''
                                                    }
                                                >
                                                    Mint {tokenTicker}
                                                </SecondaryButton>
                                            </InputFlex>
                                        </TokenStatsRow>
                                    )}
                                </SendTokenForm>
                            )}
                        </>
                    )}
                </>
            )}
        </OuterCtn>
    );
};

export default Token;
