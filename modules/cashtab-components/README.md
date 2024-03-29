# Cashtab React Components

Interact with the Cashtab wallet to support eCash payments in web apps. Download the Cashtab extension [here](https://chrome.google.com/webstore/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag)

This project is based on [badger-components-react](https://github.com/Bitcoin-com/badger-components-react)

## Notes

Upcoming features:

-   [x] Connect to webpages metamask-style
-   [ ] Websocket monitoring of payment status
-   [ ] Create transactions with OP_RETURN text
-   [ ] successFn and failureFn props
-   [ ] BIP70 invoices

# Build on eCash (XEC)

A set of React components and helpers to integrate eCash (XEC) and tokens into your app with ease. Integrates with the Cashtab wallet.

## Get Started

-   [Homepage](https://e.cash/)
-   [Component Showcase](https://components.cashtab.com/)
-   [Cashtab Extension](https://chrome.google.com/webstore/detail/cashtab/obldfcmebhllhjlhjbnghaipekcppeag)
-   [NPM page](https://www.npmjs.com/package/cashtab-components)

### Install Component

```bash
$ npm install --save cashtab-components
```

### Install Peer Dependencies

This library depends on the following three peer dependencies

-   `styled-components` ^4.4.1

```bash
$ npm install --save styled-components@4.4.1
```

### Add to React Project

```js
import { CashtabButton, CashtabBadge } from 'cashtab-components';

const Example = props => {
    const toAddress = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';

    // eToken address
    const toSLPAddress = 'etoken:qz2708636snqhsxu8wnlka78h6fdp77ar5tv2tzg4r';

    // tokenId
    const nakamotoID =
        'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb';

    return (
        <>
            {/* Minimal Examples */}
            <CashtabBadge to={toAddress} price={0.5} currency="USD" />
            <CashtabButton to={toAddress} price={1} currency="JPY" />

            {/* Price in XEC */}
            <CashtabBadge to={toAddress} amount={0.01} coinType="XEC" />
            <CashtabButton to={toAddress} amount={0.0001} coinType="XEC" />

            {/* Price in eTokens - NAKAMOTO in this example */}
            <CashtabBadge
                to={toSLPAddress}
                amount={5.01}
                coinType="eToken"
                tokenId={nakamotoID}
            />
            <CashtabButton
                to={toSLPAddress}
                amount={2.0001}
                coinType="eToken"
                tokenId={nakamotoID}
            />

            {/* More Complex Examples, pricing in fiat */}
            <CashtabBadge
                price={0.001} // Price in currency
                currency="CAD" // Currency to convert from
                to="ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035" // Payment address
                opReturn={['0x6d02', 'Hello cashtab-components']}
                tag="Cashtab Pay" // Text on button
                text="Payment Total" // Text at top of badge
                showBrand // Show link to cashtab website
                showAmount // Show BCH satoshi amount
                showQR // Intent to show QR if transaction is URI encodeable
                successFn={() => console.log('Payment success callback')}
                failFn={() =>
                    console.warn('Payment failed or cancelled callback')
                }
            />

            <CashtabButton
                price={0.003}
                currency="USD"
                to="ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035"
                opReturn={['0x6d02', 'Hello cashtab-components-react']}
                text="cashtab Pay"
                showAmount
                showBorder
                showQR
                successFn={() => console.log('success example function called')}
                failFn={() => console.log('fail example function called')}
            />

            {/* Pricing in XEC */}
            <CashtabBadge
                amount={0.001} // Amount in crypto
                coinType="XEC" // Defaults to XEC
                to="ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035" // Payment address
                isRepeatable // Reset to fresh state after a few seconds
                repeatTimeout={4000} // time in ms to reset button after payment
                watchAddress // Watch all payments to address
            />
        </>
    );
};

export default Example;
```

### Create a Custom Cashtab Button / Integration

```js
import React from 'react'
import { CashtabBase, formatAmount } from 'cashtab-components'

import styled from 'styled-components'

const CoolButton = styled.button`
  background-color: rebeccapurple;
  color: lime;
  border-radius: 24px;
`

const MyButton extends React.Component {
  render() {
    // Props from higher order component
    const {
      handleClick,
      to,
      step,

      price,
      currency,

      coinType,
      coinDecimals,
      coinSymbol,
      amount,

      showQR,

      isRepeatable,
      repeatTimeout,
      watchAddress,
      } = this.props;

    return (
      <div>
        <h3>Donate {price}{currency} to {to}</h3>
        <h4>Satoshis: {formatAmount(amount, coinDecimals)}</h4>
        <CoolButton onClick={handleClick}>Custom looking button with render</CoolButton>
      </div>
    )
  }
}

// Wrap with CashtabBase higher order component
export default CashtabBase(MyButton);
```

### Control Step from app

When accepting payments, the state of the payment should be handled by the backend of your application. As such, you can pass in `stepControlled` with the values of `fresh`, `pending` or `complete` to indicate which part of the payment the user is on.

## Development with Storybook

To develop additions to this project, run the local storybook development server with

### Setup

```bash
 $ npm i
 $ npm run storybook
```

Navigate to [http://localhost:6006](http://localhost:6006) to view your stories. They automatically update as you develop ✨.

Storybook will pick up stories from the `*stories.tsx` file in each components folder.

To build a static version of storybook for deployment

```bash
 $ npm run build-storybook
 Deploy contents of  `/storybook-static`
```
