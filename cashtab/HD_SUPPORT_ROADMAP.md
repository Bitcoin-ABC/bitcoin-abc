# Cashtab HD wallet support roadmap

Remaining work after opt-in HD create / receive / spend on Settings → Wallets.

## Must-fix for backup / restore

- [x] **Import as HD** — Import Wallet (and New Wallet) expose an HD checkbox
      (default off) on the name prompt; when checked, `createCashtabWallet`
      is called with `{ hd: true }`. Distinct “New HD Wallet” button removed.

## Nice-to-haves

- [ ] **Upgrade** an existing single-address wallet to HD (same mnemonic +
      discover)
- [ ] **Onboarding** HD create / import (first-run New Wallet / Import);
      currently scoped to the Wallets page only
- [ ] **Push notifications** — registrar still uses `ecashWallet.address`
      (receive\[0\]), not the current unused receive address
- [ ] **Address list** UI for past receive / change addresses
- [ ] HD history performance — multi-address path fetches full per-address
      history then pages locally (fine until wallets get large)
- [ ] Expose BIP44 `accountNumber` above 0 in the UI (storage already supports
      it; product default remains account 0)
- [ ] Subscribe only to “active” addresses (skip old receive addresses that are
      fully spent and unlikely to be reused — Electrum-style)

## Notes

- Path identity: non-HD and HD account 0 receive index 0 are both
  `m/44'/1899'/0'/0/0`, so existing funds at the Cashtab address remain visible
  after enabling HD on the same mnemonic.
- Crypto / sync / signing multi-address behavior lives in `ecash-wallet`;
  Cashtab owns storage, WS, history aggregation, and Receive UX.
