// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import Modal from 'components/Common/Modal';

const Extension: React.FC = () => {
    // Extension-only state fields
    const [showApproveAddressShareModal, setShowApproveAddressShareModal] =
        useState<boolean>(false);
    const [addressRequestTabId, setAddressRequestTabId] = useState<
        number | null
    >(null);
    const [addressRequestTabUrl, setAddressRequestTabUrl] =
        useState<string>('');

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
