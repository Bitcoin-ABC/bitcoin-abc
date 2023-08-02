import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import PropTypes from 'prop-types';
import WalletLabel from 'components/Common/WalletLabel.js';
import {
    ZeroBalanceHeader,
    SidePaddingCtn,
    WalletInfoCtn,
    AlertMsg,
} from 'components/Common/Atoms';
import {
    AntdFormWrapper,
    AliasInput,
    AliasAddressInput,
    CashtabCheckbox,
} from 'components/Common/EnhancedInputs';
import { Form, Modal } from 'antd';
import { SmartButton } from 'components/Common/PrimaryButton';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import { Row, Col } from 'antd';
import {
    getWalletState,
    fromSatoshisToXec,
    convertToEcashPrefix,
} from 'utils/cashMethods';
import { currency } from 'components/Common/Ticker.js';
import { registerNewAlias } from 'utils/transactions';
import {
    errorNotification,
    registerAliasNotification,
} from 'components/Common/Notifications';
import { isAliasFormat, isValidAliasString } from 'utils/validation';
import { queryAliasServer, getAliasByteSize } from 'utils/aliasUtils';
import cashaddr from 'ecashaddrjs';
import { Space, Tag } from 'antd';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';

export const CheckboxContainer = styled.div`
    text-align: left;
    margin-bottom: 12px;
`;

// Change mouse cursor to pointer upon hovering over an Alias tag
export const AliasLabel = styled.div`
    cursor: pointer;
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
        wallet,
        fiatPrice,
        cashtabSettings,
        chronik,
        changeCashtabSettings,
        cashtabCache,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances } = walletState;
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
    const [activeWalletAliases, setActiveWalletAliases] = useState([]); // stores the list of aliases registered to this active wallet
    const [aliasLength, setAliasLength] = useState(false); // real time tracking of alias char length
    const [aliasServerError, setAliasServerError] = useState(false);
    const [aliasToRegister, setAliasToRegister] = useState(false); // real time tracking of the alias input
    const [aliasDetails, setAliasDetails] = useState(false); // stores the /alias/<alias> endpoint response object

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
            !wallet.Path1899 ||
            !cashtabCache ||
            typeof cashtabCache === 'undefined'
        ) {
            return;
        }
        passLoadingStatus(true);

        // Default to registering the user's active wallet
        // Must be called in this useEffect to ensure that wallet is loaded
        // Call with this function to ensure that checkbox state and checkbox are updated
        handleDefaultAddressCheckboxChange({ target: { checked: true } });

        const thisAddress = convertToEcashPrefix(wallet.Path1899.cashAddress);

        // Retrieve aliases for this active wallet from alias-server
        try {
            const aliasesForThisAddress = await queryAliasServer(
                'address',
                thisAddress,
            );
            if (aliasesForThisAddress.error) {
                // If an error is returned from the address endpoint
                errorNotification(null, aliasesForThisAddress.error);
                setIsValidAliasInput(false);
                setAliasServerError(aliasesForThisAddress.error);
            }
            // If this active wallet has registered aliases, set to state variable for rendering under registered aliases list
            // If no aliases are registered an empty array is returned, in which case no need to update state variable
            if (aliasesForThisAddress.length > 0) {
                setActiveWalletAliases(
                    // sort in ascending order based on the `alias` property
                    aliasesForThisAddress.sort((a, b) =>
                        a.alias.localeCompare(b.alias),
                    ),
                );
            }
            passLoadingStatus(false);
        } catch (err) {
            const errorMsg = 'Error: Unable to retrieve registered aliases';
            console.log(`useEffect(): ${errorMsg}`, err);
            errorNotification(null, errorMsg);
            passLoadingStatus(false);
            setIsValidAliasInput(false);
            setAliasServerError(errorMsg);
        }

        passLoadingStatus(false);
    }, [wallet.name]);

    const preparePreviewModal = async () => {
        passLoadingStatus(true);

        // Retrieve alias details
        let aliasDetailsResp;
        try {
            aliasDetailsResp = await queryAliasServer('alias', aliasToRegister);
        } catch (err) {
            const errorMsg = 'Error retrieving alias details';
            console.log(`preparePreviewModal(): ${errorMsg}`, err);
            errorNotification(null, errorMsg);
            setIsValidAliasInput(false);
            setAliasServerError(errorMsg);
            setActiveWalletAliases([]);
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
            errorNotification(
                null,
                'This alias [' +
                    aliasToRegister +
                    `] is already owned by ${aliasDetailsResp.address}, please try another alias`,
                'Alias availability check',
            );
            setAliasDetails(false);
        } else {
            const errorMsg =
                'Unable to retrieve alias info, please try again later';
            setActiveWalletAliases([]);
            setAliasServerError(errorMsg);
            errorNotification(null, errorMsg);
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
                const result = await registerNewAlias(
                    chronik,
                    wallet,
                    currency.defaultFee,
                    aliasInput,
                    aliasAddress,
                    aliasDetails.registrationFeeSats,
                );
                registerAliasNotification(result.explorerLink, aliasInput);
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
            setAliasLength(aliasInputByteSize);
            setAliasToRegister(value);
            setAliasValidationError(false);
        } else {
            setAliasValidationError(
                'Please enter an alias (lowercase a-z, 0-9) between 1 and 21 bytes',
            );
            setIsValidAliasInput(false);
            setAliasToRegister(false);
            setAliasLength(false);
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
                    value: wallet.Path1899.cashAddress,
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
                    }' for ${fromSatoshisToXec(
                        aliasDetails.registrationFeeSats,
                    )} XEC?`}
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
                                                name: 'aliasName',
                                                onChange: e =>
                                                    handleAliasNameInput(e),
                                                required: true,
                                            }}
                                        />
                                        <CheckboxContainer>
                                            <CashtabCheckbox
                                                checked={useThisAddressChecked}
                                                onChange={
                                                    handleDefaultAddressCheckboxChange
                                                }
                                            >
                                                Register active wallet address
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
                                        {aliasLength &&
                                            `This alias is ${aliasLength} bytes in length`}
                                    </Form.Item>
                                    <Form.Item>
                                        <SmartButton
                                            disabled={
                                                !isValidAliasInput ||
                                                !isValidAliasAddressInput ||
                                                aliasServerError !== false
                                            }
                                            onClick={() =>
                                                preparePreviewModal()
                                            }
                                        >
                                            Register Alias
                                        </SmartButton>
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
                                    <Space size={[0, 8]} wrap>
                                        {activeWalletAliases &&
                                        activeWalletAliases.length > 0
                                            ? activeWalletAliases.map(alias => (
                                                  <CopyToClipboard
                                                      data={
                                                          alias.alias + '.xec'
                                                      }
                                                      optionalOnCopyNotification={{
                                                          title: 'Copied',
                                                          msg: `${alias.alias}.xec copied to clipboard`,
                                                      }}
                                                      key={alias.alias}
                                                  >
                                                      <Tag
                                                          color={'#0074C2'}
                                                          key={
                                                              'Tag: ' +
                                                              alias.alias
                                                          }
                                                      >
                                                          <AliasLabel>
                                                              {alias.alias +
                                                                  '.xec'}
                                                          </AliasLabel>
                                                      </Tag>
                                                  </CopyToClipboard>
                                              ))
                                            : !aliasServerError && (
                                                  <h3>
                                                      {'No registered aliases'}
                                                  </h3>
                                              )}
                                    </Space>
                                    <AlertMsg>{aliasServerError}</AlertMsg>
                                </CustomCollapseCtn>
                                <CustomCollapseCtn panelHeader="Pending Aliases">
                                    <h3>WIP</h3>
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
