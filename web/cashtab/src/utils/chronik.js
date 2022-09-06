// Chronik methods

/* 
Note: chronik.script('p2pkh', hash160).utxos(); is not readily mockable in jest
Hence it is necessary to keep this out of any functions that require unit testing
*/
export const getUtxosSingleHashChronik = async (chronik, hash160) => {
    // Get utxos at a single address, which chronik takes in as a hash160
    let utxos;
    try {
        utxos = await chronik.script('p2pkh', hash160).utxos();
        if (utxos.length === 0) {
            // Chronik returns an empty array if there are no utxos at this hash160
            return [];
        }
        /* Chronik returns an array of with a single object if there are utxos at this hash 160
        [
            {
                outputScript: <hash160>,
                utxos:[{utxo}, {utxo}, ..., {utxo}]
            }
        ]
        */

        // Return only the array of utxos at this address
        return utxos[0].utxos;
    } catch (err) {
        console.log(`Error in chronik.utxos(${hash160})`);
        console.log(err);
    }
};

export const returnGetUtxosChronikPromise = (chronik, hash160AndAddressObj) => {
    /*
        Chronik thinks in hash160s, but people and wallets think in addresses
        Add the address to each utxo
    */
    return new Promise((resolve, reject) => {
        getUtxosSingleHashChronik(chronik, hash160AndAddressObj.hash160).then(
            result => {
                for (let i = 0; i < result.length; i += 1) {
                    const thisUtxo = result[i];
                    thisUtxo.address = hash160AndAddressObj.address;
                }
                resolve(result);
            },
            err => {
                reject(err);
            },
        );
    });
};

export const getUtxosChronik = async (chronik, hash160sMappedToAddresses) => {
    /* 
        Chronik only accepts utxo requests for one address at a time
        Construct an array of promises for each address
        Note: Chronik requires the hash160 of an address for this request
    */
    const chronikUtxoPromises = [];
    for (let i = 0; i < hash160sMappedToAddresses.length; i += 1) {
        const thisPromise = returnGetUtxosChronikPromise(
            chronik,
            hash160sMappedToAddresses[i],
        );
        chronikUtxoPromises.push(thisPromise);
    }
    const allUtxos = await Promise.all(chronikUtxoPromises);
    // Since each individual utxo has address information, no need to keep them in distinct arrays
    // Combine into one array of all utxos
    const flatUtxos = allUtxos.flat();
    return flatUtxos;
};
