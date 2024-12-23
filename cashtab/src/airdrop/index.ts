// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from 'bignumber.js';
import { toSatoshis, toXec } from 'wallet';
import { ChronikClient } from 'chronik-client';
import { Agora, AgoraPartial } from 'ecash-agora';
import { shaRmd160 } from 'ecash-lib';
import {
    encodeCashAddress,
    getOutputScriptFromAddress,
    getTypeAndHashFromOutputScript,
    encodeOutputScript,
} from 'ecashaddrjs';
import appConfig from 'config/app';

/**
 * airdrops/index.js
 * Functions that support calculating token airdrops in Cashtab
 */

/**
 * Map of outputScript => tokenSatoshis
 */
type TokenHolderMap = Map<string, bigint>;

/**
 * token UTXOS may be held by active agora offers
 * In this case, we do not want to airdrop XEC to the agora p2sh
 * Instead we get the p2pkh address that created this offer
 * And we assign that address a balance of the qty being offered
 */
export const getAgoraHolders = async (
    agora: Agora,
    tokenId: string,
): Promise<TokenHolderMap> => {
    const activeOffers = await agora.activeOffersByTokenId(tokenId);
    const agoraHolders = new Map();
    for (const offer of activeOffers) {
        const offerInfo = offer.variant.params;
        const offeredTokens = BigInt(offer.token.amount);
        const pk =
            offerInfo instanceof AgoraPartial
                ? offerInfo.makerPk
                : offerInfo.cancelPk;
        // Note the use of shaRmd160 requires initWasm()
        const hash = shaRmd160(pk);
        const addr = encodeCashAddress('ecash', 'p2pkh', hash);
        const outputScript = getOutputScriptFromAddress(addr);

        // Have we already added this holder to the map?
        const thisAgoraHolderBalance = agoraHolders.get(outputScript);
        if (typeof thisAgoraHolderBalance === 'undefined') {
            // Initialize an agora holder
            agoraHolders.set(outputScript, offeredTokens);
        } else {
            // Increment an agora holder
            agoraHolders.set(
                outputScript,
                thisAgoraHolderBalance + offeredTokens,
            );
        }
    }
    return agoraHolders;
};

export const getP2pkhHolders = async (
    chronik: ChronikClient,
    tokenId: string,
): Promise<TokenHolderMap> => {
    // Get all utxos for this tokenId
    const utxos = (await chronik.tokenId(tokenId).utxos()).utxos;
    const p2pkhHolders: TokenHolderMap = new Map();
    for (const utxo of utxos) {
        if (typeof utxo.token === 'undefined') {
            // Ignore non-token utxos

            // Should never happen, as we can only get token utxos
            // from chronik.tokenId(tokenId).utxos()
            continue;
        }
        const { script } = utxo;

        // Validate script for p2pkh
        try {
            const { type } = getTypeAndHashFromOutputScript(script);
            if (type !== 'p2pkh') {
                continue;
            }
        } catch {
            // If we have an error in getTypeAndHashFromOutputScript, then it is not p2pkh
            continue;
        }

        const tokenSatoshis = utxo.token.amount;

        if (tokenSatoshis === '0') {
            // We do not add a 0-qty holder
            // this happens for a holder who e.g. only holds a mint baton
            continue;
        }

        // Have we already added this holder to the map?
        const thisHolderBalance = p2pkhHolders.get(script);
        if (typeof thisHolderBalance === 'undefined') {
            // Initialize a p2pkh holder
            p2pkhHolders.set(script, BigInt(tokenSatoshis));
        } else {
            // Increment an agora holder
            p2pkhHolders.set(script, thisHolderBalance + BigInt(tokenSatoshis));
        }
    }
    return p2pkhHolders;
};

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
    tokenHolders: TokenHolderMap,
    excludedAddresses: string[],
    airdropAmountXec: string,
    minTokenQtyUndecimalized = '0',
): string => {
    // The total supply (in tokenSatoshis) held by all p2pkh holders
    const totalQtyHeldByTokenHolders = new BigNumber(
        Array.from(tokenHolders.entries())
            .reduce((acc, [, value]) => acc + value, 0n)
            .toString(),
    );

    // The total ELIGIBLE supply (in tokenSatoshis) is the sum of the supply held by
    // all tokenHolders; i.e. after excluding holders via settings or balance reqs
    let circulatingSupply = new BigNumber(0);

    // User-configured param to only reward users holding a certain qty of token
    const minTokenAmount = new BigNumber(minTokenQtyUndecimalized);

    // Required balance to earn at least 546 satoshis in this airdrop, the minimum amount
    // an output can hold on eCash network
    const minTokenAmountDust = totalQtyHeldByTokenHolders
        .times(appConfig.dustSats)
        .div(toSatoshis(parseFloat(airdropAmountXec)))
        .integerValue(BigNumber.ROUND_UP);

    // Update tokenHolders to be address => tokenSatoshisBigNumber
    // We determine eligible supply here by only adding holings of eligible holders
    const airdropRecipients = new Map();
    tokenHolders.forEach((tokenSatoshis, outputScript) => {
        // We only expect p2pkh outputScripts, so no errors are expected encoding the address
        const address = encodeOutputScript(outputScript);
        const tokenSatoshisBigNumber = new BigNumber(tokenSatoshis.toString());

        if (
            !excludedAddresses.includes(address) &&
            tokenSatoshisBigNumber.gte(minTokenAmount) &&
            tokenSatoshisBigNumber.gte(minTokenAmountDust)
        ) {
            // We only add this token holder to the map if it is not excluded by settings
            airdropRecipients.set(address, tokenSatoshisBigNumber);
            circulatingSupply = circulatingSupply.plus(tokenSatoshisBigNumber);
        }
    });

    // If no holders are p2pkh or p2sh, throw an error
    if (circulatingSupply.eq(0)) {
        throw new Error(
            'No eligible recipients with these airdrop settings. Try raising the airdrop amount.',
        );
    }

    const airdropAmountSatoshis = toSatoshis(parseFloat(airdropAmountXec));

    // Sort airdropRecipients by most to least for easy reading of results
    // Convert Map to sorted array of entries (descending by BigNumber value)
    const sortedAirdropRecipientsArr = Array.from(
        airdropRecipients.entries(),
    ).sort(
        (a, b) => b[1].comparedTo(a[1]), // b[1] is the BigNumber value of b, a[1] for a
    );

    // If you want to convert back to a Map:
    const sortedAirdropRecipients = new Map(sortedAirdropRecipientsArr);

    // Now we can build our csv
    const airdropArray: string[] = [];
    sortedAirdropRecipients.forEach((tokenSatoshisBigNumber, address) => {
        const satsToReceive = Math.floor(
            tokenSatoshisBigNumber
                .div(circulatingSupply)
                .times(airdropAmountSatoshis)
                .toNumber(),
        );
        airdropArray.push(`${address}, ${toXec(satsToReceive)}`);
    });

    return airdropArray.join('\n');
};

export const getEqualAirdropTx = (
    tokenHolders: TokenHolderMap,
    excludedAddresses: string[],
    airdropAmountXec: string,
    minTokenQtyUndecimalized = '0',
): string => {
    const minTokenAmount = new BigNumber(minTokenQtyUndecimalized);
    // Update tokenHolders to be address => tokenSatoshisBigNumber
    // We determine eligible supply here by only adding holings of eligible holders
    const airdropRecipients = new Map();
    tokenHolders.forEach((tokenSatoshis, outputScript) => {
        // We only expect p2pkh outputScripts, so no errors are expected encoding the address
        const address = encodeOutputScript(outputScript);
        const tokenSatoshisBigNumber = new BigNumber(tokenSatoshis.toString());

        if (
            !excludedAddresses.includes(address) &&
            tokenSatoshisBigNumber.gte(minTokenAmount)
        ) {
            // We only add this token holder to the map if it is not excluded by settings
            airdropRecipients.set(address, tokenSatoshisBigNumber);
        }
    });

    const totalRecipients = airdropRecipients.size;
    // If no holders are p2pkh or p2sh, throw an error
    if (totalRecipients === 0) {
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

    // Sort airdropRecipients by most to least for easy reading of results
    // Note that in this case, they all get paid the same
    // But we are still putting the richest addresses first
    // never go full communism
    const sortedAirdropRecipientsArr = Array.from(
        airdropRecipients.entries(),
    ).sort(
        (a, b) => b[1].comparedTo(a[1]), // b[1] is the BigNumber value of b, a[1] for a
    );

    // If you want to convert back to a Map:
    const sortedAirdropRecipients = new Map(sortedAirdropRecipientsArr);

    // Now we can build our csv
    const airdropArray: string[] = [];
    sortedAirdropRecipients.forEach((tokenQty, address) => {
        airdropArray.push(`${address}, ${toXec(equalAirdropAmount)}`);
    });

    return airdropArray.join('\n');
};
