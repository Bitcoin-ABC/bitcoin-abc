import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { BN } from 'slp-mdm';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import {
    AntdFormWrapper,
    DestinationAddressMulti,
    InputAmountSingle,
} from 'components/Common/EnhancedInputs';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';
import { Form, Alert, Input, Modal, Spin, Progress } from 'antd';
const { TextArea } = Input;
import { Row, Col, Switch, notification } from 'antd';
import { SmartButton } from 'components/Common/PrimaryButton';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import {
    convertEtokenToEcashAddr,
    convertEcashtoEtokenAddr,
    convertToEcashPrefix,
} from 'utils/cashMethods';
import { toXec } from 'wallet';
import { getMintAddress } from 'chronik';
import {
    isValidTokenId,
    isValidXecAirdrop,
    isValidAirdropOutputsArray,
    isValidAirdropExclusionArray,
} from 'validation';
import { CustomSpinner } from 'components/Common/CustomIcons';
import * as etokenList from 'etoken-list';
import { SidePaddingCtn } from 'components/Common/Atoms';
import { Link } from 'react-router-dom';
import { token as tokenConfig } from 'config/token';
import appConfig from 'config/app';
const AirdropActions = styled.div`
    text-align: center;
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    display: flex;
    justify-content: center;
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

const AirdropOptions = styled.div`
    text-align: left;
    color: ${props => props.theme.contrast};
`;

const StyledModal = styled(Modal)`
    .ant-progress-text {
        color: ${props => props.theme.lightWhite} !important;
    }
`;

const Airdrop = ({ passLoadingStatus }) => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, chronik } = ContextValue;
    const location = useLocation();
    const [isAirdropCalcModalVisible, setIsAirdropCalcModalVisible] =
        useState(false);
    const [airdropCalcModalProgress, setAirdropCalcModalProgress] = useState(0); // the dynamic % progress bar

    useEffect(() => {
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

    const [equalDistributionRatio, setEqualDistributionRatio] = useState(false);
    const [tokenIdIsValid, setTokenIdIsValid] = useState(null);
    const [totalAirdropIsValid, setTotalAirdropIsValid] = useState(null);
    const [airdropRecipients, setAirdropRecipients] = useState('');
    const [airdropOutputIsValid, setAirdropOutputIsValid] = useState(true);
    const [etokenHolders, setEtokenHolders] = useState(parseInt(0));
    const [showAirdropOutputs, setShowAirdropOutputs] = useState(false);
    const [ignoreOwnAddress, setIgnoreOwnAddress] = useState(false);

    const [ignoreRecipientsBelowDust, setIgnoreRecipientsBelowDust] =
        useState(false);

    const [ignoreMintAddress, setIgnoreMintAddress] = useState(false);

    // flag to reflect the exclusion list checkbox
    const [ignoreCustomAddresses, setIgnoreCustomAddresses] = useState(false);
    // the exclusion list values
    const [ignoreCustomAddressesList, setIgnoreCustomAddressesList] =
        useState(false);
    const [
        ignoreCustomAddressesListIsValid,
        setIgnoreCustomAddressesListIsValid,
    ] = useState(false);
    const [ignoreCustomAddressListError, setIgnoreCustomAddressListError] =
        useState(false);

    // flag to reflect the ignore minimum etoken balance switch
    const [ignoreMinEtokenBalance, setIgnoreMinEtokenBalance] = useState(false);
    const [ignoreMinEtokenBalanceAmount, setIgnoreMinEtokenBalanceAmount] =
        useState(new BN(0));
    const [
        ignoreMinEtokenBalanceAmountIsValid,
        setIgnoreMinEtokenBalanceAmountIsValid,
    ] = useState(false);
    const [
        ignoreMinEtokenBalanceAmountError,
        setIgnoreMinEtokenBalanceAmountError,
    ] = useState(false);

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

    const handleMinEtokenBalanceChange = e => {
        const { value } = e.target;

        if (new BN(value).gt(new BN(0))) {
            setIgnoreMinEtokenBalanceAmountIsValid(true);
            setIgnoreMinEtokenBalanceAmountError(false);
        } else {
            setIgnoreMinEtokenBalanceAmountError(
                'Minimum eToken balance must be greater than 0',
            );
            setIgnoreMinEtokenBalanceAmountIsValid(false);
        }

        setIgnoreMinEtokenBalanceAmount(value);
    };

    const calculateXecAirdrop = async () => {
        // display airdrop calculation message modal
        setIsAirdropCalcModalVisible(true);
        setShowAirdropOutputs(false); // hide any previous airdrop outputs
        passLoadingStatus(true);
        setAirdropCalcModalProgress(25); // updated progress bar to 25%

        let latestBlock, chainInfo;
        try {
            chainInfo = await chronik.blockchainInfo();
            latestBlock = chainInfo.tipHeight;
            console.log(
                'Calculating airdrop recipients as at block #' + latestBlock,
            );
        } catch (err) {
            notification.error({
                message: 'Error',
                description: 'Error retrieving latest block height',
            });
            setIsAirdropCalcModalVisible(false);
            passLoadingStatus(false);
            return;
        }

        setAirdropCalcModalProgress(50);

        etokenList.Config.SetUrl(tokenConfig.tokenDbUrl);

        let airdropList;
        try {
            airdropList = await etokenList.List.GetAddressListFor(
                formData.tokenId,
                latestBlock,
                true,
            );
        } catch (err) {
            notification.error({
                message: 'Error',
                description: 'Error retrieving airdrop recipients',
            });
            setIsAirdropCalcModalVisible(false);
            passLoadingStatus(false);
            return;
        }

        // if Ignore Own Address option is checked, then filter out from recipients list
        if (ignoreOwnAddress) {
            airdropList.delete(
                convertEcashtoEtokenAddr(
                    convertToEcashPrefix(wallet.Path1899.cashAddress),
                ),
            );
        }

        // if Ignore eToken Minter option is checked, then filter out from recipients list
        if (ignoreMintAddress) {
            // extract the eToken mint address
            let mintEtokenAddress;
            try {
                mintEtokenAddress = await getMintAddress(
                    chronik,
                    formData.tokenId,
                );
            } catch (err) {
                console.log(`Error in getMintAddress`, err);
                notification.error({
                    message: 'Error',
                    description:
                        'Unable to retrieve minting address for eToken ID: ' +
                        formData.tokenId,
                });
                setIsAirdropCalcModalVisible(false);
                passLoadingStatus(false);
                return;
            }

            // remove the mint address from the recipients list
            airdropList.delete(mintEtokenAddress);
        }

        // filter out addresses from the exclusion list if the option is checked
        if (ignoreCustomAddresses && ignoreCustomAddressesListIsValid) {
            const addressStringArray = ignoreCustomAddressesList.split(',');
            for (let i = 0; i < addressStringArray.length; i++) {
                airdropList.delete(
                    convertEcashtoEtokenAddr(addressStringArray[i]),
                );
            }
        }

        // if the minimum etoken balance option is enabled
        if (ignoreMinEtokenBalance) {
            const minEligibleBalance = ignoreMinEtokenBalanceAmount;
            // initial filtering of recipients with less than minimum eToken balance
            for (let [key, value] of airdropList) {
                if (new BN(value).isLessThan(minEligibleBalance)) {
                    airdropList.delete(key);
                }
            }
        }

        if (!airdropList) {
            notification.error({
                message: 'Error',
                description:
                    'No recipients found for tokenId ' + formData.tokenId,
            });
            setIsAirdropCalcModalVisible(false);
            passLoadingStatus(false);
            return;
        }

        // if the ignore minimum payment threshold option is enabled
        if (ignoreRecipientsBelowDust) {
            // minimum airdrop threshold
            const minEligibleAirdrop = new BN(toXec(appConfig.dustSats));
            let initialTotalTokenAmongstRecipients = new BN(0);
            let initialTotalHolders = new BN(airdropList.size); // amount of addresses that hold this eToken
            setEtokenHolders(initialTotalHolders);

            // keep a cumulative total of each eToken holding in each address in airdropList
            airdropList.forEach(
                index =>
                    (initialTotalTokenAmongstRecipients =
                        initialTotalTokenAmongstRecipients.plus(new BN(index))),
            );

            let initialCircToAirdropRatio = new BN(formData.totalAirdrop).div(
                initialTotalTokenAmongstRecipients,
            );

            // initial filtering of recipients with less than minimum payout amount
            for (let [key, value] of airdropList) {
                const proRataAirdrop = new BN(value).multipliedBy(
                    initialCircToAirdropRatio,
                );
                if (proRataAirdrop.isLessThan(minEligibleAirdrop)) {
                    airdropList.delete(key);
                }
            }

            // if the list becomes empty after initial filtering
            if (!airdropList) {
                notification.error({
                    message: 'Error',
                    description:
                        'No recipients after filtering minimum payouts',
                });
                setIsAirdropCalcModalVisible(false);
                passLoadingStatus(false);
                return;
            }
        }

        setAirdropCalcModalProgress(75);

        let totalTokenAmongstRecipients = new BN(0);
        let totalHolders = parseInt(airdropList.size); // amount of addresses that hold this eToken
        setEtokenHolders(totalHolders);

        // keep a cumulative total of each eToken holding in each address in airdropList
        airdropList.forEach(
            index =>
                (totalTokenAmongstRecipients = totalTokenAmongstRecipients.plus(
                    new BN(index),
                )),
        );

        let circToAirdropRatio = new BN(0);
        let resultString = '';

        // generate the resulting recipients list based on distribution ratio
        if (equalDistributionRatio) {
            const equalDividend = new BN(formData.totalAirdrop).dividedBy(
                new BN(totalHolders),
            );
            airdropList.forEach(
                (element, index) =>
                    (resultString +=
                        convertEtokenToEcashAddr(index) +
                        ',' +
                        equalDividend.decimalPlaces(appConfig.cashDecimals) +
                        '\n'),
            );
        } else {
            circToAirdropRatio = new BN(formData.totalAirdrop).div(
                totalTokenAmongstRecipients,
            );
            airdropList.forEach(
                (element, index) =>
                    (resultString +=
                        convertEtokenToEcashAddr(index) +
                        ',' +
                        new BN(element)
                            .multipliedBy(circToAirdropRatio)
                            .decimalPlaces(appConfig.cashDecimals) +
                        '\n'),
            );
        }

        resultString = resultString.substring(0, resultString.length - 1); // remove the final newline

        setAirdropRecipients(resultString);

        setAirdropCalcModalProgress(100);

        if (!resultString) {
            notification.error({
                message: 'Error',
                description:
                    'No holders found for eToken ID: ' + formData.tokenId,
            });
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

    const handleIgnoreMinEtokenBalanceAmt = e => {
        setIgnoreMinEtokenBalance(e);
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

    const handleIgnoreMintAddress = e => {
        setIgnoreMintAddress(e);
    };

    const handleIgnoreCustomAddresses = e => {
        setIgnoreCustomAddresses(e);
    };

    const handleIgnoreCustomAddressesList = e => {
        // if the checkbox is not checked then skip the input validation
        if (!ignoreCustomAddresses) {
            return;
        }

        let customAddressList = e.target.value;

        // remove all whitespaces via regex
        customAddressList = customAddressList.replace(/ /g, '');

        // validate the exclusion list input
        const addressListIsValid =
            isValidAirdropExclusionArray(customAddressList);
        setIgnoreCustomAddressesListIsValid(addressListIsValid);

        if (!addressListIsValid) {
            setIgnoreCustomAddressListError(
                'Invalid address detected in ignore list',
            );
        } else {
            setIgnoreCustomAddressListError(false); // needs to be explicitly set in order to refresh the error state from prior invalidation
        }

        // commit the ignore list to state
        setIgnoreCustomAddressesList(customAddressList);
    };

    let airdropCalcInputIsValid = tokenIdIsValid && totalAirdropIsValid;

    // if the ignore min etoken balance and exclusion list options are in use, add the relevant validation to the total pre-calculation validation
    if (ignoreMinEtokenBalance && ignoreCustomAddresses) {
        // both enabled
        airdropCalcInputIsValid =
            ignoreMinEtokenBalanceAmountIsValid &&
            tokenIdIsValid &&
            totalAirdropIsValid &&
            ignoreCustomAddressesListIsValid;
    } else if (ignoreMinEtokenBalance && !ignoreCustomAddresses) {
        // ignore minimum etoken balance option only
        airdropCalcInputIsValid =
            ignoreMinEtokenBalanceAmountIsValid &&
            tokenIdIsValid &&
            totalAirdropIsValid;
    } else if (!ignoreMinEtokenBalance && ignoreCustomAddresses) {
        // ignore custom addresses only
        airdropCalcInputIsValid =
            tokenIdIsValid &&
            totalAirdropIsValid &&
            ignoreCustomAddressesListIsValid;
    }

    return (
        <>
            <StyledModal
                title="Querying the eCash blockchain"
                open={isAirdropCalcModalVisible}
                okButtonProps={{ style: { display: 'none' } }}
                onCancel={handleAirdropCalcModalCancel}
            >
                <Spin indicator={CustomSpinner} />
                <Progress percent={airdropCalcModalProgress} />
            </StyledModal>
            <br />
            <SidePaddingCtn data-testid="airdrop-ctn">
                <Row type="flex">
                    <Col span={24}>
                        <CustomCollapseCtn
                            panelHeader="XEC Airdrop Calculator"
                            optionalDefaultActiveKey={
                                location &&
                                location.state &&
                                location.state.airdropEtokenId
                                    ? ['1']
                                    : ['0']
                            }
                            optionalKey="1"
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
                                                checkedChildren="Equal"
                                                unCheckedChildren="Pro-Rata"
                                                defaultunchecked="true"
                                                checked={equalDistributionRatio}
                                                onChange={() => {
                                                    setEqualDistributionRatio(
                                                        prev => !prev,
                                                    );
                                                }}
                                            />
                                        </AirdropOptions>
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
                                            {toXec(
                                                appConfig.dustSats,
                                            ).toString()}{' '}
                                            XEC)
                                        </AirdropOptions>
                                    </Form.Item>
                                    <Form.Item>
                                        <AirdropOptions>
                                            <Switch
                                                onChange={() =>
                                                    handleIgnoreMintAddress(
                                                        prev => !prev,
                                                    )
                                                }
                                                defaultunchecked="true"
                                                checked={ignoreMintAddress}
                                            />
                                            &ensp;Ignore eToken minter address
                                        </AirdropOptions>
                                    </Form.Item>
                                    <Form.Item>
                                        <AirdropOptions>
                                            <Switch
                                                onChange={() =>
                                                    handleIgnoreMinEtokenBalanceAmt(
                                                        prev => !prev,
                                                    )
                                                }
                                                defaultunchecked="true"
                                                checked={ignoreMinEtokenBalance}
                                                style={{
                                                    marginBottom: '5px',
                                                }}
                                            />
                                            &ensp;Minimum eToken holder balance
                                            {ignoreMinEtokenBalance && (
                                                <InputAmountSingle
                                                    validateStatus={
                                                        ignoreMinEtokenBalanceAmountError
                                                            ? 'error'
                                                            : ''
                                                    }
                                                    help={
                                                        ignoreMinEtokenBalanceAmountError
                                                            ? ignoreMinEtokenBalanceAmountError
                                                            : ''
                                                    }
                                                    inputProps={{
                                                        placeholder:
                                                            'Minimum eToken balance',
                                                        onChange: e =>
                                                            handleMinEtokenBalanceChange(
                                                                e,
                                                            ),
                                                        value: ignoreMinEtokenBalanceAmount,
                                                    }}
                                                />
                                            )}
                                        </AirdropOptions>
                                    </Form.Item>
                                    <Form.Item>
                                        <AirdropOptions>
                                            <Switch
                                                onChange={() =>
                                                    handleIgnoreCustomAddresses(
                                                        prev => !prev,
                                                    )
                                                }
                                                defaultunchecked="true"
                                                checked={ignoreCustomAddresses}
                                                style={{
                                                    marginBottom: '5px',
                                                }}
                                            />
                                            &ensp;Ignore custom addresses
                                            {ignoreCustomAddresses && (
                                                <DestinationAddressMulti
                                                    validateStatus={
                                                        ignoreCustomAddressListError
                                                            ? 'error'
                                                            : ''
                                                    }
                                                    help={
                                                        ignoreCustomAddressListError
                                                            ? ignoreCustomAddressListError
                                                            : ''
                                                    }
                                                    inputProps={{
                                                        placeholder: `If more than one XEC address, separate them by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed`,
                                                        name: 'address',
                                                        onChange: e =>
                                                            handleIgnoreCustomAddressesList(
                                                                e,
                                                            ),
                                                        required:
                                                            ignoreCustomAddresses,
                                                        disabled:
                                                            !ignoreCustomAddresses,
                                                    }}
                                                />
                                            )}
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
                                                                toXec(
                                                                    appConfig.dustSats,
                                                                ).toString() +
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
                                                    value={airdropRecipients}
                                                    rows="10"
                                                    readOnly
                                                />
                                            </Form.Item>
                                            <Form.Item>
                                                <AirdropActions>
                                                    <Link
                                                        type="text"
                                                        to="/send"
                                                        state={{
                                                            airdropRecipients:
                                                                airdropRecipients,
                                                            airdropTokenId:
                                                                formData.tokenId,
                                                        }}
                                                        disabled={
                                                            !airdropRecipients
                                                        }
                                                    >
                                                        Copy to Send screen
                                                    </Link>
                                                    &nbsp;&nbsp;
                                                    <CopyToClipboard
                                                        data={airdropRecipients}
                                                        optionalOnCopyNotification={{
                                                            title: 'Copied',
                                                            msg: 'Airdrop recipients copied to clipboard',
                                                        }}
                                                    >
                                                        <Link
                                                            type="text"
                                                            disabled={
                                                                !airdropRecipients
                                                            }
                                                            to={'#'}
                                                        >
                                                            Copy to Clipboard
                                                        </Link>
                                                    </CopyToClipboard>
                                                </AirdropActions>
                                            </Form.Item>
                                        </>
                                    )}
                                </Form>
                            </AntdFormWrapper>
                        </CustomCollapseCtn>
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
    passLoadingStatus: PropTypes.func,
};

export default Airdrop;
