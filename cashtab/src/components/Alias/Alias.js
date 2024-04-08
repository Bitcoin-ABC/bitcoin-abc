// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import PropTypes from 'prop-types';
import { AlertMsg } from 'components/Common/Atoms';
import { AliasRegisterIcon } from 'components/Common/CustomIcons';
import PrimaryButton from 'components/Common/PrimaryButton';
import { getWalletState } from 'utils/cashMethods';
import { toXec } from 'wallet';
import { meetsAliasSpec } from 'validation';
import { queryAliasServer } from 'alias';
import cashaddr from 'ecashaddrjs';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';
import { explorer } from 'config/explorer';
import { getAliasTargetOutput, getAliasByteCount } from 'opreturn';
import { sendXec } from 'transactions';
import { hasEnoughToken } from 'wallet';
import { toast } from 'react-toastify';
import { AliasInput, Input } from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';
import Modal from 'components/Common/Modal';

const AliasWrapper = styled.div`
    color: ${props => props.theme.contrast};
    margin: 12px 0;
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
`;
export const SwitchContainer = styled.div`
    display: flex;
    margin-bottom: 12px;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
`;
const SwitchLabel = styled.div`
    display: flex;
    font-size: 16px;
`;
const AltAddressHolder = styled.div`
    display: flex;
    margin-bottom: 12px;
`;
const AliasHeader = styled.div`
    color: ${props => props.theme.contrast};
    font-weight: bold;
    font-size: 20px;
    margin: 12px 0;
    width: 100%;
`;
const Panel = styled.div`
    display: flex;
    flex-wrap: wrap;
    padding: 12px;
    width: 100%;
    background-color: ${props => props.theme.panel};
    border-radius: 9px;
    margin-bottom: 12px;
    gap: 12px;
`;
const AliasTag = styled.div`
    display: flex;
    color: ${props => props.theme.contrast};
    background-color: #0074c2;
    &:hover {
        background-color: ${props => props.theme.eCashPurple};
    }
    gap: 12px;
    border-radius: 3px;
    padding: 3px;
    font-size: 12px;
`;
// Change mouse cursor to pointer upon hovering over an Alias tag
export const AliasLabel = styled.div`
    cursor: pointer;
`;

const AliasRegisteredLink = styled.a`
    color: ${props => props.theme.walletBackground};
    text-decoration: none;
`;

export const AliasAvailable = styled.span`
    color: ${props => props.theme.eCashBlue};
`;

export const AliasPending = styled.span`
    color: ${props => props.theme.forms.error};
`;

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

const Alias = ({ passLoadingStatus }) => {
    const ContextValue = React.useContext(WalletContext);
    const {
        chronik,
        refreshAliases,
        aliases,
        setAliases,
        aliasServerError,
        aliasPrices,
        setAliasPrices,
        cashtabState,
    } = ContextValue;
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const defaultAddress =
        wallet !== false ? wallet.paths.get(1899).address : '';
    const walletState = getWalletState(wallet);
    const { balanceSats, tokens } = walletState;
    const [formData, setFormData] = useState({
        aliasName: '',
        aliasAddress: defaultAddress,
    });
    const [registerActiveWallet, setRegisterActiveWallet] = useState(true);
    const [isValidAliasInput, setIsValidAliasInput] = useState(false); // tracks whether to activate the registration button
    const [isValidAliasAddressInput, setIsValidAliasAddressInput] =
        useState(false); // tracks whether to activate the registration button
    const [aliasValidationError, setAliasValidationError] = useState(false);
    const [aliasAddressValidationError, setAliasAddressValidationError] =
        useState(false);
    const [aliasDetails, setAliasDetails] = useState(false); // stores the /alias/<alias> endpoint response object
    // Stores a conditional warning to the registration confirmation modal
    const [aliasWarningMsg, setAliasWarningMsg] = useState(false);
    // Show a confirmation modal on alias registrations
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        passLoadingStatus(false);
    }, [balanceSats]);

    useEffect(() => {
        if (registerActiveWallet) {
            // Set address of active wallet to default alias registration address
            handleAliasAddressInput({
                target: {
                    name: 'aliasAddress',
                    value: defaultAddress,
                },
            });
        } else {
            // Clear the form if the user unchecks
            handleAliasAddressInput({
                target: {
                    name: 'aliasAddress',
                    value: '',
                },
            });
        }
    }, [registerActiveWallet]);

    const handleAliasWalletChange = async () => {
        if (defaultAddress !== '') {
            await refreshAliases(defaultAddress);
        }

        // Refresh alias prices if none exist yet
        if (aliasPrices === null) {
            try {
                setAliasPrices(await queryAliasServer('prices'));
            } catch (err) {
                setAliasValidationError(
                    `Failed to fetch alias price information from server. Alias registration disabled. Refresh page to try again.`,
                );
                passLoadingStatus(false);
            }
        }

        // Track when the user stops typing into the aliasName input field for at least
        // 'aliasSettings.aliasKeyUpTimeoutMs' and make an API call to check the alias status
        const aliasInput = document.getElementsByName('aliasName')[0];
        aliasInput?.addEventListener('keyup', function () {
            setTimeout(async function () {
                // Retrieve alias details
                let aliasDetailsResp;
                if (meetsAliasSpec(aliasInput.value)) {
                    try {
                        // Note: aliasInput.value is used here as formData is not yet
                        // initialized at the point of useEffect execution
                        aliasDetailsResp = await queryAliasServer(
                            'alias',
                            aliasInput.value,
                        );
                        if (aliasDetailsResp.address) {
                            setAliasValidationError(
                                `This alias is already taken`,
                            );
                            setIsValidAliasInput(false);
                        }
                    } catch (err) {
                        setAliasValidationError(
                            `Failed to check alias availability from server. Alias registration disabled. Refresh page to try again.`,
                        );
                        passLoadingStatus(false);
                    }
                }
            }, aliasSettings.aliasKeyUpTimeoutMs);
        });

        passLoadingStatus(false);
    };

    useEffect(() => {
        // only run this useEffect block if wallet is defined
        if (wallet === false || typeof wallet === 'undefined') {
            return;
        }
        passLoadingStatus(true);

        // passLoadingStatus(false) will be called after awaiting expected methods
        handleAliasWalletChange();
    }, [wallet.name]);

    const clearInputForms = () => {
        setFormData(p => ({
            ...p,
            aliasName: '',
        }));
        setAliasWarningMsg(false);
        setIsValidAliasInput(false);
    };

    const preparePreviewModal = async () => {
        passLoadingStatus(true);

        // Retrieve alias details
        let aliasDetailsResp;
        try {
            aliasDetailsResp = await queryAliasServer(
                'alias',
                formData.aliasName,
            );
            if (
                aliasDetailsResp.pending &&
                aliasDetailsResp.pending.length > 0
            ) {
                const thisWalletThisAliasPendingCount = aliases.pending.filter(
                    pendingAliasObj =>
                        pendingAliasObj.alias === formData.aliasName,
                ).length;
                const pendingMsgForThisAddress =
                    thisWalletThisAliasPendingCount > 0
                        ? `, including ${thisWalletThisAliasPendingCount} for this wallet address`
                        : '';
                setAliasWarningMsg(
                    ` There are currently ${aliasDetailsResp.pending.length} pending registration(s) for this alias${pendingMsgForThisAddress}.`,
                );
            } else {
                setAliasWarningMsg(false);
            }
        } catch (err) {
            const errorMsg =
                'Error retrieving alias details. Refresh page to try again.';
            console.error(`preparePreviewModal(): ${errorMsg}`, err);
            // Using a pop up notification since this is a modal block
            toast.error(`${errorMsg}`);
            passLoadingStatus(false);
            return;
        }

        if (
            aliasDetailsResp &&
            !aliasDetailsResp.address &&
            !aliasDetailsResp.error &&
            aliasDetailsResp.registrationFeeSats
        ) {
            // If alias is unregistered
            setAliasDetails(aliasDetailsResp);
            setIsModalVisible(true);
        } else if (aliasDetailsResp && aliasDetailsResp.address) {
            // If alias is registered
            toast.error(
                `The alias "${formData.aliasName}" is already owned by ${aliasDetailsResp.address}. Please try another alias.`,
            );
            setAliasDetails(false);
        } else {
            setAliasValidationError(
                'Failed to check alias availability from server. Alias registration disabled. Refresh page to try again.',
            );
            setAliasDetails(false);
        }
        passLoadingStatus(false);
    };

    const handleOk = () => {
        setIsModalVisible(false);
        registerAlias();
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const registerAlias = async () => {
        passLoadingStatus(true);

        // note: input already validated via handleAliasNameInput()
        const aliasInput = formData.aliasName;
        const aliasAddress = formData.aliasAddress;

        if (
            !aliasDetails.address &&
            !aliasDetails.error &&
            aliasDetails.registrationFeeSats
        ) {
            console.info(
                'Registration fee for ' +
                    aliasInput +
                    ' is ' +
                    aliasDetails.registrationFeeSats +
                    ' sats.',
            );
            console.info(
                `Alias ${aliasInput} is available. Broadcasting registration transaction.`,
            );
            try {
                const targetOutputs = [
                    getAliasTargetOutput(aliasInput, aliasAddress),
                    {
                        address: aliasSettings.aliasPaymentAddress,
                        value: aliasDetails.registrationFeeSats,
                    },
                ];

                const txObj = await sendXec(
                    chronik,
                    wallet,
                    targetOutputs,
                    settings.minFeeSends &&
                        hasEnoughToken(
                            tokens,
                            appConfig.vipSettingsTokenId,
                            appConfig.vipSettingsTokenQty,
                        )
                        ? appConfig.minFee
                        : appConfig.defaultFee,
                );
                clearInputForms();
                toast.success(
                    <AliasRegisteredLink
                        href={`${explorer.blockExplorerUrl}/tx/${txObj.response.txid}`}
                    >
                        {aliasInput}
                    </AliasRegisteredLink>,
                );
                // Append the newly broadcasted alias registration to pending list to
                // ensure the alias refresh interval is running in useWallet.js
                setAliases(previousAliases => ({
                    ...previousAliases,
                    pending: [
                        ...previousAliases.pending,
                        {
                            alias: aliasInput,
                            address: defaultAddress,
                        },
                    ],
                }));
            } catch (err) {
                toast.error(`${err}`);
            }
            setIsValidAliasInput(true);
        } else {
            // error notification on alias being unavailable
            toast.error(
                `Alias "${aliasInput}" has already been taken, please try another alias.`,
            );
        }
        passLoadingStatus(false);
    };

    const handleAliasNameInput = e => {
        const { name, value } = e.target;
        const inputMeetsAliasSpec = meetsAliasSpec(value);
        if (inputMeetsAliasSpec === true) {
            setIsValidAliasInput(true);
            setAliasValidationError(false);
        } else {
            // In this case, inputMeetsAliasSpec is a string explaining why not
            setAliasValidationError(inputMeetsAliasSpec);
            setIsValidAliasInput(false);
        }

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleAliasAddressInput = e => {
        /* handleAliasAddressInput
         *
         * Function called to handle any changes to the aliasAddress input form
         *
         * May be called programmatically by mocking the usual js event
         * of a user updating the addressName input field
         */
        let { name, value } = e.target;

        // remove any whitespaces
        value = value.trim();

        // Validate
        let decoded;
        let isValidAddress = false;
        try {
            decoded = cashaddr.decode(value, true);
            const { hash } = decoded;
            // We only support 20-byte payloads
            isValidAddress = hash.length === 40;
        } catch (err) {
            // Invalid cashaddress
            // Log to console for user support
            console.error(`Invalid address`, err);
        }

        if (isValidAddress) {
            setIsValidAliasAddressInput(true);
            setAliasAddressValidationError(false);
        } else {
            setAliasAddressValidationError(
                'Invalid alias registration address.',
            );
            setIsValidAliasAddressInput(false);
        }

        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    return (
        <>
            {isModalVisible && (
                <Modal
                    title={
                        aliasWarningMsg
                            ? 'Pending registrations detected'
                            : 'Confirm alias registration'
                    }
                    height={aliasWarningMsg ? 350 : 155}
                    handleOk={handleOk}
                    handleCancel={handleCancel}
                    showCancelButton
                >
                    {!aliasWarningMsg &&
                        aliasDetails &&
                        Number.isInteger(aliasDetails.registrationFeeSats) && (
                            <AliasAvailable>
                                Register &quot;{formData.aliasName}&quot; for{' '}
                                {toXec(
                                    aliasDetails.registrationFeeSats,
                                ).toLocaleString()}{' '}
                                XEC ?
                            </AliasAvailable>
                        )}
                    {aliasWarningMsg !== false &&
                        aliasDetails &&
                        Number.isInteger(aliasDetails.registrationFeeSats) && (
                            <AlertMsg>
                                {` Warning: ${aliasWarningMsg}`}
                                <br />
                                <br />
                                {` Continue the registration anyway for ${toXec(
                                    aliasDetails.registrationFeeSats,
                                ).toLocaleString()} XEC?`}
                            </AlertMsg>
                        )}
                    {!registerActiveWallet &&
                        !aliasAddressValidationError &&
                        ` Please also note Cashtab will only track alias registrations for ${wallet.name}: ${defaultAddress}.`}
                </Modal>
            )}
            <AliasWrapper>
                <h2>eCash Namespace Alias</h2>

                <AliasInput
                    name="aliasName"
                    value={formData.aliasName}
                    placeholder="Enter a desired alias"
                    handleInput={handleAliasNameInput}
                    error={aliasValidationError}
                />
                {(() => {
                    let aliasLength = getAliasByteCount(formData.aliasName);
                    if (
                        aliasLength > 0 &&
                        isValidAliasInput &&
                        aliasPrices !== null
                    ) {
                        // Disable alias registration if the array is not exactly one entry
                        if (aliasPrices.prices.length !== 1) {
                            setAliasValidationError(
                                `Alias registration is temporarily unavailable, please check again later.`,
                            );
                            setIsValidAliasInput(false);
                            return;
                        }
                        // TODO Once chronik-client has been upgraded for in-node chronik, update
                        // this price parsing logic to use the new ws for blockheight comparisons.
                        // Intention is to reverse loop through `aliasPrices.prices` and parse for
                        // the latest array entry that has a startHeight within the chain's tipHeight.
                        let aliasPriceXec = toXec(
                            aliasPrices.prices[0].fees[aliasLength],
                        ).toLocaleString();
                        return (
                            <AliasAvailable>
                                This {aliasLength} byte alias is available,{' '}
                                {aliasPriceXec} XEC to register.
                            </AliasAvailable>
                        );
                    }
                })()}
                <p />
                <SwitchContainer>
                    <Switch
                        name="register-active-wallet-switch"
                        checked={registerActiveWallet}
                        handleToggle={() =>
                            setRegisterActiveWallet(!registerActiveWallet)
                        }
                    ></Switch>
                    <SwitchLabel>Register active wallet</SwitchLabel>
                </SwitchContainer>

                {!registerActiveWallet && (
                    <AltAddressHolder>
                        <Input
                            placeholder="Enter address for this alias"
                            value={formData.aliasAddress}
                            disabled={registerActiveWallet}
                            name="aliasAddress"
                            handleInput={handleAliasAddressInput}
                            error={aliasAddressValidationError}
                        />
                    </AltAddressHolder>
                )}
                <PrimaryButton
                    disabled={
                        !isValidAliasInput ||
                        !isValidAliasAddressInput ||
                        aliasValidationError !== false ||
                        aliasServerError !== false
                    }
                    onClick={() => preparePreviewModal()}
                >
                    <AliasRegisterIcon /> Register Alias
                </PrimaryButton>

                <AliasHeader>Registered Aliases</AliasHeader>
                <Panel>
                    {aliases &&
                    aliases.registered &&
                    aliases.registered.length > 0
                        ? aliases.registered.map((alias, index) => (
                              <CopyToClipboard
                                  data={alias.alias + '.xec'}
                                  showToast
                                  key={index}
                              >
                                  <AliasTag key={index}>
                                      {alias.alias + '.xec'}
                                  </AliasTag>
                              </CopyToClipboard>
                          ))
                        : !aliasServerError && (
                              <AliasHeader>
                                  {'No registered aliases'}
                              </AliasHeader>
                          )}
                    {aliasServerError && aliasValidationError === false && (
                        <AlertMsg>{aliasServerError}</AlertMsg>
                    )}
                </Panel>
                <AliasHeader>Pending Aliases</AliasHeader>
                <Panel>
                    {aliases && aliases.pending && aliases.pending.length > 0
                        ? aliases.pending.map((pendingAlias, index) => (
                              <CopyToClipboard
                                  data={pendingAlias.alias + '.xec'}
                                  showToast
                                  key={index}
                              >
                                  <AliasTag key={index}>
                                      {pendingAlias.alias + '.xec'}
                                  </AliasTag>
                              </CopyToClipboard>
                          ))
                        : !aliasServerError && (
                              <AliasHeader>{'No pending aliases'}</AliasHeader>
                          )}
                    {aliasServerError && aliasValidationError === false && (
                        <AlertMsg>{aliasServerError}</AlertMsg>
                    )}
                </Panel>
            </AliasWrapper>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Alias.test.js

status => {console.info(status)} is an arbitrary stub function
*/

Alias.defaultProps = {
    passLoadingStatus: status => {
        console.info(status);
    },
};

Alias.propTypes = {
    passLoadingStatus: PropTypes.func,
};

export default Alias;
