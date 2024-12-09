// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import { toSatoshis, toXec } from 'wallet';
import { TokenIdUtxos } from 'chronik-client';
import cashaddr from 'ecashaddrjs';
import appConfig from 'config/app';

/**
 * airdrops/index.js
 * Methods for calculating token airdrops in Cashtab
 */

/**
 * Get a list of addresses and XEC amounts for an airdrop tx according to given settings
 * @param tokenUtxos output from chronik.tokenId(airdroppedTokenId).utxos()
 * @param excludedAddresses user specified settings for this airdrop
 * @param airdropAmountXec user input for XEC amount to be airdropped
 * @param minTokenQtyUndecimalized Amount of a token users must have to be eligible for an airdrop
 * NOTE: minTokenQty is entered by the user accounting for tokenDecimals, but is UNDECIMALIZED in this function,
 * As we do not decimalize any parameters here (airdrop calcs are all relative to total, so we do not need to
 * account for specific decimals)
 * Airdrop rules
 * 1) When we ignore an address, we also ignore the balance held by that address in determining payout weight
 * 2) We include unconfirmed txs in airdrop calculations
 * 3) We always ignore recipients whose calculated XEC receive amount is less than dust
 * 4) We only send airdrops to P2PKH or P2SH recipients.
 */
export const getAirdropTx = (
    tokenUtxos: TokenIdUtxos,
    excludedAddresses: string[],
    airdropAmountXec: string,
    minTokenQtyUndecimalized = '0',
): string => {
    const { tokenId, utxos } = tokenUtxos;
    // Iterate over tokenUtxos to get total token supply

    // Initialize circulatingSupply
    // For the purposes of airdrop calculations, this is the total supply of a token held
    // at p2pkh or p2sh addresses
    let circulatingSupply = new BN(0);

    const minTokenAmount = new BN(minTokenQtyUndecimalized);

    // Map of outputScript: amount
    // Some holders are expected to have multiple utxos of a token
    // But we only want to know the total amount held by each holding outputScript
    const tokenHolders = new Map();
    for (const utxo of utxos) {
        if (typeof utxo.token === 'undefined') {
            // Note: all these tokens will have utxo key, since they came from the tokenId call
            // We do this check for typescript
            continue;
        }
        // Get this holder's address
        let address;
        try {
            address = cashaddr.encodeOutputScript(utxo.script);
        } catch (err) {
            // If the output script is not p2pkh or p2sh, we cannot get its address
            // We do not include non-p2pkh and non-p2sh scripts in airdrops
            // In calculating airdrop txs,
            // token amounts held at such scripts are not considered part of circulatingSupply
            continue;
        }

        if (excludedAddresses.includes(address)) {
            // If this is an ignored address, go to the next utxo
            continue;
        }

        // Get amount of token in this utxo
        const tokenAmountThisUtxo = new BN(utxo.token.amount);

        if (tokenAmountThisUtxo.eq(0)) {
            // Ignore 0 amounts
            // These could be from malformed txs or minting batons
            continue;
        }

        // Increment the token qty held at this address in the tokenHolders map
        const addrInMap = tokenHolders.get(address);
        tokenHolders.set(
            address,
            typeof addrInMap === 'undefined'
                ? tokenAmountThisUtxo
                : addrInMap.plus(tokenAmountThisUtxo),
        );

        // Increment circulatingSupply for this airdrop calculation
        circulatingSupply = circulatingSupply.plus(new BN(utxo.token.amount));
    }

    // If no holders are p2pkh or p2sh, throw an error
    if (circulatingSupply.eq(0)) {
        throw new Error(
            `No token balance of token "${tokenId}" held by p2pkh or p2sh addresses`,
        );
    }

    const airdropAmountSatoshis = toSatoshis(parseFloat(airdropAmountXec));

    // Remove tokenHolders with ineligible balance
    const ineligibleRecipientsLowBalance = new Set();
    tokenHolders.forEach((tokenQty, address) => {
        if (tokenQty.lt(minTokenAmount)) {
            ineligibleRecipientsLowBalance.add(address);
        }
    });

    // We need to iterate over all the utxos again, as now the relevant circulatingSupply will be different
    const eligibleTokenHolders = new Map();
    let eligibleCirculatingSupply = new BN(0);
    for (const utxo of utxos) {
        if (typeof utxo.token === 'undefined') {
            // Note: all these tokens will have utxo key, since they came from the tokenId call
            // We do this check for typescript
            continue;
        }
        // Get this holder's address
        let address;
        try {
            address = cashaddr.encodeOutputScript(utxo.script);
        } catch (err) {
            continue;
        }

        if (
            excludedAddresses.includes(address) ||
            ineligibleRecipientsLowBalance.has(address)
        ) {
            // If this is an ignored address, go to the next utxo
            // OR if this is an ineligible address due to low token balance, go to the next utxo
            continue;
        }

        // Get amount of token in this utxo
        const tokenAmountThisUtxo = new BN(utxo.token.amount);

        if (tokenAmountThisUtxo.eq(0)) {
            // Ignore 0 amounts
            // These could be from malformed txs or minting batons
            continue;
        }

        // Increment the token qty held at this address in the tokenHolders map
        const addrInMap = eligibleTokenHolders.get(address);
        eligibleTokenHolders.set(
            address,
            typeof addrInMap === 'undefined'
                ? tokenAmountThisUtxo
                : addrInMap.plus(tokenAmountThisUtxo),
        );

        // Increment circulatingSupply for this airdrop calculation
        eligibleCirculatingSupply = eligibleCirculatingSupply.plus(
            new BN(utxo.token.amount),
        );
    }

    // Recipients who would receive less than dust sats are ineligible
    const ineligibleRecipientsDust = new Set();
    eligibleTokenHolders.forEach((tokenQty, address) => {
        const satsToReceive = Math.floor(
            tokenQty
                .div(eligibleCirculatingSupply)
                .times(airdropAmountSatoshis)
                .toNumber(),
        );
        if (satsToReceive < appConfig.dustSats) {
            ineligibleRecipientsDust.add(address);
        }
    });

    // Now that we know ALL ineligible recipients, we must again iterate over token utxos to get the
    // correct circulating supply
    let finalEligibleCirculatingSupply = new BN(0);
    const airdropRecipients = new Map();
    for (const utxo of utxos) {
        if (typeof utxo.token === 'undefined') {
            // Note: all these tokens will have utxo key, since they came from the tokenId call
            // We do this check for typescript
            continue;
        }
        // Get this holder's address
        let address;
        try {
            address = cashaddr.encodeOutputScript(utxo.script);
        } catch (err) {
            // If the output script is not p2pkh or p2sh, we cannot get its address
            // We do not include non-p2pkh and non-p2sh scripts in airdrops
            // In calculating airdrop txs,
            // token amounts held at such scripts are not considered part of circulatingSupply
            continue;
        }

        if (
            excludedAddresses.includes(address) ||
            ineligibleRecipientsLowBalance.has(address) ||
            ineligibleRecipientsDust.has(address)
        ) {
            // If this is an ignored address
            // OR if this address is ineligible for low token balance
            // OR if this address is ineligible because it would receive dust
            // go to the next utxo
            continue;
        }

        // Get amount of token in this utxo
        const tokenAmountThisUtxo = new BN(utxo.token.amount);

        if (tokenAmountThisUtxo.eq(0)) {
            // Ignore 0 amounts
            // These could be from malformed txs or minting batons
            continue;
        }

        // Increment the token qty held at this address in the tokenHolders map
        const addrInMap = airdropRecipients.get(address);
        airdropRecipients.set(
            address,
            typeof addrInMap === 'undefined'
                ? tokenAmountThisUtxo
                : addrInMap.plus(tokenAmountThisUtxo),
        );

        // Increment circulatingSupply for this airdrop calculation
        finalEligibleCirculatingSupply = finalEligibleCirculatingSupply.plus(
            new BN(utxo.token.amount),
        );
    }

    // It is possible that we have no airdropRecipients because, after all exclusions are made,
    // The only "eligible" recipients left would receive dust
    // This is easy to do by setting an aidrop amount that is too low
    if (airdropRecipients.size === 0) {
        throw new Error(
            'No eligible recipients with these airdrop settings. Try raising the airdrop amount.',
        );
    }

    // Now we can build our csv
    const airdropArray: string[] = [];
    airdropRecipients.forEach((tokenQty, address) => {
        const satsToReceive = Math.floor(
            tokenQty
                .div(finalEligibleCirculatingSupply)
                .times(airdropAmountSatoshis)
                .toNumber(),
        );
        airdropArray.push(`${address}, ${toXec(satsToReceive)}`);
    });

    return airdropArray.join('\n');
};

export const getEqualAirdropTx = (
    tokenUtxos: TokenIdUtxos,
    excludedAddresses: string[],
    airdropAmountXec: string,
    minTokenQtyUndecimalized = '0',
): string => {
    const { tokenId, utxos } = tokenUtxos;
    const minTokenAmount = new BN(minTokenQtyUndecimalized);
    const tokenHolders = new Map();
    // Iterate over tokenUtxos to get total token supply
    for (const utxo of utxos) {
        if (typeof utxo.token === 'undefined') {
            // Note: all these tokens will have utxo key, since they came from the tokenId call
            // We do this check for typescript
            continue;
        }
        // Get this holder's address
        let address;
        try {
            address = cashaddr.encodeOutputScript(utxo.script);
        } catch (err) {
            // If the output script is not p2pkh or p2sh, we cannot get its address
            // We do not include non-p2pkh and non-p2sh scripts in airdrops
            // In calculating airdrop txs,
            // token amounts held at such scripts are not considered part of circulatingSupply
            continue;
        }

        if (excludedAddresses.includes(address)) {
            // If this is an ignored address, go to the next utxo
            continue;
        }

        // Get amount of token in this utxo
        const tokenAmountThisUtxo = new BN(utxo.token.amount);

        if (tokenAmountThisUtxo.eq(0)) {
            // Ignore 0 amounts
            // These could be from malformed txs or minting batons
            continue;
        }

        // Increment the token qty held at this address in the tokenHolders map
        const addrInMap = tokenHolders.get(address);
        tokenHolders.set(
            address,
            typeof addrInMap === 'undefined'
                ? tokenAmountThisUtxo
                : addrInMap.plus(tokenAmountThisUtxo),
        );
    }

    // If no holders are p2pkh or p2sh, throw an error
    if (tokenHolders.size === 0) {
        throw new Error(
            `No token balance of token "${tokenId}" held by p2pkh or p2sh addresses`,
        );
    }

    // Remove tokenHolders with ineligible balance
    tokenHolders.forEach((tokenQty, address, thisMap) => {
        if (tokenQty.lt(minTokenAmount)) {
            thisMap.delete(address);
        }
    });

    const totalRecipients = tokenHolders.size;

    if (tokenHolders.size === 0) {
        throw new Error(
            `No token holders with more than the minimum eligible balance specified. Try a higher minimum eToken holder balance.`,
        );
    }

    // How much XEC does each holder get?
    const equalAirdropAmount = Math.floor(
        toSatoshis(parseFloat(airdropAmountXec)) / totalRecipients,
    );
    if (equalAirdropAmount < appConfig.dustSats) {
        throw new Error(
            `${totalRecipients} eligible recipients. Recipients would receive less than ${appConfig.dustSats} sats with a total airdrop amount of ${airdropAmountXec} XEC. Please increase your airdrop amount or ignore more addresses.`,
        );
    }

    // Now we can build our csv
    const airdropArray: string[] = [];
    tokenHolders.forEach((tokenQty, address) => {
        airdropArray.push(`${address}, ${toXec(equalAirdropAmount)}`);
    });

    return airdropArray.join('\n');
};
