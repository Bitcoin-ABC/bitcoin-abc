import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import PropTypes from 'prop-types';
import WalletLabel from 'components/Common/WalletLabel.js';
import {
    ZeroBalanceHeader,
    SidePaddingCtn,
    WalletInfoCtn,
} from 'components/Common/Atoms';
import { DestinationAddressSingle } from 'components/Common/EnhancedInputs';
import { AntdFormWrapper } from 'components/Common/EnhancedInputs';
import { Form, Modal } from 'antd';
import { SmartButton } from 'components/Common/PrimaryButton';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import { Row, Col } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import {
    getWalletState,
    fromSatoshisToXec,
    getAliasRegistrationFee,
    convertToEcashPrefix,
    getAliasByteSize,
} from 'utils/cashMethods';
import { isAliasAvailable, isAddressRegistered } from 'utils/chronik';
import { currency } from 'components/Common/Ticker.js';
import { registerNewAlias } from 'utils/transactions';
import {
    errorNotification,
    registerAliasNotification,
} from 'components/Common/Notifications';
import { isAliasFormat, isValidAliasString } from 'utils/validation';
import { getPendingAliases } from 'utils/aliasUtils';

export const NamespaceCtn = styled.div`
    width: 100%;
    margin-top: 50px;
    margin-bottom: 20px;
    overflow-wrap: break-word;
    h2 {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
    }
    h3 {
        color: ${props => props.theme.contrast};
        margin: 0 0 10px;
    }
    white-space: pre-wrap;
`;

const StyledSpacer = styled.div`
    height: 1px;
    width: 100%;
    background-color: ${props => props.theme.lightWhite};
    margin: 60px 0 50px;
`;

const Alias = ({ passLoadingStatus }) => {
    const ContextValue = React.useContext(WalletContext);
    const {
        wallet,
        fiatPrice,
        cashtabSettings,
        chronik,
        changeCashtabSettings,
        cashtabCache,
        isAliasServerOnline,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances, nonSlpUtxos } = walletState;
    const [formData, setFormData] = useState({
        aliasName: '',
    });
    const [isValidAliasInput, setIsValidAliasInput] = useState(false); // tracks whether to activate the registration button
    const [aliasValidationError, setAliasValidationError] = useState(false);
    const [activeWalletAliases, setActiveWalletAliases] = useState([]); // stores the list of aliases registered to this active wallet
    const [aliasLength, setAliasLength] = useState(false); // real time tracking of alias char length
    const [aliasFee, setAliasFee] = useState(false); // real time tracking of alias registration fee

    // Show a confirmation modal on alias registrations
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        passLoadingStatus(false);
    }, [balances.totalBalance]);

    useEffect(async () => {
        // only run this useEffect block if wallet or cashtabCache is defined
        if (
            !wallet ||
            typeof wallet === 'undefined' ||
            !cashtabCache ||
            typeof cashtabCache === 'undefined'
        ) {
            return;
        }
        passLoadingStatus(true);

        // check whether the address is attached to an onchain alias on page load
        const walletHasAlias = isAddressRegistered(
            wallet,
            cashtabCache.aliasCache,
        );

        // retrieve aliases for this active wallet from cache for rendering on the frontend
        if (
            walletHasAlias &&
            cashtabCache.aliasCache &&
            cashtabCache.aliasCache.cachedAliasCount > 0
        ) {
            const thisAddress = convertToEcashPrefix(
                wallet.Path1899.cashAddress,
            );
            // filter for aliases that matches this wallet's address
            const registeredAliasesToWallet =
                cashtabCache.aliasCache.aliases.filter(
                    alias => alias.address === thisAddress,
                );

            const appendedWithPendingAliases = await appendWithPendingAliases(
                registeredAliasesToWallet,
            );
            setActiveWalletAliases([...new Set(appendedWithPendingAliases)]); // new Set() removes duplicate entries
        }
        passLoadingStatus(false);
    }, [wallet.name, cashtabCache.aliasCache.aliases]);

    const handleOk = () => {
        setIsModalVisible(false);
        registerAlias();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const registerAlias = async () => {
        passLoadingStatus(true);

        if (!isAliasServerOnline) {
            // error notification on alias-server being unavailable
            errorNotification(
                null,
                'Unable to connect to alias server, please try again later',
                'Alias-server status check',
            );
            passLoadingStatus(false);
            return;
        }

        // note: input already validated via handleAliasNameInput()
        const aliasInput = formData.aliasName;

        // check if the user is trying to essentially register chicken.xec.xec
        const doubleExtensionInput = isAliasFormat(aliasInput);
        if (doubleExtensionInput) {
            errorNotification(
                null,
                'Please input an alias without the ".xec"',
                'Alias extension check',
            );
            passLoadingStatus(false);
            return;
        }

        const aliasAvailable = await isAliasAvailable(
            aliasInput,
            cashtabCache.aliasCache,
        );

        if (aliasAvailable) {
            // calculate registration fee based on chars
            const registrationFee = getAliasRegistrationFee(aliasInput);

            console.log(
                'Registration fee for ' +
                    aliasInput +
                    ' is ' +
                    registrationFee +
                    ' sats.',
            );
            console.log(
                `Alias ${aliasInput} is available. Broadcasting registration transaction.`,
            );
            try {
                const link = await registerNewAlias(
                    chronik,
                    wallet,
                    nonSlpUtxos,
                    currency.defaultFee,
                    aliasInput,
                    fromSatoshisToXec(registrationFee),
                );

                registerAliasNotification(link, aliasInput);

                // allow alias server to process the pending alias
                const delay = ms => new Promise(res => setTimeout(res, ms));
                await delay(1000); // 1 second
                const appendedWithPendingAliases =
                    await appendWithPendingAliases(activeWalletAliases);
                setActiveWalletAliases([
                    ...new Set(appendedWithPendingAliases),
                ]); // new Set() removes duplicate entries
            } catch (err) {
                handleAliasRegistrationError(err);
            }
            setIsValidAliasInput(true);
        } else {
            // error notification on alias being unavailable
            errorNotification(
                null,
                'This alias [' +
                    aliasInput +
                    '] has already been taken, please try another alias',
                'Alias availability check',
            );
        }
        passLoadingStatus(false);
    };

    const appendWithPendingAliases = async currentActiveWalletAliases => {
        // retrieve the pending aliases and add to the registered aliases list for this wallet
        let pendingAliasesArray = await getPendingAliases();

        if (!pendingAliasesArray) {
            return currentActiveWalletAliases;
        }

        // append the pending indicator
        for (let i = 0; i < pendingAliasesArray.length; i += 1) {
            pendingAliasesArray[i].alias =
                pendingAliasesArray[i].alias + ' (pending)';
        }

        // filter to pending aliases matching this active wallet
        const thisAddress = convertToEcashPrefix(wallet.Path1899.cashAddress);
        const pendingAndConfirmedAliases = pendingAliasesArray.filter(
            element => element.address === thisAddress,
        );

        // merge pending with confirmed list
        let tempActiveWalletAliases = currentActiveWalletAliases;
        tempActiveWalletAliases = tempActiveWalletAliases.concat(
            pendingAndConfirmedAliases,
        );
        return tempActiveWalletAliases;
    };

    const handleAliasNameInput = e => {
        const { name, value } = e.target;
        const validAliasInput = isValidAliasString(value);
        const aliasInputByteSize = getAliasByteSize(value);
        if (
            value &&
            value.trim() !== '' &&
            aliasInputByteSize <= currency.aliasSettings.aliasMaxLength &&
            validAliasInput
        ) {
            setIsValidAliasInput(true);
            const registrationFee = getAliasRegistrationFee(value);
            setAliasFee(registrationFee);
            setAliasLength(aliasInputByteSize);
            setAliasValidationError(false);
        } else {
            setAliasValidationError(
                'Please enter an alias (lowercase a-z, 0-9) between 1 and 21 bytes',
            );
            setIsValidAliasInput(false);
            setAliasFee(false);
            setAliasLength(false);
        }

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    function handleAliasRegistrationError(errorObj) {
        // Set loading to false here as well, as balance may not change depending on where error occured in try loop
        passLoadingStatus(false);
        let message;
        if (
            errorObj.error &&
            errorObj.error.includes(
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 50] (code 64)',
            )
        ) {
            message = `The address you are trying to register has too many unconfirmed ancestors (limit 50). Registration will be possible after a block confirmation. Try again in about 10 minutes.`;
        } else {
            message =
                errorObj.message || errorObj.error || JSON.stringify(errorObj);
        }

        errorNotification(errorObj, message, 'Registering Alias');
    }

    return (
        <>
            <Modal
                title="Confirm Alias Registration"
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <p>
                    {`Are you sure you want to register the alias '${
                        formData.aliasName
                    }' for ${fromSatoshisToXec(aliasFee)} XECs?`}
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
                        You currently have 0 {currency.ticker}
                        <br />
                        Deposit some funds to use this feature
                    </ZeroBalanceHeader>
                ) : (
                    <>
                        <BalanceHeader
                            balance={balances.totalBalance}
                            ticker={currency.ticker}
                            cashtabSettings={cashtabSettings}
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
            <SidePaddingCtn>
                <Row type="flex">
                    <Col span={24}>
                        <NamespaceCtn>
                            <h2>eCash Namespace Alias</h2>
                        </NamespaceCtn>
                        <SidePaddingCtn>
                            <AntdFormWrapper>
                                <Form
                                    style={{
                                        width: 'auto',
                                    }}
                                >
                                    <Form.Item>
                                        <DestinationAddressSingle
                                            validateStatus={
                                                isValidAliasInput ? '' : 'error'
                                            }
                                            help={
                                                aliasValidationError
                                                    ? aliasValidationError
                                                    : ''
                                            }
                                            inputProps={{
                                                addonAfter: ' . xec',
                                                placeholder:
                                                    'Enter a desired alias',
                                                name: 'aliasName',
                                                onChange: e =>
                                                    handleAliasNameInput(e),
                                                required: true,
                                            }}
                                        />
                                        {aliasLength &&
                                            aliasFee &&
                                            `Registration fee for this ${aliasLength} byte Alias is ${fromSatoshisToXec(
                                                aliasFee,
                                            )} XEC`}
                                    </Form.Item>
                                    <Form.Item>
                                        <SmartButton
                                            disabled={!isValidAliasInput}
                                            onClick={() =>
                                                setIsModalVisible(true)
                                            }
                                        >
                                            Register Alias
                                        </SmartButton>
                                    </Form.Item>
                                </Form>
                            </AntdFormWrapper>
                            <StyledSpacer />
                            <NamespaceCtn>
                                <h3>
                                    <p>
                                        <UserOutlined />
                                        &emsp;Registered aliases
                                    </p>
                                    {activeWalletAliases &&
                                    activeWalletAliases.length > 0
                                        ? activeWalletAliases
                                              .map(
                                                  alias => alias.alias + '.xec',
                                              )
                                              .join('\n')
                                        : 'N/A'}
                                </h3>
                            </NamespaceCtn>
                        </SidePaddingCtn>
                    </Col>
                </Row>
            </SidePaddingCtn>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Alias.test.js

status => {console.log(status)} is an arbitrary stub function
*/

Alias.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

Alias.propTypes = {
    passLoadingStatus: PropTypes.func,
};

export default Alias;
