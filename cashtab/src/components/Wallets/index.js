// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import { WalletContext } from 'wallet/context';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import {
    ThemedCopySolid,
    ThemedTrashcanOutlined,
    ThemedEditOutlined,
    ThemedContactsOutlined,
} from 'components/Common/CustomIcons';
import Modal from 'components/Common/Modal';
import { ModalInput } from 'components/Common/Inputs';
import { toast } from 'react-toastify';
import PrimaryButton, {
    SecondaryButton,
} from 'components/Common/PrimaryButton';
import {
    WalletsList,
    WalletsPanel,
    Row,
    ActiveWalletName,
    WalletName,
    ButtonPanel,
    WalletBalance,
    ActivateButton,
} from 'components/Wallets/styles';
import { getWalletNameError, validateMnemonic } from 'validation';
import {
    createCashtabWallet,
    generateMnemonic,
    getWalletsForNewActiveWallet,
} from 'wallet';
import { getUserLocale } from 'helpers';
import { Event } from 'components/Common/GoogleAnalytics';
import { formatXecBalance } from 'utils/formatting';

const Wallets = () => {
    const ContextValue = React.useContext(WalletContext);
    const { cashtabState, updateCashtabState } = ContextValue;
    const { wallets, contactList } = cashtabState;

    const userLocale = getUserLocale(navigator);

    const emptyFormData = {
        renamedWalletName: '',
        walletToBeDeletedName: '',
        newWalletName: '',
        mnemonic: '',
    };
    const emptyFormDataErrors = {
        renamedWalletName: false,
        walletToBeDeletedName: false,
        newWalletName: false,
        mnemonic: false,
    };

    // State variables
    const [formData, setFormData] = useState(emptyFormData);
    const [formDataErrors, setFormDataErrors] = useState(emptyFormDataErrors);
    const [walletToBeRenamed, setWalletToBeRenamed] = useState(null);
    const [walletToBeDeleted, setWalletToBeDeleted] = useState(null);
    const [showImportWalletModal, setShowImportWalletModal] = useState(false);

    /**
     * Update formData with user input
     * @param {Event} e js input event
     * e.target.value will be input value
     * e.target.name will be name of originating input field
     */
    const handleInput = e => {
        const { name, value } = e.target;

        if (name === 'renamedWalletName') {
            setFormDataErrors(previous => ({
                ...previous,
                [name]: getWalletNameError(value, wallets),
            }));
        }
        if (name === 'walletToBeDeletedName') {
            const walletToBeDeletedNameError =
                value === 'delete ' + walletToBeDeleted.name
                    ? false
                    : `Input must exactly match "delete ${walletToBeDeleted.name}"`;
            setFormDataErrors(previous => ({
                ...previous,
                [name]: walletToBeDeletedNameError,
            }));
        }
        if (name === 'mnemonic') {
            setFormDataErrors(previous => ({
                ...previous,
                [name]:
                    validateMnemonic(value) === true
                        ? false
                        : 'Invalid mnemonic',
            }));
        }
        setFormData(previous => ({
            ...previous,
            [name]: value,
        }));
    };

    const renameWallet = async () => {
        // Find the wallet you want to rename
        let walletToUpdate = wallets.find(
            wallet => wallet.mnemonic === walletToBeRenamed.mnemonic,
        );
        const oldName = walletToUpdate.name;

        // if a match was found
        if (typeof walletToUpdate !== 'undefined') {
            // update the walllet name
            walletToUpdate.name = formData.renamedWalletName;

            // Update localforage and state
            await updateCashtabState('wallets', wallets);
            toast.success(
                `"${oldName}" renamed to "${formData.renamedWalletName}"`,
            );
        } else {
            toast.error(`Unable to find wallet ${walletToBeRenamed.name}`);
        }
        // Clear walletToBeRenamed field to hide the modal
        setWalletToBeRenamed(null);

        // Clear wallet rename input
        setFormData(previous => ({
            ...previous,
            renamedWalletName: '',
        }));
    };

    const deleteWallet = async () => {
        // filter wallet from wallets
        const updatedWallets = wallets.filter(
            wallet => wallet.mnemonic !== walletToBeDeleted.mnemonic,
        );

        // Update localforage and state
        await updateCashtabState('wallets', updatedWallets);
        toast.success(`"${walletToBeDeleted.name}" deleted`);

        // Reset walletToBeDeleted to hide the modal
        setWalletToBeDeleted(null);

        // Clear wallet to delete input
        setFormData(previous => ({
            ...previous,
            walletToBeDeletedName: '',
        }));
    };

    const addNewWallet = async () => {
        // Generate a new wallet with a new mnemonic
        const mnemonic = generateMnemonic();
        const newAddedWallet = await createCashtabWallet(mnemonic);

        // Note: technically possible though highly unlikley that a wallet already exists with this name
        // Also technically possible though ... er, almost impossibly improbable for wallet with same mnemonic to exist
        // In both cases, the odds are tremendously low.
        // Let's cover the edge case anyway though. It's easy enough for the user to just create
        // a wallet again if we some crazy how get here
        const walletAlreadyInWalletsSomehow = wallets.find(
            wallet =>
                wallet.name === newAddedWallet.name ||
                wallet.mnemonic === newAddedWallet.mnemonic,
        );
        if (typeof walletAlreadyInWalletsSomehow !== 'undefined') {
            toast.error(
                `By a vanishingly small chance, "${newAddedWallet.name}" already existed in saved wallets. Please try again.`,
            );
            // Do not add this wallet
            return;
        }

        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('Configure.js', 'Create Wallet', 'New');
        // Add it to the end of the wallets object
        updateCashtabState('wallets', [...wallets, newAddedWallet]);

        toast.success(`New wallet "${newAddedWallet.name}" added to wallets`);
    };

    /**
     * Add a new imported wallet to cashtabState wallets object
     * @param {mnemonic} string
     */
    async function importNewWallet() {
        // Make sure no existing wallets have this mnemonic
        const walletInWallets = wallets.find(
            wallet => wallet.mnemonic === formData.mnemonic,
        );

        if (typeof walletInWallets !== 'undefined') {
            // Import error modal
            console.error(
                `Cannot import: wallet already exists (name: "${walletInWallets.name}")`,
            );
            toast.error(
                `Cannot import: wallet already exists (name: "${walletInWallets.name}")`,
            );
            // Do not clear form data in this case
            return;
        }

        // Create a new wallet from mnemonic
        const newImportedWallet = await createCashtabWallet(formData.mnemonic);

        // Handle edge case of another wallet having the same name
        const existingWalletHasSameName = wallets.find(
            wallet => wallet.name === newImportedWallet,
        );
        if (typeof existingWalletHasSameName !== 'undefined') {
            // Import error modal for wallet existing with the same name
            console.error(
                `Cannot import: wallet with same name already exists (name: "${existingWalletHasSameName.name}")`,
            );
            toast.error(
                `Cannot import: wallet with same name already exists (name: "${existingWalletHasSameName.name}")`,
            );
            // Do not clear form data in this case
            return;
        }

        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('Configure.js', 'Create Wallet', 'Imported');

        // Add it to the end of the wallets object
        updateCashtabState('wallets', [...wallets, newImportedWallet]);

        // Import success modal
        toast.success(
            `New imported wallet "${newImportedWallet.name}" added to your saved wallets`,
        );

        // Clear formdata
        setFormData({ ...formData, mnemonic: '' });
    }

    /**
     * Add a wallet to contacts
     * @param {{name: string; paths: new Map([[1899, string;]])}} wallet
     */
    const addWalletToContacts = async wallet => {
        const addressToAdd = wallet.paths.get(1899).address;

        // Check to see if the contact exists
        const contactExists = contactList.find(
            contact => contact.address === addressToAdd,
        );

        if (typeof contactExists !== 'undefined') {
            // Contact exists
            // Not expected to ever happen from Tx.js as user should not see option to
            // add an existing contact
            toast.error(`${addressToAdd} already exists in Contacts`);
        } else {
            contactList.push({
                name: wallet.name,
                address: addressToAdd,
            });
            // update localforage and state
            await updateCashtabState('contactList', contactList);
            toast.success(
                `${wallet.name} (${addressToAdd}) added to Contact List`,
            );
        }
    };

    const activateWallet = (walletToActivate, wallets) => {
        // Get desired wallets array after activating walletToActivate
        const walletsAfterActivation = getWalletsForNewActiveWallet(
            walletToActivate,
            wallets,
        );

        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('Configure.js', 'Activate', '');

        // Update wallets to activate this wallet
        updateCashtabState('wallets', walletsAfterActivation);
    };

    return (
        <>
            {walletToBeRenamed !== null && (
                <Modal
                    height={180}
                    title={`Rename "${walletToBeRenamed.name}"?`}
                    handleOk={renameWallet}
                    handleCancel={() => setWalletToBeRenamed(null)}
                    showCancelButton
                    disabled={
                        formDataErrors.renamedWalletName !== false ||
                        formData.renamedWalletName === ''
                    }
                >
                    <ModalInput
                        placeholder="Enter new wallet name"
                        name="renamedWalletName"
                        value={formData.renamedWalletName}
                        error={formDataErrors.renamedWalletName}
                        handleInput={handleInput}
                    />
                </Modal>
            )}
            {walletToBeDeleted !== null && (
                <Modal
                    height={210}
                    title={`Delete "${walletToBeDeleted.name}"?`}
                    handleOk={deleteWallet}
                    handleCancel={() => setWalletToBeDeleted(null)}
                    showCancelButton
                    disabled={
                        formDataErrors.walletToBeDeletedName !== false ||
                        formData.walletToBeDeletedName === ''
                    }
                >
                    <ModalInput
                        placeholder={`Type "delete ${walletToBeDeleted.name}" to confirm`}
                        name="walletToBeDeletedName"
                        value={formData.walletToBeDeletedName}
                        handleInput={handleInput}
                        error={formDataErrors.walletToBeDeletedName}
                    />
                </Modal>
            )}
            {showImportWalletModal && (
                <Modal
                    height={180}
                    title={`Import wallet`}
                    handleOk={importNewWallet}
                    handleCancel={() => setShowImportWalletModal(false)}
                    showCancelButton
                    disabled={
                        formDataErrors.mnemonic !== false ||
                        formData.mnemonic === ''
                    }
                >
                    <ModalInput
                        type="email"
                        placeholder="mnemonic (seed phrase)"
                        name="mnemonic"
                        value={formData.mnemonic}
                        error={formDataErrors.mnemonic}
                        handleInput={handleInput}
                    />
                </Modal>
            )}
            <WalletsList data-testid="wallets">
                <WalletsPanel>
                    {wallets.map((wallet, index) =>
                        index === 0 ? (
                            <Row key={`${wallet.name}_${index}`}>
                                <ActiveWalletName className="notranslate">
                                    {wallet.name}
                                </ActiveWalletName>
                                <h4>(active)</h4>
                                <ButtonPanel>
                                    <CopyToClipboard
                                        data={wallet.paths.get(1899).address}
                                        showToast
                                    >
                                        <ThemedCopySolid />
                                    </CopyToClipboard>
                                    <ThemedEditOutlined
                                        data-testid="rename-active-wallet"
                                        onClick={() =>
                                            setWalletToBeRenamed(wallet)
                                        }
                                    />
                                    <ThemedContactsOutlined
                                        onClick={() =>
                                            addWalletToContacts(wallet)
                                        }
                                    />
                                </ButtonPanel>
                            </Row>
                        ) : (
                            <Row key={`${wallet.name}_${index}`}>
                                <WalletName>
                                    <h3 className="overflow notranslate">
                                        {wallet.name}
                                    </h3>
                                </WalletName>
                                <WalletBalance>
                                    {wallet?.state?.balanceSats !== 0
                                        ? formatXecBalance(
                                              wallet.state.balanceSats,
                                              userLocale,
                                          )
                                        : '-'}
                                </WalletBalance>
                                <ButtonPanel>
                                    <CopyToClipboard
                                        data={wallet.paths.get(1899).address}
                                        showToast
                                    >
                                        <ThemedCopySolid />
                                    </CopyToClipboard>
                                    <ThemedEditOutlined
                                        data-testid="rename-saved-wallet"
                                        onClick={() =>
                                            setWalletToBeRenamed(wallet)
                                        }
                                    />
                                    <ThemedContactsOutlined
                                        data-testid="add-saved-wallet-to-contact-btn"
                                        onClick={() =>
                                            addWalletToContacts(wallet)
                                        }
                                    />
                                    <ThemedTrashcanOutlined
                                        data-testid="delete-saved-wallet"
                                        onClick={() =>
                                            setWalletToBeDeleted(wallet)
                                        }
                                    />
                                    <ActivateButton
                                        onClick={() =>
                                            activateWallet(wallet, wallets)
                                        }
                                    >
                                        Activate
                                    </ActivateButton>
                                </ButtonPanel>
                            </Row>
                        ),
                    )}
                </WalletsPanel>
                <Row>
                    <PrimaryButton onClick={() => addNewWallet()}>
                        New Wallet
                    </PrimaryButton>
                </Row>
                <Row>
                    <SecondaryButton
                        onClick={() => setShowImportWalletModal(true)}
                    >
                        Import Wallet
                    </SecondaryButton>
                </Row>
            </WalletsList>
        </>
    );
};

export default Wallets;
