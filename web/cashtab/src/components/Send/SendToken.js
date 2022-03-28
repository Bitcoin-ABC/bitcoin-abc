import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { WalletContext } from 'utils/context';
import {
    Form,
    message,
    Row,
    Col,
    Alert,
    Descriptions,
    Modal,
    Button,
    Input,
} from 'antd';
import PrimaryButton, {
    SecondaryButton,
} from 'components/Common/PrimaryButton';
import { FireTwoTone } from '@ant-design/icons';
import {
    DestinationAmount,
    DestinationAddressSingle,
    AntdFormWrapper,
} from 'components/Common/EnhancedInputs';
import useBCH from 'hooks/useBCH';
import { SidePaddingCtn } from 'components/Common/Atoms';
import BalanceHeader from 'components/Common/BalanceHeader';
import { Redirect } from 'react-router-dom';
import useWindowDimensions from 'hooks/useWindowDimensions';
import { isMobile, isIOS, isSafari } from 'react-device-detect';
import { Img } from 'react-image';
import makeBlockie from 'ethereum-blockies-base64';
import BigNumber from 'bignumber.js';
import { currency, parseAddressForParams } from 'components/Common/Ticker.js';
import { Event } from 'utils/GoogleAnalytics';
import { getWalletState, toLegacyToken } from 'utils/cashMethods';
import ApiError from 'components/Common/ApiError';
import {
    sendTokenNotification,
    errorNotification,
    burnTokenNotification,
} from 'components/Common/Notifications';
import {
    isValidXecAddress,
    isValidEtokenAddress,
    isValidEtokenBurnAmount,
} from 'utils/validation';
import { formatDate } from 'utils/formatting';
import styled, { css } from 'styled-components';
import TokenIcon from 'components/Tokens/TokenIcon';
const AntdDescriptionsCss = css`
    .ant-descriptions-item-label,
    .ant-input-number,
    .ant-descriptions-item-content {
        background-color: ${props => props.theme.contrast} !important;
        color: ${props => props.theme.dropdownText};
    }
    .ant-descriptions-title {
        color: ${props => props.theme.lightWhite};
    }
`;
const AntdDescriptionsWrapper = styled.div`
    ${AntdDescriptionsCss}
`;
const AirdropButton = styled.div`
    text-align: center;
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    background: ${props => props.theme.sentMessage};
    a {
        color: ${props => props.theme.darkBlue};
        margin: 0;
        font-size: 11px;
        border: 1px solid ${props => props.theme.darkBlue};
        border-radius: 5px;
        padding: 2px 10px;
        opacity: 0.6;
    }
    a:hover {
        opacity: 1;
        border-color: ${props => props.theme.eCashBlue};
        color: ${props => props.theme.contrast};
        background: ${props => props.theme.eCashBlue};
    }
    ${({ received, ...props }) =>
        received &&
        `
        text-align: left;    
        background: ${props.theme.receivedMessage};
    `}
`;

const SendToken = ({ tokenId, jestBCH, passLoadingStatus }) => {
    const { wallet, apiError, cashtabSettings } =
        React.useContext(WalletContext);
    const walletState = getWalletState(wallet);
    const { tokens, slpBalancesAndUtxos } = walletState;
    const token = tokens.find(token => token.tokenId === tokenId);

    const [tokenStats, setTokenStats] = useState(null);
    const [queryStringText, setQueryStringText] = useState(null);
    const [sendTokenAddressError, setSendTokenAddressError] = useState(false);
    const [sendTokenAmountError, setSendTokenAmountError] = useState(false);
    const [eTokenBurnAmount, setETokenBurnAmount] = useState(new BigNumber(1));
    const [showConfirmBurnEtoken, setShowConfirmBurnEtoken] = useState(false);
    const [burnTokenAmountError, setBurnTokenAmountError] = useState(false);
    const [burnConfirmationValid, setBurnConfirmationValid] = useState(null);
    const [confirmationOfEtokenToBeBurnt, setConfirmationOfEtokenToBeBurnt] =
        useState('');

    // Get device window width
    // If this is less than 769, the page will open with QR scanner open
    const { width } = useWindowDimensions();
    // Load with QR code open if device is mobile and NOT iOS + anything but safari
    const scannerSupported = width < 769 && isMobile && !(isIOS && !isSafari);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [formData, setFormData] = useState({
        value: '',
        address: '',
    });

    const { getBCH, getRestUrl, sendToken, getTokenStats, burnEtoken } =
        useBCH();

    // jestBCH is only ever specified for unit tests, otherwise app will use getBCH();
    const BCH = jestBCH ? jestBCH : getBCH();

    // Fetch token stats if you do not have them and API did not return an error
    if (tokenStats === null) {
        getTokenStats(BCH, tokenId).then(
            result => {
                setTokenStats(result);
            },
            err => {
                console.log(`Error getting token stats: ${err}`);
            },
        );
    }
    // Clears address and amount fields following sendTokenNotification
    const clearInputForms = () => {
        setFormData({
            value: '',
            address: '',
        });
    };

    async function submit() {
        setFormData({
            ...formData,
        });

        if (
            !formData.address ||
            !formData.value ||
            Number(formData.value <= 0) ||
            sendTokenAmountError
        ) {
            return;
        }

        // Event("Category", "Action", "Label")
        // Track number of SLPA send transactions and
        // SLPA token IDs
        Event('SendToken.js', 'Send', tokenId);

        passLoadingStatus(true);
        const { address, value } = formData;

        // Clear params from address
        let cleanAddress = address.split('?')[0];

        // Convert to simpleledger prefix if etoken
        cleanAddress = toLegacyToken(cleanAddress);

        try {
            const link = await sendToken(BCH, wallet, slpBalancesAndUtxos, {
                tokenId: tokenId,
                tokenReceiverAddress: cleanAddress,
                amount: value,
            });
            sendTokenNotification(link);
            clearInputForms();
        } catch (e) {
            passLoadingStatus(false);
            let message;

            if (!e.error && !e.message) {
                message = `Transaction failed: no response from ${getRestUrl()}.`;
            } else if (
                /Could not communicate with full node or other external service/.test(
                    e.error,
                )
            ) {
                message = 'Could not communicate with API. Please try again.';
            } else {
                message = e.message || e.error || JSON.stringify(e);
            }
            errorNotification(e, message, 'Sending eToken');
        }
    }

    const handleSlpAmountChange = e => {
        let error = false;
        const { value, name } = e.target;

        // test if exceeds balance using BigNumber
        let isGreaterThanBalance = false;
        if (!isNaN(value)) {
            const bigValue = new BigNumber(value);
            // Returns 1 if greater, -1 if less, 0 if the same, null if n/a
            isGreaterThanBalance = bigValue.comparedTo(token.balance);
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

    const handleTokenAddressChange = e => {
        const { value, name } = e.target;
        // validate for token address
        // validate for parameters
        // show warning that query strings are not supported

        let error = false;
        let addressString = value;

        const isValid = isValidEtokenAddress(addressString);

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

        const { address, queryString } = addressInfo;

        // If query string,
        // Show an alert that only amount and currency.ticker are supported
        setQueryStringText(queryString);

        // Is this valid address?
        if (!isValid) {
            error = 'Address is not a valid etoken: address';
            // If valid address but xec format
            if (isValidXecAddress(address)) {
                error = `Cashtab does not support sending eTokens to XEC addresses. Please convert to an eToken address.`;
            }
        }
        setSendTokenAddressError(error);

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const onMax = async () => {
        // Clear this error before updating field
        setSendTokenAmountError(false);
        try {
            let value = token.balance;

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

    const checkForConfirmationBeforeSendEtoken = () => {
        if (cashtabSettings.sendModal) {
            setIsModalVisible(cashtabSettings.sendModal);
        } else {
            // if the user does not have the send confirmation enabled in settings then send directly
            submit();
        }
    };

    const handleOk = () => {
        setIsModalVisible(false);
        submit();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleEtokenBurnAmountChange = e => {
        const { value } = e.target;
        const burnAmount = new BigNumber(value);
        setETokenBurnAmount(burnAmount);

        let error = false;
        if (!isValidEtokenBurnAmount(burnAmount, token.balance)) {
            error = 'Burn amount must be between 1 and ' + token.balance;
        }

        setBurnTokenAmountError(error);
    };

    const onMaxBurn = () => {
        setETokenBurnAmount(token.balance);

        // trigger validation on the inserted max value
        handleEtokenBurnAmountChange({
            target: {
                value: token.balance,
            },
        });
    };

    async function burn() {
        if (
            !burnConfirmationValid ||
            burnConfirmationValid === null ||
            !eTokenBurnAmount
        ) {
            return;
        }

        // Event("Category", "Action", "Label")
        Event('SendToken.js', 'Burn eToken', tokenId);

        passLoadingStatus(true);

        try {
            const link = await burnEtoken(BCH, wallet, slpBalancesAndUtxos, {
                tokenId: tokenId,
                amount: eTokenBurnAmount,
            });
            burnTokenNotification(link);
            clearInputForms();
            setShowConfirmBurnEtoken(false);
            passLoadingStatus(false);
            setConfirmationOfEtokenToBeBurnt('');
        } catch (e) {
            setShowConfirmBurnEtoken(false);
            passLoadingStatus(false);
            setConfirmationOfEtokenToBeBurnt('');
            let message;

            if (!e.error && !e.message) {
                message = `Transaction failed: no response from ${getRestUrl()}.`;
            } else if (/dust/.test(e.error)) {
                message = 'Unable to burn due to insufficient eToken utxos.';
            } else if (
                /Could not communicate with full node or other external service/.test(
                    e.error,
                )
            ) {
                message = 'Could not communicate with API. Please try again.';
            } else {
                message = e.message || e.error || JSON.stringify(e);
            }
            errorNotification(e, message, 'Burning eToken');
        }
    }

    const handleBurnConfirmationInput = e => {
        const { value } = e.target;

        if (value && value === `burn ${token.info.tokenTicker}`) {
            setBurnConfirmationValid(true);
        } else {
            setBurnConfirmationValid(false);
        }
        setConfirmationOfEtokenToBeBurnt(value);
    };

    const handleBurnAmountInput = () => {
        if (!burnTokenAmountError) {
            setShowConfirmBurnEtoken(true);
        }
    };

    useEffect(() => {
        // If the balance has changed, unlock the UI
        // This is redundant, if backend has refreshed in 1.75s timeout below, UI will already be unlocked

        passLoadingStatus(false);
    }, [token]);

    return (
        <>
            <Modal
                title="Confirm Send"
                visible={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <p>
                    {token && token.info && formData
                        ? `Are you sure you want to send ${formData.value}${' '}
                        ${token.info.tokenTicker} to ${formData.address}?`
                        : ''}
                </p>
            </Modal>
            {!token && <Redirect to="/" />}
            {token && (
                <SidePaddingCtn>
                    {/* eToken burn modal */}
                    <Modal
                        title={`Are you sure you want to burn ${eTokenBurnAmount.toString()} x ${
                            token.info.tokenTicker
                        } eTokens?`}
                        visible={showConfirmBurnEtoken}
                        onOk={burn}
                        okText={'Confirm'}
                        onCancel={() => setShowConfirmBurnEtoken(false)}
                    >
                        <AntdFormWrapper>
                            <Form style={{ width: 'auto' }}>
                                <Form.Item
                                    validateStatus={
                                        burnConfirmationValid === null ||
                                        burnConfirmationValid
                                            ? ''
                                            : 'error'
                                    }
                                    help={
                                        burnConfirmationValid === null ||
                                        burnConfirmationValid
                                            ? ''
                                            : 'Your confirmation phrase must match exactly'
                                    }
                                >
                                    <Input
                                        prefix={<FireTwoTone />}
                                        placeholder={`Type "burn ${token.info.tokenTicker}" to confirm`}
                                        name="etokenToBeBurnt"
                                        value={confirmationOfEtokenToBeBurnt}
                                        onChange={e =>
                                            handleBurnConfirmationInput(e)
                                        }
                                    />
                                </Form.Item>
                            </Form>
                        </AntdFormWrapper>
                    </Modal>
                    <BalanceHeader
                        balance={token.balance}
                        ticker={token.info.tokenTicker}
                    />
                    <Row type="flex">
                        <Col span={24}>
                            <Form
                                style={{
                                    width: 'auto',
                                }}
                            >
                                <DestinationAddressSingle
                                    loadWithCameraOpen={scannerSupported}
                                    validateStatus={
                                        sendTokenAddressError ? 'error' : ''
                                    }
                                    help={
                                        sendTokenAddressError
                                            ? sendTokenAddressError
                                            : ''
                                    }
                                    onScan={result =>
                                        handleTokenAddressChange({
                                            target: {
                                                name: 'address',
                                                value: result,
                                            },
                                        })
                                    }
                                    inputProps={{
                                        placeholder: `${currency.tokenTicker} Address`,
                                        name: 'address',
                                        onChange: e =>
                                            handleTokenAddressChange(e),
                                        required: true,
                                        value: formData.address,
                                    }}
                                />
                                <DestinationAmount
                                    validateStatus={
                                        sendTokenAmountError ? 'error' : ''
                                    }
                                    help={
                                        sendTokenAmountError
                                            ? sendTokenAmountError
                                            : ''
                                    }
                                    onMax={onMax}
                                    inputProps={{
                                        name: 'value',
                                        step: 1 / 10 ** token.info.decimals,
                                        placeholder: 'Amount',
                                        prefix:
                                            currency.tokenIconsUrl !== '' ? (
                                                <Img
                                                    src={`${currency.tokenIconsUrl}/32/${tokenId}.png`}
                                                    width={16}
                                                    height={16}
                                                    unloader={
                                                        <img
                                                            alt={`identicon of tokenId ${tokenId} `}
                                                            heigh="16"
                                                            width="16"
                                                            style={{
                                                                borderRadius:
                                                                    '50%',
                                                            }}
                                                            key={`identicon-${tokenId}`}
                                                            src={makeBlockie(
                                                                tokenId,
                                                            )}
                                                        />
                                                    }
                                                />
                                            ) : (
                                                <img
                                                    alt={`identicon of tokenId ${tokenId} `}
                                                    heigh="16"
                                                    width="16"
                                                    style={{
                                                        borderRadius: '50%',
                                                    }}
                                                    key={`identicon-${tokenId}`}
                                                    src={makeBlockie(tokenId)}
                                                />
                                            ),
                                        suffix: token.info.tokenTicker,
                                        onChange: e => handleSlpAmountChange(e),
                                        required: true,
                                        value: formData.value,
                                    }}
                                />
                                <div
                                    style={{
                                        paddingTop: '12px',
                                    }}
                                >
                                    {apiError ||
                                    sendTokenAmountError ||
                                    sendTokenAddressError ? (
                                        <>
                                            <SecondaryButton>
                                                Send {token.info.tokenName}
                                            </SecondaryButton>
                                        </>
                                    ) : (
                                        <PrimaryButton
                                            onClick={() =>
                                                checkForConfirmationBeforeSendEtoken()
                                            }
                                        >
                                            Send {token.info.tokenName}
                                        </PrimaryButton>
                                    )}
                                </div>

                                {queryStringText && (
                                    <Alert
                                        message={`You are sending a transaction to an address including query parameters "${queryStringText}." Token transactions do not support query parameters and they will be ignored.`}
                                        type="warning"
                                    />
                                )}
                                {apiError && <ApiError />}
                            </Form>
                            {tokenStats !== null && (
                                <AntdDescriptionsWrapper>
                                    <Descriptions
                                        column={1}
                                        bordered
                                        title={`Token info for "${token.info.tokenName}"`}
                                    >
                                        <Descriptions.Item label="Icon">
                                            <TokenIcon
                                                size={64}
                                                tokenId={tokenId}
                                            />
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Decimals">
                                            {token.info.decimals}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Token ID">
                                            {token.tokenId}
                                            <br />
                                            <AirdropButton>
                                                <Link
                                                    to={{
                                                        pathname: `/airdrop`,
                                                        state: {
                                                            airdropEtokenId:
                                                                token.tokenId,
                                                        },
                                                    }}
                                                >
                                                    Airdrop XEC to holders
                                                </Link>
                                            </AirdropButton>
                                        </Descriptions.Item>
                                        {tokenStats && (
                                            <>
                                                <Descriptions.Item label="Document URI">
                                                    {tokenStats.documentUri}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Genesis Date">
                                                    {tokenStats.timestampUnix !==
                                                    null
                                                        ? formatDate(
                                                              tokenStats.timestampUnix,
                                                              navigator.language,
                                                          )
                                                        : 'Just now (Genesis tx confirming)'}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Fixed Supply?">
                                                    {tokenStats.containsBaton
                                                        ? 'No'
                                                        : 'Yes'}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Initial Quantity">
                                                    {tokenStats.initialTokenQty.toLocaleString()}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Total Burned">
                                                    {tokenStats.totalBurned.toLocaleString()}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Total Minted">
                                                    {tokenStats.totalMinted.toLocaleString()}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Circulating Supply">
                                                    {tokenStats.circulatingSupply.toLocaleString()}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Burn eToken">
                                                    <DestinationAmount
                                                        validateStatus={
                                                            burnTokenAmountError
                                                                ? 'error'
                                                                : ''
                                                        }
                                                        help={
                                                            burnTokenAmountError
                                                                ? burnTokenAmountError
                                                                : ''
                                                        }
                                                        onMax={onMaxBurn}
                                                        inputProps={{
                                                            placeholder:
                                                                'Amount',
                                                            suffix: token.info
                                                                .tokenTicker,
                                                            onChange: e =>
                                                                handleEtokenBurnAmountChange(
                                                                    e,
                                                                ),
                                                            initialvalue: 1,
                                                            value: eTokenBurnAmount,
                                                            prefix: (
                                                                <TokenIcon
                                                                    size={32}
                                                                    tokenId={
                                                                        tokenId
                                                                    }
                                                                />
                                                            ),
                                                        }}
                                                    />
                                                    <Button
                                                        type="primary"
                                                        onClick={
                                                            handleBurnAmountInput
                                                        }
                                                        danger
                                                    >
                                                        Burn&nbsp;
                                                        {token.info.tokenTicker}
                                                    </Button>
                                                </Descriptions.Item>
                                            </>
                                        )}
                                    </Descriptions>
                                </AntdDescriptionsWrapper>
                            )}
                        </Col>
                    </Row>
                </SidePaddingCtn>
            )}
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in SendToken.test.js
status => {console.log(status)} is an arbitrary stub function
*/

SendToken.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

SendToken.propTypes = {
    tokenId: PropTypes.string,
    jestBCH: PropTypes.object,
    passLoadingStatus: PropTypes.func,
};

export default SendToken;
