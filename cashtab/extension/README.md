# Cashtab Extension API

The Cashtab browser extension provides a messaging API that allows websites to interact with the Cashtab wallet. This document describes how to integrate with the Cashtab extension from a web application.

## Overview

The Cashtab extension injects a script into web pages and listens for specific message types. Websites can send messages to request user actions like sharing an address or creating a transaction.

## Prerequisites

- The Cashtab extension must be installed and active in the user's browser
- The extension injects a global flag `window.bitcoinAbc = 'cashtab'` when available

## Message Format

All messages sent to the Cashtab extension must follow this format:

```javascript
{
    type: 'FROM_PAGE',
    // ... additional properties based on the request type
}
```

## API Methods

### 1. Request User Address

Request the user's eCash address from their Cashtab wallet.

**Message Format:**

```javascript
{
    type: 'FROM_PAGE',
    text: 'Cashtab',
    addressRequest: true
}
```

**Response:**
The extension will send a structured response message that your page can listen for:

```javascript
// Listen for the response
window.addEventListener('message', function (event) {
    if (event.data.type === 'FROM_CASHTAB') {
        if (event.data.success && event.data.address) {
            // User approved the request
            console.log('User address:', event.data.address);
        } else {
            // User denied the request
            console.log('Address request denied:', event.data.reason);
        }
    }
});
```

**Example Usage:**

```javascript
// Check if Cashtab extension is available
if (window.bitcoinAbc === 'cashtab') {
    // Request user's address
    window.postMessage(
        {
            type: 'FROM_PAGE',
            text: 'Cashtab',
            addressRequest: true,
        },
        '*',
    );
}
```

### 2. Create Transaction

Open Cashtab with pre-filled transaction details for the user to review and send.

**Message Format:**

```javascript
{
    type: 'FROM_PAGE',
    text: 'Cashtab',
    txInfo: {
        address: 'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0',
        amount: '0.001',
        // Additional transaction parameters as needed
    }
}
```

**Parameters:**

- `address` (string): The recipient's eCash address
- `amount` (string): The amount to send in XEC
- Additional parameters can be included in `txInfo` and will be passed as URL query parameters

**Example Usage:**

```javascript
if (window.bitcoinAbc === 'cashtab') {
    // Open Cashtab with transaction details
    window.postMessage(
        {
            type: 'FROM_PAGE',
            text: 'Cashtab',
            txInfo: {
                address: 'ecash:qp3wj05au4l7q2m5ng4qg0vpeejl42lvl0nqj8q0q0',
                amount: '0.001',
                label: 'Payment for services',
            },
        },
        '*',
    );
}
```

## Error Handling

### Extension Not Available

If the Cashtab extension is not installed or not active, `window.bitcoinAbc` will be undefined:

```javascript
if (typeof window.bitcoinAbc === 'undefined') {
    console.log('Cashtab extension not available');
    // Provide fallback or instructions to install the extension
}
```

### User Denies Request

When a user denies an address request, the response will contain a structured denial message:

```javascript
window.addEventListener('message', function (event) {
    if (event.data.type === 'FROM_CASHTAB') {
        if (!event.data.success) {
            console.log('User denied address request:', event.data.reason);
        } else {
            console.log('User address:', event.data.address);
        }
    }
});
```

## Security Considerations

1. **Origin Validation**: The extension only accepts messages from the same window (`event.source != window` check)
2. **User Consent**: All address requests require explicit user approval through a popup
3. **Transaction Review**: Transaction creation opens Cashtab for user review before sending

## Browser Compatibility

The Cashtab extension is available for:

- Chrome/Chromium-based browsers

## Extension IDs

- Development: `aleabaopoakgpbijdnicepefdiglggfl`
- [Production](https://chromewebstore.google.com/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag): `obldfcmebhllhjlhjbnghaipekcppeag`

## Complete Integration Example

See `cashtab-connect` in `/modules/cashtab-connect` for integration instructions and examples.

## Troubleshooting

1. **Extension not detected**: Ensure the extension is installed and enabled
2. **Messages not received**: Check that messages are sent with `type: 'FROM_PAGE'`
3. **Address request fails**: Verify the user approves the request in the popup
4. **Transaction not opening**: Check that `txInfo` contains valid parameters
