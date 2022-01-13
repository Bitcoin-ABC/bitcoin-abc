import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { WalletContext } from '@utils/context';
import {
    AntdFormWrapper,
    SendBchInput,
    DestinationAddressSingle,
    DestinationAddressMulti,
} from '@components/Common/EnhancedInputs';
import { AdvancedCollapse } from '@components/Common/StyledCollapse';
import { Form, message, Modal, Alert, Collapse, Input, Button } from 'antd';
const { Panel } = Collapse;
const { TextArea } = Input;
import { Row, Col, Switch } from 'antd';
import PrimaryButton, {
    SecondaryButton,
    SmartButton,
} from '@components/Common/PrimaryButton';
import useBCH from '@hooks/useBCH';
import useWindowDimensions from '@hooks/useWindowDimensions';
import {
    sendXecNotification,
    errorNotification,
    messageSignedNotification,
} from '@components/Common/Notifications';
import { isMobile, isIOS, isSafari } from 'react-device-detect';
import { currency, parseAddressForParams } from '@components/Common/Ticker.js';
import { Event } from '@utils/GoogleAnalytics';
import {
    fiatToCrypto,
    shouldRejectAmountInput,
    isValidXecAddress,
    isValidEtokenAddress,
    isValidXecSendAmount,
} from '@utils/validation';
import BalanceHeader from '@components/Common/BalanceHeader';
import BalanceHeaderFiat from '@components/Common/BalanceHeaderFiat';
import {
    ZeroBalanceHeader,
    ConvertAmount,
    AlertMsg,
} from '@components/Common/Atoms';
import {
    getWalletState,
    convertToEcashPrefix,
    toLegacyCash,
    toLegacyCashArray,
    fromSmallestDenomination,
} from '@utils/cashMethods';
import ApiError from '@components/Common/ApiError';
import { formatFiatBalance, formatBalance } from '@utils/formatting';
import { TokenParamLabel } from '@components/Common/Atoms';
import { PlusSquareOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const StyledSpacer = styled.div`
    height: 1px;
    width: 100%;
    background-color: ${props => props.theme.wallet.borders.color};
    margin: 60px 0 50px;
`;

const SignMessageLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.forms.darkLabel};
`;
const RecipientModeLabel = styled.div`
    color: ${props => props.theme.forms.lightLabel};
`;
const TextAreaLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.forms.darkLabel};
    padding-left: 1px;
`;

const LocaleFormattedValue = styled.h3`
    color: ${props => props.theme.forms.text};
`;
// Note jestBCH is only used for unit tests; BCHJS must be mocked for jest
const SendBCH = ({ jestBCH, passLoadingStatus }) => {
    // use balance parameters from wallet.state object and not legacy balances parameter from walletState, if user has migrated wallet
    // this handles edge case of user with old wallet who has not opened latest Cashtab version yet

    // If the wallet object from ContextValue has a `state key`, then check which keys are in the wallet object
    // Else set it as blank
    const ContextValue = React.useContext(WalletContext);
    const location = useLocation();
    const { wallet, fiatPrice, apiError, cashtabSettings } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances, slpBalancesAndUtxos } = walletState;
    // Modal settings
    const [showConfirmMsgToSign, setShowConfirmMsgToSign] = useState(false);
    const [msgToSign, setMsgToSign] = useState('');
    const [signMessageIsValid, setSignMessageIsValid] = useState(null);
    const [isOneToManyXECSend, setIsOneToManyXECSend] = useState(false);
    const [opReturnMsg, setOpReturnMsg] = useState(false);
    const [isEncryptedOptionalOpReturnMsg, setIsEncryptedOptionalOpReturnMsg] =
        useState(false);
    const [bchObj, setBchObj] = useState(false);

    // Get device window width
    // If this is less than 769, the page will open with QR scanner open
    const { width } = useWindowDimensions();
    // Load with QR code open if device is mobile and NOT iOS + anything but safari
    const scannerSupported = width < 769 && isMobile && !(isIOS && !isSafari);

    const [formData, setFormData] = useState({
        value: '',
        address: '',
    });
    const [queryStringText, setQueryStringText] = useState(null);
    const [sendBchAddressError, setSendBchAddressError] = useState(false);
    const [sendBchAmountError, setSendBchAmountError] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(currency.ticker);

    // Support cashtab button from web pages
    const [txInfoFromUrl, setTxInfoFromUrl] = useState(false);

    // Show a confirmation modal on transactions created by populating form from web page button
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [messageSignature, setMessageSignature] = useState('');
    const [sigCopySuccess, setSigCopySuccess] = useState('');
    const userLocale = navigator.language;
    const clearInputForms = () => {
        setFormData({
            value: '',
            address: '',
        });
        setOpReturnMsg(''); // OP_RETURN message has its own state field
    };

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleOk = () => {
        setIsModalVisible(false);
        send();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const { getBCH, getRestUrl, sendXec, calcFee, signPkMessage } = useBCH();

    // If the balance has changed, unlock the UI
    // This is redundant, if backend has refreshed in 1.75s timeout below, UI will already be unlocked
    useEffect(() => {
        passLoadingStatus(false);
    }, [balances.totalBalance]);

    useEffect(() => {
        // jestBCH is only ever specified for unit tests, otherwise app will use getBCH();
        const BCH = jestBCH ? jestBCH : getBCH();

        // set the BCH instance to state, for other functions to reference
        setBchObj(BCH);

        // Manually parse for txInfo object on page load when Send.js is loaded with a query string

        // if this was routed from Wallet screen's Reply to message link then prepopulate the address and value field
        if (location && location.state && location.state.replyAddress) {
            setFormData({
                address: location.state.replyAddress,
                value: `${fromSmallestDenomination(currency.dustSats)}`,
            });
        }

        // Do not set txInfo in state if query strings are not present
        if (
            !window.location ||
            !window.location.hash ||
            window.location.hash === '#/send'
        ) {
            return;
        }

        const txInfoArr = window.location.hash.split('?')[1].split('&');

        // Iterate over this to create object
        const txInfo = {};
        for (let i = 0; i < txInfoArr.length; i += 1) {
            let txInfoKeyValue = txInfoArr[i].split('=');
            let key = txInfoKeyValue[0];
            let value = txInfoKeyValue[1];
            txInfo[key] = value;
        }
        console.log(`txInfo from page params`, txInfo);
        setTxInfoFromUrl(txInfo);
        populateFormsFromUrl(txInfo);
    }, []);

    function populateFormsFromUrl(txInfo) {
        if (txInfo && txInfo.address && txInfo.value) {
            setFormData({
                address: txInfo.address,
                value: txInfo.value,
            });
        }
    }

    function handleSendXecError(errorObj, oneToManyFlag) {
        // Set loading to false here as well, as balance may not change depending on where error occured in try loop
        passLoadingStatus(false);
        let message;

        if (!errorObj.error && !errorObj.message) {
            message = `Transaction failed: no response from ${getRestUrl()}.`;
        } else if (
            /Could not communicate with full node or other external service/.test(
                errorObj.error,
            )
        ) {
            message = 'Could not communicate with API. Please try again.';
        } else if (
            errorObj.error &&
            errorObj.error.includes(
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 50] (code 64)',
            )
        ) {
            message = `The ${currency.ticker} you are trying to send has too many unconfirmed ancestors to send (limit 50). Sending will be possible after a block confirmation. Try again in about 10 minutes.`;
        } else {
            message =
                errorObj.message || errorObj.error || JSON.stringify(errorObj);
        }

        if (oneToManyFlag) {
            errorNotification(errorObj, message, 'Sending XEC one to many');
        } else {
            errorNotification(errorObj, message, 'Sending XEC');
        }
    }

    async function send() {
        setFormData({
            ...formData,
        });

        if (isOneToManyXECSend) {
            // this is a one to many XEC send transactions

            // ensure multi-recipient input is not blank
            if (!formData.address) {
                return;
            }

            // Event("Category", "Action", "Label")
            // Track number of XEC send-to-many transactions
            Event('Send.js', 'SendToMany', selectedCurrency);

            passLoadingStatus(true);
            const { address } = formData;

            //convert each line from TextArea input
            let addressAndValueArray = address.split('\n');

            try {
                // construct array of XEC->BCH addresses due to bch-api constraint
                let cleanAddressAndValueArray =
                    toLegacyCashArray(addressAndValueArray);

                const link = await sendXec(
                    bchObj,
                    wallet,
                    slpBalancesAndUtxos.nonSlpUtxos,
                    currency.defaultFee,
                    opReturnMsg,
                    true, // indicate send mode is one to many
                    cleanAddressAndValueArray,
                );
                sendXecNotification(link);
                clearInputForms();
            } catch (e) {
                handleSendXecError(e, isOneToManyXECSend);
            }
        } else {
            // standard one to one XEC send transaction

            if (
                !formData.address ||
                !formData.value ||
                Number(formData.value) <= 0
            ) {
                return;
            }

            // Event("Category", "Action", "Label")
            // Track number of BCHA send transactions and whether users
            // are sending BCHA or USD
            Event('Send.js', 'Send', selectedCurrency);

            passLoadingStatus(true);
            const { address, value } = formData;

            // Get the param-free address
            let cleanAddress = address.split('?')[0];

            // Ensure address has bitcoincash: prefix and checksum
            cleanAddress = toLegacyCash(cleanAddress);

            // Calculate the amount in BCH
            let bchValue = value;

            if (selectedCurrency !== 'XEC') {
                bchValue = fiatToCrypto(value, fiatPrice);
            }

            // encrypted message limit truncation
            let optionalOpReturnMsg;
            if (isEncryptedOptionalOpReturnMsg) {
                optionalOpReturnMsg = opReturnMsg.substring(
                    0,
                    currency.opReturn.encryptedMsgCharLimit,
                );
            } else {
                optionalOpReturnMsg = opReturnMsg;
            }

            try {
                const link = await sendXec(
                    bchObj,
                    wallet,
                    slpBalancesAndUtxos.nonSlpUtxos,
                    currency.defaultFee,
                    optionalOpReturnMsg,
                    false, // sendToMany boolean flag
                    null, // address array not applicable for one to many tx
                    cleanAddress,
                    bchValue,
                    isEncryptedOptionalOpReturnMsg,
                );
                sendXecNotification(link);
                clearInputForms();
            } catch (e) {
                handleSendXecError(e, isOneToManyXECSend);
            }
        }
    }

    const handleAddressChange = e => {
        const { value, name } = e.target;
        let error = false;
        let addressString = value;

        // validate address
        const isValid = isValidXecAddress(addressString);

        // parse address for parameters
        const addressInfo = parseAddressForParams(addressString);
        /*
        Model

        addressInfo = 
        {
            address: '',
            queryString: '',
            amount: null,
        };
        */

        const { address, queryString, amount } = addressInfo;

        // If query string,
        // Show an alert that only amount and currency.ticker are supported
        setQueryStringText(queryString);

        // Is this valid address?
        if (!isValid) {
            error = `Invalid ${currency.ticker} address`;
            // If valid address but token format
            if (isValidEtokenAddress(address)) {
                error = `eToken addresses are not supported for ${currency.ticker} sends`;
            }
        }
        setSendBchAddressError(error);

        // Set amount if it's in the query string
        if (amount !== null) {
            // Set currency to BCHA
            setSelectedCurrency(currency.ticker);

            // Use this object to mimic user input and get validation for the value
            let amountObj = {
                target: {
                    name: 'value',
                    value: amount,
                },
            };
            handleBchAmountChange(amountObj);
            setFormData({
                ...formData,
                value: amount,
            });
        }

        // Set address field to user input
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleMultiAddressChange = e => {
        const { value, name } = e.target;
        let error;

        if (!value) {
            error = 'Input must not be blank';
            setSendBchAddressError(error);
            return setFormData(p => ({
                ...p,
                [name]: value,
            }));
        }

        //convert each line from the <TextArea> input into array
        let addressStringArray = value.split('\n');
        const arrayLength = addressStringArray.length;

        // loop through each row in the <TextArea> input
        for (let i = 0; i < arrayLength; i++) {
            if (addressStringArray[i].trim() === '') {
                // if this line is a line break or bunch of spaces
                error = 'Empty spaces and rows must be removed';
                setSendBchAddressError(error);
                return setFormData(p => ({
                    ...p,
                    [name]: value,
                }));
            }

            let addressString = addressStringArray[i].split(',')[0];
            let valueString = addressStringArray[i].split(',')[1];

            const validAddress = isValidXecAddress(addressString);
            const validValueString = isValidXecSendAmount(valueString);

            if (!validAddress) {
                error = `Invalid XEC address: ${addressString}, ${valueString}`;
                setSendBchAddressError(error);
                return setFormData(p => ({
                    ...p,
                    [name]: value,
                }));
            }
            if (!validValueString) {
                error = `Amount must be at least ${fromSmallestDenomination(
                    currency.dustSats,
                )} XEC: ${addressString}, ${valueString}`;
                setSendBchAddressError(error);
                return setFormData(p => ({
                    ...p,
                    [name]: value,
                }));
            }
        }

        // If iterate to end of array with no errors, then there is no error msg
        setSendBchAddressError(false);

        // Set address field to user input
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleSelectedCurrencyChange = e => {
        setSelectedCurrency(e);
        // Clear input field to prevent accidentally sending 1 BCH instead of 1 USD
        setFormData(p => ({
            ...p,
            value: '',
        }));
    };

    // true: renders the multi recipient <TextArea>
    // false: renders the single recipient <Input>
    const handleOneToManyXECSend = sendXecMode => {
        setIsOneToManyXECSend(sendXecMode);
    };

    const handleBchAmountChange = e => {
        const { value, name } = e.target;
        let bchValue = value;
        const error = shouldRejectAmountInput(
            bchValue,
            selectedCurrency,
            fiatPrice,
            balances.totalBalance,
        );
        setSendBchAmountError(error);

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleSignMsgChange = e => {
        const { value } = e.target;
        // validation
        if (value && value.length && value.length < 150) {
            setMsgToSign(value);
            setSignMessageIsValid(true);
        } else {
            setSignMessageIsValid(false);
        }
    };

    const signMessageByPk = async () => {
        try {
            const messageSignature = await signPkMessage(
                bchObj,
                wallet.Path1899.fundingWif,
                msgToSign,
            );
            setMessageSignature(messageSignature);
            messageSignedNotification(messageSignature);
        } catch (err) {
            let message;
            if (!err.error && !err.message) {
                message = err.message || err.error || JSON.stringify(err);
            }
            errorNotification(err, message, 'Message Signing Error');
            throw err;
        }
        // Hide the modal
        setShowConfirmMsgToSign(false);
        setSigCopySuccess('');
    };

    const handleOnSigCopy = () => {
        if (messageSignature != '') {
            setSigCopySuccess('Signature copied to clipboard');
        }
    };

    const onMax = async () => {
        // Clear amt error
        setSendBchAmountError(false);
        // Set currency to BCH
        setSelectedCurrency(currency.ticker);
        try {
            const txFeeSats = calcFee(bchObj, slpBalancesAndUtxos.nonSlpUtxos);

            const txFeeBch = txFeeSats / 10 ** currency.cashDecimals;
            let value =
                balances.totalBalance - txFeeBch >= 0
                    ? (balances.totalBalance - txFeeBch).toFixed(
                          currency.cashDecimals,
                      )
                    : 0;

            setFormData({
                ...formData,
                value,
            });
        } catch (err) {
            console.log(`Error in onMax:`);
            console.log(err);
            message.error(
                'Unable to calculate the max value due to network errors',
            );
        }
    };
    // Display price in USD below input field for send amount, if it can be calculated
    let fiatPriceString = '';
    if (fiatPrice !== null && !isNaN(formData.value)) {
        if (selectedCurrency === currency.ticker) {
            // calculate conversion to fiatPrice
            fiatPriceString = `${(fiatPrice * Number(formData.value)).toFixed(
                2,
            )}`;

            // formats to fiat locale style
            fiatPriceString = formatFiatBalance(
                Number(fiatPriceString),
                userLocale,
            );

            // insert symbol and currency before/after the locale formatted fiat balance
            fiatPriceString = `${
                cashtabSettings
                    ? `${
                          currency.fiatCurrencies[cashtabSettings.fiatCurrency]
                              .symbol
                      } `
                    : '$ '
            } ${fiatPriceString} ${
                cashtabSettings && cashtabSettings.fiatCurrency
                    ? cashtabSettings.fiatCurrency.toUpperCase()
                    : 'USD'
            }`;
        } else {
            fiatPriceString = `${
                formData.value
                    ? formatFiatBalance(
                          Number(fiatToCrypto(formData.value, fiatPrice)),
                          userLocale,
                      )
                    : formatFiatBalance(0, userLocale)
            } ${currency.ticker}`;
        }
    }

    const priceApiError = fiatPrice === null && selectedCurrency !== 'XEC';

    return (
        <>
            <Modal
                title="Confirm Send"
                visible={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <p>
                    Are you sure you want to send {formData.value}{' '}
                    {currency.ticker} to {formData.address}?
                </p>
            </Modal>
            {!balances.totalBalance ? (
                <ZeroBalanceHeader>
                    You currently have 0 {currency.ticker}
                    <br />
                    Deposit some funds to use this feature
                </ZeroBalanceHeader>
            ) : (
                <>
                    <BalanceHeader
                        balance={balances.totalBalance}
                        ticker={currency.ticker}
                    />
                    {fiatPrice !== null && (
                        <BalanceHeaderFiat
                            balance={balances.totalBalance}
                            settings={cashtabSettings}
                            fiatPrice={fiatPrice}
                        />
                    )}
                </>
            )}

            <Row type="flex">
                <Col span={24}>
                    <Form
                        style={{
                            width: 'auto',
                        }}
                    >
                        {!isOneToManyXECSend ? (
                            <>
                                <Button
                                    type="text"
                                    block
                                    onClick={() => setIsOneToManyXECSend(true)}
                                >
                                    <RecipientModeLabel>
                                        Switch to multiple recipients
                                    </RecipientModeLabel>
                                </Button>
                                <DestinationAddressSingle
                                    loadWithCameraOpen={scannerSupported}
                                    validateStatus={
                                        sendBchAddressError ? 'error' : ''
                                    }
                                    help={
                                        sendBchAddressError
                                            ? sendBchAddressError
                                            : ''
                                    }
                                    onScan={result =>
                                        handleAddressChange({
                                            target: {
                                                name: 'address',
                                                value: result,
                                            },
                                        })
                                    }
                                    inputProps={{
                                        placeholder: `${currency.ticker} Address`,
                                        name: 'address',
                                        onChange: e => handleAddressChange(e),
                                        required: true,
                                        value: formData.address,
                                    }}
                                ></DestinationAddressSingle>
                                <SendBchInput
                                    activeFiatCode={
                                        cashtabSettings &&
                                        cashtabSettings.fiatCurrency
                                            ? cashtabSettings.fiatCurrency.toUpperCase()
                                            : 'USD'
                                    }
                                    validateStatus={
                                        sendBchAmountError ? 'error' : ''
                                    }
                                    help={
                                        sendBchAmountError
                                            ? sendBchAmountError
                                            : ''
                                    }
                                    onMax={onMax}
                                    inputProps={{
                                        name: 'value',
                                        dollar:
                                            selectedCurrency === 'USD' ? 1 : 0,
                                        placeholder: 'Amount',
                                        onChange: e => handleBchAmountChange(e),
                                        required: true,
                                        value: formData.value,
                                    }}
                                    selectProps={{
                                        value: selectedCurrency,
                                        disabled: queryStringText !== null,
                                        onChange: e =>
                                            handleSelectedCurrencyChange(e),
                                    }}
                                ></SendBchInput>
                                {priceApiError && (
                                    <AlertMsg>
                                        Error fetching fiat price. Setting send
                                        by{' '}
                                        {currency.fiatCurrencies[
                                            cashtabSettings.fiatCurrency
                                        ].slug.toUpperCase()}{' '}
                                        disabled
                                    </AlertMsg>
                                )}
                                <LocaleFormattedValue>
                                    {formatBalance(formData.value, userLocale)}{' '}
                                    {selectedCurrency}
                                </LocaleFormattedValue>
                                <ConvertAmount>
                                    {fiatPriceString !== '' && '='}{' '}
                                    {fiatPriceString}
                                </ConvertAmount>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="text"
                                    block
                                    onClick={() => setIsOneToManyXECSend(false)}
                                >
                                    <RecipientModeLabel>
                                        Switch to a single recipient
                                    </RecipientModeLabel>
                                </Button>
                                <DestinationAddressMulti
                                    validateStatus={
                                        sendBchAddressError ? 'error' : ''
                                    }
                                    help={
                                        sendBchAddressError
                                            ? sendBchAddressError
                                            : ''
                                    }
                                    inputProps={{
                                        placeholder: `One XEC address & value per line, separated by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,500 \necash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,700`,
                                        name: 'address',
                                        onChange: e =>
                                            handleMultiAddressChange(e),
                                        required: true,
                                        value: formData.address,
                                    }}
                                ></DestinationAddressMulti>
                            </>
                        )}
                        <div
                            style={{
                                paddingTop: '32px',
                            }}
                        >
                            <AdvancedCollapse
                                style={{
                                    marginBottom: '24px',
                                }}
                                defaultActiveKey={
                                    location &&
                                    location.state &&
                                    location.state.replyAddress
                                        ? ['1']
                                        : ['0']
                                }
                            >
                                <Panel header="Advanced" key="1">
                                    <AntdFormWrapper
                                        style={{
                                            marginBottom: '20px',
                                        }}
                                    >
                                        <TextAreaLabel>
                                            Message:&nbsp;&nbsp;
                                            {!isOneToManyXECSend ? (
                                                <Switch
                                                    checkedChildren="Private"
                                                    unCheckedChildren="Public"
                                                    defaultunchecked="true"
                                                    checked={
                                                        isEncryptedOptionalOpReturnMsg
                                                    }
                                                    onChange={() =>
                                                        setIsEncryptedOptionalOpReturnMsg(
                                                            prev => !prev,
                                                        )
                                                    }
                                                    style={{
                                                        marginBottom: '7px',
                                                    }}
                                                />
                                            ) : (
                                                ''
                                            )}
                                        </TextAreaLabel>
                                        {isEncryptedOptionalOpReturnMsg ? (
                                            <Alert
                                                style={{
                                                    marginBottom: '10px',
                                                }}
                                                description="Please note encrypted messages can only be sent to wallets with at least 1 outgoing transaction."
                                                type="warning"
                                                showIcon
                                            />
                                        ) : (
                                            <Alert
                                                style={{
                                                    marginBottom: '10px',
                                                }}
                                                description="Please note this message will be public."
                                                type="warning"
                                                showIcon
                                            />
                                        )}
                                        <TextArea
                                            name="opReturnMsg"
                                            placeholder={
                                                isEncryptedOptionalOpReturnMsg
                                                    ? `(max ${currency.opReturn.encryptedMsgCharLimit} characters)`
                                                    : `(max ${currency.opReturn.unencryptedMsgCharLimit} characters)`
                                            }
                                            value={
                                                opReturnMsg
                                                    ? isEncryptedOptionalOpReturnMsg
                                                        ? opReturnMsg.substring(
                                                              0,
                                                              currency.opReturn
                                                                  .encryptedMsgCharLimit +
                                                                  1,
                                                          )
                                                        : opReturnMsg
                                                    : ''
                                            }
                                            onChange={e =>
                                                setOpReturnMsg(e.target.value)
                                            }
                                            showCount
                                            maxLength={
                                                isEncryptedOptionalOpReturnMsg
                                                    ? currency.opReturn
                                                          .encryptedMsgCharLimit
                                                    : currency.opReturn
                                                          .unencryptedMsgCharLimit
                                            }
                                            onKeyDown={e =>
                                                e.keyCode == 13
                                                    ? e.preventDefault()
                                                    : ''
                                            }
                                        />
                                    </AntdFormWrapper>
                                </Panel>
                            </AdvancedCollapse>
                        </div>
                        <div
                            style={{
                                paddingTop: '12px',
                            }}
                        >
                            {!balances.totalBalance ||
                            apiError ||
                            sendBchAmountError ||
                            sendBchAddressError ? (
                                <SecondaryButton>Send</SecondaryButton>
                            ) : (
                                <>
                                    {txInfoFromUrl ? (
                                        <PrimaryButton
                                            onClick={() => showModal()}
                                        >
                                            Send
                                        </PrimaryButton>
                                    ) : (
                                        <PrimaryButton
                                            onClick={() => {
                                                send();
                                            }}
                                        >
                                            Send
                                        </PrimaryButton>
                                    )}
                                </>
                            )}
                        </div>
                        {queryStringText && (
                            <Alert
                                message={`You are sending a transaction to an address including query parameters "${queryStringText}." Only the "amount" parameter, in units of ${currency.ticker} satoshis, is currently supported.`}
                                type="warning"
                            />
                        )}
                        {apiError && <ApiError />}
                    </Form>
                </Col>
            </Row>
            <StyledSpacer>Signatures</StyledSpacer>
            <Modal
                title={`Please review and confirm your message to be signed using this wallet.`}
                visible={showConfirmMsgToSign}
                onOk={signMessageByPk}
                onCancel={() => setShowConfirmMsgToSign(false)}
            >
                <TokenParamLabel>Message:</TokenParamLabel> {msgToSign}
                <br />
            </Modal>
            <AdvancedCollapse
                style={{
                    marginBottom: '24px',
                }}
            >
                <Panel header="Sign Message" key="1">
                    <AntdFormWrapper>
                        <Form
                            size="small"
                            style={{
                                width: 'auto',
                            }}
                        >
                            <Form.Item>
                                <SignMessageLabel>Message:</SignMessageLabel>
                                <TextArea
                                    name="signMessage"
                                    onChange={e => handleSignMsgChange(e)}
                                    showCount
                                    maxLength={150}
                                />
                            </Form.Item>
                            <Form.Item>
                                <SignMessageLabel>Address:</SignMessageLabel>
                                <Input
                                    name="signMessageAddress"
                                    disabled={true}
                                    value={
                                        wallet &&
                                        wallet.Path1899 &&
                                        wallet.Path1899.cashAddress
                                            ? convertToEcashPrefix(
                                                  wallet.Path1899.cashAddress,
                                              )
                                            : ''
                                    }
                                />
                            </Form.Item>
                            <SmartButton
                                onClick={() => setShowConfirmMsgToSign(true)}
                                disabled={!signMessageIsValid}
                            >
                                <PlusSquareOutlined />
                                &nbsp;Sign Message
                            </SmartButton>
                            <CopyToClipboard
                                style={{
                                    display: 'inline-block',
                                    width: '100%',
                                    position: 'relative',
                                }}
                                text={messageSignature}
                            >
                                <Form.Item>
                                    <SignMessageLabel>
                                        Signature:
                                    </SignMessageLabel>
                                    <TextArea
                                        name="signMessageSignature"
                                        placeholder="The signature will be generated upon signing of the message"
                                        readOnly={true}
                                        value={messageSignature}
                                        onClick={() => handleOnSigCopy()}
                                    />
                                </Form.Item>
                            </CopyToClipboard>
                            {sigCopySuccess}
                        </Form>
                    </AntdFormWrapper>
                </Panel>
            </AdvancedCollapse>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Send.test.js

status => {console.log(status)} is an arbitrary stub function
*/

SendBCH.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

SendBCH.propTypes = {
    jestBCH: PropTypes.object,
    passLoadingStatus: PropTypes.func,
};

export default SendBCH;
