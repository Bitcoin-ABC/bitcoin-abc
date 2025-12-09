// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import {
    CashtabConnect,
    CashtabExtensionUnavailableError,
    CashtabAddressDeniedError,
    CashtabTransactionDeniedError,
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
            const response = await cashtab.sendXec(txAddress, txAmount);
            if (response.success && response.txid) {
                setTxResult({
                    message: `Transaction approved! TXID: ${response.txid}`,
                    type: 'success',
                });
            } else {
                setTxResult({
                    message: response.reason || 'Transaction was rejected',
                    type: 'error',
                });
            }
            setTxAddress('ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0');
            setTxAmount('100');
        } catch (error) {
            let errorMessage = 'Failed to create transaction';

            if (error instanceof CashtabExtensionUnavailableError) {
                errorMessage = 'Extension is not available';
            } else if (error instanceof CashtabTransactionDeniedError) {
                errorMessage = 'User denied the transaction';
            } else if (error instanceof CashtabTimeoutError) {
                errorMessage = 'Transaction request timed out';
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

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
            const response = await cashtab.sendToken(
                txAddress,
                tokenId,
                tokenQty,
            );
            if (response.success && response.txid) {
                setTokenResult({
                    message: `Token transaction approved! TXID: ${response.txid}`,
                    type: 'success',
                });
            } else {
                setTokenResult({
                    message:
                        response.reason || 'Token transaction was rejected',
                    type: 'error',
                });
            }
            setTokenId(
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
            );
            setTokenQty('1.1234');
        } catch (error) {
            let errorMessage = 'Failed to create token transaction';

            if (error instanceof CashtabExtensionUnavailableError) {
                errorMessage = 'Extension is not available';
            } else if (error instanceof CashtabTransactionDeniedError) {
                errorMessage = 'User denied the token transaction';
            } else if (error instanceof CashtabTimeoutError) {
                errorMessage = 'Token transaction request timed out';
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

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
            const response = await cashtab.sendBip21(bip21);
            if (response.success && response.txid) {
                setBip21Result({
                    message: `BIP21 transaction approved! TXID: ${response.txid}`,
                    type: 'success',
                });
            } else {
                setBip21Result({
                    message:
                        response.reason || 'BIP21 transaction was rejected',
                    type: 'error',
                });
            }
            setBip21(
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035?op_return_raw=0401020304',
            );
        } catch (error) {
            let errorMessage = 'Failed to create BIP21 transaction';

            if (error instanceof CashtabExtensionUnavailableError) {
                errorMessage = 'Extension is not available';
            } else if (error instanceof CashtabTransactionDeniedError) {
                errorMessage = 'User denied the BIP21 transaction';
            } else if (error instanceof CashtabTimeoutError) {
                errorMessage = 'BIP21 transaction request timed out';
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

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
                                    : 'unavailable'
                            }`}
                        />
                        <span>
                            {isCheckingExtension
                                ? 'Checking...'
                                : isExtensionAvailable
                                  ? 'Extension Available'
                                  : 'Extension Not Available'}
                        </span>
                    </div>
                </section>

                {/* Address Request */}
                <section className="demo-section">
                    <h2>Request Address</h2>
                    <p>
                        Request the user's eCash address from their Cashtab
                        wallet.
                    </p>
                    <button
                        onClick={handleRequestAddress}
                        disabled={!isExtensionAvailable || isLoading}
                        className="demo-button"
                    >
                        {isLoading ? 'Requesting...' : 'Request Address'}
                    </button>
                    {currentAddress && (
                        <div className="result">
                            <strong>Current Address:</strong> {currentAddress}
                        </div>
                    )}
                    {addressResult && (
                        <div className={`result ${addressResult.type}`}>
                            {addressResult.message}
                        </div>
                    )}
                </section>

                {/* XEC Transaction */}
                <section className="demo-section">
                    <h2>Send XEC</h2>
                    <p>Create a transaction to send XEC to an address.</p>
                    <div className="form-group">
                        <label htmlFor="txAddress">Address:</label>
                        <input
                            id="txAddress"
                            type="text"
                            value={txAddress}
                            onChange={e => setTxAddress(e.target.value)}
                            placeholder="eCash address"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="txAmount">Amount (XEC):</label>
                        <input
                            id="txAmount"
                            type="text"
                            value={txAmount}
                            onChange={e => setTxAmount(e.target.value)}
                            placeholder="0.001"
                        />
                    </div>
                    <button
                        onClick={handleSendXec}
                        disabled={!isExtensionAvailable}
                        className="demo-button"
                    >
                        Send XEC
                    </button>
                    {txResult && (
                        <div className={`result ${txResult.type}`}>
                            {txResult.type === 'error' &&
                            txResult.message
                                .toLowerCase()
                                .includes('reject') ? (
                                <span
                                    style={{ color: 'red', fontWeight: 'bold' }}
                                >
                                    Transaction rejected by user
                                </span>
                            ) : txResult.type === 'success' &&
                              txResult.message.includes('TXID:') ? (
                                <span
                                    style={{
                                        color: 'green',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Transaction approved!
                                    <br />
                                    TXID:{' '}
                                    <code
                                        style={{
                                            background: '#eee',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {txResult.message
                                            .split('TXID:')[1]
                                            .trim()}
                                    </code>
                                </span>
                            ) : (
                                txResult.message
                            )}
                        </div>
                    )}
                </section>

                {/* Token Transaction */}
                <section className="demo-section">
                    <h2>Send Token</h2>
                    <p>Create a transaction to send tokens to an address.</p>
                    <div className="form-group">
                        <label htmlFor="tokenAddress">Address:</label>
                        <input
                            id="tokenAddress"
                            type="text"
                            value={txAddress}
                            onChange={e => setTxAddress(e.target.value)}
                            placeholder="eCash address"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="tokenId">Token ID:</label>
                        <input
                            id="tokenId"
                            type="text"
                            value={tokenId}
                            onChange={e => setTokenId(e.target.value)}
                            placeholder="Token ID"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="tokenQty">Quantity:</label>
                        <input
                            id="tokenQty"
                            type="text"
                            value={tokenQty}
                            onChange={e => setTokenQty(e.target.value)}
                            placeholder="1.0"
                        />
                    </div>
                    <button
                        onClick={handleSendToken}
                        disabled={!isExtensionAvailable}
                        className="demo-button"
                    >
                        Send Token
                    </button>
                    {tokenResult && (
                        <div className={`result ${tokenResult.type}`}>
                            {tokenResult.type === 'error' &&
                            tokenResult.message
                                .toLowerCase()
                                .includes('reject') ? (
                                <span
                                    style={{ color: 'red', fontWeight: 'bold' }}
                                >
                                    Token transaction rejected by user
                                </span>
                            ) : tokenResult.type === 'success' &&
                              tokenResult.message.includes('TXID:') ? (
                                <span
                                    style={{
                                        color: 'green',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Token transaction approved!
                                    <br />
                                    TXID:{' '}
                                    <code
                                        style={{
                                            background: '#eee',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {tokenResult.message
                                            .split('TXID:')[1]
                                            .trim()}
                                    </code>
                                </span>
                            ) : (
                                tokenResult.message
                            )}
                        </div>
                    )}
                </section>

                {/* BIP21 Transaction */}
                <section className="demo-section">
                    <h2>Send BIP21</h2>
                    <p>Create a transaction using a raw BIP21 URI string.</p>
                    <div className="form-group">
                        <label htmlFor="bip21">BIP21 URI:</label>
                        <textarea
                            id="bip21"
                            value={bip21}
                            onChange={e => setBip21(e.target.value)}
                            placeholder="ecash:address?amount=0.001&memo=Payment"
                            rows={3}
                        />
                    </div>
                    <button
                        onClick={handleSendBip21}
                        disabled={!isExtensionAvailable}
                        className="demo-button"
                    >
                        Send BIP21
                    </button>
                    {bip21Result && (
                        <div className={`result ${bip21Result.type}`}>
                            {bip21Result.type === 'error' &&
                            bip21Result.message
                                .toLowerCase()
                                .includes('reject') ? (
                                <span
                                    style={{ color: 'red', fontWeight: 'bold' }}
                                >
                                    BIP21 transaction rejected by user
                                </span>
                            ) : bip21Result.type === 'success' &&
                              bip21Result.message.includes('TXID:') ? (
                                <span
                                    style={{
                                        color: 'green',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    BIP21 transaction approved!
                                    <br />
                                    TXID:{' '}
                                    <code
                                        style={{
                                            background: '#eee',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {bip21Result.message
                                            .split('TXID:')[1]
                                            .trim()}
                                    </code>
                                </span>
                            ) : (
                                bip21Result.message
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;
