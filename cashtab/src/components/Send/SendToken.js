// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WalletContext } from 'wallet/context';
import { message, Button } from 'antd';
import PrimaryButton, {
    SecondaryButton,
} from 'components/Common/PrimaryButton';
import { SidePaddingCtn, TxLink } from 'components/Common/Atoms';
import BalanceHeaderToken from 'components/Common/BalanceHeaderToken';
import { useNavigate } from 'react-router-dom';
import { BN } from 'slp-mdm';
import { Event } from 'components/Common/GoogleAnalytics';
import { getWalletState } from 'utils/cashMethods';
import ApiError from 'components/Common/ApiError';
import { isValidEtokenBurnAmount, parseAddressInput } from 'validation';
import { getTokenStats } from 'chronik';
import { formatDate } from 'utils/formatting';
import styled from 'styled-components';
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
} from 'slpv1';
import { sendXec } from 'transactions';
import { hasEnoughToken } from 'wallet';
import Modal from 'components/Common/Modal';
import { toast } from 'react-toastify';
import {
    InputWithScanner,
    SendTokenInput,
    ModalInput,
    InputFlex,
} from 'components/Common/Inputs';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { ThemedCopySolid } from 'components/Common/CustomIcons';

const TokenStatsTable = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    color: ${props => props.theme.contrast};
`;
const TokenStatsRow = styled.div`
    width: 100%;
    display: flex;
    text-align: center;
    justify-content: center;
    gap: 3px;
`;
const TokenStatsCol = styled.div``;

const TokenSentLink = styled.a`
    color: ${props => props.theme.walletBackground};
    text-decoration: none;
`;

const AliasAddressPreviewLabel = styled.div`
    text-align: center;
    color: ${props => props.theme.forms.text};
    padding-left: 1px;
    white-space: nowrap;
`;

const SendToken = () => {
    let navigate = useNavigate();
    const { apiError, cashtabState, loading, chronik, chaintipBlockheight } =
        React.useContext(WalletContext);
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { tokens, balanceSats } = walletState;

    const params = useParams();
    const tokenId = params.tokenId;

    const token = tokens.find(token => token.tokenId === tokenId);

    const [tokenStats, setTokenStats] = useState(null);
    const [sendTokenAddressError, setSendTokenAddressError] = useState(false);
    const [sendTokenAmountError, setSendTokenAmountError] = useState(false);
    const [showConfirmBurnEtoken, setShowConfirmBurnEtoken] = useState(false);
    const [burnTokenAmountError, setBurnTokenAmountError] = useState(false);
    const [burnConfirmationError, setBurnConfirmationError] = useState(false);
    const [confirmationOfEtokenToBeBurnt, setConfirmationOfEtokenToBeBurnt] =
        useState('');
    const [aliasInputAddress, setAliasInputAddress] = useState(false);

    // Load with QR code open if device is mobile
    const openWithScanner =
        settings && settings.autoCameraOn === true && isMobile(navigator);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [formData, setFormData] = useState({
        amount: '',
        address: '',
        burnAmount: '',
    });

    const userLocale = getUserLocale(navigator);

    useEffect(() => {
        if (typeof token === 'undefined' && loading === false) {
            // token can be undefined when the app is loading
            // in practice, this only happens in integration tests or when the user navigates directly
            // to send/tokenId screen, as cashtab locks UI while it loads
            // token becomes undefined when a user sends or burns all of their balance for this token
            // In this case -- loading === true and token === undefined -- navigate to the home page
            navigate('/');
        }
    }, [loading, token]);

    // Fetch token stats if you do not have them and API did not return an error
    if (tokenStats === null) {
        getTokenStats(chronik, tokenId).then(
            result => {
                setTokenStats(result);
            },
            err => {
                console.log(`Error getting token stats: ${err}`);
            },
        );
    }
    // Clears address and amount fields following a send token notification
    const clearInputForms = () => {
        setFormData({
            amount: '',
            address: '',
            burnAmount: '',
        });
        setAliasInputAddress(false); // clear alias address preview
    };

    async function sendToken() {
        setFormData({
            ...formData,
        });

        if (
            !formData.address ||
            !formData.amount ||
            Number(formData.amount <= 0) ||
            sendTokenAmountError
        ) {
            return;
        }

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
            const tokenInputInfo = getSendTokenInputs(
                wallet.state.slpUtxos,
                tokenId,
                amount,
                token.info.decimals,
            );

            // Get targetOutputs for an slpv1 send tx
            const tokenSendTargetOutputs = getSlpSendTargetOutputs(
                tokenInputInfo,
                cleanAddress,
            );

            // Build and broadcast the tx
            const { response } = await sendXec(
                chronik,
                wallet,
                tokenSendTargetOutputs,
                settings.minFeeSends &&
                    hasEnoughToken(
                        tokens,
                        appConfig.vipSettingsTokenId,
                        appConfig.vipSettingsTokenQty,
                    )
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
                tokenInputInfo.tokenInputs,
            );

            toast(
                <TokenSentLink
                    href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    eToken sent
                </TokenSentLink>,
                {
                    icon: <TokenIcon size={32} tokenId={tokenId} />,
                },
            );
            clearInputForms();
        } catch (e) {
            console.log(`Error sending token`, e);
            toast.error(`${e}`);
        }
    }

    const handleSlpAmountChange = e => {
        let error = false;
        const { value, name } = e.target;

        // test if exceeds balance using BigNumber
        let isGreaterThanBalance = false;
        if (!isNaN(value)) {
            const bigValue = new BN(value);
            // Returns 1 if greater, -1 if less, 0 if the same, null if n/a
            isGreaterThanBalance = bigValue.comparedTo(new BN(token.balance));
        }

        // Validate value for > 0
        if (isNaN(value)) {
            error = 'Amount must be a number';
        } else if (value <= 0) {
            error = 'Amount must be greater than 0';
        } else if (token && token.balance && isGreaterThanBalance === 1) {
            error = `Amount cannot exceed your ${token.info.tokenTicker} balance of ${token.balance}`;
        } else if (!isNaN(value) && value.toString().includes('.')) {
            if (value.toString().split('.')[1].length > token.info.decimals) {
                error = `This token only supports ${token.info.decimals} decimal places`;
            }
        }
        setSendTokenAmountError(error);
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
                console.log(
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
            let amount = token.balance;

            setFormData({
                ...formData,
                amount,
            });
        } catch (err) {
            console.log(`Error in onMax:`);
            console.log(err);
            message.error(
                'Unable to calculate the max value due to network errors',
            );
        }
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
        console.log(`handleEtokenBurnAmountChange`);
        const { name, value } = e.target;
        console.log(`name`, name);
        console.log(`value`, value);

        let error = false;
        if (!isValidEtokenBurnAmount(new BN(value), token.balance)) {
            error = 'Burn amount must be between 1 and ' + token.balance;
        }

        setBurnTokenAmountError(error);

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
                value: token.balance,
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
                token.info.decimals,
            );

            // Get targetOutputs for an slpv1 burn tx
            // this is NOT like an slpv1 send tx
            const tokenBurnTargetOutputs =
                getSlpBurnTargetOutputs(tokenInputInfo);

            // Build and broadcast the tx
            const { response } = await sendXec(
                chronik,
                wallet,
                tokenBurnTargetOutputs,
                settings.minFeeSends &&
                    hasEnoughToken(
                        tokens,
                        appConfig.vipSettingsTokenId,
                        appConfig.vipSettingsTokenQty,
                    )
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

    const handleBurnConfirmationInput = e => {
        const { value } = e.target;

        if (value && value === `burn ${token.info.tokenTicker}`) {
            setBurnConfirmationError(false);
        } else {
            setBurnConfirmationError(
                `Input must exactly match "burn ${token.info.tokenTicker}"`,
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
            {isModalVisible && (
                <Modal
                    title="Confirm Send"
                    description={`Send ${formData.amount}${' '}
                        ${token.info.tokenTicker} to ${formData.address}?`}
                    handleOk={handleOk}
                    handleCancel={handleCancel}
                    showCancelButton
                >
                    <p>
                        {token && token.info && formData
                            ? `Are you sure you want to send ${
                                  formData.amount
                              }${' '}
                        ${token.info.tokenTicker} to ${formData.address}?`
                            : ''}
                    </p>
                </Modal>
            )}
            {token && (
                <SidePaddingCtn>
                    {/* eToken burn modal */}
                    {showConfirmBurnEtoken && (
                        <Modal
                            title={`Confirm ${token.info.tokenTicker} burn`}
                            description={`Burn ${formData.burnAmount} ${token.info.tokenTicker}?`}
                            handleOk={burn}
                            handleCancel={() => setShowConfirmBurnEtoken(false)}
                            showCancelButton
                            height={250}
                        >
                            <ModalInput
                                placeholder={`Type "burn ${token.info.tokenTicker}" to confirm`}
                                name="etokenToBeBurnt"
                                value={confirmationOfEtokenToBeBurnt}
                                error={burnConfirmationError}
                                handleInput={handleBurnConfirmationInput}
                            />
                        </Modal>
                    )}
                    <BalanceHeaderToken
                        balance={new BN(token.balance)}
                        ticker={token.info.tokenTicker}
                        tokenDecimals={token.info.decimals}
                    />
                    <TokenStatsTable
                        title={`Token info for "${token.info.tokenName}"`}
                    >
                        <TokenStatsRow>
                            <TokenStatsCol colSpan={2}>
                                <CopyToClipboard data={token.tokenId} showToast>
                                    <TokenIcon size={128} tokenId={tokenId} />
                                </CopyToClipboard>
                            </TokenStatsCol>
                        </TokenStatsRow>
                        <TokenStatsRow>
                            <TokenStatsCol>
                                Token Id: {token.tokenId.slice(0, 3)}...
                                {token.tokenId.slice(-3)}
                            </TokenStatsCol>
                            <TokenStatsCol>
                                <CopyToClipboard data={token.tokenId} showToast>
                                    <ThemedCopySolid />
                                </CopyToClipboard>
                            </TokenStatsCol>
                        </TokenStatsRow>
                        <TokenStatsRow>
                            <TokenStatsCol>
                                {token.info.decimals} decimal places
                            </TokenStatsCol>
                        </TokenStatsRow>

                        {tokenStats && (
                            <>
                                <TokenStatsRow>
                                    {tokenStats.genesisInfo.url}
                                </TokenStatsRow>
                                <TokenStatsRow>
                                    Minted{' '}
                                    {tokenStats.block &&
                                    tokenStats.block.timestamp !== null
                                        ? formatDate(
                                              tokenStats.block.timestamp,
                                              navigator.language,
                                          )
                                        : 'Just now (Genesis tx confirming)'}
                                </TokenStatsRow>
                            </>
                        )}
                    </TokenStatsTable>
                    <InputWithScanner
                        placeholder={
                            aliasSettings.aliasEnabled
                                ? `Address or Alias`
                                : `Address`
                        }
                        name="address"
                        value={formData.address}
                        handleInput={handleTokenAddressChange}
                        error={sendTokenAddressError}
                        loadWithScannerOpen={openWithScanner}
                    />
                    <AliasAddressPreviewLabel>
                        <TxLink
                            key={aliasInputAddress}
                            href={`${explorer.blockExplorerUrl}/address/${aliasInputAddress}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {aliasInputAddress &&
                                `${aliasInputAddress.slice(
                                    0,
                                    10,
                                )}...${aliasInputAddress.slice(-5)}`}
                        </TxLink>
                    </AliasAddressPreviewLabel>
                    <br />
                    <SendTokenInput
                        name="amount"
                        value={formData.amount}
                        error={sendTokenAmountError}
                        placeholder="Amount"
                        decimals={token.info.decimals}
                        handleInput={handleSlpAmountChange}
                        handleOnMax={onMax}
                    />

                    <SecondaryButton
                        style={{ marginTop: '24px' }}
                        disabled={
                            apiError ||
                            sendTokenAmountError ||
                            sendTokenAddressError
                        }
                        onClick={() => checkForConfirmationBeforeSendEtoken()}
                    >
                        Send {token.info.tokenName}
                    </SecondaryButton>

                    {apiError && <ApiError />}

                    <TokenStatsTable
                        title={`Token info for "${token.info.tokenName}"`}
                    >
                        <TokenStatsRow>
                            <Link
                                style={{ width: '100%' }}
                                to="/airdrop"
                                state={{
                                    airdropEtokenId: token.tokenId,
                                }}
                            >
                                <PrimaryButton style={{ marginTop: '12px' }}>
                                    Airdrop
                                </PrimaryButton>
                            </Link>
                        </TokenStatsRow>
                        <TokenStatsRow>
                            <InputFlex>
                                <SendTokenInput
                                    name="burnAmount"
                                    value={formData.burnAmount}
                                    error={burnTokenAmountError}
                                    placeholder="Burn Amount"
                                    decimals={token.info.decimals}
                                    handleInput={handleEtokenBurnAmountChange}
                                    handleOnMax={onMaxBurn}
                                />

                                <Button
                                    type="primary"
                                    onClick={handleBurnAmountInput}
                                    danger
                                >
                                    Burn&nbsp;
                                    {token.info.tokenTicker}
                                </Button>
                            </InputFlex>
                        </TokenStatsRow>
                    </TokenStatsTable>
                </SidePaddingCtn>
            )}
        </>
    );
};

export default SendToken;
