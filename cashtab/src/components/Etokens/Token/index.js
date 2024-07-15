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
import { TxLink, SwitchLabel } from 'components/Common/Atoms';
import BalanceHeaderToken from 'components/Common/BalanceHeaderToken';
import { useNavigate } from 'react-router-dom';
import { Event } from 'components/Common/GoogleAnalytics';
import { getWalletState } from 'utils/cashMethods';
import ApiError from 'components/Common/ApiError';
import {
    isValidTokenSendOrBurnAmount,
    parseAddressInput,
    isValidTokenMintAmount,
} from 'validation';
import { formatDate } from 'utils/formatting';
import TokenIcon from 'components/Etokens/TokenIcon';
import { explorer } from 'config/explorer';
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
    getMaxMintAmount,
    getNftChildGenesisInput,
    getNftParentFanInputs,
    getNftParentFanTxTargetOutputs,
    getNft,
    getNftChildSendTargetOutputs,
} from 'slpv1';
import { sendXec } from 'transactions';
import { hasEnoughToken, decimalizeTokenAmount } from 'wallet';
import Modal from 'components/Common/Modal';
import { toast } from 'react-toastify';
import {
    InputWithScanner,
    SendTokenInput,
    ModalInput,
    InputFlex,
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
} from 'components/Etokens/Token/styled';
import CreateTokenForm from 'components/Etokens/CreateTokenForm';
import {
    getAllTxHistoryByTokenId,
    getChildNftsFromParent,
    getTokenGenesisInfo,
} from 'chronik';
import { InlineLoader } from 'components/Common/Spinner';

const Token = () => {
    let navigate = useNavigate();
    const {
        apiError,
        cashtabState,
        updateCashtabState,
        chronik,
        ecc,
        chaintipBlockheight,
        loading,
    } = useContext(WalletContext);
    const { settings, wallets, cashtabCache } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { tokens, balanceSats } = walletState;

    const params = useParams();
    const tokenId = params.tokenId;

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

    const [nftTokenIds, setNftTokenIds] = useState([]);
    const [nftChildGenesisInput, setNftChildGenesisInput] = useState([]);
    const [nftFanInputs, setNftFanInputs] = useState([]);
    const [availableNftInputs, setAvailableNftInputs] = useState(0);
    const [showTokenTypeInfo, setShowTokenTypeInfo] = useState(false);
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
    };

    const [formData, setFormData] = useState(emptyFormData);

    const userLocale = getUserLocale(navigator);

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

    const updateNftCachedInfo = async tokenId => {
        const cachedInfoWithGroupTokenId = await getTokenGenesisInfo(
            chronik,
            tokenId,
        );
        cashtabCache.tokens.set(tokenId, cachedInfoWithGroupTokenId);
        updateCashtabState('cashtabCache', cashtabCache);
    };
    const addNftCollectionToCache = async nftParentTokenId => {
        const nftParentCachedInfo = await getTokenGenesisInfo(
            chronik,
            nftParentTokenId,
        );
        cashtabCache.tokens.set(nftParentTokenId, nftParentCachedInfo);
        updateCashtabState('cashtabCache', cashtabCache);
    };

    useEffect(() => {
        if (cachedInfo.tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
            // Check if we have its groupTokenId
            if (typeof cachedInfo.groupTokenId === 'undefined') {
                // If this is an NFT and its groupTokenId is not cached
                // Update this tokens cached info
                updateNftCachedInfo(tokenId);
            } else {
                // If we do have a groupTokenId, check if we have cached token info about the group
                const nftCollectionCachedInfo = cashtabCache.tokens.get(
                    cachedInfo.groupTokenId,
                );
                if (typeof nftCollectionCachedInfo === 'undefined') {
                    // If we do not have the NFT collection token info in cache, add it
                    addNftCollectionToCache(cachedInfo.groupTokenId);
                }
            }
        }
    }, [tokenId, cachedInfo]);

    useEffect(() => {
        if (typeof cashtabCache.tokens.get(tokenId) === 'undefined') {
            // Wait for token info to be available from cache
            // For now, this is only relevant to unit tests
            // But, in the future, we will want to support a user visiting a token page
            // of a token he does not have
            return;
        }
        // Get token info that is not practical to cache as it is subject to change
        getUncachedTokenInfo();
    }, [cashtabCache.tokens.get(tokenId)]);

    useEffect(() => {
        if (
            loading === false &&
            (typeof tokenBalance === 'undefined' ||
                typeof cashtabCache.tokens.get(tokenId) === 'undefined')
        ) {
            // token can be undefined when the app is loading
            // in practice, this only happens in integration tests or when the user navigates directly
            // to send/tokenId screen, as cashtab locks UI while it loads
            // token becomes undefined when a user sends or burns all of their balance for this token
            // In this case -- loading === true and token === undefined -- navigate to the home page
            navigate('/');
        }
    }, [loading, tokenBalance, cashtabCache]);

    useEffect(() => {
        // This useEffect block works as a de-facto "on load" block,
        // for after we have the tokenId from the url params of this page
        if (isSupportedToken) {
            if (!isNftParent) {
                // Supported token that is not an NFT parent
                // Default action is send
                setSwitches(prev => ({ ...prev, showSend: true }));
            }
        }
    }, [tokenId]);

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
        const maxMintAmount = getMaxMintAmount(decimals);

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

        try {
            // Get targetOutputs for an slpv1 burn tx
            // this is NOT like an slpv1 send tx
            const mintTargetOutputs = getMintTargetOutputs(
                tokenId,
                decimals,
                formData.mintAmount,
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
                [mintBatons[0]], // Only use one mint baton
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

    return (
        <>
            {tokenBalance &&
                typeof cashtabCache.tokens.get(tokenId) !== 'undefined' && (
                    <>
                        {showTokenTypeInfo && (
                            <Modal
                                title={renderedTokenType}
                                description={renderedTokenDescription}
                                handleOk={() => setShowTokenTypeInfo(false)}
                                handleCancel={() => setShowTokenTypeInfo(false)}
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
                                    A genesis tx for an NFT collection
                                    determines the size of your NFT collection.
                                </InfoModalParagraph>
                                <InfoModalParagraph>
                                    For example, if you created an NFT
                                    Collection with a supply of 100, you can
                                    mint 100 NFTs.{' '}
                                </InfoModalParagraph>
                                <InfoModalParagraph>
                                    However, each NFT must be minted from an
                                    input UTXO with qty 1. Cashtab creates these
                                    by splitting your original UTXO into utxos
                                    with qty 1.{' '}
                                </InfoModalParagraph>
                                <InfoModalParagraph>
                                    These qty 1 NFT Collection utxos can be used
                                    to mint NFTs.
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
                                    You can use an NFT Mint Input (a qty-1 utxo
                                    from an NFT Collection token) to mint an
                                    NFT.
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
                                handleCancel={() =>
                                    setShowLargeIconModal(false)
                                }
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
                                <TokenIcon
                                    size={256}
                                    tokenId={showLargeNftIcon}
                                />
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
                                    Are you sure you want to send{' '}
                                    {formData.amount} {tokenTicker} to{' '}
                                    {formData.address}?
                                </p>
                            </Modal>
                        )}
                        {showConfirmBurnEtoken && (
                            <Modal
                                title={`Confirm ${tokenTicker} burn`}
                                description={`Burn ${formData.burnAmount} ${tokenTicker}?`}
                                handleOk={burn}
                                handleCancel={() =>
                                    setShowConfirmBurnEtoken(false)
                                }
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
                        {renderedTokenType === 'NFT' ? (
                            <>
                                <NftNameTitle>{tokenName}</NftNameTitle>
                                {typeof cachedInfo.groupTokenId !==
                                    'undefined' &&
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
                                            {typeof genesisSupply ===
                                            'string' ? (
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
                                        <TokenStatsLabel>
                                            Supply:
                                        </TokenStatsLabel>
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
                                                            {nftTokenId.slice(
                                                                0,
                                                                3,
                                                            )}
                                                            ...
                                                            {nftTokenId.slice(
                                                                -3,
                                                            )}
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
                                                            ) !==
                                                            'undefined' ? (
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

                        {isSupportedToken && (
                            <SendTokenForm title="Token Actions">
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
                                                Send {tokenName} ({tokenTicker})
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
                                                            decimals={decimals}
                                                            handleInput={
                                                                handleSlpAmountChange
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
                                                checked={switches.showFanout}
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
                                                        icon={<QuestionIcon />}
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
                                                    {nftFanInputs.length === 0
                                                        ? 'No token utxos exist with qty !== 1'
                                                        : ''}
                                                </ButtonDisabledMsg>
                                            </TokenStatsRow>
                                        )}
                                        <SwitchHolder>
                                            <Switch
                                                name="Toggle Mint NFT"
                                                checked={switches.showMintNft}
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
                                                            &nbsp;(no NFT mint
                                                            inputs)
                                                        </ButtonDisabledSpan>
                                                    ) : (
                                                        <p>
                                                            &nbsp; (
                                                            {availableNftInputs}{' '}
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
                                                        icon={<QuestionIcon />}
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
                                                checked={switches.showAirdrop}
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
                                                    style={{ width: '100%' }}
                                                    to="/airdrop"
                                                    state={{
                                                        airdropEtokenId:
                                                            tokenId,
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
                                                        handleOnMax={onMaxBurn}
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
                                                    formData.mintAmount === ''
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
    );
};

export default Token;
