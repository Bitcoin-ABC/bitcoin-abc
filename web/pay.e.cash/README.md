# pay.e.cash

Static website for universal eCash payment links.

## Goal

Use query-parameter BIP21 links:

- `https://pay.e.cash/?bip21=<bip21-uri>`
    - Example:
        - `https://pay.e.cash/?bip21=ecash:qq...?token_id=...&token_decimalized_qty=1`
- `https://pay.e.cash/?connect=1&return_url=<https-url>&b=1` — wallet connect (native app opens callback URL with `#cashtab_connect=<address>`, then exits)

With verified Android App Links in place:

1. App installed -> URL opens a linked wallet app (Cashtab or Marlin Wallet) directly
2. App not installed -> URL opens fallback web page on `pay.e.cash`

## Current behavior

- `https://pay.e.cash/` renders a human-viewable landing page.
- `https://pay.e.cash/?bip21=<bip21-uri>` renders a fallback page with:
    - Download links for Cashtab and Marlin Wallet (Play Store)
    - "Open in Cashtab Web" link pointing to `https://cashtab.com/#/send?bip21=<readable-bip21>` (same decoded `ecash:...?...` string Cashtab expects in the hash, not a single percent-encoded blob)

**Mobile (Cashtab / Marlin Wallet Android):** App Links open the same `https://pay.e.cash/?bip21=...` URL. The app reads the decoded `bip21` query value and navigates to the send screen with that full readable BIP21 string—aligned with Cashtab Web, not a different encoding.

- Verified App Links are configured with:
    - `web/pay.e.cash/.well-known/assetlinks.json` (Cashtab, Cashtab dev, Marlin Wallet)
    - Android manifest intent-filters for `pay.e.cash` on each app (Cashtab dev flavor uses the same host as prod)

## Local testing

### 1) Serve the static site

From repo root:

```bash
cd web/pay.e.cash
python3 -m http.server 8080
```

Then open:

- Landing page: `http://localhost:8080/`
- Payment fallback page example:
    - `http://localhost:8080/?bip21=ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?token_id=0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0&token_decimalized_qty=1.0000`

## Android deep-link verification commands (optional)

With device connected:

```bash
adb shell am start -a android.intent.action.VIEW -d "https://pay.e.cash/?bip21=ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=1"
```

This validates Android App Link handling for `pay.e.cash`.
