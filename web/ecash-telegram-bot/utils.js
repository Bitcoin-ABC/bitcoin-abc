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
};
