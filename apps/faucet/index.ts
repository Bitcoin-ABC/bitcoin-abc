// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, ScriptUtxo } from 'chronik-client';
import cors, { CorsOptions } from 'cors';
import {
    ALL_BIP143,
    Ecc,
    P2PKHSignatory,
    Script,
    TxBuilder,
    fromHex,
    shaRmd160,
} from 'ecash-lib';
import { decodeCashAddress, encodeCashAddress } from 'ecashaddrjs';
import express, { Express, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

function getIp(req: Request) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

function getBalanceSats(utxos: ScriptUtxo[]): bigint {
    let balanceSats = 0n;
    for (const utxo of utxos) {
        balanceSats += utxo.sats;
    }
    return balanceSats;
}

// Prepare the common error responses
function tooManyRequests(res: Response) {
    res.status(429).json({
        error: 'Too many requests',
        msg: `The faucet is limited to a single request every ${config.requestDelayHours} hours`,
    });
}
function invalidAddress(res: Response, address: string, reason: string) {
    res.status(406).json({
        address,
        error: `Invalid eCash address (${reason})`,
    });
}

console.log(`*** Bitcoin ABC faucet ***`);

console.log('Loading configuration...');
import { config } from './config';

(async () => {
    console.log('Initialize ECC...');
    const ecc = new Ecc();

    // The IP address => request time map used to rate limit the requests
    const ipMap = new Map();
    // The eCash address => request time map used to rate limit the requests
    const addressMap = new Map();

    // The wallet private key that will be used to sign the faucet
    // transactions
    console.log('Loading the wallet private key...');
    const walletPrivateKey = fromHex(config.walletPrivateKey);

    // Generate the pubkey for this wallet so we can show a refund address
    const walletPublicKey = ecc.derivePubkey(walletPrivateKey);
    const walletAddress = encodeCashAddress(
        config.prefix,
        'p2pkh',
        shaRmd160(walletPublicKey),
    );
    const walletP2PKH = Script.fromAddress(walletAddress);
    console.log(`Wallet P2PKH address: ${walletAddress}`);

    const chronik = new ChronikClient(config.chronikServerList);
    let utxos: ScriptUtxo[] = [];
    try {
        const resp = await chronik.address(walletAddress).utxos();
        utxos = resp.utxos;
    } catch (err) {
        console.log(
            `Unable to retrieve the wallet utxos at address ${walletAddress}: ${
                (err as Error).message
            }`,
        );
    }
    const balance = getBalanceSats(utxos);
    console.log(
        `Current balance for the faucet wallet is ${Number(balance) / 100} ${
            config.ticker
        }`,
    );

    console.log(`Setting up the addresses cleanup routine...`);
    setInterval(() => {
        let eligibleAddresses = [];
        const now = Date.now();
        for (const [address, lastRequestTimeMs] of addressMap) {
            if (
                lastRequestTimeMs + config.requestDelayHours * 3600 * 1000 >=
                now
            ) {
                // The address is now eligible for another request and
                // should be removed from the map
                eligibleAddresses.push(address);
            }
        }
        for (const address of eligibleAddresses) {
            addressMap.delete(address);
        }
    }, config.addressEligibilityCheckIntervalSeconds);

    console.log(`Starting the faucet service on port ${config.port} ...`);
    const faucet: Express = express();
    faucet.use(express.json());
    const corsOptions: CorsOptions = {};
    if (config.originWhitelist.length > 0) {
        corsOptions.origin = function (origin, callback) {
            if (!origin || config.originWhitelist.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        };
    }
    faucet.use(cors(corsOptions));
    // Use the x-forwarded-for IP address
    // In this way, we get the client address and not the prod server address
    // when the app is deployed with docker
    faucet.set('trust proxy', 1);

    faucet.get(
        '/claim/:address',
        // Rate limit by IP is handled by Express
        rateLimit({
            windowMs: config.requestDelayHours * 3600 * 1000,
            limit: 1, // requests per IP per `window`
            standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
            skipFailedRequests: true, // If the request was rejected (e.g. due to address typo), don't block
            handler: (req: Request, res: Response) => {
                console.log(
                    `${req.url} from ip="${getIp(req)}" blocked by rate limit`,
                );
                return tooManyRequests(res);
            },
        }),
        async function (req: Request, res: Response) {
            // Get the requested address
            let address = req.params.address;

            // Perform an address decode/encode rountrip. This ensures that
            // we don't get a duplicated address, once with and once without
            // the prefix, and also checks the validity of the address.
            let destinationScript;
            try {
                const { prefix, type, hash } = decodeCashAddress(address);
                if (prefix !== config.prefix) {
                    return invalidAddress(
                        res,
                        address,
                        `wrong prefix (expected ${config.prefix})`,
                    );
                }
                address = encodeCashAddress(prefix, type, hash);
                destinationScript = Script.fromAddress(address);
            } catch (err: unknown) {
                return invalidAddress(res, address, (err as Error).message);
            }

            // First check if the address is in our rate limit map
            if (addressMap.has(address)) {
                console.log(
                    `Request to address ${address} blocked by rate limit`,
                );
                return tooManyRequests(res);
            }

            // Build and send the faucet transaction
            let txid;
            try {
                // Check our balance
                const chronikResponse = await chronik
                    .address(walletAddress)
                    .utxos();
                const balance = await getBalanceSats(chronikResponse.utxos);
                if (balance < config.amount) {
                    console.log(
                        `Balance is too low (${Number(balance) / 100} ${
                            config.ticker
                        })`,
                    );
                    return res.status(402).json({
                        error: 'Not enough funds',
                        msg: 'The faucet balance is too low',
                    });
                }

                const inputs = [];
                // Use all the available utxos as inputs
                for (const utxo of chronikResponse.utxos) {
                    inputs.push({
                        input: {
                            prevOut: utxo.outpoint,
                            signData: {
                                sats: utxo.sats,
                                outputScript: walletP2PKH,
                            },
                        },
                        signatory: P2PKHSignatory(
                            walletPrivateKey,
                            walletPublicKey,
                            ALL_BIP143,
                        ),
                    });
                }
                const txBuilder = new TxBuilder({
                    inputs: inputs,
                    outputs: [
                        {
                            sats: config.amount,
                            script: destinationScript,
                        },
                        walletP2PKH,
                    ],
                });

                const tx = txBuilder.sign({
                    feePerKb: config.feeSatPerKB,
                    dustSats: config.dust,
                });
                const resp = await chronik.broadcastTx(
                    tx.ser(),
                    /*skipTokenChecks=*/ true,
                );
                txid = resp.txid;
            } catch (err) {
                return res.status(500).json({
                    error: 'Unable to send the faucet transaction',
                    msg: (err as Error).message,
                });
            }

            // The max number of transaction is reached, reject further
            // attempts.
            if (addressMap.size >= config.addressMapLimit) {
                return res.status(429).json({
                    error: 'Too many requests',
                    msg: `The faucet reached its address limit, please try again later`,
                });
            }

            // Remember the address has been served and should be
            // rate-limited
            addressMap.set(address, Date.now());

            console.log(
                `Successfully sent ${Number(config.amount) / 100} ${
                    config.ticker
                } to ${address}: ${txid}`,
            );

            return res.status(200).json({
                address: address,
                amount: config.amount,
                txid: txid,
            });
        },
    );

    if (config.enableBalanceEndpoint) {
        faucet.get('/balance', async function (req: Request, res: Response) {
            let utxos: ScriptUtxo[] = [];
            try {
                const resp = await chronik.address(walletAddress).utxos();
                utxos = resp.utxos;
            } catch (err) {
                console.log(
                    `Unable to retrieve the wallet utxos at address ${walletAddress}: ${
                        (err as Error).message
                    }`,
                );
                return res.status(500).json({
                    error: 'Unable to compute the balance',
                    msg: (err as Error).message,
                });
            }

            const balance = await getBalanceSats(utxos);
            return res.status(200).json({
                address: walletAddress,
                balance: balance,
            });
        });
    }

    // Kill with CTRL+C or use a process manager like systemd
    faucet.listen(config.port);
})();
