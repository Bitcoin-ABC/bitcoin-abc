// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import Modal from 'components/Common/Modal';
import { CashtabWallet } from 'wallet';

interface ExtensionProps {
    wallet: CashtabWallet | false;
}

const Extension: React.FC<ExtensionProps> = ({ wallet }) => {
    // Extension-only state fields
    const [showApproveAddressShareModal, setShowApproveAddressShareModal] =
        useState<boolean>(false);
    const [addressRequestTabId, setAddressRequestTabId] = useState<
        number | null
    >(null);
    const [addressRequestTabUrl, setAddressRequestTabUrl] =
        useState<string>('');

    // Extension storage get method
    const getObjectFromExtensionStorage = async function (
        key: string,
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.get(key, function (value) {
                    resolve(value[key]);
                });
            } catch (err) {
                reject(err);
            }
        });
    };

    const copyAddressToExtensionStorage = async (
        wallet: CashtabWallet | false,
    ): Promise<void> => {
        // Get address from active wallet
        if (wallet === false) {
            // The wallet object can be 'false' when Cashtab first loads. In this case, we want this function to do nothing.
            return;
        }

        let address: string;
        try {
            address = wallet.paths.get(1899).address;
        } catch {
            // Handle any other errors
            return;
        }
        // Save the address to extension storage API

        // Check for stored value
        const storedAddress = await getObjectFromExtensionStorage('address');
        if (address === storedAddress) {
            // No need to store it again
            return;
        }

        // If the address has not been set (or if the user has changed wallets since it was last set), set it
        await chrome.storage.sync.set({ address: address }, function () {
            console.info(
                `Address ${address} saved to storage under key 'address'`,
            );
        });
    };

    const handleApprovedAddressShare = async (): Promise<void> => {
        if (addressRequestTabId === null) return;

        await chrome.tabs.sendMessage(addressRequestTabId, {
            type: 'FROM_CASHTAB',
            text: 'Cashtab',
            addressRequestApproved: true,
            url: addressRequestTabUrl,
            tabId: addressRequestTabId,
        });
        setShowApproveAddressShareModal(false);
        // Close the popup after user action
        window.close();
    };

    const handleRejectedAddressShare = async (): Promise<void> => {
        if (addressRequestTabId === null) return;

        await chrome.tabs.sendMessage(addressRequestTabId, {
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
        // On wallet change
        copyAddressToExtensionStorage(wallet);
    }, [wallet]);

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
                    title={`Share your address?`}
                    description={`The web page ${addressRequestTabUrl} is requesting your
                        eCash address.`}
                    handleOk={() => handleApprovedAddressShare()}
                    handleCancel={() => handleRejectedAddressShare()}
                    showCancelButton
                />
            )}
        </>
    );
};

export default Extension;
