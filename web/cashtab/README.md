# Cashtab

## Bitcoin Cash Web Wallet

### Features

-   Send & Receive BCH
-   Import existing wallets

## Development

```
npm install
npm start
```

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

## Testing

Run the tests in watch mode (interactive):

```
npm test
```

Run the tests and generate a coverage report (non-interactive):

```
npm run test:coverage
```

You can then browse the HTML coverage report by opening the
`coverage/lcov-report/index.html` file in your web browser.

## Production

In the project directory, run:

```
npm run build
```

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Browser Extension

1. `npm run extension`
2. Open Chrome or Brave
3. Navigate to `chrome://extensions/` (or `brave://extensions/`)
4. Enable Developer Mode
5. Click "Load unpacked"
6. Select the `extension/dist` folder that was created with `npm run extension`

## Docker deployment

```
npm install
docker-compose build
docker-compose up
```

## Redundant APIs

Cashtab accepts multiple instances of `bch-api` as its backend. Input your desired API URLs separated commas into the `REACT_APP_BCHA_APIS` variable. For example, to run Cashtab with three redundant APIs, use:

```
REACT_APP_BCHA_APIS=https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,https://free-main.fullstack.cash/v3/
```

You can also run Cashtab with a single API, e.g.

```
REACT_APP_BCHA_APIS=https://rest.kingbch.com/v3/
```

Cashtab will start with the first API in your list. If it receives an error from that API, it will try the next one.

Navigate to `localhost:8080` to see the app.

## Cashtab Roadmap

The following features are under active development:

-   Transaction history
-   Simple Ledger Postage Protocol Support
-   Cashtab browser extension
