# GetAddress

The GetAddress component is intended to demonstrate how to fetch and get a Cashtab extension user's active address. The component itself could be used as part of a form that requires an address.

However, most dev applications will probably want the address to load other features and information on the page related to that address. Devs may review how GetAddress.tsx performs this and adapt to their custom use.

## What it does

-   Identify whether or not the user has the Cashtab extension installed
-   For user's with the extension installed, enables the "Get Address" feature
-   Ask the extension for the active wallet's address in `ecash:` format
-   Display this address in an input field
-   For users without the extension installed, prompt them to install the extension with a button that links to the install page

### Considerations for custom web implementation

There are a few basic steps that need to be implemented.

1. Check if the user has Cashtab installed.

Review the `getCashtabProviderStatus` function in `utils/cashtab-helpers.ts` to see how this is done. If the user has Cashtab installed and activated, then `window.bitcoinAbc === 'cashtab'`

2. Set up a listener for message events

On page load, `window.addEventListener('message', this.handleMessage);`

3. Post a message to the extension asking for the address

Here is the proper format to ask the extension for the user's active address:

```
window.postMessage(
            {
                type: 'FROM_PAGE',
                text: 'Cashtab',
                addressRequest: true,
            },
            '*',
        );
```

4. Catch and parse the reply from the extension

For example, the approach used in `GetAddress.tsx`:

```
handleMessage = (event: any) => {
        // Parse for an address from cashtab
        if (
            event &&
            event.data &&
            event.data.type &&
            event.data.type === 'FROM_CASHTAB'
        ) {
            // print it
            console.log(`Incoming cashtab message`, event.data);
            // set in state
            this.setState({ address: event.data.address });
        }
    };
```

If the user rejects the address request, a value of `Address request denied by user` will be returned to the requesting web page. This may be handled by the web developer.
