import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { WalletContext } from 'utils/context';
import {
    Form,
    message,
    Row,
    Col,
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
import { SidePaddingCtn, TxLink } from 'components/Common/Atoms';
import BalanceHeaderToken from 'components/Common/BalanceHeaderToken';
import { useNavigate } from 'react-router-dom';
import usePrevious from 'hooks/usePrevious';
import { Img } from 'react-image';
import makeBlockie from 'ethereum-blockies-base64';
import { BN } from 'slp-mdm';
import { Event } from 'utils/GoogleAnalytics';
import { getWalletState } from 'utils/cashMethods';
import ApiError from 'components/Common/ApiError';
import { isValidEtokenBurnAmount, parseAddressInput } from 'validation';
import { getTokenStats } from 'chronik';
import { formatDate } from 'utils/formatting';
import styled, { css } from 'styled-components';
import TokenIcon from 'components/Etokens/TokenIcon';
import { token as tokenConfig } from 'config/token';
import { explorer } from 'config/explorer';
import { queryAliasServer } from 'utils/aliasUtils';
import aliasSettings from 'config/alias';
import cashaddr from 'ecashaddrjs';
import { notification } from 'antd';
import { TokenNotificationIcon } from 'components/Common/CustomIcons';
import appConfig from 'config/app';
import { isMobile } from 'helpers';
import {
    getSendTokenInputs,
    getSlpSendTargetOutputs,
    getSlpBurnTargetOutputs,
} from 'slpv1';
import { sendXec } from 'transactions';

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
const AliasAddressPreviewLabel = styled.div`
    text-align: center;
    color: ${props => props.theme.forms.text};
    padding-left: 1px;
    white-space: nowrap;
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

const SendToken = ({ passLoadingStatus }) => {
    let navigate = useNavigate();
    const { wallet, apiError, cashtabState, chronik, chaintipBlockheight } =
        React.useContext(WalletContext);
    // Ensure cashtabState is not undefined before context initializes
    const { settings } =
        typeof cashtabState === 'undefined'
            ? appConfig.defaultCashtabState
            : cashtabState;
    const walletState = getWalletState(wallet);
    const { tokens } = walletState;

    const params = useParams();
    const tokenId = params.tokenId;

    const token = tokens.find(token => token.tokenId === tokenId);
    const previousWalletState = usePrevious(walletState);

    const [tokenStats, setTokenStats] = useState(null);
    const [sendTokenAddressError, setSendTokenAddressError] = useState(false);
    const [sendTokenAmountError, setSendTokenAmountError] = useState(false);
    const [eTokenBurnAmount, setETokenBurnAmount] = useState(new BN(1));
    const [showConfirmBurnEtoken, setShowConfirmBurnEtoken] = useState(false);
    const [burnTokenAmountError, setBurnTokenAmountError] = useState(false);
    const [burnConfirmationValid, setBurnConfirmationValid] = useState(null);
    const [confirmationOfEtokenToBeBurnt, setConfirmationOfEtokenToBeBurnt] =
        useState('');
    const [aliasInputAddress, setAliasInputAddress] = useState(false);

    // Load with QR code open if device is mobile
    const openWithScanner =
        settings && settings.autoCameraOn === true && isMobile(navigator);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [formData, setFormData] = useState({
        value: '',
        address: '',
    });

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
            value: '',
            address: '',
        });
        setAliasInputAddress(false); // clear alias address preview
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

        // Track number of SLPA send transactions and
        // SLPA token IDs
        Event('SendToken.js', 'Send', tokenId);

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

        try {
            // Get input utxos for slpv1 send tx
            const tokenInputInfo = getSendTokenInputs(
                wallet.state.slpUtxos,
                tokenId,
                value,
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
                appConfig.defaultFee,
                chaintipBlockheight,
                tokenInputInfo.tokenInputs,
            );

            notification.success({
                message: 'Success',
                description: (
                    <a
                        href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Transaction successful. Click to view in block explorer.
                    </a>
                ),
                duration: appConfig.notificationDurationShort,
                icon: <TokenNotificationIcon />,
            });
            clearInputForms();
        } catch (e) {
            console.log(`Error sending token`, e);
            passLoadingStatus(false);
            notification.error({
                message: 'Sending eToken',
                description: `${e}`,
                duration: appConfig.notificationDurationLong,
            });
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

        const parsedAddressInput = parseAddressInput(value);
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
        if (settings.sendModal) {
            setIsModalVisible(settings.sendModal);
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
        const burnAmount = new BN(value);
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

        Event('SendToken.js', 'Burn eToken', tokenId);

        passLoadingStatus(true);

        try {
            // Get input utxos for slpv1 burn tx
            // This is done the same way as for an slpv1 send tx
            const tokenInputInfo = getSendTokenInputs(
                wallet.state.slpUtxos,
                tokenId,
                eTokenBurnAmount,
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
                appConfig.defaultFee,
                chaintipBlockheight,
                tokenInputInfo.tokenInputs,
                true, // skip SLP burn checks
            );

            notification.success({
                message: 'Success',
                description: (
                    <a
                        href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        eToken burn successful. Click to view in block explorer.
                    </a>
                ),
                duration: appConfig.notificationDurationLong,
                icon: <TokenNotificationIcon />,
            });
            clearInputForms();
            setShowConfirmBurnEtoken(false);
            setConfirmationOfEtokenToBeBurnt('');
        } catch (e) {
            setShowConfirmBurnEtoken(false);
            passLoadingStatus(false);
            setConfirmationOfEtokenToBeBurnt('');
            notification.error({
                message: 'Burning eToken',
                description: `${e}`,
                duration: appConfig.notificationDurationLong,
            });
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
        // Unlock UI after user sends an eToken tx to their own wallet
        if (
            walletState &&
            walletState.balances &&
            walletState.balances.totalBalanceInSatoshis &&
            previousWalletState &&
            previousWalletState.balances &&
            previousWalletState.balances.totalBalanceInSatoshis &&
            walletState.balances.totalBalanceInSatoshis !==
                previousWalletState.balances.totalBalanceInSatoshis
        ) {
            passLoadingStatus(false);
        }
    }, [walletState]);

    return (
        <>
            <Modal
                title="Confirm Send"
                open={isModalVisible}
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
            {!token && navigate('/')}
            {token && (
                <SidePaddingCtn>
                    {/* eToken burn modal */}
                    <Modal
                        title={`Are you sure you want to burn ${eTokenBurnAmount.toString()} x ${
                            token.info.tokenTicker
                        } eTokens?`}
                        open={showConfirmBurnEtoken}
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
                    <BalanceHeaderToken
                        balance={new BN(token.balance)}
                        ticker={token.info.tokenTicker}
                        tokenDecimals={token.info.decimals}
                    />
                    <Row type="flex">
                        <Col span={24}>
                            <Form
                                style={{
                                    width: 'auto',
                                }}
                            >
                                <DestinationAddressSingle
                                    loadWithCameraOpen={openWithScanner}
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
                                        placeholder: aliasSettings.aliasEnabled
                                            ? `Address or Alias`
                                            : `Address`,
                                        name: 'address',
                                        onChange: e =>
                                            handleTokenAddressChange(e),
                                        required: true,
                                        value: formData.address,
                                    }}
                                    style={{ marginBottom: '0px' }}
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
                                            )}...${aliasInputAddress.slice(
                                                -5,
                                            )}`}
                                    </TxLink>
                                </AliasAddressPreviewLabel>
                                <br />
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
                                            tokenConfig.tokenIconsUrl !== '' ? (
                                                <Img
                                                    src={`${tokenConfig.tokenIconsUrl}/32/${tokenId}.png`}
                                                    width={16}
                                                    height={16}
                                                    unloader={
                                                        <img
                                                            alt={`identicon of tokenId ${tokenId} `}
                                                            height="16"
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
                                                    height="16"
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
                                                    to="/airdrop"
                                                    state={{
                                                        airdropEtokenId:
                                                            token.tokenId,
                                                    }}
                                                >
                                                    Airdrop XEC to holders
                                                </Link>
                                            </AirdropButton>
                                        </Descriptions.Item>
                                        {tokenStats && (
                                            <>
                                                <Descriptions.Item label="Document URI">
                                                    {
                                                        tokenStats.slpTxData
                                                            .genesisInfo
                                                            .tokenDocumentUrl
                                                    }
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Genesis Date">
                                                    {tokenStats.block &&
                                                    tokenStats.block
                                                        .timestamp !== null
                                                        ? formatDate(
                                                              tokenStats.block
                                                                  .timestamp,
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
                                                    {new BN(
                                                        tokenStats.initialTokenQuantity,
                                                    )
                                                        .toFormat(
                                                            token.info.decimals,
                                                        )
                                                        .toLocaleString()}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Total Burned">
                                                    {new BN(
                                                        tokenStats.tokenStats.totalBurned,
                                                    )
                                                        .toFormat(
                                                            token.info.decimals,
                                                        )
                                                        .toLocaleString()}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Total Minted">
                                                    {new BN(
                                                        tokenStats.tokenStats.totalMinted,
                                                    )
                                                        .toFormat(
                                                            token.info.decimals,
                                                        )
                                                        .toLocaleString()}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Circulating Supply">
                                                    {new BN(
                                                        tokenStats.circulatingSupply,
                                                    )
                                                        .toFormat(
                                                            token.info.decimals,
                                                        )
                                                        .toLocaleString()}
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
                                                                'Burn Amount',
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
    passLoadingStatus: PropTypes.func,
};

export default SendToken;
