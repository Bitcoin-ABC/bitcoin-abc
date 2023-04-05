'use strict'

module.exports = {
    returnLabeledChronikBlockPromise: async function (
        chronik,
        blockhash,
        blockname,
    ) {
        return new Promise((resolve, reject) => {
            chronik.block(blockhash).then(
                result => {
                    const namedBlockDetails = {};
                    namedBlockDetails.blockname = blockname;
                    namedBlockDetails.result = result;

                    resolve(namedBlockDetails);
                },
                err => {
                    reject(err);
                },
            );
        });
    },    
    returnAddressPreview: function (cashAddress, sliceSize = 3) {
        const addressParts = cashAddress.split(':');
        const unprefixedAddress = addressParts[addressParts.length - 1];
        return `${unprefixedAddress.slice(
            0,
            sliceSize,
        )}...${unprefixedAddress.slice(-sliceSize)}`;
    },
};
