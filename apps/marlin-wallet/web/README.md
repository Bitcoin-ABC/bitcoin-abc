You can run Marlin Wallet as a web wallet.

**This will not securely store your private key** so it is advisable to only do this for development purpose. You will also lack all the mobile/hardware related features so it can be considered as a degraded mode.

First install the dependencies. From the `web/` folder, run:

```
npm ci
```

Then run the dev version (will show an error for each exception):

```
npm run dev
```

or the production version:

```
npm run start
```
