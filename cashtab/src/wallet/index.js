/**
 * Get total value of satoshis associated with an array of chronik utxos
 * @param {array} nonSlpUtxos array of chronik utxos
 * (each is an object with an integer as a string
 * stored at 'value' key representing associated satoshis)
 * e.g. {value: '12345'}
 * @throws {error} if nonSlpUtxos does not have a .reduce method
 * @returns {number | NaN} integer, total balance of input utxos in satoshis
 * or NaN if any utxo is invalid
 */
export const getBalanceSats = nonSlpUtxos => {
    return nonSlpUtxos.reduce(
        (previousBalance, utxo) => previousBalance + parseInt(utxo.value),
        0,
    );
};
