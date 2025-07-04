// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import {
    CashtabConnect,
    CashtabExtensionUnavailableError,
    CashtabAddressDeniedError,
    CashtabTimeoutError,
} from 'cashtab-connect';
import './App.css';

function App() {
    const [isExtensionAvailable, setIsExtensionAvailable] =
        useState<boolean>(false);
    const [isCheckingExtension, setIsCheckingExtension] =
        useState<boolean>(true);
    const [currentAddress, setCurrentAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [addressResult, setAddressResult] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);
    const [txResult, setTxResult] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);
    const [tokenResult, setTokenResult] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);

    // Transaction form state
    const [txAddress, setTxAddress] = useState<string>(
        'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
    );
    const [txAmount, setTxAmount] = useState<string>('100');
    // Token send state
    const [tokenId, setTokenId] = useState<string>(
        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
    );
    const [tokenQty, setTokenQty] = useState<string>('1.1234');
    // Raw BIP21 state
    const [bip21, setBip21] = useState<string>(
        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035?op_return_raw=0401020304',
    );
    const [bip21Result, setBip21Result] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);

    // Initialize CashtabConnect
    const [cashtab] = useState(() => new CashtabConnect());

    // Check extension availability on mount
    useEffect(() => {
        const checkAvailability = async () => {
            try {
                // Try to wait for the extension to become available
                await cashtab.waitForExtension();
                setIsExtensionAvailable(true);
                setIsCheckingExtension(false);
            } catch (error) {
                console.log('Extension not available after waiting:', error);
                setIsCheckingExtension(false);
            }
        };

        checkAvailability();
    }, [cashtab]);

    // Handle address request
    const handleRequestAddress = async () => {
        setIsLoading(true);
        setAddressResult(null);

        try {
            const address = await cashtab.requestAddress();
            setCurrentAddress(address);
            setAddressResult({
                message: `Address received: ${address}`,
                type: 'success',
            });
        } catch (error) {
            let errorMessage = 'Unknown error occurred';

            if (error instanceof CashtabExtensionUnavailableError) {
                errorMessage = 'Extension is not available';
            } else if (error instanceof CashtabAddressDeniedError) {
                errorMessage = 'User denied the address request';
            } else if (error instanceof CashtabTimeoutError) {
                errorMessage = 'Address request timed out';
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            setAddressResult({ message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle XEC transaction creation
    const handleSendXec = async () => {
        if (!txAddress || !txAmount) {
            setTxResult({
                message: 'Please fill in all required fields',
                type: 'error',
            });
            return;
        }
        try {
            await cashtab.sendXec(txAddress, txAmount);
            setTxResult({
                message: 'Transaction window opened in Cashtab',
                type: 'success',
            });
            setTxAddress('ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0');
            setTxAmount('100');
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to create transaction';
            setTxResult({ message: errorMessage, type: 'error' });
        }
    };

    // Handle token transaction creation
    const handleSendToken = async () => {
        if (!txAddress || !tokenId || !tokenQty) {
            setTokenResult({
                message: 'Please fill in all required fields',
                type: 'error',
            });
            return;
        }
        try {
            await cashtab.sendToken(txAddress, tokenId, tokenQty);
            setTokenResult({
                message: 'Token transaction window opened in Cashtab',
                type: 'success',
            });
            setTokenId(
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
            );
            setTokenQty('1.1234');
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to create token transaction';
            setTokenResult({ message: errorMessage, type: 'error' });
        }
    };

    // Handle raw BIP21 send
    const handleSendBip21 = async () => {
        if (!bip21) {
            setBip21Result({
                message: 'Please enter a BIP21 string',
                type: 'error',
            });
            return;
        }
        try {
            await cashtab.sendBip21(bip21);
            setBip21Result({
                message: 'BIP21 transaction window opened in Cashtab',
                type: 'success',
            });
            setBip21(
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035?op_return_raw=0401020304',
            );
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to create BIP21 transaction';
            setBip21Result({ message: errorMessage, type: 'error' });
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Cashtab Connect Demo</h1>
                <p>Test the Cashtab browser extension integration</p>
            </header>

            <main className="App-main">
                {/* Extension Status */}
                <section className="demo-section">
                    <h2>Extension Status</h2>
                    <div className="status-indicator">
                        <div
                            className={`status-dot ${
                                isExtensionAvailable
                                    ? 'available'
                                    : isCheckingExtension
                                    ? 'checking'
                                    : 'unavailable'
                            }`}
                        ></div>
                        <span className="status-text">
                            {isExtensionAvailable
                                ? 'Extension Available'
                                : isCheckingExtension
                                ? 'Checking for Extension...'
                                : 'Extension Not Available'}
                        </span>
                    </div>
                    <p>
                        {isExtensionAvailable
                            ? 'Great! The Cashtab extension is detected and ready to use.'
                            : isCheckingExtension
                            ? "Looking for the Cashtab browser extension... Please make sure it's installed and enabled."
                            : 'The Cashtab browser extension is not available. Please install it and refresh the page.'}
                    </p>
                    {!isExtensionAvailable && !isCheckingExtension && (
                        <div className="demo-controls">
                            <a
                                href="https://chromewebstore.google.com/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="demo-button primary"
                                style={{
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                }}
                            >
                                Download Cashtab Extension
                            </a>
                        </div>
                    )}
                </section>

                {/* Address Request */}
                <section className="demo-section">
                    <h2>Request Address</h2>
                    <p>
                        Request the user's eCash address from their Cashtab
                        wallet.
                    </p>

                    <div className="demo-controls">
                        <button
                            onClick={handleRequestAddress}
                            disabled={!isExtensionAvailable || isLoading}
                            className="demo-button primary"
                        >
                            {isLoading ? 'Requesting...' : 'Request Address'}
                        </button>
                    </div>

                    {addressResult && (
                        <div className={`result ${addressResult.type}`}>
                            {addressResult.message}
                        </div>
                    )}

                    {currentAddress && (
                        <div className="address-display">
                            <h3>Current Address:</h3>
                            <code>{currentAddress}</code>
                        </div>
                    )}
                </section>

                {/* Transaction Creation */}
                <section className="demo-section">
                    <h2>Send XEC</h2>
                    <p>
                        Send XEC using Cashtab Connect (BIP21 under the hood).
                    </p>
                    <div className="form-group">
                        <label htmlFor="tx-address">Recipient Address:</label>
                        <input
                            id="tx-address"
                            type="text"
                            value={txAddress}
                            onChange={e => setTxAddress(e.target.value)}
                            placeholder="Enter eCash address"
                            disabled={!isExtensionAvailable}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="tx-amount">Amount (XEC):</label>
                        <input
                            id="tx-amount"
                            type="number"
                            value={txAmount}
                            onChange={e => setTxAmount(e.target.value)}
                            placeholder="Enter amount in XEC"
                            disabled={!isExtensionAvailable}
                        />
                    </div>

                    <div className="demo-controls">
                        <button
                            onClick={handleSendXec}
                            disabled={
                                !isExtensionAvailable || !txAddress || !txAmount
                            }
                            className="demo-button secondary"
                        >
                            Send XEC
                        </button>
                    </div>
                    {txResult && (
                        <div className={`result ${txResult.type}`}>
                            {txResult.message}
                        </div>
                    )}
                </section>
                <section className="demo-section">
                    <h2>Send Token</h2>
                    <p>
                        Send a token using Cashtab Connect (BIP21 under the
                        hood).
                    </p>
                    <div className="form-group">
                        <label htmlFor="token-id">Token ID:</label>
                        <input
                            id="token-id"
                            type="text"
                            value={tokenId}
                            onChange={e => setTokenId(e.target.value)}
                            placeholder="Enter token ID"
                            disabled={!isExtensionAvailable}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="token-qty">
                            Token Quantity (decimalized):
                        </label>
                        <input
                            id="token-qty"
                            type="number"
                            value={tokenQty}
                            onChange={e => setTokenQty(e.target.value)}
                            placeholder="Enter token quantity"
                            disabled={!isExtensionAvailable}
                        />
                    </div>

                    <div className="demo-controls">
                        <button
                            onClick={handleSendToken}
                            disabled={
                                !isExtensionAvailable ||
                                !txAddress ||
                                !tokenId ||
                                !tokenQty
                            }
                            className="demo-button secondary"
                        >
                            Send Token
                        </button>
                    </div>
                    {tokenResult && (
                        <div className={`result ${tokenResult.type}`}>
                            {tokenResult.message}
                        </div>
                    )}
                </section>
                <section className="demo-section">
                    <h2>Send Raw BIP21</h2>
                    <p>
                        Advanced: Send a raw BIP21 string using Cashtab Connect.
                    </p>
                    <div className="form-group">
                        <label htmlFor="bip21">BIP21 String:</label>
                        <input
                            id="bip21"
                            type="text"
                            value={bip21}
                            onChange={e => setBip21(e.target.value)}
                            placeholder="ecash:qq...?..."
                            disabled={!isExtensionAvailable}
                        />
                    </div>
                    <div className="demo-controls">
                        <button
                            onClick={handleSendBip21}
                            disabled={!isExtensionAvailable || !bip21}
                            className="demo-button secondary"
                        >
                            Send BIP21
                        </button>
                    </div>
                    {bip21Result && (
                        <div className={`result ${bip21Result.type}`}>
                            {bip21Result.message}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;
