# Cashtab Connect React Demo

This demo showcases all the features of the Cashtab Connect library with a React application.

## Features Demonstrated

- **Extension Status**: Shows whether the Cashtab browser extension is available
- **Address Request**: Request the user's eCash address from their Cashtab wallet
- **Transaction Creation**: Create transactions that open in the user's Cashtab wallet
- **Error Handling**: Demonstrates proper error handling for various scenarios
- **Event Logging**: Shows all interactions and events in real-time
- **React Integration**: Shows how to use Cashtab Connect in a React application
- **Convenience Functions**: Demonstrates both class-based and convenience function usage

## Getting Started

1. **Install the Cashtab Browser Extension**
    - Download and install the Cashtab browser extension
    - Make sure it's enabled and active

2. **Start the Demo**

Build the cashtab-connect library locally:

```bash
cd modules/cashtab-connect
pnpm install
pnpm run build
```

Then run the demo locally:

```bash
cd modules/cashtab-connect/demo
pnpm start
```

3. **Open the Demo**
    - Navigate to `http://localhost:3000` in your browser
    - The demo will automatically detect if the Cashtab extension is available

## Usage

### Extension Status

The demo automatically checks for the Cashtab extension every 5 seconds and updates the status indicator.

### Request Address

1. Click "Request Address" to use the class-based approach
2. Click "Request (Convenience)" to use the convenience functions
3. Approve the request in your Cashtab extension
4. The address will be displayed on the page

### Create Transaction

1. Enter a recipient address (or use the current address)
2. Enter the amount
3. Select the currency (XEC or USD)
4. Review and send the transaction
5. Click "Create Transaction" to use the class-based approach
6. Click "Create (Convenience)" to use the convenience functions
7. The transaction will open in your Cashtab extension

### Error Handling

The demo shows different error messages for:

- Extension not available
- User denied address request
- Request timeout
- Invalid transaction parameters

## React Integration Examples

The demo shows how to:

- **Use React hooks** with Cashtab Connect
- **Handle async operations** with proper loading states
- **Manage component state** for extension status and results
- **Implement error boundaries** for extension errors
- **Use both class-based and convenience function approaches**

### Key React Patterns Demonstrated

```typescript
// State management
const [isExtensionAvailable, setIsExtensionAvailable] =
    useState<boolean>(false);
const [currentAddress, setCurrentAddress] = useState<string | null>(null);

// Effect for extension detection
useEffect(() => {
    checkExtensionAvailability();
    const interval = setInterval(checkExtensionAvailability, 5000);
    return () => clearInterval(interval);
}, []);

// Async operations with loading states
const handleRequestAddress = async () => {
    setIsLoading(true);
    try {
        const address = await cashtab.requestAddress(network);
        setCurrentAddress(address);
    } catch (error) {
        // Handle errors
    } finally {
        setIsLoading(false);
    }
};
```

## Development

The demo uses:

- **React 18** with TypeScript
- **Functional components** with hooks
- **Modern CSS** with gradients and animations
- **Responsive design** for mobile and desktop

## Troubleshooting

- **Extension not detected**: Make sure the Cashtab extension is installed and enabled
- **Address request fails**: Check that the extension is active and you're on a supported page
- **Transaction doesn't open**: Verify the recipient address is valid and the amount is positive
- **React build issues**: Make sure all dependencies are installed with `pnpm install`

## Notes

- This demo is for development and testing purposes only
- It's not included in the published npm package
- The demo runs on localhost:3000 and requires the Cashtab extension to be installed
- The demo shows both class-based and convenience function usage patterns
