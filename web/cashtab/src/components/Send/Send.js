import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WalletContext } from '@utils/context';
import { Form, notification, message, Spin, Modal } from 'antd';
import { CashLoader, CashLoadingIcon } from '@components/Common/CustomIcons';
import { Row, Col } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import PrimaryButton, {
    SecondaryButton,
} from '@components/Common/PrimaryButton';
import {
    SendBchInput,
    FormItemWithQRCodeAddon,
} from '@components/Common/EnhancedInputs';
import useBCH from '@hooks/useBCH';
import useWindowDimensions from '@hooks/useWindowDimensions';
import { isMobile, isIOS, isSafari } from 'react-device-detect';
import { currency } from '@components/Common/Ticker.js';
import { Event } from '@utils/GoogleAnalytics';
export const BalanceHeader = styled.div`
    p {
        color: #777;
        width: 100%;
        font-size: 14px;
        margin-bottom: 0px;
    }

    h3 {
        color: #444;
        width: 100%;
        font-size: 26px;
        font-weight: bold;
        margin-bottom: 0px;
    }
`;

export const BalanceHeaderFiat = styled.div`
    color: #444;
    width: 100%;
    font-size: 18px;
    margin-bottom: 20px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 16px;
    }
`;

export const ZeroBalanceHeader = styled.div`
    color: #444;
    width: 100%;
    font-size: 14px;
    margin-bottom: 20px;
`;

const ConvertAmount = styled.div`
    color: #777;
    width: 100%;
    font-size: 14px;
    margin-bottom: 10px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 12px;
    }
`;

const SendBCH = ({ filledAddress, callbackTxId }) => {
    const {
        wallet,
        fiatPrice,
        balances,
        slpBalancesAndUtxos,
        apiError,
    } = React.useContext(WalletContext);

    // Get device window width
    // If this is less than 769, the page will open with QR scanner open
    const { width } = useWindowDimensions();
    // Load with QR code open if device is mobile and NOT iOS + anything but safari
    const scannerSupported = width < 769 && isMobile && !(isIOS && !isSafari);

    const [formData, setFormData] = useState({
        dirty: true,
        value: '',
        address: filledAddress || '',
    });
    const [loading, setLoading] = useState(false);
    const [sendBchAmountError, setSendBchAmountError] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(currency.ticker);

    // Support cashtab button from web pages
    const [txInfoFromUrl, setTxInfoFromUrl] = useState(false);

    // Show a confirmation modal on transactions created by populating form from web page button
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleOk = () => {
        setIsModalVisible(false);
        submit();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const { getBCH, getRestUrl, sendBch, calcFee } = useBCH();
    const BCH = getBCH();

    // If the balance has changed, unlock the UI
    // This is redundant, if backend has refreshed in 1.75s timeout below, UI will already be unlocked
    useEffect(() => {
        setLoading(false);
    }, [balances.totalBalance]);

    useEffect(() => {
        // Manually parse for txInfo object on page load when Send.js is loaded with a query string

        // Do not set txInfo in state if query strings are not present
        if (
            !window.location ||
            !window.location.hash ||
            window.location.hash === '#/send'
        ) {
            console.log(`No tx info in URL`);
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
            setFormData({ address: txInfo.address, value: txInfo.value });
        }
    }

    async function submit() {
        setFormData({
            ...formData,
            dirty: false,
        });

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

        setLoading(true);
        const { address, value } = formData;

        // Calculate the amount in BCH
        let bchValue = value;

        if (selectedCurrency === 'USD') {
            bchValue = (value / fiatPrice).toFixed(8);
        }

        try {
            const link = await sendBch(
                BCH,
                wallet,
                slpBalancesAndUtxos.nonSlpUtxos,
                {
                    addresses: [filledAddress || address],
                    values: [bchValue],
                },
                callbackTxId,
            );

            notification.success({
                message: 'Success',
                description: (
                    <a href={link} target="_blank" rel="noopener noreferrer">
                        <Paragraph>
                            Transaction successful. Click or tap here for more
                            details
                        </Paragraph>
                    </a>
                ),
                duration: 5,
            });
        } catch (e) {
            // Set loading to false here as well, as balance may not change depending on where error occured in try loop
            setLoading(false);
            let message;

            if (!e.error && !e.message) {
                message = `Transaction failed: no response from ${getRestUrl()}.`;
            } else if (
                /Could not communicate with full node or other external service/.test(
                    e.error,
                )
            ) {
                message = 'Could not communicate with API. Please try again.';
            } else if (
                e.error &&
                e.error.includes(
                    'too-long-mempool-chain, too many unconfirmed ancestors [limit: 50] (code 64)',
                )
            ) {
                message = `The ${currency.ticker} you are trying to send has too many unconfirmed ancestors to send (limit 50). Sending will be possible after a block confirmation. Try again in about 10 minutes.`;
            } else {
                message = e.message || e.error || JSON.stringify(e);
            }

            notification.error({
                message: 'Error',
                description: message,
                duration: 5,
            });
            console.error(e);
        }
    }

    const handleChange = e => {
        const { value, name } = e.target;

        setFormData(p => ({ ...p, [name]: value }));
    };

    const handleSelectedCurrencyChange = e => {
        setSelectedCurrency(e);
        // Clear input field to prevent accidentally sending 1 BCH instead of 1 USD
        setFormData(p => ({ ...p, value: '' }));
    };

    const handleBchAmountChange = e => {
        const { value, name } = e.target;
        let error = false;
        let bchValue = value;

        if (selectedCurrency === 'USD') {
            bchValue = (value / fiatPrice).toFixed(8);
        }

        // Validate value for > 0
        if (isNaN(bchValue)) {
            error = 'Amount must be a number';
        } else if (bchValue <= 0) {
            error = 'Amount must be greater than 0';
        } else if (bchValue < 0.00001) {
            error = `Send amount must be at least 0.00001 ${currency.ticker}`;
        } else if (bchValue > balances.totalBalance) {
            error = `Amount cannot exceed your ${currency.ticker} balance`;
        } else if (!isNaN(bchValue) && bchValue.toString().includes('.')) {
            if (bchValue.toString().split('.')[1].length > 8) {
                error = `${currency.ticker} transactions do not support more than 8 decimal places`;
            }
        }
        setSendBchAmountError(error);

        setFormData(p => ({ ...p, [name]: value }));
    };

    const onMax = async () => {
        // Clear amt error
        setSendBchAmountError(false);
        // Set currency to BCH
        setSelectedCurrency(currency.ticker);
        try {
            const txFeeSats = calcFee(BCH, slpBalancesAndUtxos.nonSlpUtxos);

            const txFeeBch = txFeeSats / 1e8;
            let value =
                balances.totalBalance - txFeeBch >= 0
                    ? (balances.totalBalance - txFeeBch).toFixed(8)
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
            fiatPriceString = `$ ${(fiatPrice * Number(formData.value)).toFixed(
                2,
            )} USD`;
        } else {
            fiatPriceString = `${(Number(formData.value) / fiatPrice).toFixed(
                8,
            )} ${currency.ticker}`;
        }
    }

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
                    <BalanceHeader>
                        <p>Available balance</p>
                        <h3>
                            {balances.totalBalance} {currency.ticker}
                        </h3>
                    </BalanceHeader>
                    {fiatPrice !== null && (
                        <BalanceHeaderFiat>
                            ${(balances.totalBalance * fiatPrice).toFixed(2)}{' '}
                            USD
                        </BalanceHeaderFiat>
                    )}
                </>
            )}

            <Row type="flex">
                <Col span={24}>
                    <Spin spinning={loading} indicator={CashLoadingIcon}>
                        <Form style={{ width: 'auto' }}>
                            <FormItemWithQRCodeAddon
                                loadWithCameraOpen={scannerSupported}
                                disabled={Boolean(filledAddress)}
                                validateStatus={
                                    !formData.dirty && !formData.address
                                        ? 'error'
                                        : ''
                                }
                                help={
                                    !formData.dirty && !formData.address
                                        ? `Should be a valid ${currency.ticker} address`
                                        : ''
                                }
                                onScan={result =>
                                    setFormData({
                                        ...formData,
                                        address: result,
                                    })
                                }
                                inputProps={{
                                    disabled: Boolean(filledAddress),
                                    placeholder: `${currency.ticker} Address`,
                                    name: 'address',
                                    onChange: e => handleChange(e),
                                    required: true,
                                    value: filledAddress || formData.address,
                                }}
                            ></FormItemWithQRCodeAddon>
                            <SendBchInput
                                validateStatus={
                                    sendBchAmountError ? 'error' : ''
                                }
                                help={
                                    sendBchAmountError ? sendBchAmountError : ''
                                }
                                onMax={onMax}
                                inputProps={{
                                    name: 'value',
                                    dollar: selectedCurrency === 'USD' ? 1 : 0,
                                    placeholder: 'Amount',
                                    onChange: e => handleBchAmountChange(e),
                                    required: true,
                                    value: formData.value,
                                }}
                                selectProps={{
                                    value: selectedCurrency,
                                    onChange: e =>
                                        handleSelectedCurrencyChange(e),
                                }}
                            ></SendBchInput>
                            <ConvertAmount>= {fiatPriceString}</ConvertAmount>
                            <div style={{ paddingTop: '12px' }}>
                                {!balances.totalBalance ||
                                apiError ||
                                sendBchAmountError ? (
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
                                                onClick={() => submit()}
                                            >
                                                Send
                                            </PrimaryButton>
                                        )}
                                    </>
                                )}
                            </div>
                            {apiError && (
                                <>
                                    <CashLoader />
                                    <p style={{ color: 'red' }}>
                                        <b>
                                            An error occured on our end.
                                            Reconnecting...
                                        </b>
                                    </p>
                                </>
                            )}
                        </Form>
                    </Spin>
                </Col>
            </Row>
        </>
    );
};

export default SendBCH;
