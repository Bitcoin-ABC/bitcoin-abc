import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { WalletContext } from '@utils/context';
import { Form, message, Row, Col, Alert, Descriptions, Popover } from 'antd';
import TokenIconAlert from '@components/Common/Alerts.js';
import PrimaryButton, {
    SecondaryButton,
} from '@components/Common/PrimaryButton';
import {
    DestinationAmount,
    DestinationAddressSingle,
} from '@components/Common/EnhancedInputs';
import useBCH from '@hooks/useBCH';
import BalanceHeader from '@components/Common/BalanceHeader';
import { Redirect } from 'react-router-dom';
import useWindowDimensions from '@hooks/useWindowDimensions';
import { isMobile, isIOS, isSafari } from 'react-device-detect';
import { Img } from 'react-image';
import makeBlockie from 'ethereum-blockies-base64';
import BigNumber from 'bignumber.js';
import { currency, parseAddressForParams } from '@components/Common/Ticker.js';
import { Event } from '@utils/GoogleAnalytics';
import { getWalletState, toLegacyToken } from '@utils/cashMethods';
import ApiError from '@components/Common/ApiError';
import {
    sendTokenNotification,
    errorNotification,
} from '@components/Common/Notifications';
import { isValidXecAddress, isValidEtokenAddress } from '@utils/validation';
import { formatDate } from '@utils/formatting';
import styled, { css } from 'styled-components';

const AntdDescriptionsCss = css`
    .ant-descriptions-item-label,
    .ant-descriptions-item-content {
        background-color: ${props =>
            props.theme.tokenListItem.background} !important;
        color: ${props => props.theme.tokenListItem.color};
    }
`;
const AntdDescriptionsWrapper = styled.div`
    ${AntdDescriptionsCss}
`;

const SendToken = ({ tokenId, jestBCH, passLoadingStatus }) => {
    const { wallet, apiError } = React.useContext(WalletContext);
    const walletState = getWalletState(wallet);
    const { tokens, slpBalancesAndUtxos } = walletState;
    const token = tokens.find(token => token.tokenId === tokenId);

    const [tokenStats, setTokenStats] = useState(null);
    const [queryStringText, setQueryStringText] = useState(null);
    const [sendTokenAddressError, setSendTokenAddressError] = useState(false);
    const [sendTokenAmountError, setSendTokenAmountError] = useState(false);
    // Get device window width
    // If this is less than 769, the page will open with QR scanner open
    const { width } = useWindowDimensions();
    // Load with QR code open if device is mobile and NOT iOS + anything but safari
    const scannerSupported = width < 769 && isMobile && !(isIOS && !isSafari);

    const [formData, setFormData] = useState({
        value: '',
        address: '',
    });

    const { getBCH, getRestUrl, sendToken, getTokenStats } = useBCH();

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

    useEffect(() => {
        // If the balance has changed, unlock the UI
        // This is redundant, if backend has refreshed in 1.75s timeout below, UI will already be unlocked

        passLoadingStatus(false);
    }, [token]);

    return (
        <>
            {!token && <Redirect to="/" />}
            {token && (
                <>
                    <BalanceHeader
                        balance={token.balance}
                        ticker={token.info.tokenTicker}
                    />
                    <TokenIconAlert />
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
                                        <PrimaryButton onClick={() => submit()}>
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
                                            {currency.tokenIconsUrl !== '' ? (
                                                <Popover
                                                    style={{ width: 256 }}
                                                    content={
                                                        <Img
                                                            src={`${currency.tokenIconsUrl}/256/${tokenId}.png`}
                                                        />
                                                    }
                                                    trigger="click"
                                                    color="transparent"
                                                >
                                                    <Img
                                                        src={`${currency.tokenIconsUrl}/32/${tokenId}.png`}
                                                        width={32}
                                                        height={32}
                                                        unloader={
                                                            <img
                                                                alt={`identicon of tokenId ${tokenId} `}
                                                                height="32"
                                                                width="32"
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
                                                </Popover>
                                            ) : (
                                                <img
                                                    alt={`identicon of tokenId ${tokenId} `}
                                                    height="32"
                                                    width="32"
                                                    style={{
                                                        borderRadius: '50%',
                                                    }}
                                                    key={`identicon-${tokenId}`}
                                                    src={makeBlockie(tokenId)}
                                                />
                                            )}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Decimals">
                                            {token.info.decimals}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Token ID">
                                            {token.tokenId}
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
                                            </>
                                        )}
                                    </Descriptions>
                                </AntdDescriptionsWrapper>
                            )}
                        </Col>
                    </Row>
                </>
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
