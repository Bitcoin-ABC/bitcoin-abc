import BigNumber from 'bignumber.js';
import { currency } from '../components/Common/Ticker';

export default function useBCH() {
    const DUST = 0.000005;
    const SEND_BCH_ERRORS = {
        INSUFICIENT_FUNDS: 0,
        NETWORK_ERROR: 1,
        INSUFFICIENT_PRIORITY: 66, // ~insufficient fee
        DOUBLE_SPENDING: 18,
        MAX_UNCONFIRMED_TXS: 64,
    };

    const getRestUrl = (apiIndex = 0) => {
        const apiString =
            process.env.REACT_APP_NETWORK === `mainnet`
                ? process.env.REACT_APP_BCHA_APIS
                : process.env.REACT_APP_BCHA_APIS_TEST;
        const apiArray = apiString.split(',');
        return apiArray[apiIndex];
    };

    const getTxHistory = async (BCH, addresses) => {
        let txHistoryResponse;
        try {
            //console.log(`API Call: BCH.Electrumx.utxo(addresses)`);
            //console.log(addresses);
            txHistoryResponse = await BCH.Electrumx.transactions(addresses);
            //console.log(`BCH.Electrumx.transactions(addresses) succeeded`);
            //console.log(`txHistoryResponse`, txHistoryResponse);
            if (txHistoryResponse.success && txHistoryResponse.transactions) {
                return txHistoryResponse.transactions;
            } else {
                // eslint-disable-next-line no-throw-literal
                throw new Error('Error in getTxHistory');
            }
        } catch (err) {
            console.log(`Error in BCH.Electrumx.transactions(addresses):`);
            console.log(err);
            return err;
        }
    };

    // Split out the BCH.Electrumx.utxo(addresses) call from the getSlpBalancesandUtxos function
    // If utxo set has not changed, you do not need to hydrate the utxo set
    // This drastically reduces calls to the API
    const getUtxos = async (BCH, addresses) => {
        let utxosResponse;
        try {
            //console.log(`API Call: BCH.Electrumx.utxo(addresses)`);
            //console.log(addresses);
            utxosResponse = await BCH.Electrumx.utxo(addresses);
            //console.log(`BCH.Electrumx.utxo(addresses) succeeded`);
            //console.log(`utxosResponse`, utxosResponse);
            return utxosResponse.utxos;
        } catch (err) {
            console.log(`Error in BCH.Electrumx.utxo(addresses):`);
            return err;
        }
    };

    const getSlpBalancesAndUtxos = async (BCH, utxos) => {
        let hydratedUtxoDetails;

        try {
            hydratedUtxoDetails = await BCH.SLP.Utils.hydrateUtxos(utxos);
            //console.log(`hydratedUtxoDetails`, hydratedUtxoDetails);
        } catch (err) {
            console.log(
                `Error in BCH.SLP.Utils.hydrateUtxos(utxosResponse.utxos)`,
            );
            console.log(err);
        }
        const hydratedUtxos = [];
        for (let i = 0; i < hydratedUtxoDetails.slpUtxos.length; i += 1) {
            const hydratedUtxosAtAddress = hydratedUtxoDetails.slpUtxos[i];
            for (let j = 0; j < hydratedUtxosAtAddress.utxos.length; j += 1) {
                const hydratedUtxo = hydratedUtxosAtAddress.utxos[j];
                hydratedUtxo.address = hydratedUtxosAtAddress.address;
                hydratedUtxos.push(hydratedUtxo);
            }
        }

        //console.log(`hydratedUtxos`, hydratedUtxos);

        // WARNING
        // If you hit rate limits, your above utxos object will come back with `isValid` as null, but otherwise ok
        // You need to throw an error before setting nonSlpUtxos and slpUtxos in this case
        const nullUtxos = hydratedUtxos.filter(utxo => utxo.isValid === null);
        //console.log(`nullUtxos`, nullUtxos);
        if (nullUtxos.length > 0) {
            console.log(
                `${nullUtxos.length} null utxos found, ignoring results`,
            );
            throw new Error('Null utxos found, ignoring results');
        }

        // Prevent app from treating slpUtxos as nonSlpUtxos
        // Must enforce === false as api will occasionally return utxo.isValid === null
        // Do not classify utxos with 546 satoshis as nonSlpUtxos as a precaution
        // Do not classify any utxos that include token information as nonSlpUtxos
        const nonSlpUtxos = hydratedUtxos.filter(
            utxo =>
                utxo.isValid === false &&
                utxo.satoshis !== 546 &&
                !utxo.tokenName,
        );
        const slpUtxos = hydratedUtxos.filter(utxo => utxo.isValid);

        let tokensById = {};

        slpUtxos.forEach(slpUtxo => {
            let token = tokensById[slpUtxo.tokenId];

            if (token) {
                // Minting baton does nto have a slpUtxo.tokenQty type

                if (slpUtxo.tokenQty) {
                    token.balance = token.balance.plus(
                        new BigNumber(slpUtxo.tokenQty),
                    );
                }

                //token.hasBaton = slpUtxo.transactionType === "genesis";
                if (slpUtxo.utxoType && !token.hasBaton) {
                    token.hasBaton = slpUtxo.utxoType === 'minting-baton';
                }

                // Examples of slpUtxo
                /*
        Genesis transaction:
        {
          address: "bitcoincash:qrhzv5t79e2afc3rdutcu0d3q20gl7ul3ue58whah6"
          decimals: 9
          height: 617564
          isValid: true
          satoshis: 546
          tokenDocumentHash: ""
          tokenDocumentUrl: "developer.bitcoin.com"
          tokenId: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
          tokenName: "PiticoLaunch"
          tokenTicker: "PTCL"
          tokenType: 1
          tx_hash: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
          tx_pos: 2
          txid: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
          utxoType: "minting-baton"
          value: 546
          vout: 2
        }

        Send transaction:
        {
          address: "bitcoincash:qrhzv5t79e2afc3rdutcu0d3q20gl7ul3ue58whah6"
          decimals: 9
          height: 655115
          isValid: true
          satoshis: 546
          tokenDocumentHash: ""
          tokenDocumentUrl: "developer.bitcoin.com"
          tokenId: "6c41f244676ecfcbe3b4fabee2c72c2dadf8d74f8849afabc8a549157db69199"
          tokenName: "PiticoLaunch"
          tokenQty: 1.123456789
          tokenTicker: "PTCL"
          tokenType: 1
          transactionType: "send"
          tx_hash: "dea400f963bc9f51e010f88533010f8d1f82fc2bcc485ff8500c3a82b25abd9e"
          tx_pos: 1
          txid: "dea400f963bc9f51e010f88533010f8d1f82fc2bcc485ff8500c3a82b25abd9e"
          utxoType: "token"
          value: 546
          vout: 1
        }
        */
            } else {
                token = {};
                token.info = slpUtxo;
                token.tokenId = slpUtxo.tokenId;
                if (slpUtxo.tokenQty) {
                    token.balance = new BigNumber(slpUtxo.tokenQty);
                } else {
                    token.balance = new BigNumber(0);
                }
                if (slpUtxo.utxoType) {
                    token.hasBaton = slpUtxo.utxoType === 'minting-baton';
                } else {
                    token.hasBaton = false;
                }

                tokensById[slpUtxo.tokenId] = token;
            }
        });

        const tokens = Object.values(tokensById);
        // console.log(`tokens`, tokens);
        return {
            tokens,
            nonSlpUtxos,
            slpUtxos,
        };
    };

    const calcFee = (
        BCH,
        utxos,
        p2pkhOutputNumber = 2,
        satoshisPerByte = currency.defaultFee,
    ) => {
        const byteCount = BCH.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: p2pkhOutputNumber },
        );
        const txFee = Math.ceil(satoshisPerByte * byteCount);
        return txFee;
    };

    const sendToken = async (
        BCH,
        wallet,
        slpBalancesAndUtxos,
        { tokenId, amount, tokenReceiverAddress },
    ) => {
        const largestBchUtxo = slpBalancesAndUtxos.nonSlpUtxos.reduce(
            (previous, current) =>
                previous.satoshis > current.satoshis ? previous : current,
        );
        // console.log(`largestBchUtxo`, largestBchUtxo);
        // this is big enough? might need to combine utxos
        // TODO improve utxo selection
        /*
    {
      address: "bitcoincash:qrcl220pxeec78vnchwyh6fsdyf60uv9tcynw3u2ev"
      height: 0
      isValid: false
      satoshis: 1510
      tx_hash: "faef4d8bf56353702e29c22f2aace970ddbac617144456d509e23e1192b320a8"
      tx_pos: 0
      txid: "faef4d8bf56353702e29c22f2aace970ddbac617144456d509e23e1192b320a8"
      value: 1510
      vout: 0
      wif: "removed for git potential"
    }
    */
        const bchECPair = BCH.ECPair.fromWIF(largestBchUtxo.wif);
        const tokenUtxos = slpBalancesAndUtxos.slpUtxos.filter(
            (utxo, index) => {
                if (
                    utxo && // UTXO is associated with a token.
                    utxo.tokenId === tokenId && // UTXO matches the token ID.
                    utxo.utxoType === 'token' // UTXO is not a minting baton.
                ) {
                    return true;
                }
                return false;
            },
        );

        if (tokenUtxos.length === 0) {
            throw new Error(
                'No token UTXOs for the specified token could be found.',
            );
        }

        // BEGIN transaction construction.

        // instance of transaction builder
        let transactionBuilder;
        if (process.env.REACT_APP_NETWORK === 'mainnet') {
            transactionBuilder = new BCH.TransactionBuilder();
        } else transactionBuilder = new BCH.TransactionBuilder('testnet');

        const originalAmount = largestBchUtxo.value;
        transactionBuilder.addInput(
            largestBchUtxo.tx_hash,
            largestBchUtxo.tx_pos,
        );

        let finalTokenAmountSent = new BigNumber(0);
        let tokenAmountBeingSentToAddress = new BigNumber(amount);
        /*
    console.log(`tokenAmountBeingSentToAddress`, tokenAmountBeingSentToAddress);
    console.log(
      `tokenAmountBeingSentToAddress.toString()`,
      tokenAmountBeingSentToAddress.toString()
    );
    */
        let tokenUtxosBeingSpent = [];
        for (let i = 0; i < tokenUtxos.length; i++) {
            finalTokenAmountSent = finalTokenAmountSent.plus(
                new BigNumber(tokenUtxos[i].tokenQty).div(
                    Math.pow(10, tokenUtxos[i].decimals),
                ),
            );
            transactionBuilder.addInput(
                tokenUtxos[i].tx_hash,
                tokenUtxos[i].tx_pos,
            );
            tokenUtxosBeingSpent.push(tokenUtxos[i]);
            if (tokenAmountBeingSentToAddress.lte(finalTokenAmountSent)) {
                break;
            }
        }

        // Run a test function to mock the outputs generated by BCH.SLP.TokenType1.generateSendOpReturn below
        slpDebug(
            tokenUtxosBeingSpent,
            tokenAmountBeingSentToAddress.toString(),
        );

        // Generate the OP_RETURN code.
        console.log(`Debug output`);
        console.log(`tokenUtxos`, tokenUtxosBeingSpent);
        console.log(`sendQty`, tokenAmountBeingSentToAddress.toString());
        const slpSendObj = BCH.SLP.TokenType1.generateSendOpReturn(
            tokenUtxosBeingSpent,
            tokenAmountBeingSentToAddress.toString(),
        );

        const slpData = slpSendObj.script;

        // Add OP_RETURN as first output.
        transactionBuilder.addOutput(slpData, 0);

        // Send dust transaction representing tokens being sent.
        transactionBuilder.addOutput(
            BCH.SLP.Address.toLegacyAddress(tokenReceiverAddress),
            546,
        );

        // Return any token change back to the sender.
        if (slpSendObj.outputs > 1) {
            transactionBuilder.addOutput(
                BCH.SLP.Address.toLegacyAddress(
                    tokenUtxosBeingSpent[0].address,
                ),
                546,
            );
        }

        // get byte count to calculate fee. paying 1 sat
        // Note: This may not be totally accurate. Just guessing on the byteCount size.
        const txFee = calcFee(
            BCH,
            tokenUtxosBeingSpent,
            5,
            1.1 * currency.defaultFee,
        );

        // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
        const remainder = originalAmount - txFee - 546 * 2;
        if (remainder < 1) {
            throw new Error('Selected UTXO does not have enough satoshis');
        }
        // Last output: send the BCH change back to the wallet.
        transactionBuilder.addOutput(
            BCH.Address.toLegacyAddress(largestBchUtxo.address),
            remainder,
        );

        // Sign the transaction with the private key for the BCH UTXO paying the fees.
        let redeemScript;
        transactionBuilder.sign(
            0,
            bchECPair,
            redeemScript,
            transactionBuilder.hashTypes.SIGHASH_ALL,
            originalAmount,
        );

        // Sign each token UTXO being consumed.
        for (let i = 0; i < tokenUtxosBeingSpent.length; i++) {
            const thisUtxo = tokenUtxosBeingSpent[i];
            const accounts = [wallet.Path245, wallet.Path145];
            const utxoEcPair = BCH.ECPair.fromWIF(
                accounts
                    .filter(acc => acc.cashAddress === thisUtxo.address)
                    .pop().fundingWif,
            );

            transactionBuilder.sign(
                1 + i,
                utxoEcPair,
                redeemScript,
                transactionBuilder.hashTypes.SIGHASH_ALL,
                thisUtxo.value,
            );
        }

        // build tx
        const tx = transactionBuilder.build();

        // output rawhex
        const hex = tx.toHex();
        // console.log(`Transaction raw hex: `, hex);

        // END transaction construction.

        // Broadcast transaction to the network

        const txidStr = await BCH.RawTransactions.sendRawTransaction([hex]);
        if (txidStr && txidStr[0]) {
            console.log(`${currency.tokenTicker} txid`, txidStr[0]);
        }

        let link;
        if (process.env.REACT_APP_NETWORK === `mainnet`) {
            link = `${currency.blockExplorerUrl}/tx/${txidStr}`;
        } else {
            link = `${currency.blockExplorerUrlTestnet}/tx/${txidStr}`;
        }
        //console.log(`link`, link);

        return link;
    };

    const slpDebug = (tokenUtxos, sendQty) => {
        console.log(`slpDebug test called with`);
        console.log(`tokenUtxos`, tokenUtxos);
        console.log(`sendQty`, sendQty);
        try {
            //const tokenId = tokenUtxos[0].tokenId;
            const decimals = tokenUtxos[0].decimals;

            // Joey patch to do
            // totalTokens must be a big number accounting for decimals
            // sendQty must be the same
            /* From slp-sdk

      amount = new BigNumber(amount).times(10 ** tokenDecimals) // Don't forget to account for token precision


      This is analagous to sendQty here
      */
            const sendQtyBig = new BigNumber(sendQty).times(10 ** decimals);

            // Calculate the total amount of tokens owned by the wallet.
            //let totalTokens = 0;
            //for (let i = 0; i < tokenUtxos.length; i++) totalTokens += tokenUtxos[i].tokenQty;

            // Calculate total amount of tokens using Big Number throughout
            /*
      let totalTokens = new BigNumber(0);
      for (let i = 0; i < tokenUtxos.length; i++) {
        console.log(`tokenQty normal`, tokenUtxos[i].tokenQty);
        const thisTokenQty = new BigNumber(tokenUtxos[i].tokenQty);
        totalTokens.plus(thisTokenQty);
      }
      totalTokens.times(10 ** decimals);
      */
            let totalTokens = tokenUtxos.reduce((tot, txo) => {
                return tot.plus(
                    new BigNumber(txo.tokenQty).times(10 ** decimals),
                );
            }, new BigNumber(0));

            console.log(`totalTokens`, totalTokens);
            //test
            //totalTokens = new BigNumber(totalTokens).times(10 ** decimals);

            console.log(`sendQtyBig`, sendQtyBig);
            const change = totalTokens.minus(sendQtyBig);
            console.log(`change`, change);

            //let script;
            //let outputs = 1;

            // The normal case, when there is token change to return to sender.
            if (change > 0) {
                //outputs = 2;

                // Convert the send quantity to the format expected by slp-mdm.

                //let baseQty = new BigNumber(sendQty).times(10 ** decimals);
                // Update: you've done this earlier, so don't do it now
                let baseQty = sendQtyBig.toString();
                console.log(`baseQty: `, baseQty);

                // Convert the change quantity to the format expected by slp-mdm.
                //let baseChange = new BigNumber(change).times(10 ** decimals);
                // Update: you've done this earlier, so don't do it now
                let baseChange = change.toString();
                console.log(`baseChange: `, baseChange);

                const outputQty = new BigNumber(baseChange).plus(
                    new BigNumber(baseQty),
                );
                const inputQty = new BigNumber(totalTokens);
                console.log(
                    `new BigNumber(baseChange)`,
                    new BigNumber(baseChange),
                );
                console.log(`new BigNumber(baseQty)`, new BigNumber(baseQty));
                console.log(`outputQty:`, outputQty);
                console.log(`inputQty:`, inputQty);
                console.log(
                    `outputQty.minus(inputQty).toString():`,
                    outputQty.minus(inputQty).toString(),
                );
                console.log(
                    `outputQty.minus(inputQty).toString():`,
                    outputQty.minus(inputQty).toString() === '0',
                );

                const tokenOutputDelta =
                    outputQty.minus(inputQty).toString() !== '0';
                if (tokenOutputDelta)
                    console.log(
                        'Token transaction inputs do not match outputs, cannot send transaction',
                    );
                // Generate the OP_RETURN as a Buffer.
                /*
        script = slpMdm.TokenType1.send(tokenId, [
          new slpMdm.BN(baseQty),
          new slpMdm.BN(baseChange)
        ]);
        */
                //

                // Corner case, when there is no token change to send back.
            } else {
                console.log(`No change case:`);
                let baseQty = sendQtyBig.toString();
                console.log(`baseQty: `, baseQty);

                // Check for potential burns
                const noChangeOutputQty = new BigNumber(baseQty);
                const noChangeInputQty = new BigNumber(totalTokens);
                console.log(`noChangeOutputQty`, noChangeOutputQty);
                console.log(`noChangeInputQty`, noChangeInputQty);

                const tokenSingleOutputError =
                    noChangeOutputQty.minus(noChangeInputQty).toString() !==
                    '0';
                if (tokenSingleOutputError)
                    console.log(
                        'Token transaction inputs do not match outputs, cannot send transaction',
                    );

                // Generate the OP_RETURN as a Buffer.
                //script = slpMdm.TokenType1.send(tokenId, [new slpMdm.BN(baseQty)]);
            }
        } catch (err) {
            console.log(`Error in generateSendOpReturn()`);
            throw err;
        }
    };

    const sendBch = async (
        BCH,
        wallet,
        utxos,
        { addresses, values, encodedOpReturn },
        callbackTxId,
    ) => {
        // Note: callbackTxId is a callback function that accepts a txid as its only parameter
        /* Debug logs
    console.log(`sendBch called with`);
    console.log("BCH", BCH);
    console.log("wallet", wallet);
    console.log("utxos", utxos);
    console.log("addresses", addresses);
    console.log("values", values);
    console.log("encodedOpReturn", encodedOpReturn);
    console.log("callbackTxid", callbackTxId);
    */
        try {
            if (!values || values.length === 0) {
                return null;
            }

            const value = values.reduce(
                (previous, current) => new BigNumber(current).plus(previous),
                new BigNumber(0),
            );
            const REMAINDER_ADDR = wallet.Path145.cashAddress;
            const inputUtxos = [];
            let transactionBuilder;

            // instance of transaction builder
            if (process.env.REACT_APP_NETWORK === `mainnet`)
                transactionBuilder = new BCH.TransactionBuilder();
            else transactionBuilder = new BCH.TransactionBuilder('testnet');

            const satoshisToSend = BCH.BitcoinCash.toSatoshi(value.toFixed(8));
            let originalAmount = new BigNumber(0);
            let txFee = 0;
            for (let i = 0; i < utxos.length; i++) {
                const utxo = utxos[i];
                originalAmount = originalAmount.plus(utxo.satoshis);
                const vout = utxo.vout;
                const txid = utxo.txid;
                // add input with txid and index of vout
                transactionBuilder.addInput(txid, vout);

                inputUtxos.push(utxo);
                txFee = encodedOpReturn
                    ? calcFee(BCH, inputUtxos, addresses.length + 2)
                    : calcFee(BCH, inputUtxos, addresses.length + 1);

                if (originalAmount.minus(satoshisToSend).minus(txFee).gte(0)) {
                    break;
                }
            }

            // amount to send back to the remainder address.
            const remainder = Math.floor(
                originalAmount.minus(satoshisToSend).minus(txFee),
            );
            if (remainder < 0) {
                const error = new Error(`Insufficient funds`);
                error.code = SEND_BCH_ERRORS.INSUFICIENT_FUNDS;
                throw error;
            }

            if (encodedOpReturn) {
                transactionBuilder.addOutput(encodedOpReturn, 0);
            }

            // add output w/ address and amount to send
            for (let i = 0; i < addresses.length; i++) {
                const address = addresses[i];
                transactionBuilder.addOutput(
                    BCH.Address.toCashAddress(address),
                    BCH.BitcoinCash.toSatoshi(Number(values[i]).toFixed(8)),
                );
            }

            if (remainder >= BCH.BitcoinCash.toSatoshi(DUST)) {
                transactionBuilder.addOutput(REMAINDER_ADDR, remainder);
            }

            // Sign the transactions with the HD node.
            for (let i = 0; i < inputUtxos.length; i++) {
                const utxo = inputUtxos[i];
                transactionBuilder.sign(
                    i,
                    BCH.ECPair.fromWIF(utxo.wif),
                    undefined,
                    transactionBuilder.hashTypes.SIGHASH_ALL,
                    utxo.satoshis,
                );
            }

            // build tx
            const tx = transactionBuilder.build();
            // output rawhex
            const hex = tx.toHex();

            // Broadcast transaction to the network
            const txidStr = await BCH.RawTransactions.sendRawTransaction([hex]);

            if (txidStr && txidStr[0]) {
                console.log(`${currency.ticker} txid`, txidStr[0]);
            }
            let link;

            if (callbackTxId) {
                callbackTxId(txidStr);
            }
            if (process.env.REACT_APP_NETWORK === `mainnet`) {
                link = `${currency.blockExplorerUrl}/tx/${txidStr}`;
            } else {
                link = `${currency.blockExplorerUrlTestnet}/tx/${txidStr}`;
            }
            //console.log(`link`, link);

            return link;
        } catch (err) {
            if (err.error === 'insufficient priority (code 66)') {
                err.code = SEND_BCH_ERRORS.INSUFFICIENT_PRIORITY;
            } else if (err.error === 'txn-mempool-conflict (code 18)') {
                err.code = SEND_BCH_ERRORS.DOUBLE_SPENDING;
            } else if (err.error === 'Network Error') {
                err.code = SEND_BCH_ERRORS.NETWORK_ERROR;
            } else if (
                err.error ===
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)'
            ) {
                err.code = SEND_BCH_ERRORS.MAX_UNCONFIRMED_TXS;
            }
            console.log(`error: `, err);
            throw err;
        }
    };

    const getBCH = (apiIndex = 0, fromWindowObject = true) => {
        if (fromWindowObject && window.SlpWallet) {
            const SlpWallet = new window.SlpWallet('', {
                restURL: getRestUrl(apiIndex),
            });
            return SlpWallet.bchjs;
        }
    };

    return {
        getBCH,
        calcFee,
        getUtxos,
        getSlpBalancesAndUtxos,
        getTxHistory,
        getRestUrl,
        sendBch,
        sendToken,
    };
}
