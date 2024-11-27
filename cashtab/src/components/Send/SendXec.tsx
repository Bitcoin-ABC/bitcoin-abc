// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { WalletContext } from 'wallet/context';
import { CashReceivedNotificationIcon } from 'components/Common/CustomIcons';
import Modal from 'components/Common/Modal';
import PrimaryButton from 'components/Common/Buttons';
import { toSatoshis, toXec } from 'wallet';
import { sumOneToManyXec } from 'utils/cashMethods';
import { Event } from 'components/Common/GoogleAnalytics';
import {
    isValidMultiSendUserInput,
    shouldSendXecBeDisabled,
    parseAddressInput,
    isValidXecSendAmount,
    getOpReturnRawError,
    CashtabParsedAddressInfo,
} from 'validation';
import { ConvertAmount, AlertMsg, TxLink, Info } from 'components/Common/Atoms';
import { getWalletState } from 'utils/cashMethods';
import {
    sendXec,
    getMultisendTargetOutputs,
    getMaxSendAmountSatoshis,
} from 'transactions';
import {
    getCashtabMsgTargetOutput,
    getAirdropTargetOutput,
    getCashtabMsgByteCount,
    getOpreturnParamTargetOutput,
    parseOpReturnRaw,
    ParsedOpReturnRaw,
} from 'opreturn';
import ApiError from 'components/Common/ApiError';
import { formatFiatBalance, formatBalance } from 'utils/formatting';
import styled from 'styled-components';
import { opReturn as opreturnConfig } from 'config/opreturn';
import { explorer } from 'config/explorer';
import { Alias, queryAliasServer } from 'alias';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';
import { isMobile, getUserLocale } from 'helpers';
import { hasEnoughToken, fiatToSatoshis } from 'wallet';
import { toast } from 'react-toastify';
import {
    InputWithScanner,
    SendXecInput,
    TextArea,
} from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';
import { opReturn } from 'config/opreturn';
import { Script } from 'ecash-lib';

const SendXecForm = styled.div`
    margin: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;
const SendXecRow = styled.div``;
const SwitchAndLabel = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
`;
const SwitchLabel = styled.div`
    color: ${props => props.theme.contrast};
`;
const SwitchContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    color: ${props => props.theme.forms.text};
    white-space: nowrap;
    margin: 12px 0;
`;

const SentLink = styled.a`
    color: ${props => props.theme.walletBackground};
    text-decoration: none;
`;

const AliasAddressPreviewLabel = styled.div`
    text-align: center;
    color: ${props => props.theme.forms.text};
    padding-left: 1px;
    white-space: nowrap;
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
    color: ${props => props.theme.contrast};
    text-align: left;
    width: 100%;
`;
const ParsedBip21Info = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: ${props => props.theme.eCashBlue};
    padding: 12px;
    text-align: left;
`;

const LocaleFormattedValue = styled.div`
    color: ${props => props.theme.contrast};
    font-weight: bold;
    font-size: 1.17em;
    margin-bottom: 0;
`;

const SendToOneHolder = styled.div``;
const SendToManyHolder = styled.div``;
const SendToOneInputForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;
const InputAndAliasPreviewHolder = styled.div`
    displaly: flex;
    flex-direction: column;
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
interface CashtabTxInfo {
    address?: string;
    bip21?: string;
    value?: string;
    parseAllAsBip21?: boolean;
}
const SendXec: React.FC = () => {
    const ContextValue = React.useContext(WalletContext);
    const location = useLocation();
    const {
        chaintipBlockheight,
        fiatPrice,
        apiError,
        cashtabState,
        chronik,
        ecc,
    } = ContextValue;
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { balanceSats, tokens } = walletState;

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

    // Load with QR code open if device is mobile
    const openWithScanner =
        settings && settings.autoCameraOn === true && isMobile(navigator);

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
    const [aliasInputAddress, setAliasInputAddress] = useState<string | false>(
        false,
    );
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        appConfig.ticker,
    );
    const [parsedAddressInput, setParsedAddressInput] =
        useState<CashtabParsedAddressInfo>(parseAddressInput('', 0));

    // Support cashtab button from web pages
    const [txInfoFromUrl, setTxInfoFromUrl] = useState<false | CashtabTxInfo>(
        false,
    );

    // Show a confirmation modal on transactions created by populating form from web page button
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

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
            isAlias: boolean;
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
    const clearInputForms = () => {
        setFormData(emptyFormData);
        setAliasInputAddress(false); // clear alias address preview
        setParsedAddressInput(parseAddressInput('', 0));
        // Reset to XEC
        // Note, this ensures we never are in fiat send mode for multi-send
        setSelectedCurrency(appConfig.ticker);
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
        }
    }, []);

    useEffect(() => {
        if (txInfoFromUrl === false) {
            return;
        }
        if (txInfoFromUrl.parseAllAsBip21) {
            handleAddressChange({
                target: {
                    name: 'address',
                    value: txInfoFromUrl.bip21,
                },
            } as React.ChangeEvent<HTMLInputElement>);
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
    }, [txInfoFromUrl, balanceSats]);

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

    async function send() {
        setFormData({
            ...formData,
        });

        // Initialize targetOutputs for this tx
        let targetOutputs = [];

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
        }

        if (isOneToManyXECSend) {
            // Handle XEC send to multiple addresses
            targetOutputs = targetOutputs.concat(
                getMultisendTargetOutputs(formData.multiAddressInput),
            );

            Event('Send.js', 'SendToMany', selectedCurrency);
        } else {
            // Handle XEC send to one address
            let cleanAddress;
            // check state on whether this is an alias or ecash address
            if (aliasInputAddress) {
                cleanAddress = aliasInputAddress;
            } else {
                // Get the non-alias param-free address
                cleanAddress = formData.address.split('?')[0];
            }
            const satoshisToSend =
                selectedCurrency === 'XEC'
                    ? toSatoshis(parseFloat(formData.amount))
                    : fiatToSatoshis(formData.amount, fiatPrice);

            targetOutputs.push({
                script: Script.fromAddress(cleanAddress),
                value: satoshisToSend,
            });

            if (isBip21MultipleOutputsSafe(parsedAddressInput)) {
                parsedAddressInput.parsedAdditionalXecOutputs.value.forEach(
                    ([addr, amount]) => {
                        targetOutputs.push({
                            script: Script.fromAddress(addr),
                            value: toSatoshis(parseFloat(amount)),
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
            const txObj = await sendXec(
                chronik,
                ecc,
                wallet,
                targetOutputs,
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
            );

            toast(
                <SentLink
                    href={`${explorer.blockExplorerUrl}/tx/${txObj.response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    eCash sent
                </SentLink>,
                {
                    icon: CashReceivedNotificationIcon,
                },
            );

            clearInputForms();
            setAirdropFlag(false);
            if (txInfoFromUrl) {
                // Close window after successful tx
                window.close();
            }
        } catch (err) {
            handleSendXecError(err as XecSendError);
        }
    }

    const handleAddressChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setAliasInputAddress(false); // clear alias address preview
        const { value, name } = e.target;
        const parsedAddressInput = parseAddressInput(
            value,
            balanceSats,
            userLocale,
        );

        // Set in state as various param outputs determine app rendering
        // For example, a valid amount param should disable user amount input
        setParsedAddressInput(parsedAddressInput);

        const address = parsedAddressInput.address.value;
        let renderedSendToError = parsedAddressInput.address.error;
        if (
            typeof parsedAddressInput.queryString !== 'undefined' &&
            typeof parsedAddressInput.queryString.error === 'string'
        ) {
            // If you have a bad queryString, this should be the rendered error
            renderedSendToError = parsedAddressInput.queryString.error;
        } else if (
            parsedAddressInput.address.isAlias &&
            parsedAddressInput.address.error === false &&
            address !== null
        ) {
            // If we have a valid alias input, check the server for full validation
            // extract alias without the `.xec`
            const aliasName = address.slice(0, address.length - 4);

            // retrieve the alias details for `aliasName` from alias-server
            let aliasDetails: Alias;
            try {
                aliasDetails = (await queryAliasServer(
                    'alias',
                    aliasName,
                )) as Alias;
                if (!aliasDetails.address) {
                    renderedSendToError =
                        'eCash Alias does not exist or yet to receive 1 confirmation';
                    setAliasInputAddress(false);
                } else {
                    // Valid address response returned
                    setAliasInputAddress(aliasDetails.address);
                }
            } catch (err) {
                setAliasInputAddress(false);
                renderedSendToError =
                    'Error resolving alias at indexer, contact admin.';
            }
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

        setSendAddressError(renderedSendToError);

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
            fiatPrice,
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
            );
        } catch (err) {
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

    const priceApiError = fiatPrice === null && selectedCurrency !== 'XEC';

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

    return (
        <>
            {isModalVisible && (
                <Modal
                    title="Confirm Send"
                    description={
                        isOneToManyXECSend
                            ? `Send
                                ${multiSendTotal.toLocaleString(userLocale, {
                                    maximumFractionDigits: 2,
                                })} 
                                XEC to multiple recipients?`
                            : `Send ${formData.amount}${' '}
                  ${selectedCurrency} to ${parsedAddressInput.address.value}`
                    }
                    handleOk={handleOk}
                    handleCancel={handleCancel}
                    showCancelButton
                />
            )}

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
            <InputModesHolder open={isOneToManyXECSend}>
                <SendToOneHolder>
                    <SendToOneInputForm>
                        <InputAndAliasPreviewHolder>
                            <InputWithScanner
                                placeholder={
                                    aliasSettings.aliasEnabled
                                        ? `Address or Alias`
                                        : `Address`
                                }
                                name="address"
                                value={formData.address}
                                disabled={txInfoFromUrl !== false}
                                handleInput={handleAddressChange}
                                error={sendAddressError}
                                loadWithScannerOpen={openWithScanner}
                            />
                            <AliasAddressPreviewLabel>
                                <TxLink
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
                        </InputAndAliasPreviewHolder>
                        {isBip21MultipleOutputsSafe(parsedAddressInput) ? (
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
                                        .parsedAdditionalXecOutputs.value
                                        .length + 1}{' '}
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
                                        txInfoFromUrl.value !== 'null' &&
                                        txInfoFromUrl.value !== 'undefined') ||
                                    'amount' in parsedAddressInput
                                }
                                fiatCode={settings.fiatCurrency.toUpperCase()}
                                error={sendAmountError}
                                handleInput={handleAmountChange}
                                handleSelect={handleSelectedCurrencyChange}
                                handleOnMax={onMax}
                            />
                        )}
                    </SendToOneInputForm>
                </SendToOneHolder>
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
                                setSendWithCashtabMsg(!sendWithCashtabMsg);
                            }}
                        />
                        <SwitchLabel>Cashtab Msg</SwitchLabel>
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
                                setSendWithOpReturnRaw(!sendWithOpReturnRaw);
                            }}
                        />
                        <SwitchLabel>op_return_raw</SwitchLabel>
                    </SwitchAndLabel>
                </SendXecRow>
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
                                max={2 * opReturn.opreturnParamByteLimit}
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
                                            <b>{parsedOpReturnRaw.protocol}</b>
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
                                            .parsedAdditionalXecOutputs.value,
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
                                            ).toLocaleString(userLocale, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} XEC`}</li>
                                        );
                                    })}
                                </ol>
                            </ParsedBip21Info>
                        </ParsedBip21InfoRow>
                    </SendXecRow>
                )}
            </SendXecForm>

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
                        ) : isBip21MultipleOutputsSafe(parsedAddressInput) ? (
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
                            {fiatPriceString !== '' && '='} {fiatPriceString}
                        </ConvertAmount>
                    </>
                )}
            </AmountPreviewCtn>
            <PrimaryButton
                style={{ marginTop: '12px' }}
                disabled={disableSendButton}
                onClick={() => {
                    checkForConfirmationBeforeSendXec();
                }}
            >
                Send
            </PrimaryButton>
            {apiError && <ApiError />}
        </>
    );
};

export default SendXec;
