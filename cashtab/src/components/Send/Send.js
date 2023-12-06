import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { WalletContext } from 'utils/context';
import {
    AntdFormWrapper,
    SendBchInput,
    DestinationAddressSingle,
    DestinationAddressMulti,
} from 'components/Common/EnhancedInputs';
import { ThemedMailOutlined } from 'components/Common/CustomIcons';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';
import { Form, message, Modal, Alert, Input } from 'antd';
import { Row, Col, Switch } from 'antd';
import PrimaryButton, { DisabledButton } from 'components/Common/PrimaryButton';
import useWindowDimensions from 'hooks/useWindowDimensions';
import {
    sendXecNotification,
    errorNotification,
} from 'components/Common/Notifications';
import { isMobile, isIOS, isSafari } from 'react-device-detect';
import { parseAddressForParams, sumOneToManyXec } from 'utils/cashMethods';
import { Event } from 'utils/GoogleAnalytics';
import {
    fiatToCrypto,
    shouldRejectAmountInput,
    isValidXecAddress,
    isValidEtokenAddress,
    isValidXecSendAmount,
    isAliasFormat,
} from 'utils/validation';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import {
    ZeroBalanceHeader,
    ConvertAmount,
    AlertMsg,
    WalletInfoCtn,
    SidePaddingCtn,
    FormLabel,
    TxLink,
    MsgBytesizeError,
} from 'components/Common/Atoms';
import {
    getWalletState,
    fromSatoshisToXec,
    calcFee,
    getMessageByteSize,
} from 'utils/cashMethods';
import { sendXec } from 'utils/transactions';
import ApiError from 'components/Common/ApiError';
import { formatFiatBalance, formatBalance } from 'utils/formatting';
import styled from 'styled-components';
import WalletLabel from 'components/Common/WalletLabel.js';
import { opReturn as opreturnConfig } from 'config/opreturn';
import { explorer } from 'config/explorer';
import { queryAliasServer } from 'utils/aliasUtils';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';

const { TextArea } = Input;

const TextAreaLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.forms.text};
    padding-left: 1px;
    white-space: nowrap;
`;

const AliasAddressPreviewLabel = styled.div`
    text-align: center;
    color: ${props => props.theme.forms.text};
    padding-left: 1px;
    white-space: nowrap;
`;

const AmountPreviewCtn = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: top;
    max-height: 1rem;
`;

const SendInputCtn = styled.div`
    .ant-form-item-explain-error {
        @media (max-width: 300px) {
            font-size: 12px;
        }
    }
`;

const LocaleFormattedValue = styled.h3`
    color: ${props => props.theme.contrast};
    font-weight: bold;
    margin-bottom: 0;
`;

const SendAddressHeader = styled.div`
    display: flex;
    align-items: center;
`;
const DestinationAddressSingleCtn = styled.div``;
const DestinationAddressMultiCtn = styled.div``;

const ExpandingAddressInputCtn = styled.div`
    min-height: 14rem;
    ${DestinationAddressSingleCtn} {
        overflow: hidden;
        transition: ${props =>
            props.open
                ? 'max-height 200ms ease-in, opacity 200ms ease-out'
                : 'max-height 200ms cubic-bezier(0, 1, 0, 1), opacity 200ms ease-in'};
        max-height: ${props => (props.open ? '0rem' : '12rem')};
        opacity: ${props => (props.open ? 0 : 1)};
    }
    ${DestinationAddressMultiCtn} {
        overflow: hidden;
        transition: ${props =>
            props.open
                ? 'max-height 200ms ease-in, transform 200ms ease-out, opacity 200ms ease-in'
                : 'max-height 200ms cubic-bezier(0, 1, 0, 1), transform 200ms ease-out'};
        max-height: ${props => (props.open ? '13rem' : '0rem')};
        transform: ${props =>
            props.open ? 'translateY(0%)' : 'translateY(100%)'};
        opacity: ${props => (props.open ? 1 : 0)};
    }
`;

const PanelHeaderCtn = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
`;

const SendBCH = ({ passLoadingStatus }) => {
    // use balance parameters from wallet.state object and not legacy balances parameter from walletState, if user has migrated wallet
    // this handles edge case of user with old wallet who has not opened latest Cashtab version yet

    // If the wallet object from ContextValue has a `state key`, then check which keys are in the wallet object
    // Else set it as blank
    const ContextValue = React.useContext(WalletContext);
    const location = useLocation();
    const {
        wallet,
        fiatPrice,
        apiError,
        cashtabSettings,
        changeCashtabSettings,
        chronik,
        cashtabCache,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances, nonSlpUtxos } = walletState;
    // Modal settings
    const [isOneToManyXECSend, setIsOneToManyXECSend] = useState(false);
    const [opReturnMsg, setOpReturnMsg] = useState(false);

    // Get device window width
    // If this is less than 769, the page will open with QR scanner open
    const { width } = useWindowDimensions();
    // Load with QR code open if device is mobile and NOT iOS + anything but safari
    const scannerSupported =
        cashtabSettings &&
        cashtabSettings.autoCameraOn === true &&
        width < 769 &&
        isMobile &&
        !(isIOS && !isSafari);

    const [formData, setFormData] = useState({
        value: '',
        address: '',
        airdropTokenId: '',
    });
    const [queryStringText, setQueryStringText] = useState(null);
    const [sendBchAddressError, setSendBchAddressError] = useState(false);
    const [sendBchAmountError, setSendBchAmountError] = useState(false);
    const [isMsgError, setIsMsgError] = useState(false);
    const [aliasInputAddress, setAliasInputAddress] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(appConfig.ticker);

    // Support cashtab button from web pages
    const [txInfoFromUrl, setTxInfoFromUrl] = useState(false);

    // Show a confirmation modal on transactions created by populating form from web page button
    const [isModalVisible, setIsModalVisible] = useState(false);

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

    const [airdropFlag, setAirdropFlag] = useState(false);

    const userLocale = navigator.language;
    const clearInputForms = () => {
        setFormData({
            value: '',
            address: '',
        });
        setOpReturnMsg(''); // OP_RETURN message has its own state field
        setAliasInputAddress(false); // clear alias address preview
    };

    const checkForConfirmationBeforeSendXec = () => {
        if (txInfoFromUrl || queryStringText !== null) {
            setIsModalVisible(true);
        } else if (cashtabSettings.sendModal) {
            setIsModalVisible(cashtabSettings.sendModal);
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

    // If the balance has changed, unlock the UI
    // This is redundant, if backend has refreshed in 1.75s timeout below, UI will already be unlocked
    useEffect(() => {
        passLoadingStatus(false);
    }, [balances.totalBalance]);

    useEffect(() => {
        // only run this useEffect block if cashtabCache is defined
        if (!cashtabCache || typeof cashtabCache === 'undefined') {
            return;
        }

        // Manually parse for txInfo object on page load when Send.js is loaded with a query string

        // if this was routed from Wallet screen's Reply to message link then prepopulate the address and value field
        if (location && location.state && location.state.replyAddress) {
            setFormData({
                address: location.state.replyAddress,
                value: `${fromSatoshisToXec(appConfig.dustSats).toString()}`,
            });
        }

        // if this was routed from the Contact List
        if (location && location.state && location.state.contactSend) {
            setFormData({
                address: location.state.contactSend,
            });

            // explicitly trigger the address validation upon navigation from contact list
            handleAddressChange({
                target: {
                    name: 'address',
                    value: location.state.contactSend,
                },
            });
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
                address: location.state.airdropRecipients,
                airdropTokenId: location.state.airdropTokenId,
            });

            // validate the airdrop outputs from the calculator
            handleMultiAddressChange({
                target: {
                    value: location.state.airdropRecipients,
                },
            });

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
    }, [cashtabCache]);

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
                const link = await sendXec(
                    chronik,
                    wallet,
                    nonSlpUtxos,
                    appConfig.defaultFee,
                    opReturnMsg,
                    true, // indicate send mode is one to many
                    addressAndValueArray,
                    null,
                    null,
                    false, // one to many tx msg can't be encrypted
                    airdropFlag,
                    formData.airdropTokenId,
                );
                sendXecNotification(link);
                clearInputForms();
                setAirdropFlag(false);
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

            let cleanAddress;
            // check state on whether this is an alias or ecash address
            if (aliasInputAddress) {
                cleanAddress = aliasInputAddress;
            } else {
                // Get the non-alias param-free address
                cleanAddress = address.split('?')[0];
            }
            // Calculate the amount in BCH
            let bchValue = value;

            if (selectedCurrency !== 'XEC') {
                bchValue = fiatToCrypto(value, fiatPrice);
            }

            try {
                const link = await sendXec(
                    chronik,
                    wallet,
                    nonSlpUtxos,
                    appConfig.defaultFee,
                    opReturnMsg,
                    false, // sendToMany boolean flag
                    null, // address array not applicable for one to many tx
                    cleanAddress,
                    bchValue,
                    false,
                );
                sendXecNotification(link);
                clearInputForms();
            } catch (e) {
                handleSendXecError(e, isOneToManyXECSend);
            }
        }
    }

    const handleAddressChange = async e => {
        setAliasInputAddress(false); // clear alias address preview
        const { value, name } = e.target;
        let error = false;
        let addressString = value;
        // parse address for parameters
        const addressInfo = parseAddressForParams(addressString);
        const { address, queryString, amount } = addressInfo;

        // validate address
        const isValid = isValidXecAddress(addressInfo.address);

        // Store query string in state (disable currency selection if loaded from query string)
        setQueryStringText(queryString);

        // Is this valid address?
        if (!isValid) {
            error = `Invalid address`;
            // If valid address but token format
            if (isValidEtokenAddress(address)) {
                error = `eToken addresses are not supported for ${appConfig.ticker} sends`;
            }
        }

        // if input is invalid as an ecash address, check if it's a valid alias
        // otherwise the invalid address error above will be displayed
        const isAliasInput = isAliasFormat(address);
        if (isAliasInput) {
            // reset the invalid address check from above
            error = false;

            // extract alias without the `.xec`
            const aliasName = address.slice(0, address.length - 4);

            // retrieve the alias details for `aliasName` from alias-server
            let aliasDetails;
            try {
                aliasDetails = await queryAliasServer('alias', aliasName);
                if (!aliasDetails.address) {
                    error =
                        'eCash Alias does not exist or yet to receive 1 confirmation';
                    setAliasInputAddress(false);
                } else {
                    // Valid address response returned
                    setAliasInputAddress(aliasDetails.address);
                }
            } catch (err) {
                console.log(`handleAddressChange(): error retrieving alias`);
                setAliasInputAddress(false);
                errorNotification(null, 'Error retrieving alias info');
            }
        }

        setSendBchAddressError(error);

        // Set amount if it's in the query string
        if (amount !== null) {
            // Set currency to BCHA
            setSelectedCurrency(appConfig.ticker);

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
                error = 'Ensure each XEC address is valid';
                setSendBchAddressError(error);
                return setFormData(p => ({
                    ...p,
                    [name]: value,
                }));
            }
            if (!validValueString) {
                error = `Amount must be >= ${(appConfig.dustSats / 100).toFixed(
                    2,
                )} XEC and <= 2 decimals.`;
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

    const handleMsgChange = e => {
        const { value } = e.target;
        let msgError = false;
        const msgByteSize = getMessageByteSize(value);

        const maxSize =
            location && location.state && location.state.airdropTokenId
                ? opreturnConfig.cashtabMsgByteLimit - localAirdropTxAddedBytes
                : opreturnConfig.cashtabMsgByteLimit;
        if (msgByteSize > maxSize) {
            msgError = `Message can not exceed ${maxSize} bytes`;
        }
        setIsMsgError(msgError);
        setOpReturnMsg(e.target.value);
    };

    const onMax = async () => {
        // Clear amt error
        setSendBchAmountError(false);
        // Set currency to BCH
        setSelectedCurrency(appConfig.ticker);
        try {
            const txFeeSats = calcFee(nonSlpUtxos);

            const txFeeBch = txFeeSats / 10 ** appConfig.cashDecimals;
            let value =
                balances.totalBalance - txFeeBch >= 0
                    ? (balances.totalBalance - txFeeBch).toFixed(
                          appConfig.cashDecimals,
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
        if (selectedCurrency === appConfig.ticker) {
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
                          supportedFiatCurrencies[cashtabSettings.fiatCurrency]
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
            } ${appConfig.ticker}`;
        }
    }

    const priceApiError = fiatPrice === null && selectedCurrency !== 'XEC';

    return (
        <>
            <Modal
                title="Confirm Send"
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <p>
                    {isOneToManyXECSend ? (
                        <>
                            Are you sure you want to send{' '}
                            {sumOneToManyXec(
                                formData.address.split('\n'),
                            ).toLocaleString(userLocale, {
                                maximumFractionDigits: 2,
                            })}{' '}
                            XEC in the following transaction?
                            <br />
                            <br />
                            {formData.address}
                        </>
                    ) : (
                        `Are you sure you want to send ${formData.value}${' '}
                  ${selectedCurrency} to ${
                            queryStringText === null
                                ? formData.address
                                : formData.address.slice(
                                      0,
                                      formData.address.indexOf('?'),
                                  )
                        }?`
                    )}
                </p>
            </Modal>
            <WalletInfoCtn>
                <WalletLabel
                    name={wallet.name}
                    cashtabSettings={cashtabSettings}
                    changeCashtabSettings={changeCashtabSettings}
                ></WalletLabel>
                {!balances.totalBalance ? (
                    <ZeroBalanceHeader>
                        You currently have 0 {appConfig.ticker}
                        <br />
                        Deposit some funds to use this feature
                    </ZeroBalanceHeader>
                ) : (
                    <>
                        <BalanceHeader
                            balance={balances.totalBalance}
                            ticker={appConfig.ticker}
                            cashtabSettings={cashtabSettings}
                        />

                        <BalanceHeaderFiat
                            balance={balances.totalBalance}
                            settings={cashtabSettings}
                            fiatPrice={fiatPrice}
                        />
                    </>
                )}
            </WalletInfoCtn>
            <SidePaddingCtn>
                <Row type="flex">
                    <Col span={24}>
                        <Form
                            style={{
                                width: 'auto',
                                marginTop: '40px',
                            }}
                        >
                            <SendAddressHeader>
                                {' '}
                                <FormLabel>Send to</FormLabel>
                                <TextAreaLabel>
                                    Multiple Recipients:&nbsp;&nbsp;
                                    <Switch
                                        defaultunchecked="true"
                                        checked={isOneToManyXECSend}
                                        onChange={() => {
                                            setIsOneToManyXECSend(
                                                !isOneToManyXECSend,
                                            );
                                            // Do not persist multisend input to single send and vice versa
                                            clearInputForms();
                                        }}
                                        style={{
                                            marginBottom: '7px',
                                        }}
                                    />
                                </TextAreaLabel>
                            </SendAddressHeader>
                            <ExpandingAddressInputCtn open={isOneToManyXECSend}>
                                <SendInputCtn>
                                    <DestinationAddressSingleCtn>
                                        <DestinationAddressSingle
                                            style={{ marginBottom: '0px' }}
                                            loadWithCameraOpen={
                                                location &&
                                                location.state &&
                                                location.state.replyAddress
                                                    ? false
                                                    : scannerSupported
                                            }
                                            validateStatus={
                                                sendBchAddressError
                                                    ? 'error'
                                                    : ''
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
                                                placeholder:
                                                    aliasSettings.aliasEnabled
                                                        ? `Address or Alias`
                                                        : `Address`,
                                                name: 'address',
                                                onChange: e =>
                                                    handleAddressChange(e),
                                                required: true,
                                                value: formData.address,
                                            }}
                                        ></DestinationAddressSingle>
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
                                                    )}...${aliasInputAddress.slice(
                                                        -5,
                                                    )}`}
                                            </TxLink>
                                        </AliasAddressPreviewLabel>
                                        <FormLabel>Amount</FormLabel>
                                        <SendBchInput
                                            activeFiatCode={
                                                cashtabSettings &&
                                                cashtabSettings.fiatCurrency
                                                    ? cashtabSettings.fiatCurrency.toUpperCase()
                                                    : 'USD'
                                            }
                                            validateStatus={
                                                sendBchAmountError
                                                    ? 'error'
                                                    : ''
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
                                                    selectedCurrency === 'USD'
                                                        ? 1
                                                        : 0,
                                                placeholder: 'Amount',
                                                onChange: e =>
                                                    handleBchAmountChange(e),
                                                required: true,
                                                value: formData.value,
                                                disabled: priceApiError,
                                            }}
                                            selectProps={{
                                                value: selectedCurrency,
                                                disabled:
                                                    queryStringText !== null,
                                                onChange: e =>
                                                    handleSelectedCurrencyChange(
                                                        e,
                                                    ),
                                            }}
                                        ></SendBchInput>
                                    </DestinationAddressSingleCtn>
                                    {priceApiError && (
                                        <AlertMsg>
                                            Error fetching fiat price. Setting
                                            send by{' '}
                                            {supportedFiatCurrencies[
                                                cashtabSettings.fiatCurrency
                                            ].slug.toUpperCase()}{' '}
                                            disabled
                                        </AlertMsg>
                                    )}
                                </SendInputCtn>

                                <>
                                    <DestinationAddressMultiCtn>
                                        <DestinationAddressMulti
                                            validateStatus={
                                                sendBchAddressError
                                                    ? 'error'
                                                    : ''
                                            }
                                            help={
                                                sendBchAddressError
                                                    ? sendBchAddressError
                                                    : ''
                                            }
                                            inputProps={{
                                                placeholder: `One address & value per line, separated by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,500 \necash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed,700`,
                                                name: 'address',
                                                onChange: e =>
                                                    handleMultiAddressChange(e),
                                                required: true,
                                                value: formData.address,
                                            }}
                                        ></DestinationAddressMulti>
                                    </DestinationAddressMultiCtn>
                                </>
                                <AmountPreviewCtn>
                                    {!priceApiError && !isOneToManyXECSend && (
                                        <>
                                            <LocaleFormattedValue>
                                                {!isNaN(formData.value)
                                                    ? formatBalance(
                                                          formData.value,
                                                          userLocale,
                                                      ) +
                                                      ' ' +
                                                      selectedCurrency
                                                    : ''}
                                            </LocaleFormattedValue>
                                            <ConvertAmount>
                                                {fiatPriceString !== '' && '='}{' '}
                                                {fiatPriceString}
                                            </ConvertAmount>
                                        </>
                                    )}
                                </AmountPreviewCtn>
                            </ExpandingAddressInputCtn>

                            <div
                                style={{
                                    paddingTop: '1rem',
                                }}
                            >
                                {!balances.totalBalance ||
                                apiError ||
                                sendBchAmountError ||
                                sendBchAddressError ||
                                isMsgError ||
                                priceApiError ||
                                isNaN(formData.value) ? (
                                    <DisabledButton>Send</DisabledButton>
                                ) : (
                                    <>
                                        {txInfoFromUrl ? (
                                            <PrimaryButton
                                                onClick={() =>
                                                    checkForConfirmationBeforeSendXec()
                                                }
                                            >
                                                Send
                                            </PrimaryButton>
                                        ) : (
                                            <PrimaryButton
                                                onClick={() => {
                                                    checkForConfirmationBeforeSendXec();
                                                }}
                                            >
                                                Send
                                            </PrimaryButton>
                                        )}
                                    </>
                                )}
                            </div>

                            <CustomCollapseCtn
                                panelHeader={
                                    <PanelHeaderCtn>
                                        <ThemedMailOutlined /> Message
                                    </PanelHeaderCtn>
                                }
                                optionalDefaultActiveKey={
                                    location &&
                                    location.state &&
                                    location.state.replyAddress
                                        ? ['1']
                                        : ['0']
                                }
                                optionalKey="1"
                            >
                                <AntdFormWrapper
                                    style={{
                                        marginBottom: '20px',
                                    }}
                                >
                                    <Alert
                                        style={{
                                            marginBottom: '10px',
                                        }}
                                        description="Please note this message will be public."
                                        type="warning"
                                        showIcon
                                    />
                                    <TextArea
                                        name="opReturnMsg"
                                        placeholder={
                                            location &&
                                            location.state &&
                                            location.state.airdropTokenId
                                                ? `(max ${
                                                      opreturnConfig.cashtabMsgByteLimit -
                                                      localAirdropTxAddedBytes
                                                  } bytes)`
                                                : `(max ${opreturnConfig.cashtabMsgByteLimit} bytes)`
                                        }
                                        value={opReturnMsg ? opReturnMsg : ''}
                                        onChange={e => handleMsgChange(e)}
                                        onKeyDown={e =>
                                            e.keyCode == 13
                                                ? e.preventDefault()
                                                : ''
                                        }
                                    />
                                    <MsgBytesizeError>
                                        {isMsgError ? isMsgError : ''}
                                    </MsgBytesizeError>
                                </AntdFormWrapper>
                            </CustomCollapseCtn>
                            {apiError && <ApiError />}
                        </Form>
                    </Col>
                </Row>
            </SidePaddingCtn>
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
    passLoadingStatus: PropTypes.func,
};

export default SendBCH;
