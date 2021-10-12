/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Collapse, Form, Input, Modal, Alert } from 'antd';
import {
    PlusSquareOutlined,
    WalletFilled,
    ImportOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { WalletContext } from '@utils/context';
import { StyledCollapse } from '@components/Common/StyledCollapse';
import {
    AntdFormWrapper,
    CurrencySelectDropdown,
} from '@components/Common/EnhancedInputs';
import PrimaryButton, {
    SecondaryButton,
    SmartButton,
} from '@components/Common/PrimaryButton';
import {
    ThemedCopyOutlined,
    ThemedWalletOutlined,
    ThemedDollarOutlined,
} from '@components/Common/CustomIcons';
import { ReactComponent as Trashcan } from '@assets/trashcan.svg';
import { ReactComponent as Edit } from '@assets/edit.svg';
import { Event } from '@utils/GoogleAnalytics';
import ApiError from '@components/Common/ApiError';
import { formatSavedBalance } from '@utils/validation';

const { Panel } = Collapse;

const SettingsLink = styled.a`
    text-decoration: underline;
    color: ${props => props.theme.primary};
    :visited {
        text-decoration: underline;
        color: ${props => props.theme.primary};
    }
    :hover {
        color: ${props => props.theme.brandSecondary};
    }
`;

const SWRow = styled.div`
    border-radius: 3px;
    padding: 10px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
    @media (max-width: 500px) {
        flex-direction: column;
        margin-bottom: 12px;
    }
`;

const SWName = styled.div`
    width: 50%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    word-wrap: break-word;
    hyphens: auto;

    @media (max-width: 500px) {
        width: 100%;
        justify-content: center;
        margin-bottom: 15px;
    }

    h3 {
        font-size: 16px;
        color: ${props => props.theme.wallet.text.secondary};
        margin: 0;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    h3.overflow {
        width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    h3.overflow:hover {
        background-color: #eee;
        overflow: visible;
        inline-size: 100px;
        white-space: normal;
    }
`;

const SWBalance = styled.div`
    width: 50%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    word-wrap: break-word;
    hyphens: auto;
    @media (max-width: 500px) {
        width: 100%;
        justify-content: center;
        margin-bottom: 15px;
    }
    div {
        font-size: 13px;
        color: ${props => props.theme.wallet.text.secondary};
        margin: 0;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    div.overflow {
        width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    div.overflow:hover {
        background-color: #eee;
        overflow: visible;
        inline-size: 150px;
        white-space: normal;
    }
`;

const SWButtonCtn = styled.div`
    width: 50%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    @media (max-width: 500px) {
        width: 100%;
        justify-content: center;
    }

    button {
        cursor: pointer;

        @media (max-width: 768px) {
            font-size: 14px;
        }
    }

    svg {
        stroke: ${props => props.theme.wallet.text.secondary};
        fill: ${props => props.theme.wallet.text.secondary};
        width: 25px;
        height: 25px;
        margin-right: 20px;
        cursor: pointer;

        :first-child:hover {
            stroke: ${props => props.theme.primary};
            fill: ${props => props.theme.primary};
        }
        :hover {
            stroke: ${props => props.theme.settings.delete};
            fill: ${props => props.theme.settings.delete};
        }
    }
`;

const AWRow = styled.div`
    padding: 10px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    h3 {
        font-size: 16px;
        display: inline-block;
        color: ${props => props.theme.wallet.text.secondary};
        margin: 0;
        text-align: left;
        font-weight: bold;
        @media (max-width: 500px) {
            font-size: 14px;
        }
    }
    h4 {
        font-size: 16px;
        display: inline-block;
        color: ${props => props.theme.primary} !important;
        margin: 0;
        text-align: right;
    }
    @media (max-width: 500px) {
        flex-direction: column;
        margin-bottom: 12px;
    }
`;

const StyledConfigure = styled.div`
    h2 {
        color: ${props => props.theme.wallet.text.primary};
        font-size: 25px;
    }
    p {
        color: ${props => props.theme.wallet.text.secondary};
    }
`;

const StyledSpacer = styled.div`
    height: 1px;
    width: 100%;
    background-color: ${props => props.theme.wallet.borders.color};
    margin: 60px 0 50px;
`;

const Configure = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, apiError } = ContextValue;

    const {
        addNewSavedWallet,
        activateWallet,
        renameWallet,
        deleteWallet,
        validateMnemonic,
        getSavedWallets,
        cashtabSettings,
        changeCashtabSettings,
    } = ContextValue;
    const [savedWallets, setSavedWallets] = useState([]);
    const [formData, setFormData] = useState({
        dirty: true,
        mnemonic: '',
    });
    const [showRenameWalletModal, setShowRenameWalletModal] = useState(false);
    const [showDeleteWalletModal, setShowDeleteWalletModal] = useState(false);
    const [walletToBeRenamed, setWalletToBeRenamed] = useState(null);
    const [walletToBeDeleted, setWalletToBeDeleted] = useState(null);
    const [newWalletName, setNewWalletName] = useState('');
    const [
        confirmationOfWalletToBeDeleted,
        setConfirmationOfWalletToBeDeleted,
    ] = useState('');
    const [newWalletNameIsValid, setNewWalletNameIsValid] = useState(null);
    const [walletDeleteValid, setWalletDeleteValid] = useState(null);
    const [seedInput, openSeedInput] = useState(false);
    const [showTranslationWarning, setShowTranslationWarning] = useState(false);

    const showPopulatedDeleteWalletModal = walletInfo => {
        setWalletToBeDeleted(walletInfo);
        setShowDeleteWalletModal(true);
    };

    const showPopulatedRenameWalletModal = walletInfo => {
        setWalletToBeRenamed(walletInfo);
        setShowRenameWalletModal(true);
    };
    const cancelRenameWallet = () => {
        // Delete form value
        setNewWalletName('');
        setShowRenameWalletModal(false);
    };
    const cancelDeleteWallet = () => {
        setWalletToBeDeleted(null);
        setConfirmationOfWalletToBeDeleted('');
        setShowDeleteWalletModal(false);
    };
    const updateSavedWallets = async activeWallet => {
        if (activeWallet) {
            let savedWallets;
            try {
                savedWallets = await getSavedWallets(activeWallet);
                setSavedWallets(savedWallets);
            } catch (err) {
                console.log(`Error in getSavedWallets()`);
                console.log(err);
            }
        }
    };

    const [isValidMnemonic, setIsValidMnemonic] = useState(null);

    useEffect(() => {
        // Update savedWallets every time the active wallet changes
        updateSavedWallets(wallet);
    }, [wallet]);

    useEffect(() => {
        const detectedBrowserLang = navigator.language;
        if (!detectedBrowserLang.includes('en-')) {
            setShowTranslationWarning(true);
        }
    }, []);

    // Need this function to ensure that savedWallets are updated on new wallet creation
    const updateSavedWalletsOnCreate = async importMnemonic => {
        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('Configure.js', 'Create Wallet', 'New');
        const walletAdded = await addNewSavedWallet(importMnemonic);
        if (!walletAdded) {
            Modal.error({
                title: 'This wallet already exists!',
                content: 'Wallet not added',
            });
        } else {
            Modal.success({
                content: 'Wallet added to your saved wallets',
            });
        }
        await updateSavedWallets(wallet);
    };
    // Same here
    // TODO you need to lock UI here until this is complete
    // Otherwise user may try to load an already-loading wallet, wreak havoc with indexedDB
    const updateSavedWalletsOnLoad = async walletToActivate => {
        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('Configure.js', 'Activate', '');
        await activateWallet(walletToActivate);
    };

    async function submit() {
        setFormData({
            ...formData,
            dirty: false,
        });

        // Exit if no user input
        if (!formData.mnemonic) {
            return;
        }

        // Exit if mnemonic is invalid
        if (!isValidMnemonic) {
            return;
        }
        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('Configure.js', 'Create Wallet', 'Imported');
        updateSavedWalletsOnCreate(formData.mnemonic);
    }

    const handleChange = e => {
        const { value, name } = e.target;

        // Validate mnemonic on change
        // Import button should be disabled unless mnemonic is valid
        setIsValidMnemonic(validateMnemonic(value));

        setFormData(p => ({ ...p, [name]: value }));
    };

    const changeWalletName = async () => {
        if (newWalletName === '' || newWalletName.length > 24) {
            setNewWalletNameIsValid(false);
            return;
        }
        // Hide modal
        setShowRenameWalletModal(false);
        // Change wallet name
        console.log(
            `Changing wallet ${walletToBeRenamed.name} name to ${newWalletName}`,
        );
        const renameSuccess = await renameWallet(
            walletToBeRenamed.name,
            newWalletName,
        );

        if (renameSuccess) {
            Modal.success({
                content: `Wallet "${walletToBeRenamed.name}" renamed to "${newWalletName}"`,
            });
        } else {
            Modal.error({
                content: `Rename failed. All wallets must have a unique name.`,
            });
        }
        await updateSavedWallets(wallet);
        // Clear wallet name for form
        setNewWalletName('');
    };

    const deleteSelectedWallet = async () => {
        if (!walletDeleteValid && walletDeleteValid !== null) {
            return;
        }
        if (
            confirmationOfWalletToBeDeleted !==
            `delete ${walletToBeDeleted.name}`
        ) {
            setWalletDeleteValid(false);
            return;
        }

        // Hide modal
        setShowDeleteWalletModal(false);
        // Change wallet name
        console.log(`Deleting wallet "${walletToBeDeleted.name}"`);
        const walletDeletedSuccess = await deleteWallet(walletToBeDeleted);

        if (walletDeletedSuccess) {
            Modal.success({
                content: `Wallet "${walletToBeDeleted.name}" successfully deleted`,
            });
        } else {
            Modal.error({
                content: `Error deleting ${walletToBeDeleted.name}.`,
            });
        }
        await updateSavedWallets(wallet);
        // Clear wallet delete confirmation from form
        setConfirmationOfWalletToBeDeleted('');
    };

    const handleWalletNameInput = e => {
        const { value } = e.target;
        // validation
        if (value && value.length && value.length < 24) {
            setNewWalletNameIsValid(true);
        } else {
            setNewWalletNameIsValid(false);
        }

        setNewWalletName(value);
    };

    const handleWalletToDeleteInput = e => {
        const { value } = e.target;

        if (value && value === `delete ${walletToBeDeleted.name}`) {
            setWalletDeleteValid(true);
        } else {
            setWalletDeleteValid(false);
        }
        setConfirmationOfWalletToBeDeleted(value);
    };

    return (
        <StyledConfigure>
            {walletToBeRenamed !== null && (
                <Modal
                    title={`Rename Wallet ${walletToBeRenamed.name}`}
                    visible={showRenameWalletModal}
                    onOk={changeWalletName}
                    onCancel={() => cancelRenameWallet()}
                >
                    <AntdFormWrapper>
                        <Form style={{ width: 'auto' }}>
                            <Form.Item
                                validateStatus={
                                    newWalletNameIsValid === null ||
                                    newWalletNameIsValid
                                        ? ''
                                        : 'error'
                                }
                                help={
                                    newWalletNameIsValid === null ||
                                    newWalletNameIsValid
                                        ? ''
                                        : 'Wallet name must be a string between 1 and 24 characters long'
                                }
                            >
                                <Input
                                    prefix={<WalletFilled />}
                                    placeholder="Enter new wallet name"
                                    name="newName"
                                    value={newWalletName}
                                    onChange={e => handleWalletNameInput(e)}
                                />
                            </Form.Item>
                        </Form>
                    </AntdFormWrapper>
                </Modal>
            )}
            {walletToBeDeleted !== null && (
                <Modal
                    title={`Are you sure you want to delete wallet "${walletToBeDeleted.name}"?`}
                    visible={showDeleteWalletModal}
                    onOk={deleteSelectedWallet}
                    onCancel={() => cancelDeleteWallet()}
                >
                    <AntdFormWrapper>
                        <Form style={{ width: 'auto' }}>
                            <Form.Item
                                validateStatus={
                                    walletDeleteValid === null ||
                                    walletDeleteValid
                                        ? ''
                                        : 'error'
                                }
                                help={
                                    walletDeleteValid === null ||
                                    walletDeleteValid
                                        ? ''
                                        : 'Your confirmation phrase must match exactly'
                                }
                            >
                                <Input
                                    prefix={<WalletFilled />}
                                    placeholder={`Type "delete ${walletToBeDeleted.name}" to confirm`}
                                    name="walletToBeDeletedInput"
                                    value={confirmationOfWalletToBeDeleted}
                                    onChange={e => handleWalletToDeleteInput(e)}
                                />
                            </Form.Item>
                        </Form>
                    </AntdFormWrapper>
                </Modal>
            )}
            <h2>
                <ThemedCopyOutlined /> Backup your wallet
            </h2>
            <Alert
                style={{ marginBottom: '12px' }}
                description="Your seed phrase is the only way to restore your wallet. Write it down. Keep it safe."
                type="warning"
                showIcon
            />
            {showTranslationWarning && (
                <Alert
                    style={{ marginBottom: '12px' }}
                    description="Please do not translate your seed phrase. Store your seed phrase in English. You must re-enter these exact English words to restore your wallet from seed."
                    type="warning"
                    showIcon
                />
            )}
            {wallet && wallet.mnemonic && (
                <StyledCollapse>
                    <Panel header="Click to reveal seed phrase" key="1">
                        <p className="notranslate">
                            {wallet && wallet.mnemonic ? wallet.mnemonic : ''}
                        </p>
                    </Panel>
                </StyledCollapse>
            )}
            <StyledSpacer />
            <h2>
                <ThemedWalletOutlined /> Manage Wallets
            </h2>
            {apiError ? (
                <ApiError />
            ) : (
                <>
                    <PrimaryButton onClick={() => updateSavedWalletsOnCreate()}>
                        <PlusSquareOutlined /> New Wallet
                    </PrimaryButton>
                    <SecondaryButton onClick={() => openSeedInput(!seedInput)}>
                        <ImportOutlined /> Import Wallet
                    </SecondaryButton>
                    {seedInput && (
                        <>
                            <p>
                                Copy and paste your mnemonic seed phrase below
                                to import an existing wallet
                            </p>
                            <AntdFormWrapper>
                                <Form style={{ width: 'auto' }}>
                                    <Form.Item
                                        validateStatus={
                                            isValidMnemonic === null ||
                                            isValidMnemonic
                                                ? ''
                                                : 'error'
                                        }
                                        help={
                                            isValidMnemonic === null ||
                                            isValidMnemonic
                                                ? ''
                                                : 'Valid mnemonic seed phrase required'
                                        }
                                    >
                                        <Input
                                            prefix={<LockOutlined />}
                                            type="email"
                                            placeholder="mnemonic (seed phrase)"
                                            name="mnemonic"
                                            autoComplete="off"
                                            onChange={e => handleChange(e)}
                                            required
                                        />
                                    </Form.Item>
                                    <SmartButton
                                        disabled={!isValidMnemonic}
                                        onClick={() => submit()}
                                    >
                                        Import
                                    </SmartButton>
                                </Form>
                            </AntdFormWrapper>
                        </>
                    )}
                </>
            )}
            {savedWallets && savedWallets.length > 0 && (
                <>
                    <StyledCollapse>
                        <Panel header="Saved wallets" key="2">
                            <AWRow>
                                <h3 className="notranslate">{wallet.name}</h3>
                                <h4>Currently active</h4>
                            </AWRow>
                            <div>
                                {savedWallets.map(sw => (
                                    <SWRow key={sw.name}>
                                        <SWName>
                                            <h3 className="overflow notranslate">
                                                {sw.name}
                                            </h3>
                                        </SWName>
                                        <SWBalance>
                                            <div className="overflow">
                                                [
                                                {sw && sw.state
                                                    ? formatSavedBalance(
                                                          sw.state.balances
                                                              .totalBalance,
                                                      )
                                                    : 'N/A'}{' '}
                                                XEC]
                                            </div>
                                        </SWBalance>
                                        <SWButtonCtn>
                                            <Edit
                                                onClick={() =>
                                                    showPopulatedRenameWalletModal(
                                                        sw,
                                                    )
                                                }
                                            />
                                            <Trashcan
                                                onClick={() =>
                                                    showPopulatedDeleteWalletModal(
                                                        sw,
                                                    )
                                                }
                                            />
                                            <button
                                                onClick={() =>
                                                    updateSavedWalletsOnLoad(sw)
                                                }
                                            >
                                                Activate
                                            </button>
                                        </SWButtonCtn>
                                    </SWRow>
                                ))}
                            </div>
                        </Panel>
                    </StyledCollapse>
                </>
            )}
            <StyledSpacer />
            <h2>
                <ThemedDollarOutlined /> Fiat Currency
            </h2>
            <AntdFormWrapper>
                <CurrencySelectDropdown
                    defaultValue={
                        cashtabSettings && cashtabSettings.fiatCurrency
                            ? cashtabSettings.fiatCurrency
                            : 'usd'
                    }
                    onChange={fiatCode =>
                        changeCashtabSettings('fiatCurrency', fiatCode)
                    }
                />
            </AntdFormWrapper>
            <StyledSpacer />[
            <SettingsLink
                type="link"
                href="https://docs.cashtabapp.com/docs/"
                target="_blank"
                rel="noreferrer"
            >
                Documentation
            </SettingsLink>
            ]
        </StyledConfigure>
    );
};

export default Configure;
