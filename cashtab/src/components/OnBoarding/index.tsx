// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import { WalletContext } from 'wallet/context';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';
import { Event } from 'components/Common/GoogleAnalytics';
import { validateMnemonic } from 'validation';
import appConfig from 'config/app';
import { createCashtabWallet, generateMnemonic } from 'wallet';
import { WelcomeCtn, WelcomeLink, WelcomeText } from './styles';
import Modal from 'components/Common/Modal';
import { ModalTextArea } from 'components/Common/Inputs';

const OnBoarding = () => {
    const ContextValue = React.useContext(WalletContext);
    const { updateCashtabState } = ContextValue;

    const [importedMnemonic, setImportedMnemonic] = useState<string>('');
    const [showImportWalletModal, setShowImportWalletModal] =
        useState<boolean>(false);
    const [isImportingWallet, setIsImportingWallet] = useState<boolean>(false);
    // Initialize as true so that validation error only renders after user input
    const [isValidMnemonic, setIsValidMnemonic] = useState<boolean>(true);

    async function importWallet(): Promise<void> {
        if (isImportingWallet) {
            return;
        }
        setIsImportingWallet(true);
        // Event("Category", "Action", "Label")
        // Track number of created wallets from onboarding
        Event('Onboarding.js', 'Create Wallet', 'Imported');
        try {
            const importedWallet = createCashtabWallet(importedMnemonic);
            // Set activeWalletAddress in CashtabState (this also persists to storage)
            // This will trigger initializeWallet() in useWallet
            await updateCashtabState({
                wallets: [importedWallet],
                activeWalletAddress: importedWallet.address,
            });
            // Close the modal
            setShowImportWalletModal(false);
        } catch (err) {
            console.error('Error importing wallet from onboarding', err);
        } finally {
            setIsImportingWallet(false);
        }
    }

    async function createNewWallet(): Promise<void> {
        // Event("Category", "Action", "Label")
        // Track number of created wallets from onboarding
        Event('Onboarding.js', 'Create Wallet', 'New');
        const newWallet = createCashtabWallet(generateMnemonic());
        // Set activeWalletAddress in CashtabState (this also persists to storage)
        // This will trigger initializeWallet() in useWallet
        await updateCashtabState({
            wallets: [newWallet],
            activeWalletAddress: newWallet.address,
        });
    }

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;

        // Validate mnemonic on change
        // Import button should be disabled unless mnemonic is valid
        setIsValidMnemonic(validateMnemonic(value));

        setImportedMnemonic(value);
    };

    return (
        <>
            {showImportWalletModal && (
                <Modal
                    height={265}
                    title={`Import wallet`}
                    handleOk={importWallet}
                    handleCancel={() => {
                        setShowImportWalletModal(false);
                        setIsImportingWallet(false);
                    }}
                    showCancelButton
                    disabled={
                        !isValidMnemonic ||
                        importedMnemonic === '' ||
                        isImportingWallet
                    }
                    isConfirmLoading={isImportingWallet}
                >
                    <ModalTextArea
                        placeholder="mnemonic (seed phrase)"
                        name="mnemonic"
                        value={importedMnemonic}
                        error={
                            isValidMnemonic
                                ? false
                                : 'Invalid 12-word mnemonic. Note: all letters must be lowercase.'
                        }
                        handleInput={handleInput}
                        height={96}
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </Modal>
            )}

            <WelcomeCtn>
                <h2>Welcome to Cashtab!</h2>
                <WelcomeText>
                    Cashtab is an{' '}
                    <WelcomeLink
                        href="https://github.com/bitcoin-abc/bitcoin-abc"
                        target="_blank"
                        rel="noreferrer"
                    >
                        open source,
                    </WelcomeLink>{' '}
                    non-custodial web wallet for {appConfig.name}.
                </WelcomeText>

                <PrimaryButton onClick={() => createNewWallet()}>
                    New Wallet
                </PrimaryButton>

                <SecondaryButton onClick={() => setShowImportWalletModal(true)}>
                    Import Wallet
                </SecondaryButton>
            </WelcomeCtn>
        </>
    );
};

export default OnBoarding;
