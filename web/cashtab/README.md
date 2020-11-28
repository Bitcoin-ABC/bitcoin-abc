# CashTab

## Bitcoin Cash Web Wallet

### Features

-   Send & Receive BCH
-   Import existing wallets

## Development

Cashtab relies on some modules that retain legacy dependencies. NPM version 7 or later no longer supports automatic resolution of these peer dependencies. To successfully install modules such as `qrcode.react`, with NPM > 7, run `npm install` with the flag `--legacy-peer-deps`

```
npm install --legacy-peer-deps
npm start
```

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

## Testing

### 'npm test'

### 'npm run test:coverage'

## Production

In the project directory, run:

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## CashTab Roadmap

The following features are under active development:

-   Transaction history
-   Simple Ledger Postage Protocol Support
-   Cashtab as browser extension
