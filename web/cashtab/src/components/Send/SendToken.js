import React, { useState, useEffect } from 'react';
import { WalletContext } from '@utils/context';
import {
    Form,
    notification,
    message,
    Spin,
    Row,
    Col,
    Alert,
    Descriptions,
} from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import PrimaryButton, {
    SecondaryButton,
} from '@components/Common/PrimaryButton';
import { CashLoader, CashLoadingIcon } from '@components/Common/CustomIcons';
import {
    FormItemWithMaxAddon,
    FormItemWithQRCodeAddon,
} from '@components/Common/EnhancedInputs';
import useBCH from '@hooks/useBCH';
import { BalanceHeader } from '@components/Common/Atoms';
import { Redirect } from 'react-router-dom';
import useWindowDimensions from '@hooks/useWindowDimensions';
import { isMobile, isIOS, isSafari } from 'react-device-detect';
import { Img } from 'react-image';
import makeBlockie from 'ethereum-blockies-base64';
import BigNumber from 'bignumber.js';
import {
    currency,
    parseAddress,
    isValidTokenPrefix,
} from '@components/Common/Ticker.js';
import { Event } from '@utils/GoogleAnalytics';
import { formatBalance, isValidStoredWallet } from '@utils/cashMethods';

const SendToken = ({ tokenId, jestBCH }) => {
    const { wallet, tokens, slpBalancesAndUtxos, apiError } = React.useContext(
        WalletContext,
    );
    // If this wallet has migrated to latest storage structure, get token info from there
    // If not, use the tokens object (unless it's undefined, in which case use an empty array)
    const liveTokenState =
        isValidStoredWallet(wallet) && wallet.state.tokens
            ? wallet.state.tokens
            : tokens
            ? tokens
            : [];
    const token = liveTokenState.find(token => token.tokenId === tokenId);

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
        dirty: true,
        value: '',
        address: '',
    });
    const [loading, setLoading] = useState(false);

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

    async function submit() {
        setFormData({
            ...formData,
            dirty: false,
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

        setLoading(true);
        const { address, value } = formData;

        // Clear params from address
        let cleanAddress = address.split('?')[0];

        try {
            const link = await sendToken(BCH, wallet, slpBalancesAndUtxos, {
                tokenId: tokenId,
                tokenReceiverAddress: cleanAddress,
                amount: value,
            });

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
            } else {
                message = e.message || e.error || JSON.stringify(e);
            }
            console.log(e);
            notification.error({
                message: 'Error',
                description: message,
                duration: 3,
            });
            console.error(e);
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
        // parse address
        const addressInfo = parseAddress(BCH, addressString);
        /*
        Model

        addressInfo = 
        {
            address: '',
            isValid: false,
            queryString: '',
            amount: null,
        };
        */

        const { address, isValid, queryString } = addressInfo;

        // If query string,
        // Show an alert that only amount and currency.ticker are supported
        setQueryStringText(queryString);

        // Is this valid address?
        if (!isValid) {
            error = 'Address is not valid';
            // If valid address but token format
        } else if (!isValidTokenPrefix(address)) {
            error = `Cashtab only supports sending to ${currency.tokenPrefixes[0]} prefixed addresses`;
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

        setLoading(false);
    }, [token]);

    return (
        <>
            {!token && <Redirect to="/" />}

            {token && (
                <>
                    <BalanceHeader>
                        {formatBalance(token.balance)} {token.info.tokenTicker}
                    </BalanceHeader>

                    <Row type="flex">
                        <Col span={24}>
                            <Spin
                                style={{
                                    color: 'red',
                                }}
                                spinning={loading}
                                indicator={CashLoadingIcon}
                            >
                                <Form
                                    style={{
                                        width: 'auto',
                                    }}
                                >
                                    <FormItemWithQRCodeAddon
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
                                    <FormItemWithMaxAddon
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
                                                currency.tokenIconsUrl !==
                                                '' ? (
                                                    <Img
                                                        src={`${currency.tokenIconsUrl}/${tokenId}.png`}
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
                                                        src={makeBlockie(
                                                            tokenId,
                                                        )}
                                                    />
                                                ),
                                            suffix: token.info.tokenTicker,
                                            onChange: e =>
                                                handleSlpAmountChange(e),
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
                                                {apiError && <CashLoader />}
                                            </>
                                        ) : (
                                            <PrimaryButton
                                                onClick={() => submit()}
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
                                    {apiError && (
                                        <p
                                            style={{
                                                color: 'red',
                                            }}
                                        >
                                            <b>
                                                An error occured on our end.
                                                Reconnecting...
                                            </b>
                                        </p>
                                    )}
                                </Form>
                                {tokenStats !== null && (
                                    <Descriptions
                                        column={1}
                                        bordered
                                        title={`Token info for "${token.info.tokenName}"`}
                                    >
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
                                                    {new Date(
                                                        tokenStats.timestampUnix *
                                                            1000,
                                                    ).toLocaleDateString()}
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
                                )}
                            </Spin>
                        </Col>
                    </Row>
                </>
            )}
        </>
    );
};

export default SendToken;
