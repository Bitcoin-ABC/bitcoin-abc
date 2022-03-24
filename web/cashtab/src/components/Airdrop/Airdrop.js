import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import BigNumber from 'bignumber.js';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import { AntdFormWrapper } from 'components/Common/EnhancedInputs';
import { AdvancedCollapse } from 'components/Common/StyledCollapse';
import { Form, Alert, Collapse, Input, Modal, Spin, Progress } from 'antd';
const { Panel } = Collapse;
const { TextArea } = Input;
import { Row, Col, Switch } from 'antd';
import { SmartButton } from 'components/Common/PrimaryButton';
import useBCH from 'hooks/useBCH';
import {
    errorNotification,
    generalNotification,
} from 'components/Common/Notifications';
import { currency } from 'components/Common/Ticker.js';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import {
    getWalletState,
    convertEtokenToEcashAddr,
    fromSmallestDenomination,
    convertToEcashPrefix,
} from 'utils/cashMethods';
import {
    isValidTokenId,
    isValidXecAirdrop,
    isValidAirdropOutputsArray,
} from 'utils/validation';
import { CustomSpinner } from 'components/Common/CustomIcons';
import * as etokenList from 'etoken-list';
import {
    ZeroBalanceHeader,
    SidePaddingCtn,
    WalletInfoCtn,
} from 'components/Common/Atoms';
import WalletLabel from 'components/Common/WalletLabel.js';
import { Link } from 'react-router-dom';

const AirdropActions = styled.div`
    text-align: center;
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    a {
        color: ${props => props.theme.contrast};
        margin: 0;
        font-size: 11px;
        border: 1px solid ${props => props.theme.contrast};
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

const StyledPanel = styled(Panel)`
    .ant-alert-message {
        color: ${props => props.theme.lightGrey};
    }
    .ant-form-item {
        color: ${props => props.theme.lightWhite};
    }
`;

const AirdropOptions = styled.div`
    text-align: left;
    color: ${props => props.theme.contrast};
`;

// Note jestBCH is only used for unit tests; BCHJS must be mocked for jest
const Airdrop = ({ jestBCH, passLoadingStatus }) => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, fiatPrice, cashtabSettings } = ContextValue;
    const location = useLocation();
    const walletState = getWalletState(wallet);
    const { balances } = walletState;

    const [bchObj, setBchObj] = useState(false);
    const [isAirdropCalcModalVisible, setIsAirdropCalcModalVisible] =
        useState(false);
    const [airdropCalcModalProgress, setAirdropCalcModalProgress] = useState(0); // the dynamic % progress bar

    useEffect(() => {
        // jestBCH is only ever specified for unit tests, otherwise app will use getBCH();
        const BCH = jestBCH ? jestBCH : getBCH();

        // set the BCH instance to state, for other functions to reference
        setBchObj(BCH);

        if (location && location.state && location.state.airdropEtokenId) {
            setFormData({
                ...formData,
                tokenId: location.state.airdropEtokenId,
            });
            handleTokenIdInput({
                target: {
                    value: location.state.airdropEtokenId,
                },
            });
        }
    }, []);

    const [formData, setFormData] = useState({
        tokenId: '',
        totalAirdrop: '',
    });

    const [tokenIdIsValid, setTokenIdIsValid] = useState(null);
    const [totalAirdropIsValid, setTotalAirdropIsValid] = useState(null);
    const [airdropRecipients, setAirdropRecipients] = useState('');
    const [airdropOutputIsValid, setAirdropOutputIsValid] = useState(true);
    const [etokenHolders, setEtokenHolders] = useState(new BigNumber(0));
    const [showAirdropOutputs, setShowAirdropOutputs] = useState(false);
    const [ignoreOwnAddress, setIgnoreOwnAddress] = useState(false);

    const [ignoreRecipientsBelowDust, setIgnoreRecipientsBelowDust] =
        useState(false);

    const { getBCH } = useBCH();

    const handleTokenIdInput = e => {
        const { name, value } = e.target;
        setTokenIdIsValid(isValidTokenId(value));
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleTotalAirdropInput = e => {
        const { name, value } = e.target;
        setTotalAirdropIsValid(isValidXecAirdrop(value));
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const calculateXecAirdrop = async () => {
        // display airdrop calculation message modal
        setIsAirdropCalcModalVisible(true);
        setShowAirdropOutputs(false); // hide any previous airdrop outputs
        passLoadingStatus(true);
        setAirdropCalcModalProgress(25); // updated progress bar to 25%

        let latestBlock;
        try {
            latestBlock = await bchObj.Blockchain.getBlockCount();
        } catch (err) {
            errorNotification(
                err,
                'Error retrieving latest block height',
                'bchObj.Blockchain.getBlockCount() error',
            );
            setIsAirdropCalcModalVisible(false);
            passLoadingStatus(false);
            return;
        }

        setAirdropCalcModalProgress(50);

        etokenList.Config.SetUrl(currency.tokenDbUrl);

        let airdropList;
        try {
            airdropList = await etokenList.List.GetAddressListFor(
                formData.tokenId,
                latestBlock,
                true,
            );
        } catch (err) {
            errorNotification(
                err,
                'Error retrieving airdrop recipients',
                'etokenList.List.GetAddressListFor() error',
            );
            setIsAirdropCalcModalVisible(false);
            passLoadingStatus(false);
            return;
        }

        // if Ignore Own Address option is checked, then filter out from recipients list
        if (ignoreOwnAddress) {
            const ownEtokenAddress = convertToEcashPrefix(
                wallet.Path1899.slpAddress,
            );
            airdropList.delete(ownEtokenAddress);
        }

        if (!airdropList || airdropList.size === 0) {
            errorNotification(
                null,
                'No recipients found for tokenId ' + formData.tokenId,
                'Airdrop Calculation Error',
            );
            setIsAirdropCalcModalVisible(false);
            passLoadingStatus(false);
            return;
        }

        // if the ignore minimum payment threshold option is enabled
        if (ignoreRecipientsBelowDust) {
            // minimum airdrop threshold
            const minEligibleAirdrop = new BigNumber(
                fromSmallestDenomination(currency.dustSats),
            );

            // first calculation on expected pro rata airdrops
            let initialTotalTokenAmongstRecipients = new BigNumber(0);
            let initialTotalHolders = new BigNumber(airdropList.size); // amount of addresses that hold this eToken
            setEtokenHolders(initialTotalHolders);

            // keep a cumulative total of each eToken holding in each address in airdropList
            airdropList.forEach(
                index =>
                    (initialTotalTokenAmongstRecipients =
                        initialTotalTokenAmongstRecipients.plus(
                            new BigNumber(index),
                        )),
            );

            let initialCircToAirdropRatio = new BigNumber(
                formData.totalAirdrop,
            ).div(initialTotalTokenAmongstRecipients);

            // initial filtering of recipients with less than minimum payout amount
            for (let [key, value] of airdropList) {
                const proRataAirdrop = new BigNumber(value).multipliedBy(
                    initialCircToAirdropRatio,
                );
                if (proRataAirdrop.isLessThan(minEligibleAirdrop)) {
                    airdropList.delete(key);
                }
            }

            // if the list becomes empty after initial filtering
            if (!airdropList) {
                errorNotification(
                    null,
                    'No recipients after filtering minimum payouts',
                    'Airdrop Calculation Error',
                );
                setIsAirdropCalcModalVisible(false);
                passLoadingStatus(false);
                return;
            }
        }

        setAirdropCalcModalProgress(75);

        let totalTokenAmongstRecipients = new BigNumber(0);
        let totalHolders = new BigNumber(airdropList.size); // amount of addresses that hold this eToken
        setEtokenHolders(totalHolders);

        // keep a cumulative total of each eToken holding in each address in airdropList
        airdropList.forEach(
            index =>
                (totalTokenAmongstRecipients = totalTokenAmongstRecipients.plus(
                    new BigNumber(index),
                )),
        );

        let circToAirdropRatio = new BigNumber(formData.totalAirdrop).div(
            totalTokenAmongstRecipients,
        );

        let resultString = '';

        airdropList.forEach(
            (element, index) =>
                (resultString +=
                    convertEtokenToEcashAddr(index) +
                    ',' +
                    new BigNumber(element)
                        .multipliedBy(circToAirdropRatio)
                        .decimalPlaces(currency.cashDecimals) +
                    '\n'),
        );

        resultString = resultString.substring(0, resultString.length - 1); // remove the final newline

        setAirdropRecipients(resultString);

        setAirdropCalcModalProgress(100);

        if (!resultString) {
            errorNotification(
                null,
                'No holders found for eToken ID: ' + formData.tokenId,
                'Airdrop Calculation Error',
            );
            setIsAirdropCalcModalVisible(false);
            passLoadingStatus(false);
            return;
        }

        // validate the airdrop values for each recipient
        // Note: addresses are not validated as they are retrieved directly from onchain
        setAirdropOutputIsValid(isValidAirdropOutputsArray(resultString));
        setShowAirdropOutputs(true); // display the airdrop outputs TextArea
        setIsAirdropCalcModalVisible(false);
        passLoadingStatus(false);
    };

    const handleAirdropCalcModalCancel = () => {
        setIsAirdropCalcModalVisible(false);
        passLoadingStatus(false);
    };

    const handleIgnoreOwnAddress = e => {
        setIgnoreOwnAddress(e);
    };

    const handleIgnoreRecipientBelowDust = e => {
        setIgnoreRecipientsBelowDust(e);
    };

    let airdropCalcInputIsValid = tokenIdIsValid && totalAirdropIsValid;

    return (
        <>
            <WalletInfoCtn>
                <WalletLabel name={wallet.name}></WalletLabel>
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
            </WalletInfoCtn>
            <Modal
                title="Querying the eCash blockchain"
                visible={isAirdropCalcModalVisible}
                okButtonProps={{ style: { display: 'none' } }}
                onCancel={handleAirdropCalcModalCancel}
            >
                <Spin indicator={CustomSpinner} />
                <Progress percent={airdropCalcModalProgress} />
            </Modal>
            <br />
            <SidePaddingCtn>
                <Row type="flex">
                    <Col span={24}>
                        <AdvancedCollapse
                            style={{
                                marginBottom: '24px',
                            }}
                            defaultActiveKey={
                                location &&
                                location.state &&
                                location.state.airdropEtokenId
                                    ? ['1']
                                    : ['0']
                            }
                        >
                            <StyledPanel
                                header="XEC Airdrop Calculator"
                                key="1"
                            >
                                <Alert
                                    message={`Please ensure the qualifying eToken transactions to airdrop recipients have at least one confirmation. The airdrop calculator will not detect unconfirmed token balances.`}
                                    type="warning"
                                />
                                <br />
                                <AntdFormWrapper>
                                    <Form
                                        style={{
                                            width: 'auto',
                                        }}
                                    >
                                        <Form.Item
                                            validateStatus={
                                                tokenIdIsValid === null ||
                                                tokenIdIsValid
                                                    ? ''
                                                    : 'error'
                                            }
                                            help={
                                                tokenIdIsValid === null ||
                                                tokenIdIsValid
                                                    ? ''
                                                    : 'Invalid eToken ID'
                                            }
                                        >
                                            <Input
                                                addonBefore="eToken ID"
                                                placeholder="Enter the eToken ID"
                                                name="tokenId"
                                                value={formData.tokenId}
                                                onChange={e =>
                                                    handleTokenIdInput(e)
                                                }
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            validateStatus={
                                                totalAirdropIsValid === null ||
                                                totalAirdropIsValid
                                                    ? ''
                                                    : 'error'
                                            }
                                            help={
                                                totalAirdropIsValid === null ||
                                                totalAirdropIsValid
                                                    ? ''
                                                    : 'Invalid total XEC airdrop'
                                            }
                                        >
                                            <Input
                                                addonBefore="Total XEC airdrop"
                                                placeholder="Enter the total XEC airdrop"
                                                name="totalAirdrop"
                                                type="number"
                                                value={formData.totalAirdrop}
                                                onChange={e =>
                                                    handleTotalAirdropInput(e)
                                                }
                                            />
                                        </Form.Item>
                                        <Form.Item>
                                            <AirdropOptions>
                                                <Switch
                                                    onChange={() =>
                                                        handleIgnoreOwnAddress(
                                                            prev => !prev,
                                                        )
                                                    }
                                                    defaultunchecked="true"
                                                    checked={ignoreOwnAddress}
                                                />
                                                &ensp;Ignore my own address
                                            </AirdropOptions>
                                        </Form.Item>
                                        <Form.Item>
                                            <AirdropOptions>
                                                <Switch
                                                    onChange={() =>
                                                        handleIgnoreRecipientBelowDust(
                                                            prev => !prev,
                                                        )
                                                    }
                                                    defaultunchecked="true"
                                                    checked={
                                                        ignoreRecipientsBelowDust
                                                    }
                                                />
                                                &ensp;Ignore airdrops below min.
                                                payment (
                                                {fromSmallestDenomination(
                                                    currency.dustSats,
                                                )}{' '}
                                                XEC)
                                            </AirdropOptions>
                                        </Form.Item>
                                        <Form.Item>
                                            <SmartButton
                                                onClick={() =>
                                                    calculateXecAirdrop()
                                                }
                                                disabled={
                                                    !airdropCalcInputIsValid ||
                                                    !tokenIdIsValid
                                                }
                                            >
                                                Calculate Airdrop
                                            </SmartButton>
                                        </Form.Item>
                                        {showAirdropOutputs && (
                                            <>
                                                {!ignoreRecipientsBelowDust &&
                                                    !airdropOutputIsValid &&
                                                    etokenHolders > 0 && (
                                                        <>
                                                            <Alert
                                                                description={
                                                                    'At least one airdrop is below the minimum ' +
                                                                    fromSmallestDenomination(
                                                                        currency.dustSats,
                                                                    ) +
                                                                    ' XEC dust. Please increase the total XEC airdrop.'
                                                                }
                                                                type="error"
                                                                showIcon
                                                            />
                                                            <br />
                                                        </>
                                                    )}
                                                <Form.Item>
                                                    One to Many Airdrop Payment
                                                    Outputs
                                                    <TextArea
                                                        name="airdropRecipients"
                                                        placeholder="Please input parameters above."
                                                        value={
                                                            airdropRecipients
                                                        }
                                                        rows="10"
                                                        readOnly
                                                    />
                                                </Form.Item>
                                                <Form.Item>
                                                    <AirdropActions>
                                                        <Link
                                                            type="text"
                                                            to={{
                                                                pathname: `/send`,
                                                                state: {
                                                                    airdropRecipients:
                                                                        airdropRecipients,
                                                                },
                                                            }}
                                                            disabled={
                                                                !airdropRecipients
                                                            }
                                                        >
                                                            Copy to Send screen
                                                        </Link>
                                                        &nbsp;&nbsp;
                                                        <Link
                                                            type="text"
                                                            disabled={
                                                                !airdropRecipients
                                                            }
                                                            to={'#'}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(
                                                                    airdropRecipients,
                                                                );
                                                                generalNotification(
                                                                    'Airdrop recipients copied to clipboard',
                                                                    'Copied',
                                                                );
                                                            }}
                                                        >
                                                            Copy to Clipboard
                                                        </Link>
                                                    </AirdropActions>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form>
                                </AntdFormWrapper>
                            </StyledPanel>
                        </AdvancedCollapse>
                    </Col>
                </Row>
            </SidePaddingCtn>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Airdrop.test.js

status => {console.log(status)} is an arbitrary stub function
*/

Airdrop.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

Airdrop.propTypes = {
    jestBCH: PropTypes.object,
    passLoadingStatus: PropTypes.func,
};

export default Airdrop;
