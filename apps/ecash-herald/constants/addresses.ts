// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * addresses.ts
 * A developer-updated directory of known eCash addresses
 * Tags below are added on a 'best guess' basis and are not necessarily confirmed
 *
 * Used by the returnAddressPreview function in Utils.js to render an address tag
 * instead of an eCash address slice preview for known addresses
 */

const addressDirectory: Map<string, { tag: string }> = new Map();

// Binance
addressDirectory.set('ecash:qq337uy8jdmgg7gdzpyjjne6a7w0k7c9m5m5gnpx4u', {
    tag: 'Binance',
});
addressDirectory.set('ecash:qq580luw0dkypdlrply9ulk3rht6nrqfugvgm9le8a', {
    tag: 'Coinex 1',
});
addressDirectory.set('ecash:qqv2vqz6he83x9pczvt552fuxnvhevlt6ugrqqa7w5', {
    tag: 'Coinex 2',
});

export default addressDirectory;
