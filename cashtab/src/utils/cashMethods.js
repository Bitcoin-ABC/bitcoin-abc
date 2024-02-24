import { BN } from 'slp-mdm';
import cashaddr from 'ecashaddrjs';
import appConfig from 'config/app';
import { toXec } from 'wallet';

export const getCashtabByteCount = (p2pkhInputCount, p2pkhOutputCount) => {
    // Simplifying bch-js function for P2PKH txs only, as this is all Cashtab supports for now
    // https://github.com/Permissionless-Software-Foundation/bch-js/blob/master/src/bitcoincash.js#L408
    // The below magic numbers refer to:
    // const types = {
    //     inputs: {
    //         'P2PKH': 148 * 4,
    //     },
    //     outputs: {
    //         P2PKH: 34 * 4,
    //     },
    // };

    const inputCount = new BN(p2pkhInputCount);
    const outputCount = new BN(p2pkhOutputCount);
    const inputWeight = new BN(148 * 4);
    const outputWeight = new BN(34 * 4);
    const nonSegwitWeightConstant = new BN(10 * 4);
    let totalWeight = new BN(0);
    totalWeight = totalWeight
        .plus(inputCount.times(inputWeight))
        .plus(outputCount.times(outputWeight))
        .plus(nonSegwitWeightConstant);
    const byteCount = totalWeight.div(4).integerValue(BN.ROUND_CEIL);

    return Number(byteCount);
};

export const calcFee = (
    utxos,
    p2pkhOutputNumber = 2,
    satoshisPerByte = appConfig.defaultFee,
    opReturnByteCount = 0,
) => {
    const byteCount = getCashtabByteCount(utxos.length, p2pkhOutputNumber);
    const txFee = Math.ceil(satoshisPerByte * (byteCount + opReturnByteCount));
    return txFee;
};

/**
 * Get the total XEC amount sent in a one-to-many XEC tx
 * @param {array} destinationAddressAndValueArray
 * Array constructed by user input of addresses and values
 * e.g. [
 *  "<address>, <value>",
 *   "<address>, <value>"
 *  ]
 * @returns {number} total value of XEC
 */
export const sumOneToManyXec = destinationAddressAndValueArray => {
    return destinationAddressAndValueArray.reduce((prev, curr) => {
        return parseFloat(prev) + parseFloat(curr.split(',')[1]);
    }, 0);
};

export const getWalletBalanceFromUtxos = nonSlpUtxos => {
    const totalBalanceInSatoshis = nonSlpUtxos.reduce(
        (previousBalance, utxo) => previousBalance.plus(new BN(utxo.value)),
        new BN(0),
    );
    return {
        totalBalanceInSatoshis: totalBalanceInSatoshis.toString(),
        totalBalance: toXec(totalBalanceInSatoshis.toNumber()).toString(),
    };
};

export const isValidStoredWallet = walletStateFromStorage => {
    return (
        typeof walletStateFromStorage === 'object' &&
        'state' in walletStateFromStorage &&
        'mnemonic' in walletStateFromStorage &&
        'name' in walletStateFromStorage &&
        'Path245' in walletStateFromStorage &&
        'Path145' in walletStateFromStorage &&
        'Path1899' in walletStateFromStorage &&
        typeof walletStateFromStorage.state === 'object' &&
        'balances' in walletStateFromStorage.state &&
        !('hydratedUtxoDetails' in walletStateFromStorage.state) &&
        !('slpBalancesAndUtxos' in walletStateFromStorage.state) &&
        'slpUtxos' in walletStateFromStorage.state &&
        'nonSlpUtxos' in walletStateFromStorage.state &&
        'tokens' in walletStateFromStorage.state
    );
};

export const getWalletState = wallet => {
    if (!wallet || !wallet.state) {
        return {
            balances: { totalBalance: 0, totalBalanceInSatoshis: 0 },
            hydratedUtxoDetails: {},
            tokens: [],
            slpUtxos: [],
            nonSlpUtxos: [],
            parsedTxHistory: [],
            utxos: [],
        };
    }

    return wallet.state;
};

export function convertEtokenToEcashAddr(eTokenAddress) {
    if (!eTokenAddress) {
        return new Error(
            `cashMethods.convertToEcashAddr() error: No etoken address provided`,
        );
    }

    // Confirm input is a valid eToken address
    const isValidInput = cashaddr.isValidCashAddress(eTokenAddress, 'etoken');
    if (!isValidInput) {
        return new Error(
            `cashMethods.convertToEcashAddr() error: ${eTokenAddress} is not a valid etoken address`,
        );
    }

    // Check for etoken: prefix
    const isPrefixedEtokenAddress = eTokenAddress.slice(0, 7) === 'etoken:';

    // If no prefix, assume it is checksummed for an etoken: prefix
    const testedEtokenAddr = isPrefixedEtokenAddress
        ? eTokenAddress
        : `etoken:${eTokenAddress}`;

    let ecashAddress;
    try {
        const { type, hash } = cashaddr.decode(testedEtokenAddr);
        ecashAddress = cashaddr.encode('ecash', type, hash);
    } catch (err) {
        return err;
    }

    return ecashAddress;
}

export function convertToEcashPrefix(bitcoincashPrefixedAddress) {
    // Prefix-less addresses may be valid, but the cashaddr.decode function used below
    // will throw an error without a prefix. Hence, must ensure prefix to use that function.
    const hasPrefix = bitcoincashPrefixedAddress.includes(':');
    if (hasPrefix) {
        // Is it bitcoincash: or simpleledger:
        const { type, hash, prefix } = cashaddr.decode(
            bitcoincashPrefixedAddress,
        );

        let newPrefix;
        if (prefix === 'bitcoincash') {
            newPrefix = 'ecash';
        } else if (prefix === 'simpleledger') {
            newPrefix = 'etoken';
        } else {
            return bitcoincashPrefixedAddress;
        }

        const convertedAddress = cashaddr.encode(newPrefix, type, hash);

        return convertedAddress;
    } else {
        return bitcoincashPrefixedAddress;
    }
}

export function convertEcashtoEtokenAddr(eCashAddress) {
    const isValidInput = cashaddr.isValidCashAddress(eCashAddress, 'ecash');
    if (!isValidInput) {
        return new Error(`${eCashAddress} is not a valid ecash address`);
    }

    // Check for ecash: prefix
    const isPrefixedEcashAddress = eCashAddress.slice(0, 6) === 'ecash:';

    // If no prefix, assume it is checksummed for an ecash: prefix
    const testedEcashAddr = isPrefixedEcashAddress
        ? eCashAddress
        : `ecash:${eCashAddress}`;

    let eTokenAddress;
    try {
        const { type, hash } = cashaddr.decode(testedEcashAddr);
        eTokenAddress = cashaddr.encode('etoken', type, hash);
    } catch (err) {
        return new Error('eCash to eToken address conversion error');
    }
    return eTokenAddress;
}

export const isLegacyMigrationRequired = wallet => {
    // If the wallet does not have Path1899,
    // Or each Path1899, Path145, Path245 does not have a public key
    // Then it requires migration
    if (
        !wallet.Path1899 ||
        !wallet.Path1899.publicKey ||
        !wallet.Path1899.hash160 ||
        !wallet.Path145.publicKey ||
        !wallet.Path145.hash160 ||
        !wallet.Path245.publicKey ||
        !wallet.Path245.hash160 ||
        !wallet.Path1899.cashAddress.startsWith('ecash:') ||
        !wallet.Path145.cashAddress.startsWith('ecash:') ||
        !wallet.Path245.cashAddress.startsWith('ecash:')
    ) {
        return true;
    }

    return false;
};

export const getHashArrayFromWallet = wallet => {
    // If the wallet has wallet.Path1899.hash160, it's migrated and will have all of them
    // Return false for an umigrated wallet
    const hash160Array =
        wallet && wallet.Path1899 && 'hash160' in wallet.Path1899
            ? [
                  wallet.Path245.hash160,
                  wallet.Path145.hash160,
                  wallet.Path1899.hash160,
              ]
            : false;
    return hash160Array;
};

export const isActiveWebsocket = ws => {
    // Return true if websocket is connected and subscribed
    // Otherwise return false
    return (
        ws !== null &&
        ws &&
        'ws' in ws &&
        'readyState' in ws.ws &&
        ws.ws.readyState === 1 &&
        'subs' in ws &&
        ws.subs.length > 0
    );
};

export const outputScriptToAddress = outputScript => {
    // returns P2SH or P2PKH address

    // P2PKH addresses are in outputScript of type 76a914...88ac
    // P2SH addresses are in outputScript of type a914...87

    // Return false if cannot determine P2PKH or P2SH address

    const typeTestSlice = outputScript.slice(0, 4);

    let addressType;
    let hash160;
    switch (typeTestSlice) {
        case '76a9':
            addressType = 'P2PKH';
            hash160 = outputScript.substring(
                outputScript.indexOf('76a914') + '76a914'.length,
                outputScript.lastIndexOf('88ac'),
            );
            break;
        case 'a914':
            addressType = 'P2SH';
            hash160 = outputScript.substring(
                outputScript.indexOf('a914') + 'a914'.length,
                outputScript.lastIndexOf('87'),
            );
            break;
        default:
            throw new Error('Unrecognized outputScript format');
    }

    // Test hash160 for correct length
    if (hash160.length !== 40) {
        throw new Error('Parsed hash160 is incorrect length');
    }

    const buffer = Buffer.from(hash160, 'hex');

    // Because ecashaddrjs only accepts Uint8Array as input type, convert
    const hash160ArrayBuffer = new ArrayBuffer(buffer.length);
    const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer);

    for (let i = 0; i < hash160Uint8Array.length; i += 1) {
        hash160Uint8Array[i] = buffer[i];
    }

    // Encode ecash: address
    const ecashAddress = cashaddr.encode(
        'ecash',
        addressType,
        hash160Uint8Array,
    );

    return ecashAddress;
};
