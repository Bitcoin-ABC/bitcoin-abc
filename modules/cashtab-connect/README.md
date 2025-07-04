# Cashtab Connect

A developer-friendly API for integrating with the Cashtab browser extension. This library provides a clean, TypeScript-first interface for requesting user addresses and creating transactions through the Cashtab wallet extension.

## Installation

```bash
npm install cashtab-connect
```

```bash
yarn add cashtab-connect
```

## Quick Start

```typescript
import { CashtabConnect } from 'cashtab-connect';

// Create an instance
const cashtab = new CashtabConnect();

// Wait for the extension to become available
async function initializeCashtab() {
    try {
        await cashtab.waitForExtension();
        console.log('Cashtab extension is available!');

        // Now you can safely use the extension
        const address = await cashtab.requestAddress();
        console.log('User address:', address);
    } catch (error) {
        console.error('Extension not available:', error.message);
    }
}

// Initialize when your app loads
await initializeCashtab();
```

## API Reference

### CashtabConnect Class

The main class for interacting with the Cashtab extension.

#### Constructor

```typescript
new CashtabConnect(options?: CashtabConnectOptions)
```

**Options:**

-   `timeout` (number): Timeout in milliseconds for address requests (default: 30000)
-   `extensionNotAvailableMessage` (string): Custom error message when extension is not available
-   `addressDeniedMessage` (string): Custom error message when user denies address request

#### Methods

##### `waitForExtension(timeout?: number): Promise<void>`

Wait for the Cashtab extension to become available. This is the recommended way to check for extension availability.

**Parameters:**

-   `timeout` (number): Maximum time to wait in milliseconds (default: 3000). In practice this usually takes less than 1s.

**Returns:** Promise that resolves when extension is available or rejects on timeout.

**Example:**

```typescript
try {
    await cashtab.waitForExtension();
    console.log('Extension is ready!');
} catch (error) {
    console.log('Extension not available within timeout');
}
```

##### `isExtensionAvailable(): Promise<boolean>`

Check if the extension is currently available without waiting.

**Returns:** Promise that resolves to true if extension is available, false otherwise.

**Example:**

```typescript
const isAvailable = await cashtab.isExtensionAvailable();
if (isAvailable) {
    // Extension is ready to use
} else {
    // Extension is not available
}
```

##### `requestAddress(): Promise<string>`

Request the user's eCash address from their Cashtab wallet.

**Returns:** Promise that resolves with the user's address or rejects with an error.

**Throws:**

-   `ExtensionNotAvailableError`: When the Cashtab extension is not available
-   `AddressRequestDeniedError`: When the user denies the address request (includes reason)
-   `AddressRequestTimeoutError`: When the request times out

**Example:**

```typescript
try {
    const address = await cashtab.requestAddress();
    console.log('User address:', address);
} catch (error) {
    if (error instanceof CashtabExtensionUnavailableError) {
        console.log('Please install the Cashtab extension');
    } else if (error instanceof CashtabAddressDeniedError) {
        console.log('User denied address request');
    }
}
```

##### `sendXec(address: string, amount: string | number): Promise<void>`

Send XEC to an address using Cashtab (dev-friendly).

**Parameters:**

-   `address` (string): Recipient's eCash address
-   `amount` (string | number): Amount to send in XEC

**Throws:**

-   `CashtabExtensionUnavailableError`: When the Cashtab extension is not available

**Example:**

```typescript
cashtab.sendXec('ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0', '1000.12');
```

### Error Classes

#### CashtabExtensionUnavailableError

Thrown when the Cashtab extension is not available.

#### CashtabAddressDeniedError

Thrown when the user denies an address request.

#### CashtabTimeoutError

Thrown when an address request times out.

## Advanced Usage

### Custom Instance

Create a custom instance with specific timeout:

```typescript
import { CashtabConnect } from 'cashtab-connect';

const cashtab = new CashtabConnect(60000); // 60 second timeout for address requests
```

### Error Handling

Comprehensive error handling example:

```typescript
import {
    CashtabConnect,
    CashtabExtensionUnavailableError,
    CashtabAddressDeniedError,
    CashtabTimeoutError,
} from 'cashtab-connect';

async function requestUserAddress() {
    const cashtab = new CashtabConnect();

    try {
        const address = await cashtab.requestAddress();
        return address;
    } catch (error) {
        if (error instanceof CashtabExtensionUnavailableError) {
            // Show installation instructions
            showInstallationInstructions();
        } else if (error instanceof CashtabAddressDeniedError) {
            // Show alternative payment methods
            showAlternativePaymentMethods();
        } else if (error instanceof CashtabTimeoutError) {
            // Retry or show timeout message
            showTimeoutMessage();
        } else {
            // Handle unexpected errors
            console.error('Unexpected error:', error);
        }
        throw error;
    }
}
```

## Browser Compatibility

This library works in all modern browsers that support:

-   ES2020 features
-   TypeScript
-   Browser extensions (Chrome, Firefox, Edge)

## Prerequisites

-   The Cashtab browser extension must be installed and active
-   The extension injects a global flag `window.bitcoinAbc = 'cashtab'` when available

## Security Considerations

1. **User Consent**: All address requests require explicit user approval through a popup
2. **Transaction Review**: Transaction creation opens Cashtab for user review before sending
3. **Origin Validation**: The extension only accepts messages from the same window

## Troubleshooting

### Extension Not Detected

1. Ensure the Cashtab extension is installed
2. Check that the extension is enabled
3. Verify the extension is compatible with your browser
4. Use `waitForExtension()` instead of checking availability immediately on page load

### Address Request Fails

1. Check that the user approves the request in the popup
2. Verify the extension is available before making requests using `waitForExtension()`
3. Handle timeout errors appropriately

### Transaction Not Opening

1. Check that the address and amount parameters are valid
2. Ensure the extension is available using `waitForExtension()`
3. Verify the address format is correct

## Examples

### React Component

```tsx
import React, { useEffect, useState } from 'react';
import {
    CashtabConnect,
    CashtabExtensionUnavailableError,
    CashtabAddressDeniedError,
    CashtabTimeoutError,
} from 'cashtab-connect';

function CashtabIntegration() {
    const [address, setAddress] = useState<string | null>(null);
    const [isExtensionAvailable, setIsExtensionAvailable] = useState(false);
    const [isCheckingExtension, setIsCheckingExtension] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [addressResult, setAddressResult] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);

    // Initialize CashtabConnect in state
    const [cashtab] = useState(() => new CashtabConnect());

    // Check extension availability on mount
    useEffect(() => {
        const checkAvailability = async () => {
            try {
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

    const handleRequestAddress = async () => {
        setIsLoading(true);
        setAddressResult(null);

        try {
            const userAddress = await cashtab.requestAddress();
            setAddress(userAddress);
            setAddressResult({
                message: `Address received: ${userAddress}`,
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

    const handleSendXec = () => {
        cashtab.sendXec(
            'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0',
            '1000.12',
        );
    };

    if (isCheckingExtension) {
        return <div>Checking for Cashtab extension...</div>;
    }

    return (
        <div>
            <p>
                Cashtab Extension:{' '}
                {isExtensionAvailable ? 'Available' : 'Not Available'}
            </p>
            {address && <p>User Address: {address}</p>}
            {addressResult && (
                <p
                    style={{
                        color:
                            addressResult.type === 'success' ? 'green' : 'red',
                    }}
                >
                    {addressResult.message}
                </p>
            )}
            <button
                onClick={handleRequestAddress}
                disabled={!isExtensionAvailable || isLoading}
            >
                {isLoading ? 'Requesting...' : 'Request Address'}
            </button>
            <button onClick={handleSendXec} disabled={!isExtensionAvailable}>
                Send XEC
            </button>
        </div>
    );
}
```

## Development

### Running Tests

```bash
npm test
```

### Running the Demo

The library includes a React demo application that showcases all features:

```bash
npm start
```

Then open `http://localhost:3000` in your browser. The demo requires the Cashtab browser extension to be installed.

The React demo demonstrates:

-   Extension status detection
-   Address requests with network selection
-   Transaction creation with form validation
-   Error handling for various scenarios
-   Real-time event logging
-   Both class-based and convenience function usage patterns

See the [demo README](demo/README.md) for more details.

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## License

MIT License - see COPYING file at top level of the monorepo for details.

## Support

For support, please visit the [Cashtab documentation](https://cashtab.com/) or [GitHub repository](https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/cashtab).
