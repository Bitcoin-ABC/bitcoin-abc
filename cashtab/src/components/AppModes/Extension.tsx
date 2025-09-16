// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import Modal from 'components/Common/Modal';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import {
    ActiveCashtabWallet,
    StoredCashtabWallet,
    sortWalletsForDisplay,
} from 'wallet';
import { Event } from 'components/Common/GoogleAnalytics';
import { previewAddress } from 'helpers';
import {
    AddressShareModal,
    WalletAddressRow,
    WalletInfo,
    WalletNameText,
    WalletAddress,
    CopyButton,
    ActiveIndicator,
} from 'components/Wallets/styles';

const Extension: React.FC = () => {
    // Extension-only state fields
    const [showApproveAddressShareModal, setShowApproveAddressShareModal] =
        useState<boolean>(false);
    const [addressRequestTabId, setAddressRequestTabId] = useState<
        number | null
    >(null);
    const [addressRequestTabUrl, setAddressRequestTabUrl] =
        useState<string>('');

    // Get wallet context
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // If wallet context is not loaded, show loading or return null
        return null;
    }
    const { cashtabState, handleActivatingCopiedWallet } = ContextValue;
    const { wallets, activeWallet } = cashtabState;

    if (!activeWallet) {
        return null;
    }

    const sortedWallets = sortWalletsForDisplay(activeWallet, wallets);

    /**
     * Handle wallet connection - activate wallet and share address
     */
    const handleWalletConnect = async (
        wallet: ActiveCashtabWallet | StoredCashtabWallet,
    ): Promise<void> => {
        if (addressRequestTabId === null) return;

        // If the selected wallet is not the active wallet, activate it first
        if (activeWallet.address !== wallet.address) {
            // Event("Category", "Action", "Label")
            // Track number of times a different wallet is activated
            Event('Extension.js', 'Activate', '');

            // Only update the activeWalletAddress in storage for address sharing
            await handleActivatingCopiedWallet(wallet.address);
        }

        // Send the address approval to the service worker
        await chrome.runtime.sendMessage({
            type: 'FROM_CASHTAB',
            text: 'Cashtab',
            addressRequestApproved: true,
            url: addressRequestTabUrl,
            tabId: addressRequestTabId,
            address: wallet.address,
        });

        setShowApproveAddressShareModal(false);
        // Close the popup after user action
        window.close();
    };

    const handleRejectedAddressShare = async (): Promise<void> => {
        if (addressRequestTabId === null) return;

        await chrome.runtime.sendMessage({
            type: 'FROM_CASHTAB',
            text: 'Cashtab',
            addressRequestApproved: false,
            url: addressRequestTabUrl,
            tabId: addressRequestTabId,
        });
        setShowApproveAddressShareModal(false);
        // Close the popup after user action
        window.close();
    };

    useEffect(() => {
        // On load

        // Parse for query string asking for user approval of sharing extension info with a web page
        // Do not set txInfo in state if query strings are not present
        if (
            !window.location ||
            !window.location.hash ||
            window.location.hash === '#/wallet'
        ) {
            return;
        }

        try {
            const windowHash = window.location.hash;
            const queryStringArray = windowHash.split('#/wallet?');
            const queryString = queryStringArray[1];
            const queryStringParams = new URLSearchParams(queryString);
            const request = queryStringParams.get('request');
            const tabId = parseInt(queryStringParams.get('tabId') || '0');
            const tabUrl = queryStringParams.get('tabUrl') || '';
            if (request !== 'addressRequest') {
                return;
            }

            // Open a modal that asks for user approval
            setAddressRequestTabId(tabId);
            setAddressRequestTabUrl(tabUrl);
            setShowApproveAddressShareModal(true);
        } catch {
            // If you can't parse this, forget about it
            return;
        }

        // Modal onApprove function should post a message that gets to background.js
    }, []);

    return (
        <>
            {showApproveAddressShareModal && (
                <Modal
                    height={400}
                    title="Connect Wallet"
                    description={`Wallet connect request from ${
                        new URL(addressRequestTabUrl).hostname
                    }`}
                    handleCancel={() => setShowApproveAddressShareModal(false)}
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
                                onClick={() => handleRejectedAddressShare()}
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
                        {sortedWallets.map((wallet, index) => (
                            <WalletAddressRow key={`${wallet.name}_${index}`}>
                                <WalletInfo>
                                    <WalletNameText>
                                        {wallet.name}
                                        {activeWallet.address ===
                                            wallet.address && (
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
                                            const firstChar = preview.charAt(0);
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
                                    onClick={() => handleWalletConnect(wallet)}
                                >
                                    Connect
                                </CopyButton>
                            </WalletAddressRow>
                        ))}
                    </AddressShareModal>
                </Modal>
            )}
        </>
    );
};

export default Extension;
