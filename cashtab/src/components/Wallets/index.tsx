// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useContext, useEffect } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { ActiveCashtabWallet } from 'wallet';
import {
    TrashcanIcon,
    EditIcon,
    AddContactIcon,
    BankIcon,
} from 'components/Common/CustomIcons';
import Modal from 'components/Common/Modal';
import { ModalInput } from 'components/Common/Inputs';
import { toast } from 'react-toastify';
import PrimaryButton, {
    SecondaryButton,
    IconButton,
    CopyIconButton,
} from 'components/Common/Buttons';
import {
    WalletsList,
    WalletsPanel,
    Wallet,
    WalletRow,
    ActionsRow,
    ActiveWalletName,
    WalletName,
    ButtonPanel,
    SvgButtonPanel,
    ActivateButton,
    AddressShareModal,
    WalletAddressRow,
    WalletInfo,
    WalletNameText,
    WalletAddress,
    CopyButton,
    ActiveIndicator,
} from 'components/Wallets/styles';
import { getWalletNameError, validateMnemonic } from 'validation';
import {
    createCashtabWallet,
    generateMnemonic,
    StoredCashtabWallet,
    createActiveCashtabWallet,
} from 'wallet';
import { previewAddress } from 'helpers';
import { sortWalletsForDisplay } from 'wallet';
import { Event } from 'components/Common/GoogleAnalytics';
import debounce from 'lodash.debounce';
import { PageHeader } from 'components/Common/Atoms';

interface WalletsFormData {
    renamedWalletName: string;
    walletToBeDeletedName: string;
    newWalletName: string;
    mnemonic: string;
}

interface WalletsFormDataErrors {
    renamedWalletName: false | string;
    walletToBeDeletedName: false | string;
    newWalletName: false | string;
    mnemonic: false | string;
}

const Wallets = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const {
        cashtabState,
        chronik,
        setLoading,
        updateCashtabState,
        handleActivatingCopiedWallet,
    } = ContextValue;
    const { wallets, contactList, activeWallet } = cashtabState;
    if (activeWallet === undefined) {
        return null;
    }

    const emptyFormData: WalletsFormData = {
        renamedWalletName: '',
        walletToBeDeletedName: '',
        newWalletName: '',
        mnemonic: '',
    };

    const emptyFormDataErrors: WalletsFormDataErrors = {
        renamedWalletName: false,
        walletToBeDeletedName: false,
        newWalletName: false,
        mnemonic: false,
    };

    // State variables
    const [formData, setFormData] = useState<WalletsFormData>(emptyFormData);
    const [formDataErrors, setFormDataErrors] =
        useState<WalletsFormDataErrors>(emptyFormDataErrors);
    const [walletToBeRenamed, setWalletToBeRenamed] =
        useState<null | StoredCashtabWallet>(null);
    const [walletToBeDeleted, setWalletToBeDeleted] =
        useState<null | StoredCashtabWallet>(null);
    const [showImportWalletModal, setShowImportWalletModal] =
        useState<boolean>(false);
    const [showAddressShareModal, setShowAddressShareModal] =
        useState<boolean>(false);

    // Check for address sharing URL parameter on component mount
    useEffect(() => {
        if (
            !window.location ||
            !window.location.hash ||
            window.location.hash === '#/wallets'
        ) {
            return;
        }

        try {
            const windowHash = window.location.hash;
            const queryStringArray = windowHash.split('#/wallets?');
            if (queryStringArray.length < 2) {
                return;
            }
            const queryString = queryStringArray[1];
            const queryStringParams = new URLSearchParams(queryString);
            const shareAddresses = queryStringParams.get('shareAddresses');

            if (shareAddresses === 'true') {
                setShowAddressShareModal(true);
            }
        } catch {
            // If you can't parse this, forget about it
            return;
        }
    }, []);

    /**
     * Update formData with user input
     * e.target.value will be input value
     * e.target.name will be name of originating input field
     */
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'renamedWalletName') {
            setFormDataErrors(previous => ({
                ...previous,
                [name]: getWalletNameError(value, wallets),
            }));
        }
        if (name === 'walletToBeDeletedName') {
            // We are handling input for user confirmation of walletToBeDeleted
            // We only expect this if walletToBeDeleted has been set
            if (walletToBeDeleted === null) {
                return;
            }
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
                        : 'Invalid 12-word mnemonic. Note: all letters must be lowercase.',
            }));
        }
        setFormData(previous => ({
            ...previous,
            [name]: value,
        }));
    };

    /**
     * Get user input to rename a wallet
     * We only expect to be in this function if walletToBeRenamed is not null
     */
    const renameWallet = async () => {
        if (walletToBeRenamed === null) {
            // We can only rename a walletToBeRenamed
            return;
        }

        // Find the wallet you want to rename
        const walletToUpdate = wallets.find(
            wallet => wallet.mnemonic === walletToBeRenamed.mnemonic,
        );

        if (typeof walletToUpdate === 'undefined') {
            // We always expect to find it, since only wallets that exist are rendered to the user
            return;
        }

        const oldName = walletToUpdate.name;

        // if a match was found
        if (typeof walletToUpdate !== 'undefined') {
            // update the walllet name
            walletToUpdate.name = formData.renamedWalletName;

            // Update localforage and state
            const updates: {
                wallets: StoredCashtabWallet[];
                activeWallet?: ActiveCashtabWallet;
            } = { wallets };
            if (activeWallet.mnemonic === walletToBeRenamed.mnemonic) {
                // Also update the active wallet name
                activeWallet.name = formData.renamedWalletName;
                updates.activeWallet = activeWallet;
            }
            await updateCashtabState(updates);
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

    /**
     * Delete wallet on successful user confirmation
     */
    const deleteWallet = async () => {
        // We only call this function if we have a walletToBeDeleted
        if (walletToBeDeleted === null) {
            return;
        }

        // filter wallet from wallets
        const updatedWallets = wallets.filter(
            wallet => wallet.mnemonic !== walletToBeDeleted.mnemonic,
        );

        // Update localforage and state
        await updateCashtabState({ wallets: updatedWallets });
        toast.success(`"${walletToBeDeleted.name}" deleted`);

        // Reset walletToBeDeleted to hide the modal
        setWalletToBeDeleted(null);

        // Clear wallet to delete input
        setFormData(previous => ({
            ...previous,
            walletToBeDeletedName: '',
        }));
    };

    /**
     * Generate a new wallet and add it to the users wallets array
     */
    const addNewWallet = async () => {
        // Generate a new wallet with a new mnemonic
        const mnemonic = generateMnemonic();
        const newAddedWallet = createCashtabWallet(mnemonic);

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
        updateCashtabState({ wallets: [...wallets, newAddedWallet] });

        toast.success(`New wallet "${newAddedWallet.name}" added to wallets`);
    };

    /**
     * Add a new imported wallet to cashtabState wallets object
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
        const newImportedWallet = createCashtabWallet(formData.mnemonic);

        // Handle edge case of another wallet having the same name
        const existingWalletHasSameName = wallets.find(
            wallet => wallet.name === newImportedWallet.name,
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
        updateCashtabState({ wallets: [...wallets, newImportedWallet] });

        // Import success modal
        toast.success(
            `New imported wallet "${newImportedWallet.name}" added to your saved wallets`,
        );

        // Clear formdata
        setFormData({ ...formData, mnemonic: '' });

        // Close the modal
        setShowImportWalletModal(false);
    }

    /**
     * Add a wallet to contacts
     */
    const addWalletToContacts = async (wallet: StoredCashtabWallet) => {
        const addressToAdd = wallet.address;

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
            await updateCashtabState({ contactList: contactList });
            toast.success(
                `${wallet.name} (${addressToAdd}) added to Contact List`,
            );
        }
    };

    /**
     * Copy wallet address and close tab
     */
    const copyWalletAddress = async (address: string, walletName: string) => {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(address);
        }
        toast.success(`"${address}" copied to clipboard`);

        // Find the wallet that was copied
        const copiedWallet = wallets.find(wallet => wallet.name === walletName);

        // If the copied wallet is not the active wallet, activate it
        if (copiedWallet && activeWallet.mnemonic !== copiedWallet.mnemonic) {
            // Event("Category", "Action", "Label")
            // Track number of times a different wallet is activated
            Event('Configure.js', 'Activate', '');

            // Only update the activeWalletAddress in storage for address copying
            await handleActivatingCopiedWallet(copiedWallet.address);
        }

        // Close the tab after copying - this works when the tab was opened by JavaScript
        window.close();
    };

    const activateWallet = async (walletToActivate: StoredCashtabWallet) => {
        setLoading(true);
        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('Configure.js', 'Activate', '');

        try {
            const activeWallet = await createActiveCashtabWallet(
                chronik,
                walletToActivate,
                cashtabState.cashtabCache,
            );
            await updateCashtabState({ activeWallet: activeWallet });
        } catch (error) {
            console.error('Error activating wallet:', error);
            toast.error('Failed to activate wallet. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageHeader>
                Wallets <BankIcon />
            </PageHeader>
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
                        type="text"
                        placeholder="mnemonic (seed phrase)"
                        name="mnemonic"
                        value={formData.mnemonic}
                        error={formDataErrors.mnemonic}
                        handleInput={handleInput}
                    />
                </Modal>
            )}
            {showAddressShareModal && (
                <Modal
                    height={400}
                    title="Connect Wallet"
                    description="Select a wallet to connect"
                    handleCancel={() => setShowAddressShareModal(false)}
                    showCancelButton={false}
                    showButtons={false}
                >
                    <AddressShareModal>
                        <div
                            style={{
                                marginBottom: '16px',
                                textAlign: 'center',
                            }}
                        >
                            <button
                                onClick={() => setShowAddressShareModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                Reject
                            </button>
                        </div>
                        {sortWalletsForDisplay(activeWallet, wallets).map(
                            (wallet, index) => (
                                <WalletAddressRow
                                    key={`${wallet.name}_${index}`}
                                >
                                    <WalletInfo>
                                        <WalletNameText>
                                            {wallet.name}
                                            {index === 0 && (
                                                <ActiveIndicator>
                                                    [active]
                                                </ActiveIndicator>
                                            )}
                                        </WalletNameText>
                                        <WalletAddress>
                                            {(() => {
                                                const preview = previewAddress(
                                                    wallet.address,
                                                );
                                                const firstChar =
                                                    preview.charAt(0);
                                                const rest = preview.slice(1);
                                                return (
                                                    <>
                                                        <span
                                                            style={{
                                                                color: 'var(--accent)',
                                                            }}
                                                        >
                                                            {firstChar}
                                                        </span>
                                                        {rest}
                                                    </>
                                                );
                                            })()}
                                        </WalletAddress>
                                    </WalletInfo>
                                    <CopyButton
                                        onClick={() =>
                                            copyWalletAddress(
                                                wallet.address,
                                                wallet.name,
                                            )
                                        }
                                    >
                                        Connect
                                    </CopyButton>
                                </WalletAddressRow>
                            ),
                        )}
                    </AddressShareModal>
                </Modal>
            )}
            <WalletsList title="Wallets">
                <WalletsPanel>
                    {sortWalletsForDisplay(activeWallet, wallets).map(
                        (wallet, index) =>
                            index === 0 ? (
                                <Wallet key={`${wallet.name}_${index}`}>
                                    <WalletRow>
                                        <ActiveWalletName className="notranslate">
                                            {wallet.name}
                                        </ActiveWalletName>
                                        <h4>(active)</h4>
                                        <SvgButtonPanel>
                                            <CopyIconButton
                                                name={`Copy address of ${wallet.name}`}
                                                data={wallet.address}
                                                showToast
                                            />
                                            <IconButton
                                                name={`Rename ${wallet.name}`}
                                                icon={<EditIcon />}
                                                onClick={() =>
                                                    setWalletToBeRenamed(wallet)
                                                }
                                            />
                                            <IconButton
                                                name={`Add ${wallet.name} to contacts`}
                                                icon={<AddContactIcon />}
                                                onClick={() =>
                                                    addWalletToContacts(wallet)
                                                }
                                            />
                                        </SvgButtonPanel>
                                    </WalletRow>
                                </Wallet>
                            ) : (
                                <Wallet key={`${wallet.name}_${index}`}>
                                    <WalletRow>
                                        <WalletName>
                                            <h3 className="overflow notranslate">
                                                {wallet.name}
                                            </h3>
                                        </WalletName>
                                    </WalletRow>
                                    <ActionsRow>
                                        <ButtonPanel>
                                            <SvgButtonPanel>
                                                <CopyIconButton
                                                    name={`Copy address of ${wallet.name}`}
                                                    data={wallet.address}
                                                    showToast
                                                />
                                                <IconButton
                                                    name={`Rename ${wallet.name}`}
                                                    icon={<EditIcon />}
                                                    onClick={() =>
                                                        setWalletToBeRenamed(
                                                            wallet,
                                                        )
                                                    }
                                                />
                                                <IconButton
                                                    name={`Add ${wallet.name} to contacts`}
                                                    icon={<AddContactIcon />}
                                                    onClick={() =>
                                                        addWalletToContacts(
                                                            wallet,
                                                        )
                                                    }
                                                />
                                                <IconButton
                                                    name={`Delete ${wallet.name}`}
                                                    icon={<TrashcanIcon />}
                                                    onClick={() =>
                                                        setWalletToBeDeleted(
                                                            wallet,
                                                        )
                                                    }
                                                />
                                            </SvgButtonPanel>
                                            <ActivateButton
                                                aria-label={`Activate ${wallet.name}`}
                                                onClick={debounce(
                                                    () =>
                                                        activateWallet(wallet),
                                                    500,
                                                )}
                                            >
                                                Activate
                                            </ActivateButton>
                                        </ButtonPanel>
                                    </ActionsRow>
                                </Wallet>
                            ),
                    )}
                </WalletsPanel>
                <WalletRow>
                    <PrimaryButton onClick={() => addNewWallet()}>
                        New Wallet
                    </PrimaryButton>
                </WalletRow>
                <WalletRow>
                    <SecondaryButton
                        onClick={() => setShowImportWalletModal(true)}
                    >
                        Import Wallet
                    </SecondaryButton>
                </WalletRow>
            </WalletsList>
        </>
    );
};

export default Wallets;
