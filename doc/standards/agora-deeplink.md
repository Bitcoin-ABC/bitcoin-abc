# Agora Action Deep Links

## Background

[Agora](https://agora.cash) is eCash's non-custodial, on-chain marketplace
protocol. It defines two kinds of offer:

- **Oneshot** offers — a whole lot is offered at a fixed price. Typically used
  to sell a single SLP NFT (NFT1 child).
- **Partial** offers — a fungible amount (SLP or ALP) is offered and may be
  partially filled, priced per token with a minimum accept amount.

Marketplaces and dApps frequently want to hand a user off to their wallet to act
on a specific token — to **list** one for sale, or to **buy** one — without the
user re-entering the token id, price, or other details by hand.

No standard for this exists today (see task T3760). Because Agora is an
eCash-wide protocol rather than a feature of any single wallet, the convention
for deep-linking Agora actions should be a shared standard that any wallet can
implement, not a wallet-specific behavior.

## Approach

An Agora deep link expresses an **intent**: perform an `action` on a `tokenId`,
with optional action-specific parameters. The link carries no authority. It only
tells the wallet which action the user wants and supplies values to **prefill**;
it can never, on its own, produce a signature, a listing, or a spend.

The wallet is the source of truth. For every link it MUST independently validate
the token, the action's applicability, the user's ability to perform it, and any
relevant on-chain state, and it MUST require explicit user confirmation before
signing anything.

### Parameters

Deep links are expressed as URL query parameters:

- **`action`** (required) — the Agora action to perform. Version 1 defines
  `LIST` and `BUY`. It is written as an uppercase token, and the wallet MUST
  compare it case-insensitively (uppercase the value before matching), so that
  `buy`, `Buy`, and `BUY` are equivalent.
- **`tokenId`** (required) — a 64-character lowercase hex SLP/ALP token id. The
  wallet MUST verify that it resolves to a known token and that the token
  supports the requested `action`.
- Additional parameters are action-specific and OPTIONAL (see below).

Each parameter appears at most once. A parameter given more than once is
ambiguous, and the wallet MUST NOT silently pick one value; it treats the link
as invalid (surfacing a validation error or ignoring the link). A parameter
present with an empty value (for example `price=` with nothing after it) is
treated as absent.

Numeric parameter values (`price`, `quantity`) are canonical decimal strings —
digits with an optional `.` decimal separator and no grouping separators —
regardless of the user's or the linking site's locale. Wallets MUST NOT parse
them with locale rules: in comma-decimal locales `.` is a grouping separator,
and a locale parse would silently misread `1.70` as `170`.

A wallet defines its own base URL and maps these parameters onto its existing
per-token screen. A wallet whose route already carries the token id in the path
(for example `/token/<tokenId>`) MAY treat that path value as the `tokenId`
parameter rather than repeating it in the query string. If such a link carries a
`tokenId` in _both_ the path and the query and the two disagree, the link is
ambiguous and the wallet MUST NOT act on it; it surfaces a validation error
instead of silently choosing one.

If `action` is missing, the wallet MUST fall back to its default behavior (for
example, opening the token page normally): the link may be a plain payment or
carry no agora intent at all. If `action` is present but unrecognized, the
wallet MUST NOT act on it — it may be an action defined by a newer version of
this standard — but SHOULD tell the user the action is unsupported rather than
silently doing nothing. Once `action` is a recognized action, the link is
unambiguously an agora-action intent; if its `tokenId` is then missing or
malformed, the wallet MUST surface a validation error rather than silently
falling back, so the user learns the link is broken. In every case the failure
is never fatal and never triggers an action. Unknown parameters MUST be ignored.

### `LIST`

Intent: open the wallet's "sell / list on Agora" flow for `tokenId`, prefilled.

Optional parameters:

- **`price`** — the list price the linking site suggests, as a decimal XEC
  amount. Its meaning depends on the token type: for a oneshot (NFT) listing it
  is the total asking price for the lot; for a partial (fungible) listing it is
  the price per token, as the wallet's list form expresses it.

`LIST` does not take a `quantity`: how much to list is chosen by the user in the
wallet's listing form, not dictated by the link. A `quantity` parameter on a
`LIST` is invalid, and the wallet MUST surface a validation error rather than
act on it. (`quantity` is a `BUY` parameter; see below.)

Before prefilling, the wallet MUST:

1. Resolve `tokenId` and confirm it is a token type the wallet supports listing
   on Agora.
2. Confirm the user actually holds the token. For a fungible token the amount
   to list is entered in the form afterwards, so the wallet revalidates that
   the user holds the entered amount before signing.
3. Validate any supplied `price` using the same rules it applies to a manually
   entered listing. Prefill it only if it is valid; otherwise open the form with
   that field empty.

The wallet then presents the prefilled listing form. The user reviews it and
confirms; the wallet signs and broadcasts only on explicit user action. If any
check fails, the wallet informs the user (for example, "you do not hold this
token") and does not prefill.

### `BUY`

Intent: open the wallet's "buy from an Agora listing" flow for `tokenId`.

Optional parameters:

- **`quantity`** — the token quantity the buyer wants, as a decimalized token
  amount. Only meaningful for partial (fungible) offers; an NFT is a single
  whole lot.

`BUY` does not take a `price`: the price always comes from the on-chain offer,
never from the link. A `price` parameter on a `BUY` is invalid, and the wallet
MUST surface a validation error rather than act on it.

The wallet MUST:

1. Resolve `tokenId` and query the active Agora offers for it.
2. Present the offers for that token, surfacing the one the user is most likely
   to want first:
    - **Oneshot (NFT):** there is at most one active offer. Present it. If there
      is none, inform the user that the token is not currently for sale.
    - **Partial (fungible):** order the offers by effective price, cheapest
      first. If a `quantity` is given, the wallet SHOULD select the cheapest
      offer that can fill that quantity and that the user can afford, and present
      that amount (locked or editable) for confirmation. Otherwise it SHOULD
      select the cheapest offer the user can afford and let the user edit the
      amount. If no suitable offer exists, inform the user. A wallet MAY present
      this as a dedicated confirm screen (review token, quantity, and price;
      accept or reject) rather than its full orderbook UI.
3. The user reviews and confirms the purchase; the wallet signs and broadcasts
   only on explicit user action. Filling a quantity larger than any single
   offer (by taking several cheaper offers in sequence) is out of scope for this
   version.

`quantity` normalization: on an NFT (oneshot) offer the parameter is ignored —
the lot is indivisible. A value that is not a valid decimal for the token (bad
format, or more precision than the token's decimals) is likewise ignored, and
the wallet proceeds as if no quantity were given. A valid quantity MAY be
snapped to the selected offer's discrete accepted-amount step; the wallet MUST
show the final accepted amount and its total price for confirmation before
signing. An offer made by the user's own wallet cannot be bought by that
wallet and is skipped during selection. If no single offer can fill the
quantity affordably, the wallet informs the user and presents the offers with
no preselection from the link.

## Security

Deep-link parameters are attacker-controllable: anyone can craft and share a
link. They MUST be treated as untrusted input that only prefills the UI.

- The wallet MUST re-derive every trust-relevant value — token type, ownership,
  offer existence, offer price, affordability — from the indexer or chain, never
  from the link.
- The wallet MUST NOT auto-sign, auto-broadcast, auto-list, or auto-buy. Every
  state-changing action requires the same explicit human confirmation as a
  manually initiated one.

Given these rules, the worst case for a malicious or malformed link is that the
wallet opens the wrong screen or shows a prefilled value that the user can see
and reject before signing. A link can never move funds or create an offer on its
own.

## pay.e.cash links

[pay.e.cash](https://docs.e.cash/pay) is a wallet-agnostic deep link service. It
already wraps BIP21 payments (`?bip21=`) and wallet connect (`?connect=1`).
Agora actions are carried on the `/token` path, using the same parameters
defined above:

```
https://pay.e.cash/token?action=LIST&tokenId=<tokenId>&price=<xec>
https://pay.e.cash/token?action=BUY&tokenId=<tokenId>
```

Agora actions have their own path so that **wallet support for them is
optional**. A wallet that implements agora actions handles `/token`; a wallet
that only does payments simply does not, and keeps handling the payment links at
the root path unchanged. On mobile this is the difference between registering
the `/token` path in an app's deep link filters or leaving it alone, so a wallet
such as Marlin can support pay.e.cash payments without having to support agora.

As with the other pay.e.cash forms, `b=1` requests a return to the browser after
the action. A link that carries `bip21` or `connect` is a payment or connect
request, not an agora action, and MUST NOT be treated as one.

This lets a site link to an agora action without knowing which wallet the user
has: a wallet that handles these links resolves `tokenId` and `action` onto its
own token screen, then applies the validation rules above.

## Examples

Using Cashtab's token route as the reference base URL. `<nftTokenId>` stands for
an NFT (oneshot) token id and `<fungibleTokenId>` for a fungible (partial) one —
distinct token types, and so distinct ids:

1. List an NFT for 5,000 XEC:

    `https://cashtab.com/#/token/<nftTokenId>?action=LIST&price=5000`

2. List a fungible token at 1 XEC per token:

    `https://cashtab.com/#/token/<fungibleTokenId>?action=LIST&price=1`

3. Buy an NFT (its single active offer):

    `https://cashtab.com/#/token/<nftTokenId>?action=BUY`

4. Buy 100 of a fungible token (cheapest offer that can fill it):

    `https://cashtab.com/#/token/<fungibleTokenId>?action=BUY&quantity=100`

## Reference implementation

Cashtab implements this standard on its token route (`#/token/<tokenId>`; it
uses hash routing), and accepts the pay.e.cash form described above.

- `cashtab/src/components/Etokens/Token/index.tsx` resolves the token, decides
  whether it supports the requested action, prefills the listing form for LIST,
  and for BUY opens the dedicated deep-link confirm screen (DeepLinkBuy) with
  an optional quantity.
- `cashtab/src/components/Agora/DeepLinkBuy/index.tsx` loads active offers for
  a fungible BUY, selects the cheapest offer that can affordably fill a
  requested quantity (or lets the user choose an amount when none is given),
  and completes the take only after explicit confirmation.
- `cashtab/src/components/Agora/OrderBook/index.tsx` remains the in-app buy UI
  on the token page (not the deep-link confirm path).
- `cashtab/src/deeplinks/index.ts` parses pay.e.cash agora links, which
  `cashtab/src/components/App/App.tsx` routes onto the token screen.

## Extensibility

- **New actions.** Future versions may add actions (for example `CANCEL` to
  delist an offer the user owns). Each new action defines its own required
  validation and optional parameters. Wallets MUST NOT act on an action they do
  not support (telling the user it is unsupported, per the rule above), and MUST
  ignore parameters they do not support.
- **Buy-side offers.** Because consensus does not validate tokens, most Agora
  offers today are sell-side. For an NFT, however, the token id already uniquely
  identifies the lot, so buy-side oneshot offers are possible; if that pattern is
  adopted, the `BUY` and `LIST` selection logic would extend to cover it.
- **Versioning.** This document specifies version 1. Breaking changes will be
  described as a new version.
