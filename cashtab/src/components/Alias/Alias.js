// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import PropTypes from 'prop-types';
import { SidePaddingCtn, AlertMsg } from 'components/Common/Atoms';
import { PendingAliasWarningIcon } from 'components/Common/CustomIcons';
import {
    AntdFormWrapper,
    AliasInput,
    AliasAddressInput,
    CashtabCheckbox,
} from 'components/Common/EnhancedInputs';
import { AliasRegisterIcon } from 'components/Common/CustomIcons';
import { Form, Modal } from 'antd';
import PrimaryButton from 'components/Common/PrimaryButton';
import { Row, Col } from 'antd';
import { getWalletState } from 'utils/cashMethods';
import { toXec } from 'wallet';
import { meetsAliasSpec } from 'validation';
import { queryAliasServer } from 'alias';
import cashaddr from 'ecashaddrjs';
import { Space, Tag } from 'antd';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';
import { explorer } from 'config/explorer';
import { getAliasTargetOutput, getAliasByteCount } from 'opreturn';
import { sendXec } from 'transactions';
import { hasEnoughToken } from 'wallet';
import { toast } from 'react-toastify';

export const CheckboxContainer = styled.div`
    text-align: left;
    margin-bottom: 12px;
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

const StyledSpacer = styled.div`
    height: 1px;
    width: 100%;
    background-color: ${props => props.theme.lightWhite};
    margin: 60px 0 50px;
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
        wallet !== false
            ? wallet.paths.find(pathInfo => pathInfo.path === 1899).address
            : '';
    const walletState = getWalletState(wallet);
    const { balanceSats, tokens } = walletState;
    const [formData, setFormData] = useState({
        aliasName: '',
        aliasAddress: '',
    });
    const [useThisAddressChecked, setUseThisAddressChecked] = useState(false);
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

        // Default to registering the user's active wallet
        // Must be called in this useEffect to ensure that wallet is loaded
        // Call with this function to ensure that checkbox state and checkbox are updated
        handleDefaultAddressCheckboxChange({ target: { checked: true } });

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
            console.log(`preparePreviewModal(): ${errorMsg}`, err);
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
            console.log(
                'Registration fee for ' +
                    aliasInput +
                    ' is ' +
                    aliasDetails.registrationFeeSats +
                    ' sats.',
            );
            console.log(
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

    const handleDefaultAddressCheckboxChange = e => {
        /* handleDefaultAddressCheckboxChange
         *
         * Function to handle user action of checking or unchecking the
         * checkbox on this page labeled 'Register active wallet address'
         *
         * May be called programmatically by mocking the usual js event
         * of a user checking the box
         *
         * If the box is checked, set formData for aliasAddress to the active wallet's address
         * If the box is unchecked, clear formData for aliasAddress
         */
        const checked = e.target.checked;
        setUseThisAddressChecked(checked);
        if (checked) {
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
            console.log(`Invalid address`, err);
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
            <Modal
                title={
                    aliasWarningMsg ? (
                        <>
                            <PendingAliasWarningIcon />
                            <AliasPending>
                                {' '}
                                <b>Warning: pending registrations detected</b>
                            </AliasPending>
                        </>
                    ) : (
                        <AliasAvailable>
                            Confirm alias registration
                        </AliasAvailable>
                    )
                }
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                {!aliasWarningMsg &&
                    aliasDetails &&
                    Number.isInteger(aliasDetails.registrationFeeSats) && (
                        <AliasAvailable>
                            {`The alias ${
                                formData.aliasName
                            } is available and can be registered for ${toXec(
                                aliasDetails.registrationFeeSats,
                            ).toLocaleString()} XEC. Proceed with registration?`}
                        </AliasAvailable>
                    )}
                {aliasWarningMsg !== false &&
                    aliasDetails &&
                    Number.isInteger(aliasDetails.registrationFeeSats) && (
                        <>
                            <b>
                                <AlertMsg>
                                    {` Warning: ${aliasWarningMsg}`}
                                    <br />
                                    <br />
                                    {` Continue the registration anyway for ${toXec(
                                        aliasDetails.registrationFeeSats,
                                    ).toLocaleString()} XEC?`}
                                </AlertMsg>
                            </b>
                        </>
                    )}
                {!useThisAddressChecked &&
                    !aliasAddressValidationError &&
                    ` Please also note Cashtab will only track alias registrations for ${wallet.name}: ${defaultAddress}.`}
            </Modal>
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
                                        <AliasInput
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
                                                value: formData.aliasName,
                                                name: 'aliasName',
                                                onChange: e =>
                                                    handleAliasNameInput(e),
                                                required: true,
                                            }}
                                        />
                                        {(() => {
                                            let aliasLength = getAliasByteCount(
                                                formData.aliasName,
                                            );
                                            if (
                                                aliasLength > 0 &&
                                                isValidAliasInput &&
                                                aliasPrices !== null
                                            ) {
                                                // Disable alias registration if the array is not exactly one entry
                                                if (
                                                    aliasPrices.prices
                                                        .length !== 1
                                                ) {
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
                                                    aliasPrices.prices[0].fees[
                                                        aliasLength
                                                    ],
                                                ).toLocaleString();
                                                return (
                                                    <AliasAvailable>
                                                        This {aliasLength} byte
                                                        alias is available,{' '}
                                                        {aliasPriceXec} XEC to
                                                        register.
                                                    </AliasAvailable>
                                                );
                                            }
                                        })()}
                                        <p />
                                        <CheckboxContainer>
                                            <CashtabCheckbox
                                                checked={useThisAddressChecked}
                                                onChange={
                                                    handleDefaultAddressCheckboxChange
                                                }
                                            >
                                                Register to the active wallet
                                                address
                                            </CashtabCheckbox>
                                        </CheckboxContainer>
                                        {!useThisAddressChecked && (
                                            <AliasAddressInput
                                                validateStatus={
                                                    isValidAliasAddressInput
                                                        ? ''
                                                        : 'error'
                                                }
                                                help={
                                                    aliasAddressValidationError
                                                        ? aliasAddressValidationError
                                                        : ''
                                                }
                                                inputProps={{
                                                    placeholder:
                                                        'Enter address for this alias',
                                                    value: formData.aliasAddress,
                                                    disabled:
                                                        useThisAddressChecked,
                                                    name: 'aliasAddress',
                                                    onChange: e =>
                                                        handleAliasAddressInput(
                                                            e,
                                                        ),
                                                    required: true,
                                                }}
                                            />
                                        )}
                                        <PrimaryButton
                                            disabled={
                                                !isValidAliasInput ||
                                                !isValidAliasAddressInput ||
                                                aliasValidationError !==
                                                    false ||
                                                aliasServerError !== false
                                            }
                                            onClick={() =>
                                                preparePreviewModal()
                                            }
                                        >
                                            <AliasRegisterIcon /> Register Alias
                                        </PrimaryButton>
                                    </Form.Item>
                                </Form>
                            </AntdFormWrapper>
                            <StyledSpacer />
                            <NamespaceCtn>
                                <CustomCollapseCtn
                                    panelHeader="Registered Aliases"
                                    optionalDefaultActiveKey={['1']}
                                    optionalKey="1"
                                >
                                    <Space
                                        size={[0, 8]}
                                        wrap
                                        data-testid="registered-aliases-list"
                                    >
                                        {aliases &&
                                        aliases.registered &&
                                        aliases.registered.length > 0
                                            ? aliases.registered.map(
                                                  (alias, index) => (
                                                      <CopyToClipboard
                                                          data={
                                                              alias.alias +
                                                              '.xec'
                                                          }
                                                          showToast
                                                          key={index}
                                                      >
                                                          <Tag
                                                              color={'#0074C2'}
                                                              key={index}
                                                          >
                                                              <AliasLabel>
                                                                  {alias.alias +
                                                                      '.xec'}
                                                              </AliasLabel>
                                                          </Tag>
                                                      </CopyToClipboard>
                                                  ),
                                              )
                                            : !aliasServerError && (
                                                  <h3>
                                                      {'No registered aliases'}
                                                  </h3>
                                              )}
                                    </Space>
                                    <AlertMsg>
                                        {aliasServerError &&
                                            aliasValidationError === false &&
                                            aliasServerError}
                                    </AlertMsg>
                                </CustomCollapseCtn>
                                <CustomCollapseCtn
                                    panelHeader="Pending Aliases"
                                    optionalDefaultActiveKey={['1']}
                                    optionalKey="1"
                                >
                                    <Space
                                        size={[0, 8]}
                                        wrap
                                        data-testid="pending-aliases-list"
                                    >
                                        {aliases &&
                                        aliases.pending &&
                                        aliases.pending.length > 0
                                            ? aliases.pending.map(
                                                  (pendingAlias, index) => (
                                                      <CopyToClipboard
                                                          data={
                                                              pendingAlias.alias +
                                                              '.xec'
                                                          }
                                                          showToast
                                                          key={index}
                                                      >
                                                          <Tag
                                                              color={'#0074C2'}
                                                              key={index}
                                                          >
                                                              <AliasLabel>
                                                                  {pendingAlias.alias +
                                                                      '.xec'}
                                                              </AliasLabel>
                                                          </Tag>
                                                      </CopyToClipboard>
                                                  ),
                                              )
                                            : !aliasServerError && (
                                                  <h3>
                                                      {'No pending aliases'}
                                                  </h3>
                                              )}
                                    </Space>
                                    <AlertMsg>
                                        {aliasServerError &&
                                            aliasValidationError === false &&
                                            aliasServerError}
                                    </AlertMsg>
                                </CustomCollapseCtn>
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
