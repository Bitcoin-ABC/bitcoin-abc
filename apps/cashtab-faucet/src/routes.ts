// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import express, { Express, Request, Response } from 'express';
import * as http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import config from '../config';
import { getHistoryAfterTimestamp } from './chronik/clientHandler';
import { isAddressEligibleForTokenReward } from './rewards';
import { sendReward, sendXecAirdrop } from './transactions';
import { Wallet } from 'ecash-wallet';
import { ChronikClient } from 'chronik-client';
import { isValidCashAddress } from 'ecashaddrjs';
import { RateLimitRequestHandler } from 'express-rate-limit';
import {
    validateRecaptchaV2,
    verifyRecaptchaToken,
    verifyTokenRewardRecaptcha,
    RecaptchaEnterpriseSettings,
} from './recaptcha';

/**
 * routes.ts
 * Start Express server and expose API endpoints
 */

/**
 * Standard IP logger function to be called by all endpoints
 * @param request express request
 */
function getRequestIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0]?.trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0]?.split(',')[0]?.trim();
    }
    return req.socket.remoteAddress ?? undefined;
}

function logIpInfo(req: Request) {
    const ip = getRequestIp(req);
    console.log(`${req.url} from ${ip}`);
}

export const startExpressServer = (
    port: number,
    chronik: ChronikClient,
    limiter: RateLimitRequestHandler,
    tokenLimiter: RateLimitRequestHandler,
    recaptchaV2Secret: string,
    recaptchaV3Secret: string,
    recaptchaV3MinScore: number,
    recaptchaV3AndroidMinScore: number,
    wallet: Wallet,
    recaptchaEnterprise: RecaptchaEnterpriseSettings | null = null,
): http.Server => {
    // Initialize express
    const app: Express = express();

    // Enhanced security for express apps
    // https://www.npmjs.com/package/helmet
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

    // Use JSON for data
    app.use(express.json());

    // Use cors
    app.use(cors());

    // Use the x-forwarded-for IP address
    // In this way, we get the client address and not the prod server address
    // when the app is deployed with docker
    app.set('trust proxy', 1);

    // API endpoints
    app.get('/status', async function (req: Request, res: Response) {
        logIpInfo(req);

        return res.status(200).json({
            status: 'running',
        });
    });

    app.get(
        '/is-eligible/:address',
        async function (req: Request, res: Response) {
            // Get the requested address
            const address = req.params.address;

            logIpInfo(req);

            if (typeof address !== 'string') {
                return res.status(500).json({
                    address,
                    error: `Address is not a string`,
                });
            }

            if (!isValidCashAddress(address, 'ecash')) {
                return res.status(500).json({
                    address,
                    error: `Invalid eCash address`,
                });
            }

            // Get the timestamp of the request in seconds
            const timeOfRequest = Math.ceil(Date.now() / 1000);

            // Get the timestamp after which txs received at this address
            // are potentially blocking token reward eligibility
            const timestamp = timeOfRequest - config.eligibilityResetSeconds;
            // Get potentially eligible tx history
            let historyToCheck;
            try {
                historyToCheck = await getHistoryAfterTimestamp(
                    chronik,
                    address,
                    timestamp,
                );
            } catch (err: unknown) {
                console.log(`Error fetching ${req.url}`, err);
                // err is likely ChronikError, i.e. {msg}
                return res.status(500).json({
                    address,
                    error: 'chronik error determining address eligibility',
                });
            }

            // Determine if the address is eligible
            const isAddressEligible = isAddressEligibleForTokenReward(
                address,
                config.rewardsTokenId,
                wallet.script.toHex(),
                historyToCheck,
            );

            interface RewardEligibilityResponse {
                address: string;
                isEligible: boolean;
                becomesEligible?: number;
            }
            const response: RewardEligibilityResponse = {
                address,
                isEligible: false,
            };

            if (typeof isAddressEligible === 'number') {
                // If a timestamp is returned, the API returns the timestamp when the address again becomes eligible
                response.becomesEligible =
                    isAddressEligible + config.eligibilityResetSeconds;
            } else {
                response.isEligible = isAddressEligible;
            }

            return res.status(200).json(response);
        },
    );

    app.post(
        '/claim/:address',
        tokenLimiter,
        async function (req: Request, res: Response) {
            // Get the requested address
            const address = req.params.address;

            if (typeof address !== 'string') {
                return res.status(500).json({
                    address,
                    error: `Address is not a string`,
                });
            }

            logIpInfo(req);

            if (typeof req.body.token !== 'string') {
                console.error('Request did not include a recaptcha token');
                return res.status(500).json({
                    address,
                    error: `Request did not include Recaptcha token. Are you a bot?`,
                });
            }

            try {
                const recaptchaClient =
                    typeof req.body.recaptchaClient === 'string'
                        ? req.body.recaptchaClient
                        : undefined;
                const userAgent = req.headers['user-agent'];
                const recaptchaResult = await verifyTokenRewardRecaptcha(
                    req.body.token,
                    recaptchaClient,
                    recaptchaV3Secret,
                    recaptchaV3MinScore,
                    recaptchaV3AndroidMinScore,
                    recaptchaEnterprise,
                    {
                        userIpAddress: getRequestIp(req),
                        userAgent:
                            typeof userAgent === 'string'
                                ? userAgent
                                : undefined,
                    },
                );
                if (recaptchaResult.error !== null) {
                    return res.status(500).json({
                        address,
                        error: recaptchaResult.error,
                    });
                }
                if (typeof recaptchaResult.score === 'number') {
                    console.log(
                        `Token reward recaptcha score: ${recaptchaResult.score} (${recaptchaClient ?? 'web'})`,
                    );
                }
            } catch (err) {
                console.error('Error verifying recaptcha-response', err);
                return res.status(500).json({
                    address,
                    error: `Error validating recaptcha response, please try again later`,
                });
            }

            if (!isValidCashAddress(address, 'ecash')) {
                return res.status(500).json({
                    address,
                    error: `Invalid eCash address`,
                });
            }

            // Get the timestamp of the request in seconds
            const timeOfRequest = Math.ceil(Date.now() / 1000);

            // Get the timestamp after which txs received at this address
            // are potentially blocking token reward eligibility
            const timestamp = timeOfRequest - config.eligibilityResetSeconds;
            // Get potentially eligible tx history
            let historyToCheck;
            try {
                historyToCheck = await getHistoryAfterTimestamp(
                    chronik,
                    address,
                    timestamp,
                );
            } catch (err: unknown) {
                console.log(`Error fetching ${req.url}`, err);
                // err is likely ChronikError, i.e. {msg}
                return res.status(500).json({
                    address,
                    error: `chronik error building token reward`,
                });
            }

            // Determine if the address is eligible
            const isAddressEligible = isAddressEligibleForTokenReward(
                address,
                config.rewardsTokenId,
                wallet.script.toHex(),
                historyToCheck,
            );

            if (typeof isAddressEligible === 'number') {
                // Return address ineligible response
                return res.status(500).json({
                    address,
                    error: `Address is not yet eligible for token rewards`,
                    becomesEligible:
                        isAddressEligible + config.eligibilityResetSeconds,
                });
            }

            // Build and broadcast reward tx
            let rewardSuccess;
            try {
                rewardSuccess = await sendReward(
                    wallet,
                    config.rewardsTokenId,
                    config.rewardAmountTokenSats,
                    address,
                );
            } catch (err) {
                // Log error for server review
                console.log(`Error broadcasting rewards tx`);
                console.log(err);
                // Return server error response
                return res.status(500).json({
                    error: `Error sending rewards tx, please contact admin`,
                    msg: `${err}`,
                });
            }

            // Get txid before sending response
            const txid = rewardSuccess.broadcasted[0];
            interface SendRewardResponse {
                address: string;
                txid?: string;
                msg: string;
            }
            const response: SendRewardResponse = {
                address,
                txid,
                msg: 'Success',
            };

            return res.status(200).json(response);
        },
    );

    // Endpoint for Cashtab users to claim an XEC airdrop on creation of a new wallet
    app.post(
        '/claimxec/:address',
        limiter,
        async function (req: Request, res: Response) {
            // Get the requested address
            const address = req.params.address;

            if (typeof address !== 'string') {
                return res.status(500).json({
                    address,
                    error: `Address is not a string`,
                });
            }

            logIpInfo(req);

            // No need to bother with the google recaptcha check if we do not have the inputs
            if (typeof req.body.token !== 'string') {
                console.error('Request did not include a recaptcha token');
                return res.status(500).json({
                    address,
                    error: `Request did not include Recaptcha token. Are you a bot?`,
                });
            }

            // Verify recaptcha before reward
            try {
                const recaptchaVerification = await verifyRecaptchaToken(
                    recaptchaV2Secret,
                    req.body.token,
                );
                const recaptchaError = validateRecaptchaV2(
                    recaptchaVerification,
                );
                if (recaptchaError !== null) {
                    console.error('Recaptcha check failed.');
                    return res.status(500).json({
                        address,
                        error: recaptchaError,
                    });
                }
            } catch (err) {
                console.error('Error verifying recaptcha-response', err);
                return res.status(500).json({
                    address,
                    error: `Error validating recaptcha response, please try again later`,
                });
            }

            if (!isValidCashAddress(address, 'ecash')) {
                return res.status(500).json({
                    address,
                    error: `Invalid eCash address`,
                });
            }

            let addressUnused;
            try {
                addressUnused =
                    (await chronik.address(address).history()).numTxs === 0;
            } catch (err) {
                // Handle chronik error
                return res.status(500).json({
                    address,
                    error: `Error querying chronik for address history: ${err}`,
                });
            }

            if (!addressUnused) {
                return res.status(500).json({
                    address,
                    error: `Only unused addresses are eligible for XEC airdrops`,
                });
            }

            // Build and broadcast reward tx
            let airdropSuccess;
            try {
                airdropSuccess = await sendXecAirdrop(
                    wallet,
                    config.xecAirdropAmountSats,
                    address,
                );
            } catch (err) {
                // Log error for server review
                console.log(`Error broadcasting XEC airdrop tx`);
                console.log(err);

                // Return server error response
                return res.status(500).json({
                    error: `Error sending XEC airdrop tx, please contact admin`,
                    msg: `${err}`,
                });
            }

            // Get txid before sending response
            const txid = airdropSuccess.broadcasted[0];
            interface SendRewardResponse {
                address: string;
                txid?: string;
                msg: string;
            }
            const response: SendRewardResponse = {
                address,
                txid,
                msg: 'Success',
            };

            return res.status(200).json(response);
        },
    );

    app.use((req, res) => {
        // Handle 404

        // Log ip info and requested URL for these 404s
        logIpInfo(req);
        return res.status(404).json({ error: `Could not find ${req.url}` });
    });

    return app.listen(port);
};
