You can run Marlin Wallet as a web wallet.

**This will not securely store your private key** so it is advisable to only do this for development purpose. You will also lack all the mobile/hardware related features so it can be considered as a degraded mode.

First install the dependencies. From the repository root, run:

```
pnpm install --frozen-lockfile --filter marlin-wallet-web...
```

This installs marlin-wallet-web and all its dependencies (including workspace dependencies like chronik-client, ecash-lib, and ecash-wallet).

Then, from the `apps/marlin-wallet/web/` directory, run the dev version (will show an error for each exception):

```
pnpm run dev
```

or the production version:

```
pnpm run start
```
