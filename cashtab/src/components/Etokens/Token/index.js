// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WalletContext } from 'wallet/context';
import PrimaryButton, {
    SecondaryButton,
    IconButton,
    CopyIconButton,
} from 'components/Common/Buttons';
import { TxLink, SwitchLabel, Info, Alert } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import BalanceHeaderToken from 'components/Common/BalanceHeaderToken';
import { useNavigate } from 'react-router-dom';
import { Event } from 'components/Common/GoogleAnalytics';
import { getWalletState } from 'utils/cashMethods';
import ApiError from 'components/Common/ApiError';
import {
    isValidTokenSendOrBurnAmount,
    parseAddressInput,
    isValidTokenMintAmount,
    getXecListPriceError,
    getAgoraPartialListPriceError,
    NANOSAT_DECIMALS,
    isValidTokenId,
} from 'validation';
import { BN } from 'slp-mdm';
import { formatDate, getFormattedFiatPrice } from 'utils/formatting';
import TokenIcon from 'components/Etokens/TokenIcon';
import { explorer } from 'config/explorer';
import { token as tokenConfig } from 'config/token';
import { queryAliasServer } from 'alias';
import aliasSettings from 'config/alias';
import cashaddr from 'ecashaddrjs';
import appConfig from 'config/app';
import { isMobile, getUserLocale } from 'helpers';
import {
    getSendTokenInputs,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutputs,
    getMintBatons,
    getMintTargetOutputs,
    getMaxDecimalizedSlpQty,
    getNftChildGenesisInput,
    getNftParentFanInputs,
    getNftParentFanTxTargetOutputs,
    getNft,
    getNftChildSendTargetOutputs,
    getAgoraAdFuelSats,
} from 'slpv1';
import { sendXec } from 'transactions';
import {
    hasEnoughToken,
    decimalizeTokenAmount,
    toSatoshis,
    toXec,
    undecimalizeTokenAmount,
    xecToNanoSatoshis,
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
} from 'components/Common/Inputs';
import { QuestionIcon } from 'components/Common/CustomIcons';
import { decimalizedTokenQtyToLocaleFormat } from 'utils/formatting';
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
    TokenStatsLabel,
    SwitchHolder,
    TokenSentLink,
    AliasAddressPreviewLabel,
    InfoModalParagraph,
    ButtonDisabledMsg,
    ButtonDisabledSpan,
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
} from 'components/Etokens/Token/styled';
import CreateTokenForm from 'components/Etokens/CreateTokenForm';
import {
    getAllTxHistoryByTokenId,
    getChildNftsFromParent,
    getTokenGenesisInfo,
} from 'chronik';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import {
    slpSend,
    SLP_NFT1_CHILD,
    SLP_FUNGIBLE,
    Script,
    fromHex,
    shaRmd160,
    P2PKHSignatory,
    ALL_BIP143,
} from 'ecash-lib';
import { InlineLoader } from 'components/Common/Spinner';
import {
    AgoraOneshot,
    AgoraOneshotAdSignatory,
    AgoraPartialAdSignatory,
} from 'ecash-agora';
import * as wif from 'wif';
import OrderBook from 'components/Agora/OrderBook';

const Token = () => {
    let navigate = useNavigate();
    const {
        apiError,
        cashtabState,
        updateCashtabState,
        chronik,
        agora,
        ecc,
        chaintipBlockheight,
        fiatPrice,
    } = useContext(WalletContext);
    const { settings, wallets, cashtabCache } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    // We get public key when wallet changes
    const sk =
        wallet === false
            ? false
            : wif.decode(wallet.paths.get(appConfig.derivationPath).wif)
                  .privateKey;
    const pk = sk === false ? false : ecc.derivePubkey(sk);
    const walletState = getWalletState(wallet);
    const { tokens, balanceSats } = walletState;

    const { tokenId } = useParams();

    const validTokenId = isValidTokenId(tokenId);

    const tokenBalance = tokens.get(tokenId);
    const cachedInfo =
        typeof cashtabCache.tokens.get(tokenId) !== 'undefined'
            ? cashtabCache.tokens.get(tokenId)
            : {
                  tokenType: {
                      number: 1,
                      protocol: 'SLP',
                      type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                  },
                  genesisInfo: {
                      tokenName: 'UNCACHED',
                      tokenTicker: 'UNCACHED',
                      decimals: 0,
                  },
                  genesisSupply: '0',
                  genesisMintBatons: 0,
              };

    const { tokenType, genesisInfo, genesisSupply } = cachedInfo;
    const { tokenName, tokenTicker, url, hash, decimals } = genesisInfo;

    let isSupportedToken = false;
    let isNftParent = false;
    let isNftChild = false;

    // Assign default values which will be presented for any token without explicit support
    let renderedTokenType = `${tokenType.protocol} ${tokenType.number} ${tokenType.type}`;
    let renderedTokenDescription =
        'This token is not yet supported by Cashtab.';
    switch (tokenType.protocol) {
        case 'SLP': {
            switch (tokenType.type) {
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
                default: {
                    // leave renderedTokenType and renderedTokenDescription as defaults
                    break;
                }
            }
            break;
        }
        case 'ALP': {
            renderedTokenType = 'ALP';
            // Leave renderedTokenDescription as default
            break;
        }
        default: {
            // leave renderedTokenType and renderedTokenDescription as defaults
            break;
        }
    }

    const [isBlacklisted, setIsBlacklisted] = useState(null);
    const [chronikQueryError, setChronikQueryError] = useState(false);
    const [nftTokenIds, setNftTokenIds] = useState([]);
    const [nftChildGenesisInput, setNftChildGenesisInput] = useState([]);
    const [nftFanInputs, setNftFanInputs] = useState([]);
    const [availableNftInputs, setAvailableNftInputs] = useState(0);
    const [showTokenTypeInfo, setShowTokenTypeInfo] = useState(false);
    const [showAgoraPartialInfo, setShowAgoraPartialInfo] = useState(false);
    const [showFanoutInfo, setShowFanoutInfo] = useState(false);
    const [showMintNftInfo, setShowMintNftInfo] = useState(false);
    const [sendTokenAddressError, setSendTokenAddressError] = useState(false);
    const [sendTokenAmountError, setSendTokenAmountError] = useState(false);
    const [showConfirmBurnEtoken, setShowConfirmBurnEtoken] = useState(false);
    const [burnTokenAmountError, setBurnTokenAmountError] = useState(false);
    const [mintAmountError, setMintAmountError] = useState(false);
    const [burnConfirmationError, setBurnConfirmationError] = useState(false);
    const [confirmationOfEtokenToBeBurnt, setConfirmationOfEtokenToBeBurnt] =
        useState('');
    const [aliasInputAddress, setAliasInputAddress] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(appConfig.ticker);
    const [nftListPriceError, setNftListPriceError] = useState(false);
    const [slpListPriceError, setSlpListPriceError] = useState(false);
    const [showConfirmListNft, setShowConfirmListNft] = useState(false);
    const [showConfirmListPartialSlp, setShowConfirmListPartialSlp] =
        useState(false);
    const [slpAgoraPartialTokenQty, setSlpAgoraPartialTokenQty] = useState('0');
    const [slpAgoraPartialTokenQtyError, setSlpAgoraPartialTokenQtyError] =
        useState(false);
    const [slpAgoraPartialMin, setSlpAgoraPartialMin] = useState('0');
    const [slpAgoraPartialMinError, setSlpAgoraPartialMinError] =
        useState(false);
    // We need to build an agora partial and keep it in state so the user is able
    // to confirm the actual offer is reasonable vs their inputs, which are approximations
    const [previewedAgoraPartial, setPreviewedAgoraPartial] = useState(null);

    // By default, we load the app with all switches disabled
    // For SLP v1 tokens, we want showSend to be enabled by default
    // But we may not want this to be default for other token types in the future
    const switchesOff = {
        showSend: false,
        showAirdrop: false,
        showBurn: false,
        showMint: false,
        showFanout: false,
        showMintNft: false,
        showSellNft: false,
        showSellSlp: false,
    };
    const [switches, setSwitches] = useState(switchesOff);
    const [showLargeIconModal, setShowLargeIconModal] = useState(false);
    const [showLargeNftIcon, setShowLargeNftIcon] = useState('');
    const defaultUncachedTokenInfo = {
        circulatingSupply: null,
        mintBatons: null,
    };
    const [uncachedTokenInfo, setUncachedTokenInfo] = useState(
        defaultUncachedTokenInfo,
    );
    const [uncachedTokenInfoError, setUncachedTokenInfoError] = useState(false);

    // Check if the user has mint batons for this token
    // If they don't, disable the mint switch and label why
    const mintBatons = getMintBatons(wallet.state.slpUtxos, tokenId);

    // Load with QR code open if device is mobile
    const openWithScanner =
        settings && settings.autoCameraOn === true && isMobile(navigator);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const emptyFormData = {
        amount: '',
        address: '',
        burnAmount: '',
        mintAmount: '',
        nftListPrice: null,
        slpListPrice: null,
    };

    const [formData, setFormData] = useState(emptyFormData);

    const userLocale = getUserLocale(navigator);

    const getAgoraPartialActualPrice = () => {
        // Due to encoding limitations of agora offers, the actual price may vary depending on how
        // much of an offer the buyer accepts
        // Calculate the actual price by determining the price per token for the minimum buy of the created preview offer

        // Get min accepted tokens
        // Note this value is in token satoshis
        const minAcceptedTokenSatoshis =
            previewedAgoraPartial.minAcceptedTokens();
        // Get the cost for accepting the min offer
        // Note this price is in satoshis (per token satoshi)
        const minAcceptPriceSats = previewedAgoraPartial.askedSats(
            minAcceptedTokenSatoshis,
        );
        const minAcceptedPriceXec = toXec(Number(minAcceptPriceSats));
        // Decimalize token amount
        const minAcceptedTokens = decimalizeTokenAmount(
            minAcceptedTokenSatoshis.toString(),
            decimals,
        );
        // Get the unit price
        // Use BN because this could be less than 1 satoshi
        const actualPricePerToken = new BN(minAcceptedPriceXec).div(
            new BN(minAcceptedTokens),
        );
        // Get formatted price in XEC
        const renderedActualPrice = getFormattedFiatPrice(
            settings,
            userLocale,
            actualPricePerToken.toNumber(),
            null,
        );

        return renderedActualPrice;
    };

    const getAgoraPartialTargetPriceXec = () => {
        // Get the price per token, in XEC, based on the user's input settings
        // Used for a visual comparison with the calculated actual price in XEC
        // from the created Agora Partial (which we get from getAgoraPartialActualPrice())
        return selectedCurrency === appConfig.ticker
            ? getFormattedFiatPrice(
                  settings,
                  userLocale,
                  formData.slpListPrice,
                  null,
              )
            : getFormattedFiatPrice(
                  settings,
                  userLocale,
                  parseFloat(formData.slpListPrice) / fiatPrice,
                  null,
              );
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
            formData.slpListPrice === null ||
            typeof settings !== 'object' ||
            typeof fiatPrice === 'undefined'
        ) {
            return;
        }
        let inputPrice = formData.slpListPrice;
        if (inputPrice === '') {
            inputPrice = 0;
        }
        return selectedCurrency === appConfig.ticker
            ? `${getFormattedFiatPrice(
                  settings,
                  userLocale,
                  inputPrice,
                  null,
              )} (${getFormattedFiatPrice(
                  settings,
                  userLocale,
                  inputPrice,
                  fiatPrice,
              )}) per token`
            : `${
                  supportedFiatCurrencies[settings.fiatCurrency].symbol
              }${inputPrice.toLocaleString(
                  userLocale,
              )} ${selectedCurrency.toUpperCase()} (${getFormattedFiatPrice(
                  settings,
                  userLocale,
                  parseFloat(inputPrice) / fiatPrice,
                  null,
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
                const { token } = utxo;
                const { amount, isMintBaton } = token;
                undecimalizedBigIntCirculatingSupply += BigInt(amount);
                if (isMintBaton) {
                    mintBatons += 1;
                }
            }
            const circulatingSupply = decimalizeTokenAmount(
                undecimalizedBigIntCirculatingSupply.toString(),
                decimals,
            );

            setUncachedTokenInfo({ circulatingSupply, mintBatons });
        } catch (err) {
            console.error(`Error in chronik.tokenId(${tokenId}).utxos()`, err);
            setUncachedTokenInfoError(true);
        }
    };

    const addTokenToCashtabCache = async tokenId => {
        try {
            const cachedInfoWithGroupTokenId = await getTokenGenesisInfo(
                chronik,
                tokenId,
            );
            cashtabCache.tokens.set(tokenId, cachedInfoWithGroupTokenId);
            updateCashtabState('cashtabCache', cashtabCache);
        } catch (err) {
            console.error(`Error getting token details for ${tokenId}`, err);
            setChronikQueryError(true);
        }
    };

    useEffect(() => {
        if (cachedInfo.tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
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
            addTokenToCashtabCache(tokenId);
        } else {
            // Get token info that is not practical to cache as it is subject to change
            // Note that we need decimals from cache for supply to be accurate
            getUncachedTokenInfo();

            // Get token blacklist status
            getTokenBlacklistStatus();
        }
    }, [tokenId, cashtabCache.tokens.get(tokenId)]);

    useEffect(() => {
        if (!isSupportedToken) {
            // Do nothing for unsupported tokens
            return;
        }
        // This useEffect block works as a de-facto "on load" block,
        // for after we have the tokenId from the url params of this page
        if (!isNftParent) {
            // Supported token that is not an NFT parent
            if (isNftChild) {
                // Default action is list
                setSwitches({ ...switchesOff, showSellNft: true });
            } else if (tokenType.type === 'SLP_TOKEN_TYPE_FUNGIBLE') {
                setSwitches({ ...switchesOff, showSellSlp: true });
            } else {
                // Default action is send
                setSwitches({ ...switchesOff, showSend: true });
            }
        }
    }, [isSupportedToken, isNftParent, isNftChild]);

    useEffect(() => {
        // Clear NFT and SLP list prices and de-select fiat currency if rate is unavailable
        handleSelectedCurrencyChange({ target: { value: 'XEC' } });
    }, [fiatPrice]);

    useEffect(() => {
        // We need to adjust slpAgoraPartialMin if the user reduces slpAgoraPartialTokenQty
        if (Number(slpAgoraPartialTokenQty) < Number(slpAgoraPartialMin)) {
            setSlpAgoraPartialMin(slpAgoraPartialTokenQty);
        }
    }, [slpAgoraPartialTokenQty]);

    const getNfts = async tokenId => {
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
            // Update nft fan inputs
            setNftFanInputs(
                getNftParentFanInputs(tokenId, wallet.state.slpUtxos),
            );
            // Update nft child genesis input
            // Note this is always an array, either empty or of 1 qty-1 utxo
            setNftChildGenesisInput(
                getNftChildGenesisInput(tokenId, wallet.state.slpUtxos),
            );
            // Update the child NFTs
            getNfts(tokenId);
            // Get total amount of child genesis inputs
            const availableNftMintInputs = wallet.state.slpUtxos.filter(
                slpUtxo =>
                    slpUtxo?.token?.tokenId === tokenId &&
                    slpUtxo?.token?.amount === '1',
            );
            setAvailableNftInputs(availableNftMintInputs.length);
        }
    }, [wallet.state.slpUtxos, isNftParent]);

    useEffect(() => {
        if (nftChildGenesisInput.length > 0) {
            // If we have inputs to mint an NFT, NFT1 default action should be Mint NFT
            setSwitches({
                ...switchesOff,
                showMintNft: true,
            });
        } else if (nftFanInputs.length > 0) {
            // If we have no nftChildGenesisInput but we do have nftFanInputs
            // default action should be a fan-out tx to get these inputs
            setSwitches({
                ...switchesOff,
                showFanout: true,
            });
        }
        // Otherwise all switches are off
    }, [nftFanInputs, nftChildGenesisInput]);

    useEffect(() => {
        if (previewedAgoraPartial === null) {
            // Hide the confirm modal if the user cancels the listing
            // This happens
            // 1 - on screen load
            // 2 - on user canceling an SLP listing at confirmation modal
            return setShowConfirmListPartialSlp(false);
        }

        // Show the Agora Partial summary and confirm modal when we have a non-null previewedAgoraPartial
        setShowConfirmListPartialSlp(true);
    }, [previewedAgoraPartial]);

    // Clears address and amount fields following a send token notification
    const clearInputForms = () => {
        setFormData(emptyFormData);
        setAliasInputAddress(false); // clear alias address preview
    };

    async function sendToken() {
        // Track number of SLPA send transactions and
        // SLPA token IDs
        Event('SendToken.js', 'Send', tokenId);

        const { address, amount } = formData;

        let cleanAddress;
        // check state on whether this is an alias or ecash address
        if (aliasInputAddress) {
            cleanAddress = aliasInputAddress;
        } else {
            // Get the non-alias param-free address
            cleanAddress = address.split('?')[0];
        }

        try {
            // Get input utxos for slpv1 send tx
            const tokenInputInfo = !isNftChild
                ? getSendTokenInputs(
                      wallet.state.slpUtxos,
                      tokenId,
                      amount,
                      decimals,
                  )
                : undefined;

            // Get targetOutputs for an slpv1 send tx
            const tokenSendTargetOutputs = isNftChild
                ? getNftChildSendTargetOutputs(tokenId, cleanAddress)
                : getSlpSendTargetOutputs(tokenInputInfo, cleanAddress);

            // Build and broadcast the tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                tokenSendTargetOutputs,
                settings.minFeeSends &&
                    (hasEnoughToken(
                        tokens,
                        appConfig.vipTokens.grumpy.tokenId,
                        appConfig.vipTokens.grumpy.vipBalance,
                    ) ||
                        hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.cachet.tokenId,
                            appConfig.vipTokens.cachet.vipBalance,
                        ))
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
                isNftChild
                    ? getNft(tokenId, wallet.state.slpUtxos)
                    : tokenInputInfo.tokenInputs,
            );

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {isNftChild ? 'NFT sent' : 'eToken sent'}
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            clearInputForms();
        } catch (e) {
            console.error(`Error sending ${isNftChild ? 'NFT' : 'token'}`, e);
            toast.error(`${e}`);
        }
    }

    /**
     * Create SLP1 NFT Mint Fan Inputs
     * Function may only be called if nftFanInputs is not an empty array
     * Note the only button that calls this function is disabled if nftFanInputs.length === 0
     */
    async function createNftMintInputs() {
        try {
            // Get targetOutputs for an slpv1 nft parent fan-out tx
            const nftFanTargetOutputs =
                getNftParentFanTxTargetOutputs(nftFanInputs);

            // Build and broadcast the tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                nftFanTargetOutputs,
                settings.minFeeSends &&
                    (hasEnoughToken(
                        tokens,
                        appConfig.vipTokens.grumpy.tokenId,
                        appConfig.vipTokens.grumpy.vipBalance,
                    ) ||
                        hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.cachet.tokenId,
                            appConfig.vipTokens.cachet.vipBalance,
                        ))
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
                nftFanInputs,
            );

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    NFT Mint inputs created
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            clearInputForms();
        } catch (e) {
            console.error(`Error creating NFT mint inputs`, e);
            toast.error(`${e}`);
        }
    }

    const handleSlpOfferedSlide = e => {
        const amount = e.target.value;

        const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            amount,
            tokenBalance,
            decimals,
        );

        setSlpAgoraPartialTokenQtyError(
            isValidAmountOrErrorMsg === true ? false : isValidAmountOrErrorMsg,
        );

        setSlpAgoraPartialTokenQty(amount);
    };

    const handleSlpMinSlide = e => {
        const amount = e.target.value;

        const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            amount,
            tokenBalance,
            decimals,
        );

        setSlpAgoraPartialMinError(
            isValidAmountOrErrorMsg === true ? false : isValidAmountOrErrorMsg,
        );

        // Also validate price input if it is non-zero
        // If the user has reduced min qty, the price may now be below dust
        if (formData.slpListPrice !== null) {
            setSlpListPriceError(
                getAgoraPartialListPriceError(
                    formData.slpListPrice,
                    selectedCurrency,
                    fiatPrice,
                    amount,
                    decimals,
                ),
            );
        }

        setSlpAgoraPartialMin(amount);
    };

    const handleSlpAmountChange = e => {
        const { value, name } = e.target;
        const isValidAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            value,
            tokenBalance,
            decimals,
        );
        setSendTokenAmountError(
            isValidAmountOrErrorMsg === true ? false : isValidAmountOrErrorMsg,
        );
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleTokenAddressChange = async e => {
        setAliasInputAddress(false); // clear alias address preview
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
            cashaddr.isValidCashAddress(address, 'etoken')
        ) {
            // If address is a valid eToken address, no error
            // We support sending to etoken: addresses on SendToken screen
            renderedError = false;
        } else if (
            parsedAddressInput.address.isAlias &&
            parsedAddressInput.address.error === false
        ) {
            // if input is a valid alias (except for server validation check)

            // extract alias without the `.xec`
            const aliasName = address.slice(0, address.length - 4);

            // retrieve the alias details for `aliasName` from alias-server
            let aliasDetails;
            try {
                aliasDetails = await queryAliasServer('alias', aliasName);
                if (!aliasDetails.address) {
                    renderedError =
                        'eCash Alias does not exist or yet to receive 1 confirmation';
                } else {
                    // Valid address response returned
                    setAliasInputAddress(aliasDetails.address);
                }
            } catch (err) {
                console.error(
                    `handleTokenAddressChange(): error retrieving alias`,
                    err,
                );
                renderedError =
                    'Error resolving alias at indexer, contact admin.';
            }
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
            let amount = tokenBalance;

            setFormData({
                ...formData,
                amount,
            });
        } catch (err) {
            console.error(`Error in onMax:`);
            console.error(err);
        }
    };

    const onMaxMint = () => {
        const maxMintAmount = getMaxDecimalizedSlpQty(decimals);

        handleMintAmountChange({
            target: {
                name: 'mintAmount',
                value: maxMintAmount,
            },
        });
    };

    const checkForConfirmationBeforeSendEtoken = () => {
        if (settings.sendModal) {
            setIsModalVisible(settings.sendModal);
        } else {
            // if the user does not have the send confirmation enabled in settings then send directly
            sendToken();
        }
    };

    const handleOk = () => {
        setIsModalVisible(false);
        sendToken();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleEtokenBurnAmountChange = e => {
        const { name, value } = e.target;
        const isValidBurnAmountOrErrorMsg = isValidTokenSendOrBurnAmount(
            value,
            tokenBalance,
            decimals,
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

    const handleMintAmountChange = e => {
        const { name, value } = e.target;
        const isValidMintAmountOrErrorMsg = isValidTokenMintAmount(
            value,
            decimals,
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
        });
    };

    async function burn() {
        if (burnConfirmationError || formData.burnAmount === '') {
            return;
        }

        Event('SendToken.js', 'Burn eToken', tokenId);

        try {
            // Get input utxos for slpv1 burn tx
            // This is done the same way as for an slpv1 send tx
            const tokenInputInfo = getSendTokenInputs(
                wallet.state.slpUtxos,
                tokenId,
                formData.burnAmount,
                decimals,
            );

            // Get targetOutputs for an slpv1 burn tx
            // this is NOT like an slpv1 send tx
            const tokenBurnTargetOutputs =
                getSlpBurnTargetOutputs(tokenInputInfo);

            // Build and broadcast the tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                tokenBurnTargetOutputs,
                settings.minFeeSends &&
                    (hasEnoughToken(
                        tokens,
                        appConfig.vipTokens.grumpy.tokenId,
                        appConfig.vipTokens.grumpy.vipBalance,
                    ) ||
                        hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.cachet.tokenId,
                            appConfig.vipTokens.cachet.vipBalance,
                        ))
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
                tokenInputInfo.tokenInputs,
                true, // skip SLP burn checks
            );
            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🔥 Burn successful
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            clearInputForms();
            setShowConfirmBurnEtoken(false);
            setConfirmationOfEtokenToBeBurnt('');
        } catch (e) {
            setShowConfirmBurnEtoken(false);
            setConfirmationOfEtokenToBeBurnt('');
            toast.error(`${e}`);
        }
    }

    async function handleMint() {
        Event('SendToken.js', 'Mint eToken', tokenId);

        // We only use 1 mint baton
        const mintBaton = mintBatons[0];
        const tokenTypeNumberFromUtxo = mintBaton.token.tokenType.number;

        try {
            // Get targetOutputs for an slpv1 burn tx
            // this is NOT like an slpv1 send tx
            const mintTargetOutputs = getMintTargetOutputs(
                tokenId,
                decimals,
                formData.mintAmount,
                tokenTypeNumberFromUtxo,
            );

            // We should not be able to get here without at least one mint baton,
            // as the mint switch would be disabled
            // Still, handle
            if (mintBatons.length < 1) {
                throw new Error(`Unable to find mint baton for ${tokenName}`);
            }

            // Build and broadcast the tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                mintTargetOutputs,
                settings.minFeeSends &&
                    (hasEnoughToken(
                        tokens,
                        appConfig.vipTokens.grumpy.tokenId,
                        appConfig.vipTokens.grumpy.vipBalance,
                    ) ||
                        hasEnoughToken(
                            tokens,
                            appConfig.vipTokens.cachet.tokenId,
                            appConfig.vipTokens.cachet.vipBalance,
                        ))
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
                [mintBaton],
            );
            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ⚗️ Minted {formData.mintAmount} {tokenTicker}
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            clearInputForms();
        } catch (e) {
            toast.error(`${e}`);
        }
    }

    const handleBurnConfirmationInput = e => {
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

    const handleSelectedCurrencyChange = e => {
        setSelectedCurrency(e.target.value);
        // Clear SLP and NFT price input fields to prevent unit confusion
        // User must re-specify price in new units
        setFormData(p => ({
            ...p,
            nftListPrice: '',
            slpListPrice: '',
        }));
    };

    const handleNftListPriceChange = e => {
        const { name, value } = e.target;
        setNftListPriceError(
            getXecListPriceError(value, selectedCurrency, fiatPrice),
        );
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleSlpListPriceChange = e => {
        const { name, value } = e.target;

        setSlpListPriceError(
            getAgoraPartialListPriceError(
                value,
                selectedCurrency,
                fiatPrice,
                slpAgoraPartialMin,
                decimals,
            ),
        );

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const listNft = async () => {
        const listPriceSatoshis =
            selectedCurrency === appConfig.ticker
                ? toSatoshis(formData.nftListPrice)
                : toSatoshis(
                      parseFloat(
                          (
                              parseFloat(formData.nftListPrice) / fiatPrice
                          ).toFixed(2),
                      ),
                  );
        const satsPerKb =
            settings.minFeeSends &&
            (hasEnoughToken(
                tokens,
                appConfig.vipTokens.grumpy.tokenId,
                appConfig.vipTokens.grumpy.vipBalance,
            ) ||
                hasEnoughToken(
                    tokens,
                    appConfig.vipTokens.cachet.tokenId,
                    appConfig.vipTokens.cachet.vipBalance,
                ))
                ? appConfig.minFee
                : appConfig.defaultFee;

        // Build the ad tx
        // The advertisement tx is an SLP send tx of the listed NFT to the seller's wallet

        const sellerSk = wif.decode(
            wallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;

        const sellerPk = ecc.derivePubkey(sellerSk);
        const sellerP2pkh = Script.p2pkh(
            fromHex(wallet.paths.get(appConfig.derivationPath).hash),
        );

        const enforcedOutputs = [
            {
                value: 0,
                script: slpSend(tokenId, SLP_NFT1_CHILD, [0, 1]),
            },
            {
                value: listPriceSatoshis,
                script: Script.p2pkh(
                    fromHex(wallet.paths.get(appConfig.derivationPath).hash),
                ),
            },
        ];

        const agoraOneshot = new AgoraOneshot({
            enforcedOutputs,
            cancelPk: sellerPk,
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
                value: 0,
                script: slpSend(tokenId, SLP_NFT1_CHILD, [1]),
            },
            { value: appConfig.dustSats, script: agoraP2sh },
        ];
        const offerTxFuelSats = getAgoraAdFuelSats(
            agoraAdScript,
            AgoraOneshotAdSignatory(sellerSk),
            offerTargetOutputs,
            satsPerKb,
        );

        // So, the ad prep tx must include an output with an input that covers this fee
        // This will be dust + fee
        const adFuelOutputSats = appConfig.dustSats + offerTxFuelSats;

        // Input needs to be the child NFT utxo with appropriate signData
        // Get the NFT utxo from Cashtab wallet
        const [thisNftUtxo] = getNft(tokenId, wallet.state.slpUtxos);
        // Prepare it for an ecash-lib tx
        const adSetupInputs = [
            {
                input: {
                    prevOut: {
                        txid: thisNftUtxo.outpoint.txid,
                        outIdx: thisNftUtxo.outpoint.outIdx,
                    },
                    signData: {
                        value: appConfig.dustSats,
                        outputScript: sellerP2pkh,
                    },
                },
                signatory: P2PKHSignatory(sellerSk, sellerPk, ALL_BIP143),
            },
        ];
        const adSetupTargetOutputs = [
            {
                value: 0,
                script: slpSend(tokenId, SLP_NFT1_CHILD, [1]),
            },
            { value: adFuelOutputSats, script: agoraAdP2sh },
        ];

        // Broadcast the ad setup tx
        let adSetupTxid;
        try {
            // Build and broadcast the ad setup tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                adSetupTargetOutputs,
                satsPerKb,
                chaintipBlockheight,
                adSetupInputs,
            );
            adSetupTxid = response.txid;

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${adSetupTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Created NFT ad
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
        } catch (err) {
            console.error(`Error creating NFT listing ad`, err);
            toast.error(`Error creating NFT listing ad: ${err}`);
            // Do not attempt to list the NFT if the ad tx fails
            return;
        }

        const offerInputs = [
            // The actual NFT
            {
                input: {
                    prevOut: {
                        // Since we just broadcast the ad tx and know how it was built,
                        // this prevOut will always look like this
                        txid: adSetupTxid,
                        outIdx: 1,
                    },
                    signData: {
                        value: adFuelOutputSats,
                        redeemScript: agoraAdScript,
                    },
                },
                signatory: AgoraOneshotAdSignatory(sellerSk),
            },
        ];

        let offerTxid;
        try {
            // Build and broadcast the ad setup tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                offerTargetOutputs,
                satsPerKb,
                chaintipBlockheight,
                offerInputs,
            );
            offerTxid = response.txid;

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${offerTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    NFT listed for{' '}
                    {toXec(parseInt(listPriceSatoshis)).toLocaleString(
                        userLocale,
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        },
                    )}{' '}
                    XEC
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );

            // Navigate to the NFTs page so the user can see and manage this listing (and others)
            navigate(`/nfts`);
        } catch (err) {
            console.error(`Error listing NFT`, err);
            toast.error(`Error listing NFT: ${err}`);
        }
    };

    const previewSlpPartial = async () => {
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
                ? parseFloat(formData.slpListPrice)
                : new BN(
                      new BN(
                          parseFloat(formData.slpListPrice) / fiatPrice,
                      ).toFixed(NANOSAT_DECIMALS),
                  );
        const priceNanoSatsPerDecimalizedToken = xecToNanoSatoshis(priceInXec);

        // Adjust for token satoshis
        // e.g. a 9-decimal token, the user sets the the price for 1.000000000 tokens
        // but you must create the offer with priceNanoSatsPerToken for 1 token satoshi
        // i.e. 0.000000001 token
        const priceNanoSatsPerTokenSatoshi =
            BigInt(priceNanoSatsPerDecimalizedToken) /
            BigInt(Math.pow(10, decimals));

        // Convert formData list qty (a decimalized token qty) to BigInt token sats
        const userSuggestedOfferedTokens = BigInt(
            undecimalizeTokenAmount(slpAgoraPartialTokenQty, decimals),
        );

        // Convert formData min buy qty to BigInt
        const minAcceptedTokens = BigInt(
            undecimalizeTokenAmount(slpAgoraPartialMin, decimals),
        );

        const sellerSk = wif.decode(
            wallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const makerPk = ecc.derivePubkey(sellerSk);

        let agoraPartial;

        try {
            agoraPartial = await agora.selectParams({
                tokenId: tokenId,
                tokenType: SLP_FUNGIBLE,
                tokenProtocol: 'SLP',
                offeredTokens: userSuggestedOfferedTokens,
                priceNanoSatsPerToken: priceNanoSatsPerTokenSatoshi,
                makerPk,
                minAcceptedTokens,
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

    const listSlpPartial = async () => {
        const sellerSk = wif.decode(
            wallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const makerPk = ecc.derivePubkey(sellerSk);

        const sellerP2pkh = Script.p2pkh(
            fromHex(wallet.paths.get(appConfig.derivationPath).hash),
        );

        // offeredTokens is in units of token satoshis
        const offeredTokens = previewedAgoraPartial.offeredTokens();

        // To guarantee we have no utxo conflicts while sending a chain of 2 txs
        // We ensure that the target output of the ad setup tx will include enough XEC
        // to cover the offer tx
        const satsPerKb =
            settings.minFeeSends &&
            (hasEnoughToken(
                tokens,
                appConfig.vipTokens.grumpy.tokenId,
                appConfig.vipTokens.grumpy.vipBalance,
            ) ||
                hasEnoughToken(
                    tokens,
                    appConfig.vipTokens.cachet.tokenId,
                    appConfig.vipTokens.cachet.vipBalance,
                ))
                ? appConfig.minFee
                : appConfig.defaultFee;

        const agoraAdScript = previewedAgoraPartial.adScript();
        const agoraAdP2sh = Script.p2sh(shaRmd160(agoraAdScript.bytecode));

        // Get enough token utxos to cover the listing
        // Note that getSendTokenInputs expects decimalized tokens as a string and decimals as a param
        // Because we have undecimalized tokens in token sats from the AgoraPartial object,
        // We pass this and "0" as decimals
        const slpInputsInfo = getSendTokenInputs(
            wallet.state.slpUtxos,
            tokenId,
            // This is already in units of token sats
            offeredTokens.toString(),
            0, // offeredTokens is already undecimalized
        );

        const { tokenInputs, sendAmounts } = slpInputsInfo;

        // Seller finishes offer setup + sends tokens to the advertised P2SH
        const agoraScript = previewedAgoraPartial.script();
        const agoraP2sh = Script.p2sh(shaRmd160(agoraScript.bytecode));

        const offerTargetOutputs = [
            {
                value: 0,
                // We will not have any token change for the tx that creates the offer
                // This is bc the ad setup tx sends the exact amount of tokens we need
                // for the ad tx (the offer)
                script: slpSend(tokenId, SLP_FUNGIBLE, [sendAmounts[0]]),
            },
            { value: appConfig.dustSats, script: agoraP2sh },
        ];

        const adSetupSatoshis = getAgoraAdFuelSats(
            agoraAdScript,
            AgoraPartialAdSignatory(sellerSk),
            offerTargetOutputs,
            satsPerKb,
        );

        // The ad setup tx itself is sending tokens to a dust output
        // So, the fuel input must be adSetupSatoshis more than dust
        const agoraAdFuelInputSats = appConfig.dustSats + adSetupSatoshis;

        const adSetupInputs = [];
        for (const slpTokenInput of tokenInputs) {
            adSetupInputs.push({
                input: {
                    prevOut: slpTokenInput.outpoint,
                    signData: {
                        value: appConfig.dustSats,
                        outputScript: sellerP2pkh,
                    },
                },
                signatory: P2PKHSignatory(sellerSk, makerPk, ALL_BIP143),
            });
        }
        const adSetupTargetOutputs = [
            {
                value: 0,
                // We use sendAmounts here instead of sendAmounts[0] used in offerTargetOutputs
                // They may be the same thing, i.e. sendAmounts may be an array of length one
                // But we could have token change for the ad setup tx
                script: slpSend(
                    tokenId,
                    previewedAgoraPartial.tokenType,
                    sendAmounts,
                ),
            },
            {
                value: agoraAdFuelInputSats,
                script: agoraAdP2sh,
            },
        ];

        // Include token change output for the ad setup tx if we have change
        if (sendAmounts.length > 1) {
            adSetupTargetOutputs.push({ value: appConfig.dustSats });
        }

        // Calculate decimalized total offered amount for notifications
        const decimalizedOfferedTokens = decimalizeTokenAmount(
            offeredTokens.toString(),
            decimals,
        );

        // Broadcast the ad setup tx
        let adSetupTxid;
        try {
            // Build and broadcast the ad setup tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                adSetupTargetOutputs,
                satsPerKb,
                chaintipBlockheight,
                adSetupInputs,
            );
            adSetupTxid = response.txid;

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${adSetupTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {`Successful ad setup tx to offer ${decimalizedOfferedTokens} ${tokenName} for ${getAgoraPartialActualPrice()} per token`}
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
        } catch (err) {
            console.error(`Error creating SLP Partial listing ad`, err);
            toast.error(`Error creating SLP Partial listing ad: ${err}`);
            // Do not attempt to list the SLP Partial if the ad tx fails
            return;
        }

        // Now that we know the prevOut txid, we can make the real input
        const offerInputs = [
            // The utxo storing the tokens to be offered
            {
                input: {
                    prevOut: {
                        // Since we just broadcast the ad tx and know how it was built,
                        // this prevOut will always look like this
                        txid: adSetupTxid,
                        outIdx: 1,
                    },
                    signData: {
                        value: agoraAdFuelInputSats,
                        redeemScript: agoraAdScript,
                    },
                },
                signatory: AgoraPartialAdSignatory(sellerSk),
            },
        ];

        let offerTxid;
        try {
            // Build and broadcast the ad setup tx
            const { response } = await sendXec(
                chronik,
                ecc,
                wallet,
                offerTargetOutputs,
                satsPerKb,
                chaintipBlockheight,
                offerInputs,
            );
            offerTxid = response.txid;

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${offerTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {`${decimalizedOfferedTokens} ${tokenName} listed for ${getAgoraPartialActualPrice()} per token`}
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
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
        <>
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
                    {showFanoutInfo && (
                        <Modal
                            title="Creating NFT mint inputs"
                            handleOk={() => setShowFanoutInfo(false)}
                            handleCancel={() => setShowFanoutInfo(false)}
                            height={300}
                        >
                            <InfoModalParagraph>
                                A genesis tx for an NFT collection determines
                                the size of your NFT collection.
                            </InfoModalParagraph>
                            <InfoModalParagraph>
                                For example, if you created an NFT Collection
                                with a supply of 100, you can mint 100 NFTs.{' '}
                            </InfoModalParagraph>
                            <InfoModalParagraph>
                                However, each NFT must be minted from an input
                                UTXO with qty 1. Cashtab creates these by
                                splitting your original UTXO into utxos with qty
                                1.{' '}
                            </InfoModalParagraph>
                            <InfoModalParagraph>
                                These qty 1 NFT Collection utxos can be used to
                                mint NFTs.
                            </InfoModalParagraph>
                        </Modal>
                    )}
                    {showMintNftInfo && (
                        <Modal
                            title="Minting an NFT"
                            handleOk={() => setShowMintNftInfo(false)}
                            handleCancel={() => setShowMintNftInfo(false)}
                            height={300}
                        >
                            <InfoModalParagraph>
                                You can use an NFT Mint Input (a qty-1 utxo from
                                an NFT Collection token) to mint an NFT.
                            </InfoModalParagraph>
                            <InfoModalParagraph>
                                NFTs from the same Collection are usually
                                related somehow. They will be indexed by the
                                tokenId of the NFT Collection.
                            </InfoModalParagraph>
                            <InfoModalParagraph>
                                For example, popular NFT Collections include
                                Cryptopunks and Bored Apes. Each individual
                                Cryptopunk or Bored Ape is its own NFT.
                            </InfoModalParagraph>
                        </Modal>
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
                    {showConfirmListNft && formData.nftListPrice !== '' && (
                        <Modal
                            title={`List ${tokenTicker} for ${
                                selectedCurrency === appConfig.ticker
                                    ? `${parseFloat(
                                          formData.nftListPrice,
                                      ).toLocaleString(userLocale)}
                                                        XEC (${
                                                            settings
                                                                ? `${
                                                                      supportedFiatCurrencies[
                                                                          settings
                                                                              .fiatCurrency
                                                                      ].symbol
                                                                  } `
                                                                : '$ '
                                                        }${(
                                          parseFloat(formData.nftListPrice) *
                                          fiatPrice
                                      ).toLocaleString(userLocale, {
                                          minimumFractionDigits:
                                              appConfig.cashDecimals,
                                          maximumFractionDigits:
                                              appConfig.cashDecimals,
                                      })} ${
                                          settings && settings.fiatCurrency
                                              ? settings.fiatCurrency.toUpperCase()
                                              : 'USD'
                                      })?`
                                    : `${
                                          settings
                                              ? `${
                                                    supportedFiatCurrencies[
                                                        settings.fiatCurrency
                                                    ].symbol
                                                } `
                                              : '$ '
                                      }${parseFloat(
                                          formData.nftListPrice,
                                      ).toLocaleString(userLocale)} ${
                                          settings && settings.fiatCurrency
                                              ? settings.fiatCurrency.toUpperCase()
                                              : 'USD'
                                      } (${(
                                          parseFloat(formData.nftListPrice) /
                                          fiatPrice
                                      ).toLocaleString(userLocale, {
                                          minimumFractionDigits:
                                              appConfig.cashDecimals,
                                          maximumFractionDigits:
                                              appConfig.cashDecimals,
                                      })}
                                                        XEC)?`
                            }`}
                            handleOk={listNft}
                            handleCancel={() => setShowConfirmListNft(false)}
                            showCancelButton
                            description={`This will create a sell offer. Your NFT is only transferred if your full price is paid. The price is fixed in XEC. If your NFT is not purchased, you can cancel or renew your listing at any time.`}
                            height={275}
                        />
                    )}
                    {showConfirmListPartialSlp &&
                        formData.slpListPrice !== '' &&
                        previewedAgoraPartial !== null && (
                            <Modal
                                title={`List ${tokenTicker}?`}
                                handleOk={listSlpPartial}
                                handleCancel={() =>
                                    setPreviewedAgoraPartial(null)
                                }
                                showCancelButton
                                height={450}
                            >
                                <AgoraPreviewParagraph>
                                    Agora offers require special encoding and
                                    may not match your input.
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
                                            {decimalizeTokenAmount(
                                                previewedAgoraPartial
                                                    .offeredTokens()
                                                    .toString(),
                                                decimals,
                                            )}
                                        </AgoraPreviewCol>
                                    </AgoraPreviewRow>
                                    <AgoraPreviewRow>
                                        <AgoraPreviewLabel>
                                            Min buy:{' '}
                                        </AgoraPreviewLabel>
                                        <AgoraPreviewCol>
                                            {decimalizeTokenAmount(
                                                previewedAgoraPartial
                                                    .minAcceptedTokens()
                                                    .toString(),
                                                decimals,
                                            )}
                                        </AgoraPreviewCol>
                                    </AgoraPreviewRow>

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
                                </AgoraPreviewTable>
                                <AgoraPreviewParagraph>
                                    If actual price is not close to target
                                    price, increase your min buy.
                                </AgoraPreviewParagraph>
                                <AgoraPreviewParagraph>
                                    You can cancel this listing at any time.
                                </AgoraPreviewParagraph>
                            </Modal>
                        )}
                    {renderedTokenType === 'NFT' ? (
                        <>
                            <NftNameTitle>{tokenName}</NftNameTitle>
                            {typeof cachedInfo.groupTokenId !== 'undefined' &&
                                typeof cashtabCache.tokens.get(
                                    cachedInfo.groupTokenId,
                                ) !== 'undefined' && (
                                    <NftCollectionTitle>
                                        NFT from collection &quot;
                                        <Link
                                            to={`/token/${cachedInfo.groupTokenId}`}
                                        >
                                            {
                                                cashtabCache.tokens.get(
                                                    cachedInfo.groupTokenId,
                                                ).genesisInfo.tokenName
                                            }
                                        </Link>
                                        &quot;
                                    </NftCollectionTitle>
                                )}
                        </>
                    ) : (
                        <BalanceHeaderToken
                            formattedDecimalizedTokenBalance={
                                typeof tokenBalance === 'string'
                                    ? decimalizedTokenQtyToLocaleFormat(
                                          tokenBalance,
                                          userLocale,
                                      )
                                    : null
                            }
                            ticker={tokenTicker}
                            name={tokenName}
                        />
                    )}
                    <TokenStatsTable title="Token Stats">
                        <TokenStatsCol>
                            <TokenIconExpandButton
                                onClick={() => setShowLargeIconModal(true)}
                            >
                                <TokenIcon size={128} tokenId={tokenId} />
                            </TokenIconExpandButton>
                        </TokenStatsCol>
                        <TokenStatsCol>
                            <TokenStatsTableRow>
                                <TokenStatsLabel>Type:</TokenStatsLabel>
                                <TokenStatsCol>
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
                                </TokenStatsCol>
                            </TokenStatsTableRow>
                            <TokenStatsTableRow>
                                <TokenStatsLabel>Token Id:</TokenStatsLabel>
                                <TokenStatsCol>
                                    <a
                                        href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {tokenId.slice(0, 3)}...
                                        {tokenId.slice(-3)}
                                    </a>
                                </TokenStatsCol>
                                <TokenStatsCol>
                                    <CopyIconButton
                                        data={tokenId}
                                        showToast
                                        customMsg={`Token ID "${tokenId}" copied to clipboard`}
                                    />
                                </TokenStatsCol>
                            </TokenStatsTableRow>
                            {renderedTokenType !== 'NFT' &&
                                renderedTokenType !== 'NFT Collection' && (
                                    <TokenStatsTableRow>
                                        <TokenStatsLabel>
                                            decimals:
                                        </TokenStatsLabel>
                                        <TokenStatsCol>
                                            {decimals}
                                        </TokenStatsCol>
                                    </TokenStatsTableRow>
                                )}
                            {url !== '' && (
                                <TokenStatsTableRow>
                                    <TokenStatsLabel>url:</TokenStatsLabel>
                                    <TokenUrlCol>
                                        <a
                                            href={
                                                url.startsWith('https://')
                                                    ? url
                                                    : `https://${url}`
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {`${url.slice(
                                                url.startsWith('https://')
                                                    ? 8
                                                    : 0,
                                            )}`}
                                        </a>
                                    </TokenUrlCol>
                                </TokenStatsTableRow>
                            )}
                            <TokenStatsTableRow>
                                <TokenStatsLabel>created:</TokenStatsLabel>
                                <TokenStatsCol>
                                    {typeof cachedInfo.block !== 'undefined'
                                        ? formatDate(
                                              cachedInfo.block.timestamp,
                                              navigator.language,
                                          )
                                        : formatDate(
                                              cachedInfo.timeFirstSeen,
                                              navigator.language,
                                          )}
                                </TokenStatsCol>
                            </TokenStatsTableRow>
                            {renderedTokenType !== 'NFT' && (
                                <TokenStatsTableRow>
                                    <TokenStatsLabel>
                                        Genesis Qty:
                                    </TokenStatsLabel>
                                    <TokenStatsCol>
                                        {typeof genesisSupply === 'string' ? (
                                            decimalizedTokenQtyToLocaleFormat(
                                                genesisSupply,
                                                userLocale,
                                            )
                                        ) : (
                                            <InlineLoader />
                                        )}
                                    </TokenStatsCol>
                                </TokenStatsTableRow>
                            )}
                            {renderedTokenType !== 'NFT' && (
                                <TokenStatsTableRow>
                                    <TokenStatsLabel>Supply:</TokenStatsLabel>
                                    <TokenStatsCol>
                                        {typeof uncachedTokenInfo.circulatingSupply ===
                                        'string' ? (
                                            `${decimalizedTokenQtyToLocaleFormat(
                                                uncachedTokenInfo.circulatingSupply,
                                                userLocale,
                                            )}${
                                                uncachedTokenInfo.mintBatons ===
                                                0
                                                    ? ' (fixed)'
                                                    : ' (var.)'
                                            }`
                                        ) : uncachedTokenInfoError ? (
                                            'Error fetching supply'
                                        ) : (
                                            <InlineLoader />
                                        )}
                                    </TokenStatsCol>
                                </TokenStatsTableRow>
                            )}
                            {typeof hash !== 'undefined' && hash !== '' && (
                                <TokenStatsTableRow>
                                    <TokenStatsLabel>hash:</TokenStatsLabel>
                                    <TokenStatsCol>
                                        {hash.slice(0, 3)}...
                                        {hash.slice(-3)}
                                    </TokenStatsCol>
                                    <TokenStatsCol>
                                        <CopyIconButton
                                            data={hash}
                                            showToast
                                            customMsg={`Token document hash "${hash}" copied to clipboard`}
                                        />
                                    </TokenStatsCol>
                                </TokenStatsTableRow>
                            )}
                        </TokenStatsCol>
                    </TokenStatsTable>
                    {isBlacklisted && (
                        <Alert>
                            Cashtab does not support trading this token
                        </Alert>
                    )}
                    {isSupportedToken &&
                        pk !== false &&
                        isBlacklisted !== null &&
                        !isBlacklisted && (
                            <OrderBook
                                tokenId={tokenId}
                                noIcon
                                cachedTokenInfo={cashtabCache.tokens.get(
                                    tokenId,
                                )}
                                settings={settings}
                                userLocale={userLocale}
                                fiatPrice={fiatPrice}
                                activePk={pk}
                                wallet={wallet}
                                ecc={ecc}
                                chronik={chronik}
                                agora={agora}
                                chaintipBlockheight={chaintipBlockheight}
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
                                                        href={`${explorer.blockExplorerUrl}/tx/${nftTokenId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {nftTokenId.slice(0, 3)}
                                                        ...
                                                        {nftTokenId.slice(-3)}
                                                    </a>
                                                    <CopyIconButton
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
                        </>
                    )}
                    {apiError && <ApiError />}
                    {typeof tokenBalance === 'undefined' ? (
                        <Info>You do not hold this token.</Info>
                    ) : (
                        <>
                            {isSupportedToken && (
                                <SendTokenForm title="Token Actions">
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
                                                                          ) *
                                                                          fiatPrice
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
                                                                nftListPriceError ||
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
                                        tokenType.type ===
                                            'SLP_TOKEN_TYPE_FUNGIBLE' && (
                                            <>
                                                <SwitchHolder>
                                                    <Switch
                                                        name="Toggle Sell SLP"
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
                                                                        'slpAgoraPartialTokenQty'
                                                                    }
                                                                    label={`Offered qty`}
                                                                    value={
                                                                        slpAgoraPartialTokenQty
                                                                    }
                                                                    handleSlide={
                                                                        handleSlpOfferedSlide
                                                                    }
                                                                    error={
                                                                        slpAgoraPartialTokenQtyError
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
                                                                <Slider
                                                                    name={
                                                                        'slpAgoraPartialMin'
                                                                    }
                                                                    label={`Min buy`}
                                                                    value={
                                                                        slpAgoraPartialMin
                                                                    }
                                                                    handleSlide={
                                                                        handleSlpMinSlide
                                                                    }
                                                                    error={
                                                                        slpAgoraPartialMinError
                                                                    }
                                                                    min={0}
                                                                    max={
                                                                        slpAgoraPartialTokenQty
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
                                                                <ListPriceInput
                                                                    name="slpListPrice"
                                                                    placeholder="Enter SLP list price (per token)"
                                                                    inputDisabled={
                                                                        slpAgoraPartialMin ===
                                                                        '0'
                                                                    }
                                                                    value={Number(
                                                                        formData.slpListPrice,
                                                                    )}
                                                                    selectValue={
                                                                        selectedCurrency
                                                                    }
                                                                    selectDisabled={
                                                                        fiatPrice ===
                                                                        null
                                                                    }
                                                                    fiatCode={settings.fiatCurrency.toUpperCase()}
                                                                    error={
                                                                        slpListPriceError
                                                                    }
                                                                    handleInput={
                                                                        handleSlpListPriceChange
                                                                    }
                                                                    handleSelect={
                                                                        handleSelectedCurrencyChange
                                                                    }
                                                                ></ListPriceInput>
                                                            </InputRow>
                                                        </SendTokenFormRow>

                                                        {!slpListPriceError &&
                                                            formData.slpListPrice !==
                                                                '' &&
                                                            formData.slpListPrice !==
                                                                null &&
                                                            fiatPrice !==
                                                                null && (
                                                                <ListPricePreview title="SLP List Price">
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
                                                                    slpListPriceError ||
                                                                    formData.slpListPrice ===
                                                                        '' ||
                                                                    formData.slpListPrice ===
                                                                        null ||
                                                                    slpAgoraPartialTokenQty ===
                                                                        '0' ||
                                                                    slpAgoraPartialMin ===
                                                                        '0'
                                                                }
                                                                onClick={
                                                                    previewSlpPartial
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
                                                                placeholder={
                                                                    aliasSettings.aliasEnabled
                                                                        ? `Address or Alias`
                                                                        : `Address`
                                                                }
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
                                                                loadWithScannerOpen={
                                                                    openWithScanner
                                                                }
                                                            />
                                                            <AliasAddressPreviewLabel>
                                                                <TxLink
                                                                    key={
                                                                        aliasInputAddress
                                                                    }
                                                                    href={`${explorer.blockExplorerUrl}/address/${aliasInputAddress}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    {aliasInputAddress &&
                                                                        `${aliasInputAddress.slice(
                                                                            0,
                                                                            10,
                                                                        )}...${aliasInputAddress.slice(
                                                                            -5,
                                                                        )}`}
                                                                </TxLink>
                                                            </AliasAddressPreviewLabel>
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
                                                                decimals={
                                                                    decimals
                                                                }
                                                                handleInput={
                                                                    handleSlpAmountChange
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
                                                                sendTokenAmountError ||
                                                                sendTokenAddressError ||
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
                                                    name="Toggle NFT Parent Fan-out"
                                                    checked={
                                                        switches.showFanout
                                                    }
                                                    handleToggle={() =>
                                                        // We turn everything else off, whether we are turning this one on or off
                                                        setSwitches({
                                                            ...switchesOff,
                                                            showFanout:
                                                                !switches.showFanout,
                                                        })
                                                    }
                                                />
                                                <SwitchLabel>
                                                    <DataAndQuestionButton>
                                                        Create NFT mint inputs
                                                        <IconButton
                                                            name={`Click for more info about NFT Collection fan-out txs`}
                                                            icon={
                                                                <QuestionIcon />
                                                            }
                                                            onClick={() =>
                                                                setShowFanoutInfo(
                                                                    true,
                                                                )
                                                            }
                                                        />
                                                    </DataAndQuestionButton>
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showFanout && (
                                                <TokenStatsRow>
                                                    <SecondaryButton
                                                        style={{
                                                            marginTop: '12px',
                                                            marginBottom: '0px',
                                                        }}
                                                        disabled={
                                                            nftFanInputs.length ===
                                                            0
                                                        }
                                                        onClick={
                                                            createNftMintInputs
                                                        }
                                                    >
                                                        Create NFT Mint Inputs
                                                    </SecondaryButton>
                                                    <ButtonDisabledMsg>
                                                        {nftFanInputs.length ===
                                                        0
                                                            ? 'No token utxos exist with qty !== 1'
                                                            : ''}
                                                    </ButtonDisabledMsg>
                                                </TokenStatsRow>
                                            )}
                                            <SwitchHolder>
                                                <Switch
                                                    name="Toggle Mint NFT"
                                                    checked={
                                                        switches.showMintNft
                                                    }
                                                    disabled={
                                                        nftChildGenesisInput.length ===
                                                        0
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
                                                    <DataAndQuestionButton>
                                                        Mint NFT{' '}
                                                        {availableNftInputs ===
                                                        0 ? (
                                                            <ButtonDisabledSpan>
                                                                &nbsp;(no NFT
                                                                mint inputs)
                                                            </ButtonDisabledSpan>
                                                        ) : (
                                                            <p>
                                                                &nbsp; (
                                                                {
                                                                    availableNftInputs
                                                                }{' '}
                                                                input
                                                                {availableNftInputs >
                                                                1
                                                                    ? 's'
                                                                    : ''}{' '}
                                                                available)
                                                            </p>
                                                        )}
                                                        <IconButton
                                                            name={`Click for more info about minting an NFT`}
                                                            icon={
                                                                <QuestionIcon />
                                                            }
                                                            onClick={() =>
                                                                setShowMintNftInfo(
                                                                    true,
                                                                )
                                                            }
                                                        />
                                                    </DataAndQuestionButton>
                                                </SwitchLabel>
                                            </SwitchHolder>
                                            {switches.showMintNft && (
                                                <CreateTokenForm
                                                    nftChildGenesisInput={
                                                        nftChildGenesisInput
                                                    }
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
                                                            decimals={decimals}
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
                                                                burnTokenAmountError ||
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
                                                    type="number"
                                                    value={formData.mintAmount}
                                                    error={mintAmountError}
                                                    placeholder="Mint Amount"
                                                    decimals={decimals}
                                                    handleInput={
                                                        handleMintAmountChange
                                                    }
                                                    handleOnMax={onMaxMint}
                                                />

                                                <SecondaryButton
                                                    onClick={handleMint}
                                                    disabled={
                                                        mintAmountError ||
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
        </>
    );
};

export default Token;
