// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const CASHTAB_WEB_SEND_BASE = 'https://cashtab.com/#/send';
const CASHTAB_WEB_CONNECT_BASE =
    'https://cashtab.com/#/wallets?shareAddresses=true';
const CASHTAB_WEB_TOKEN_BASE = 'https://cashtab.com/#/token';

/** A tokenId is 32 bytes as lowercase hex (matches Cashtab's isValidTokenId) */
const TOKEN_ID_REGEX = /^[a-f0-9]{64}$/;
const homeViewEl = document.getElementById('home-view');
const fallbackViewEl = document.getElementById('fallback-view');
const fallbackTitleEl = document.getElementById('fallback-title');
const paymentSummaryEl = document.getElementById('payment-summary');
const fullBip21BoxEl = document.getElementById('full-bip21-box');
const openWebLinkEl = document.getElementById('open-web-link');
const copyBip21ButtonEl = document.getElementById('copy-bip21-btn');

let currentBip21 = null;
let copyBip21TooltipTimeoutId = null;
let fullBip21CopiedTimeoutId = null;

const parseBip21FromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const bip21Param = params.get('bip21');
    if (!bip21Param) {
        return null;
    }

    if (!bip21Param.toLowerCase().startsWith('ecash:')) {
        return null;
    }

    // Support raw query style links where params after the first '&' are parsed
    // as outer URL params, e.g. ?bip21=ecash:addr?token_id=...&token_decimalized_qty=...
    const trailingParams = [];
    for (const [key, value] of params.entries()) {
        if (key === 'bip21') {
            continue;
        }
        trailingParams.push(`${key}=${value}`);
    }

    if (trailingParams.length === 0) {
        return bip21Param;
    }

    const joiner = bip21Param.includes('?') ? '&' : '?';
    return `${bip21Param}${joiner}${trailingParams.join('&')}`;
};

const parseConnectFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const connect = params.get('connect');
    if (connect !== '1' && connect !== 'true') {
        return null;
    }
    if (params.get('bip21')) {
        return null;
    }
    const returnUrl = params.get('return_url');
    if (!returnUrl) {
        return null;
    }
    try {
        return new URL(returnUrl).protocol === 'https:' ? returnUrl : null;
    } catch {
        return null;
    }
};

/**
 * Parse an agora action link, see
 * doc/standards/agora-deeplink.md
 *
 * https://pay.e.cash/token?action=LIST&tokenId=<tokenId>&price=<xec>
 * https://pay.e.cash/token?action=BUY&tokenId=<tokenId>
 *
 * Agora actions live on the /token path, and not at the root with the payment
 * links, so that supporting them is optional for a wallet.
 */
const parseAgoraActionFromQuery = () => {
    // Accept exactly /token and /token/, nothing else
    if (
        window.location.pathname !== '/token' &&
        window.location.pathname !== '/token/'
    ) {
        return null;
    }

    const params = new URLSearchParams(window.location.search);

    // A payment or connect link is not an agora action. Check by presence, so
    // that an empty ?bip21= or ?connect= still counts.
    if (params.has('bip21') || params.has('connect')) {
        return null;
    }

    // A parameter given more than once is ambiguous (which value wins?). On the
    // dedicated agora path this is a broken agora link, so surface it rather
    // than silently taking the first value or falling back.
    for (const key of ['action', 'tokenId', 'price', 'quantity', 'b']) {
        if (params.getAll(key).length > 1) {
            return {
                action: null,
                tokenId: null,
                price: null,
                quantity: null,
                error: 'This token action link has a repeated parameter',
            };
        }
    }

    // An empty ?action= is treated as absent, like every other empty-valued
    // parameter (the spec's empty-value rule), so it falls back rather than
    // surfacing an unrecognized-action error
    const action = (params.get('action') || null)?.toUpperCase();
    if (action === undefined) {
        // No action at all: not an agora action link, fall back.
        return null;
    }
    if (action !== 'LIST' && action !== 'BUY') {
        // A present but unrecognized action (e.g. a future action this version
        // does not implement). We must not act on it, but surface it rather
        // than silently showing the home view with no feedback.
        return {
            action: null,
            tokenId: null,
            price: null,
            quantity: null,
            error: 'This token action is not supported',
        };
    }

    // The action is recognized, so this link is meant as an agora action. A
    // missing or malformed tokenId is a broken agora link, not a fall-through:
    // surface it as an error rather than returning null, which would silently
    // show the home view with no feedback.
    const tokenId = params.get('tokenId');
    if (!tokenId || !TOKEN_ID_REGEX.test(tokenId)) {
        return {
            action,
            tokenId: null,
            price: null,
            quantity: null,
            error: 'This token action link has an invalid token id',
        };
    }

    // An empty value (e.g. ?price=) means the parameter was not really
    // provided; treat it as absent so it is not mistaken for a real value.
    const price = params.get('price') || null;
    const quantity = params.get('quantity') || null;

    // A BUY takes its price from the on-chain offer, so a price on a BUY is
    // invalid; LIST likewise takes no quantity. Flag either here rather than
    // forwarding it to Cashtab.
    let error = null;
    if (action === 'BUY' && price !== null) {
        error = 'A buy link cannot specify a price';
    } else if (action === 'LIST' && quantity !== null) {
        error = 'A list link cannot specify a quantity';
    }
    if (error !== null) {
        return { action, tokenId, price: null, quantity: null, error };
    }

    return {
        action,
        tokenId,
        // price applies to LIST, quantity to BUY
        price: action === 'LIST' ? price : null,
        quantity: action === 'BUY' ? quantity : null,
        error: null,
    };
};

/** Matches Cashtab web hash-route format (`#/send?bip21=ecash:...?...`), not %-encoded params */
const buildCashtabWebSendUrl = bip21 =>
    `${CASHTAB_WEB_SEND_BASE}?bip21=${bip21}`;

/** Matches Cashtab web hash-route format (`#/token/<tokenId>?action=...`) */
const buildCashtabWebTokenUrl = ({ action, tokenId, price, quantity }) => {
    const params = new URLSearchParams({ action });
    if (price !== null) {
        params.set('price', price);
    }
    if (quantity !== null && quantity !== undefined) {
        params.set('quantity', quantity);
    }
    return `${CASHTAB_WEB_TOKEN_BASE}/${tokenId}?${params.toString()}`;
};

const showPaymentFallbackView = bip21 => {
    currentBip21 = bip21;
    const cashtabWebUrl = buildCashtabWebSendUrl(bip21);
    if (homeViewEl) {
        homeViewEl.classList.add('hidden');
    }
    if (fallbackViewEl) {
        fallbackViewEl.classList.remove('hidden');
    }
    if (fallbackTitleEl) {
        fallbackTitleEl.textContent =
            'Open this payment in a supported eCash wallet';
    }
    if (paymentSummaryEl) {
        paymentSummaryEl.textContent = 'BIP21 payment detected:';
    }
    if (fullBip21BoxEl) {
        fullBip21BoxEl.classList.remove('hidden');
        fullBip21BoxEl.textContent = bip21;
    }
    if (openWebLinkEl) {
        openWebLinkEl.textContent = 'Open in Cashtab Web';
        openWebLinkEl.href = cashtabWebUrl;
    }
    if (copyBip21ButtonEl) {
        copyBip21ButtonEl.classList.remove('hidden');
    }
};

const showConnectFallbackView = returnUrl => {
    currentBip21 = null;
    let origin = returnUrl;
    try {
        origin = new URL(returnUrl).hostname;
    } catch {
        // keep returnUrl
    }
    if (homeViewEl) {
        homeViewEl.classList.add('hidden');
    }
    if (fallbackViewEl) {
        fallbackViewEl.classList.remove('hidden');
    }
    if (fallbackTitleEl) {
        fallbackTitleEl.textContent =
            'Connect your wallet in a supported eCash app';
    }
    if (paymentSummaryEl) {
        paymentSummaryEl.textContent = `Wallet connect for ${origin}. Install Cashtab on Android for one-tap connect, or use Cashtab Web and paste your address back in the app.`;
    }
    if (fullBip21BoxEl) {
        fullBip21BoxEl.classList.add('hidden');
    }
    if (openWebLinkEl) {
        openWebLinkEl.textContent = 'Open Cashtab Web to connect';
        openWebLinkEl.href = CASHTAB_WEB_CONNECT_BASE;
    }
    if (copyBip21ButtonEl) {
        copyBip21ButtonEl.classList.add('hidden');
    }
};

const previewTokenId = tokenId =>
    `${tokenId.slice(0, 6)}...${tokenId.slice(-6)}`;

const showAgoraActionErrorView = message => {
    currentBip21 = null;
    if (homeViewEl) {
        homeViewEl.classList.add('hidden');
    }
    if (fallbackViewEl) {
        fallbackViewEl.classList.remove('hidden');
    }
    if (fallbackTitleEl) {
        fallbackTitleEl.textContent = 'This link is not valid';
    }
    if (paymentSummaryEl) {
        paymentSummaryEl.textContent = message;
    }
    if (fullBip21BoxEl) {
        fullBip21BoxEl.classList.add('hidden');
    }
    // There is no valid action to open, so hide the wallet link
    if (openWebLinkEl) {
        openWebLinkEl.classList.add('hidden');
    }
    if (copyBip21ButtonEl) {
        copyBip21ButtonEl.classList.add('hidden');
    }
};

const showAgoraActionFallbackView = agoraAction => {
    currentBip21 = null;
    const { action, tokenId, price, quantity } = agoraAction;
    if (homeViewEl) {
        homeViewEl.classList.add('hidden');
    }
    if (fallbackViewEl) {
        fallbackViewEl.classList.remove('hidden');
    }
    if (fallbackTitleEl) {
        fallbackTitleEl.textContent =
            'Open this token action in a supported eCash wallet';
    }
    if (paymentSummaryEl) {
        paymentSummaryEl.textContent =
            action === 'LIST'
                ? `List token ${previewTokenId(tokenId)} for sale${
                      price !== null ? ` at ${price} XEC` : ''
                  }. Your wallet checks the token and you confirm before anything is signed.`
                : `Buy token ${previewTokenId(tokenId)}${
                      quantity !== null ? ` (quantity ${quantity})` : ''
                  }. Your wallet takes the price from the active offer, and you confirm before anything is signed.`;
    }
    if (fullBip21BoxEl) {
        fullBip21BoxEl.classList.add('hidden');
    }
    if (openWebLinkEl) {
        openWebLinkEl.textContent = 'Open in Cashtab Web';
        openWebLinkEl.href = buildCashtabWebTokenUrl(agoraAction);
    }
    if (copyBip21ButtonEl) {
        copyBip21ButtonEl.classList.add('hidden');
    }
};

const copyBip21 = async () => {
    if (!currentBip21 || !copyBip21ButtonEl) {
        return;
    }
    try {
        await window.copyTextToClipboard(currentBip21);
        copyBip21ButtonEl.classList.add('copied');
        if (copyBip21TooltipTimeoutId !== null) {
            clearTimeout(copyBip21TooltipTimeoutId);
        }
        copyBip21TooltipTimeoutId = setTimeout(() => {
            copyBip21ButtonEl.classList.remove('copied');
            copyBip21TooltipTimeoutId = null;
        }, 1000);
    } catch {
        // No visual change on failure to avoid replacing button label text.
    }
};

const run = () => {
    const agoraAction = parseAgoraActionFromQuery();
    if (agoraAction) {
        if (agoraAction.error) {
            showAgoraActionErrorView(agoraAction.error);
        } else {
            showAgoraActionFallbackView(agoraAction);
        }
        return;
    }

    const connectReturnUrl = parseConnectFromQuery();
    if (connectReturnUrl) {
        showConnectFallbackView(connectReturnUrl);
        return;
    }

    const bip21 = parseBip21FromQuery();
    if (!bip21) {
        return;
    }
    showPaymentFallbackView(bip21);
};

run();

copyBip21ButtonEl?.addEventListener('click', () => {
    copyBip21();
});

fullBip21BoxEl?.addEventListener('click', async () => {
    if (!currentBip21) {
        return;
    }
    try {
        await window.copyTextToClipboard(currentBip21);
        fullBip21BoxEl.classList.add('copied');
        if (fullBip21CopiedTimeoutId !== null) {
            clearTimeout(fullBip21CopiedTimeoutId);
        }
        fullBip21CopiedTimeoutId = setTimeout(() => {
            fullBip21BoxEl.classList.remove('copied');
            fullBip21CopiedTimeoutId = null;
        }, 1000);
    } catch {
        // Ignore box tooltip on copy failure; primary copy button still indicates errors.
    }
});
