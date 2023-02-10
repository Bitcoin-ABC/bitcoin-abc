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
    convertToEcashPrefix,
} from 'utils/cashMethods';
import {
    isAliasAvailable,
    isAddressRegistered,
    getAllTxHistory,
    getOnchainAliasTxCount,
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
        getAliasesFromLocalForage,
        updateAliases,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances, nonSlpUtxos } = walletState;
    const [formData, setFormData] = useState({
        aliasName: '',
    });
    const [isValidAliasInput, setIsValidAliasInput] = useState(false); // tracks whether to activate the registration button
    const [activeWalletAliases, setActiveWalletAliases] = useState([]); // stores the list of aliases registered to this active wallet

    useEffect(() => {
        passLoadingStatus(false);
    }, [balances.totalBalance]);

    useEffect(async () => {
        // only run this useEffect block if wallet is defined
        if (!wallet || typeof wallet === 'undefined') {
            return;
        }
        passLoadingStatus(true);

        let cachedAliases;
        // retrieve cached aliases
        try {
            cachedAliases = await getAliasesFromLocalForage();
        } catch (err) {
            console.log(`Error retrieving aliases from local forage`, err);
        }

        // if alias cache exists, check if partial tx history retrieval is required
        if (cachedAliases && cachedAliases.paymentTxHistory.length > 0) {
            // get cached tx count
            const cachedAliasTxCount = cachedAliases.totalPaymentTxCount;

            // temporary log for reviewer
            console.log(`cached Alias Tx Count: `, cachedAliasTxCount);

            // get onchain tx count
            let onchainAliasTxCount = await getOnchainAliasTxCount(chronik);

            // temporary log for reviewer
            console.log(`onchain Alias Tx Count: `, onchainAliasTxCount);

            // condition where a partial alias tx history refresh is required
            if (cachedAliasTxCount !== onchainAliasTxCount) {
                // temporary log for reviewer
                console.log(`partial tx history retrieval required`);

                const onchainPages = Math.ceil(
                    cachedAliasTxCount / currency.chronikTxsPerPage,
                );

                // execute a partial tx history retrieval instead of full history
                const pagesToTraverse = Math.ceil(
                    onchainPages -
                        cachedAliasTxCount / currency.chronikTxsPerPage,
                ); // how many pages to traverse backwards via chronik
                const partialAliasPaymentTxHistory = await getAllTxHistory(
                    chronik,
                    currency.aliasSettings.aliasPaymentHash160,
                    pagesToTraverse,
                );

                // temporary log for reviewer
                console.log(
                    `partial txs retrieved: `,
                    partialAliasPaymentTxHistory.length,
                );

                // update cache with the latest alias transactions
                let allTxHistory = cachedAliases.paymentTxHistory; // starting point is what's currently cached

                if (allTxHistory) {
                    // only concat non-duplicate entries from the partial tx history retrieval
                    partialAliasPaymentTxHistory.forEach(element => {
                        if (
                            !JSON.stringify(allTxHistory).includes(
                                JSON.stringify(element.txid),
                            )
                        ) {
                            allTxHistory = allTxHistory.concat(element);
                            // temporary log for reviewer
                            console.log(
                                `${element.txid} appended to allTxHistory`,
                            );
                        }
                    });
                }

                // update cached alias list
                // updateAliases() handles the extraction of the aliases and generates the expected JSON format
                await updateAliases(allTxHistory);

                // temporary console log for reviewer
                console.log(`alias cache update complete`);
            } else {
                // temporary console log for reviewer
                console.log(
                    `cachedAliases exist however partial alias cache refresh NOT required`,
                );
            }
        } else {
            // first time loading Alias, execute full tx history retrieval
            // temporary console log for reviewer
            console.log(
                `Alias.js: cachedAliases DOES NOT exist, retrieving full tx history`,
            );

            // get latest tx count for payment address
            const aliasPaymentTxHistory = await getAllTxHistory(
                chronik,
                currency.aliasSettings.aliasPaymentHash160,
            );
            const totalPaymentTxCount = aliasPaymentTxHistory.length;

            // temporary log for reviewer
            console.log(`onchain totalPaymentTxCount: ${totalPaymentTxCount}`);

            // temporary console log for reviewer
            if (cachedAliases) {
                console.log(
                    `cached totalPaymentTxCount: `,
                    cachedAliases.totalPaymentTxCount,
                );
            }

            // conditions where an alias refresh is required
            if (
                !cachedAliases ||
                !cachedAliases.totalPaymentTxCount ||
                cachedAliases.totalPaymentTxCount < totalPaymentTxCount
            ) {
                // temporary console log for reviewer
                console.log(`alias cache refresh required`);

                try {
                    // update cached alias list
                    // updateAliases() handles the extraction of the alias and generates the expected JSON format
                    await updateAliases(aliasPaymentTxHistory);

                    // temporary console log for reviewer
                    console.log(`alias cache update complete`);
                } catch (err) {
                    console.log(`Error updating alias cache in Alias.js`, err);
                }
            } else {
                // temporary console log for reviewer
                console.log(`alias cache refresh NOT required`);
            }
        }

        // check whether the address is attached to an onchain alias on page load
        const walletHasAlias = isAddressRegistered(wallet, cachedAliases);

        // temporary console log for reviewer
        console.log(
            'Does this active wallet have an onchain alias? : ' +
                walletHasAlias,
        );

        // retrieve aliases for this active wallet from cache for rendering on the frontend
        if (
            walletHasAlias &&
            cachedAliases &&
            cachedAliases.aliases.length > 0
        ) {
            const thisAddress = convertToEcashPrefix(
                wallet.Path1899.cashAddress,
            );
            // filter for aliases that matches this wallet's address
            const registeredAliasesToWallet = cachedAliases.aliases.filter(
                alias => alias.address === thisAddress,
            );

            setActiveWalletAliases(registeredAliasesToWallet);
        }

        passLoadingStatus(false);
    }, [wallet.name]);

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

            // set alias as pending until subsequent websocket notification on 1 conf on the registration tx

            let tempactiveWalletAliases = activeWalletAliases;
            const thisAddress = convertToEcashPrefix(
                wallet.Path1899.cashAddress,
            );
            tempactiveWalletAliases.push({
                alias: `${aliasInput} (Pending)`,
                address: thisAddress,
            });
            setActiveWalletAliases(tempactiveWalletAliases);
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
