# Cashtab

## eCash Web Wallet

### Features

- Send & Receive eCash (XEC) and tokens
- Mint and trade tokens and NFTs
- Import existing wallets
- Create and manage multiple wallets
- Create new eTokens with token icons
- Send and receive airdrops

## Quick Start

To get Cashtab running quickly:

1. **Install all dependencies:**

    ```bash
    ./install-deps.sh
    ```

2. **Start the development server:**
    ```bash
    npm start
    ```

The app will open at [http://localhost:3000](http://localhost:3000).

## Browser Extension

1. `npm run extension`
2. Open Chrome or Brave
3. Navigate to `chrome://extensions/` (or `brave://extensions/`)
4. Enable Developer Mode
5. Click "Load unpacked"
6. Select the `extension/dist` folder that was created with `npm run extension`

## Developing web apps that interact with the extension

A web app can request an extension user's active address. For an example implementation, please review the `GetAddress.tsx` component (and its associated `README.md`) in `/web/cashtab-components`.

## Docker deployment

See `cashtab.Dockerfile` in the top level of the monorepo. To test this build locally, you must manually change `ARG NGINX_CONF=nginx.conf` to `ARG NGINX_CONF=nginx-preview.conf`.

Then,

```
docker build -f cashtab.Dockerfile -t cashtab_local .
docker run --rm -p 8080:80 --name cashtab cashtab_local
```

Navigate to `localhost:8080` to see the app.

## Redundant APIs

Cashtab accepts multiple instances of `chronik` as its backend. Update the `chronikUrls` array in `src/config/chronik.js` to change your chronik server or add additional redundant backups.
