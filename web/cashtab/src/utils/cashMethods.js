import { currency } from '@components/Common/Ticker';
import BigNumber from 'bignumber.js';

export const fromSmallestDenomination = (
    amount,
    cashDecimals = currency.cashDecimals,
) => {
    const amountBig = new BigNumber(amount);
    const multiplier = new BigNumber(10 ** (-1 * cashDecimals));
    const amountInBaseUnits = amountBig.times(multiplier);
    return amountInBaseUnits.toNumber();
};

export const toSmallestDenomination = (
    sendAmount,
    cashDecimals = currency.cashDecimals,
) => {
    // Replace the BCH.toSatoshi method with an equivalent function that works for arbitrary decimal places
    // Example, for an 8 decimal place currency like Bitcoin
    // Input: a BigNumber of the amount of Bitcoin to be sent
    // Output: a BigNumber of the amount of satoshis to be sent, or false if input is invalid

    // Validate
    // Input should be a BigNumber with no more decimal places than cashDecimals
    const isValidSendAmount =
        BigNumber.isBigNumber(sendAmount) && sendAmount.dp() <= cashDecimals;
    if (!isValidSendAmount) {
        return false;
    }
    const conversionFactor = new BigNumber(10 ** cashDecimals);
    const sendAmountSmallestDenomination = sendAmount.times(conversionFactor);
    return sendAmountSmallestDenomination;
};

export const formatBalance = x => {
    try {
        let balanceInParts = x.toString().split('.');
        balanceInParts[0] = balanceInParts[0].replace(
            /\B(?=(\d{3})+(?!\d))/g,
            ' ',
        );
        return balanceInParts.join('.');
    } catch (err) {
        console.log(`Error in formatBalance for ${x}`);
        console.log(err);
        return x;
    }
};

export const batchArray = (inputArray, batchSize) => {
    // take an array of n elements, return an array of arrays each of length batchSize

    const batchedArray = [];
    for (let i = 0; i < inputArray.length; i += batchSize) {
        const tempArray = inputArray.slice(i, i + batchSize);
        batchedArray.push(tempArray);
    }
    return batchedArray;
};

export const flattenBatchedHydratedUtxos = batchedHydratedUtxoDetails => {
    // Return same result as if only the bulk API call were made
    // to do this, just need to move all utxos under one slpUtxos
    /*
    given 
    [
      {
        slpUtxos: [
            {
                utxos: [],
                address: '',
            }
          ],
      },
      {
        slpUtxos: [
            {
                utxos: [],
                address: '',
            }
          ],
      }
    ]
  return [
    {
        slpUtxos: [
            {
            utxos: [],
            address: ''
            },
            {
            utxos: [],
            address: ''
            },
          ]
        }
  */
    const flattenedBatchedHydratedUtxos = { slpUtxos: [] };
    for (let i = 0; i < batchedHydratedUtxoDetails.length; i += 1) {
        const theseSlpUtxos = batchedHydratedUtxoDetails[i].slpUtxos[0];
        flattenedBatchedHydratedUtxos.slpUtxos.push(theseSlpUtxos);
    }
    return flattenedBatchedHydratedUtxos;
};

export const loadStoredWallet = walletStateFromStorage => {
    // Accept cached tokens array that does not save BigNumber type of BigNumbers
    // Return array with BigNumbers converted
    // See BigNumber.js api for how to create a BigNumber object from an object
    // https://mikemcl.github.io/bignumber.js/
    const liveWalletState = walletStateFromStorage;
    const { tokens } = liveWalletState;
    for (let i = 0; i < tokens.length; i += 1) {
        const thisTokenBalance = tokens[i].balance;
        thisTokenBalance._isBigNumber = true;
        tokens[i].balance = new BigNumber(thisTokenBalance);
    }
    return liveWalletState;
};

export const isValidStoredWallet = walletStateFromStorage => {
    return (
        typeof walletStateFromStorage === 'object' &&
        'state' in walletStateFromStorage &&
        typeof walletStateFromStorage.state === 'object' &&
        'balances' in walletStateFromStorage.state &&
        'utxos' in walletStateFromStorage.state &&
        'hydratedUtxoDetails' in walletStateFromStorage.state &&
        'slpBalancesAndUtxos' in walletStateFromStorage.state &&
        'tokens' in walletStateFromStorage.state
    );
};
