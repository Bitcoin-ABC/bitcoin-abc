import React, { useState, useEffect } from 'react';
import BigNumber from 'bignumber.js';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import PropTypes from 'prop-types';
import WalletLabel from 'components/Common/WalletLabel.js';
import {
    ZeroBalanceHeader,
    SidePaddingCtn,
    WalletInfoCtn,
} from 'components/Common/Atoms';
import { AntdFormWrapper } from 'components/Common/EnhancedInputs';
import { Form, Input } from 'antd';
import { SmartButton } from 'components/Common/PrimaryButton';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import { Row, Col } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import {
    getWalletState,
    fromSatoshisToXec,
    getAliasRegistrationFee,
} from 'utils/cashMethods';
import {
    isAliasAvailable,
    isAddressRegistered,
    getAllTxHistory,
} from 'utils/chronik';
import { currency } from 'components/Common/Ticker.js';
import { registerNewAlias } from 'utils/transactions';
import {
    sendXecNotification,
    errorNotification,
} from 'components/Common/Notifications';

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
`;

const Alias = ({ passLoadingStatus }) => {
    const ContextValue = React.useContext(WalletContext);
    const {
        wallet,
        fiatPrice,
        cashtabSettings,
        chronik,
        changeCashtabSettings,
        getAliasesFromLocalForage,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances, nonSlpUtxos } = walletState;

    const [formData, setFormData] = useState({
        aliasName: '',
    });
    const [alias, setAlias] = useState([]); // stores the alias name array
    const [isValidAliasInput, setIsValidAliasInput] = useState(false); // tracks whether to activate the registration button
    // const [hasValidAlias, setHasValidAlias] = useState(false);

    useEffect(() => {
        passLoadingStatus(false);
    }, [balances.totalBalance]);

    useEffect(async () => {
        passLoadingStatus(true);

        // get latest tx count for payment address
        const totalPaymentTx = await getAllTxHistory(
            chronik,
            currency.aliasSettings.aliasPaymentHash160,
        );

        // temporary log for reviewer
        console.log(`totalPaymentTx: ${totalPaymentTx.length}`);

        // retrieve cached aliases
        let cachedAliases;
        try {
            cachedAliases = await getAliasesFromLocalForage();
        } catch (err) {
            console.log(`Error retrieving aliases from local forage`, err);
        }

        if (
            !cachedAliases ||
            !cachedAliases.totalPaymentTx ||
            new BigNumber(cachedAliases.totalPaymentTx) <
                new BigNumber(totalPaymentTx)
        ) {
            // temporary console log for reviewer
            console.log(`alias cache refresh required`);

            // call updateAliases() in next diff to refresh the alias cache object
        }

        // check whether the address is attached to an onchain alias on page load
        let walletHasAlias = isAddressRegistered(wallet);

        console.log(
            'Does this active wallet have an onchain alias? : ' +
                walletHasAlias,
        );
        passLoadingStatus(false);
    }, []);

    const registerAlias = async () => {
        passLoadingStatus(true);

        // note: input already validated via handleAliasNameInput()
        const aliasInput = formData.aliasName;

        const aliasAvailable = await isAliasAvailable(chronik, aliasInput);

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
                sendXecNotification(link);
            } catch (err) {
                handleAliasRegistrationError(err);
            }
            setIsValidAliasInput(true);

            // TODO: ** Utilize websockets to only trigger success notification upon 1 conf of the registration tx **

            // set alias as pending until subsequent websocket notification on 1 conf on the registration tx
            setAlias(prevArray => [...prevArray, `${aliasInput} (Pending)`]);

            // TODO: add alias array to local storage
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

    const handleAliasNameInput = e => {
        const { name, value } = e.target;

        if (value && value.trim() !== '') {
            setIsValidAliasInput(true);
        } else {
            setIsValidAliasInput(false);
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
                            <h3>
                                <UserOutlined />
                                {/*TODO: alias array to be rendered appropriately in later diffs*/}
                                &emsp;
                                {alias && Array.isArray(alias)
                                    ? alias.map(alias => (
                                          <li key={alias}>{alias}</li>
                                      ))
                                    : 'N/A'}
                            </h3>
                        </NamespaceCtn>
                        <SidePaddingCtn>
                            <AntdFormWrapper>
                                <Form
                                    style={{
                                        width: 'auto',
                                    }}
                                >
                                    <Form.Item>
                                        <Input
                                            addonAfter=" . xec"
                                            placeholder="Enter a desired alias"
                                            name="aliasName"
                                            maxLength={
                                                currency.aliasSettings
                                                    .aliasMaxLength
                                            }
                                            onChange={e =>
                                                handleAliasNameInput(e)
                                            }
                                        />
                                    </Form.Item>
                                    <Form.Item>
                                        <SmartButton
                                            disabled={!isValidAliasInput}
                                            onClick={() => registerAlias()}
                                        >
                                            Register Alias
                                        </SmartButton>
                                    </Form.Item>
                                </Form>
                            </AntdFormWrapper>
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
