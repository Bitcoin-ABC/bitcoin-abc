// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as http from 'http';
import request from 'supertest';
import config from '../config';
import { encodeCashAddress, getOutputScriptFromAddress } from 'ecashaddrjs';
import { startExpressServer } from '../src/routes';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import {
    MOCK_SCRIPT_UTXO,
    MOCK_SPENDABLE_TOKEN_UTXO,
    MOCK_OUTPOINT,
    MOCK_UTXO_TOKEN,
} from '../test/vectors';
import { rateLimit } from 'express-rate-limit';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ChronikClient, ScriptUtxo, Tx } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import { fromHex } from 'ecash-lib';

describe('routes.js', function () {
    let app: http.Server;

    const ELIGIBLE_ADDRESS = 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y';
    const ELIGIBLE_OUTPUTSCRIPT = getOutputScriptFromAddress(ELIGIBLE_ADDRESS);
    const INELIGIBLE_ADDRESS =
        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
    const INELIGIBLE_OUTPUTSCRIPT =
        getOutputScriptFromAddress(INELIGIBLE_ADDRESS);
    const INVALID_ADDRESS = 'ecash:erroraddress';
    const ERROR_ADDRESS = encodeCashAddress(
        'ecash',
        'p2pkh',
        '0000000000000000000000000000000000000000',
    );
    const mockedChronikClient = new MockChronikClient();
    // Dummy for tests
    const mockServerWallet = Wallet.fromSk(
        fromHex(
            '78c6bfffd52b70404de0719962966adb34b61cf20414feebed7435b96dca479a',
        ),
        mockedChronikClient as unknown as ChronikClient,
    );
    const SERVER_WALLET_ADDRESS = mockServerWallet.address;
    const SERVER_WALLET_OUTPUTSCRIPT = getOutputScriptFromAddress(
        SERVER_WALLET_ADDRESS,
    );
    // Set an eligible mock
    // Seen ~ 2x before the amount of time required
    const eligibleTimeFirstSeen =
        Math.ceil(Date.now() / 1000) - 2 * config.eligibilityResetSeconds;
    mockedChronikClient.setTxHistoryByAddress(ELIGIBLE_ADDRESS, [
        {
            timeFirstSeen: eligibleTimeFirstSeen,
            inputs: [{ outputScript: SERVER_WALLET_OUTPUTSCRIPT }],
            outputs: [
                {
                    outputScript: ELIGIBLE_OUTPUTSCRIPT,
                    token: { tokenId: config.rewardsTokenId },
                },
            ],
        } as Tx,
    ]);

    const mockCachetClaim = {
        rawTx: '02000000021111111111111111111111111111111111111111111111111111111111111111000000006441bba10be120fe1552207b5d0608fd96b93b007a4559e5589135284e2645dad0a9028742091b37b483918e58ee3c23d6f25fa219d83d658362adc67baea639241641210228363bacbd9e52c1e515e715633fd2376d58671cda418e05685447a4a49b0645ffffffff1111111111111111111111111111111111111111111111111111111111111111010000006441e3a5dca2108390a00fc3f135ed4c3069ad8ef36e27bb02d5553280979abab75b9d4885b3cbd3afd00eadb47513e9fd75d31ae1ab7eaecf4264f5c04d2f511f0841210228363bacbd9e52c1e515e715633fd2376d58671cda418e05685447a4a49b0645ffffffff030000000000000000376a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271022020000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac68250000000000001976a91476fb100532b1fe23b26930e7001dff7989d2db5588ac00000000',
        txid: '49f3eaa422872d1a9383f76368afda09ed5c515c821fd8c84172f7a191551556',
    };
    mockedChronikClient.setBroadcastTx(
        mockCachetClaim.rawTx,
        mockCachetClaim.txid,
    );
    // Set an ineligible mock
    // Seen just now
    const ineligibleTimeFirstSeen = Math.ceil(Date.now() / 1000);
    mockedChronikClient.setTxHistoryByAddress(INELIGIBLE_ADDRESS, [
        {
            timeFirstSeen: ineligibleTimeFirstSeen,
            inputs: [{ outputScript: SERVER_WALLET_OUTPUTSCRIPT }],
            outputs: [
                {
                    outputScript: INELIGIBLE_OUTPUTSCRIPT,
                    token: { tokenId: config.rewardsTokenId },
                },
            ],
        } as Tx,
    ]);
    // Mock chronik throwing an error
    mockedChronikClient.setTxHistoryByAddress(
        ERROR_ADDRESS,
        new Error('some chronik error'),
    );

    // Address with no tx history
    // i.e. eligible for an XEC airdrop
    const NEW_ADDRESS = 'ecash:qrfkcnzdm0dvkrc20dhcf7qv23vt736ynuujzxnzs6';
    mockedChronikClient.setTxHistoryByAddress(NEW_ADDRESS, []);

    // Address with tx history
    // i.e. not eligible for an XEC airdrop
    const USED_ADDRESS = 'ecash:qrplfw9x5hrdnra3t42s3543gh3vtg8xgyr4t4lrun';
    mockedChronikClient.setTxHistoryByAddress(USED_ADDRESS, [
        { isTx: true },
    ] as unknown as Tx[]);

    // Mock an XEC airdrop tx
    const expectedXecAirdropTxid =
        'd19c496e82bd160c841968ec0d2b61bf64cb884b002835649594cd973967d33b';
    mockedChronikClient.setBroadcastTx(
        '02000000011111111111111111111111111111111111111111111111111111111111111111000000006441d51a04ca0cba7e791ceb0d39f19b45162756087e7058cf5dec770cbcabbc89598b5b6f966a3609b01a34b1e5b6853c46f843bd8b3507c0dbd6acc4329182b88841210228363bacbd9e52c1e515e715633fd2376d58671cda418e05685447a4a49b0645ffffffff0268100000000000001976a914d36c4c4ddbdacb0f0a7b6f84f80c5458bf47449f88accd150000000000001976a91476fb100532b1fe23b26930e7001dff7989d2db5588ac00000000',
        expectedXecAirdropTxid,
    );

    // Initialize fs, to be memfs in these tests
    beforeEach(async () => {
        const TEST_PORT = 5000;

        // Mock utxo set before each test, to ensure it is constant across tests
        mockedChronikClient.setUtxosByAddress(SERVER_WALLET_ADDRESS, [
            { ...MOCK_SCRIPT_UTXO, sats: 10000n },
            {
                ...MOCK_SPENDABLE_TOKEN_UTXO,
                outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                token: {
                    ...MOCK_UTXO_TOKEN,
                    tokenId: config.rewardsTokenId,
                    // Note, can change this to '10' or something less than config.rewardAmountTokenSats
                    // to test behavior of server if it is out of tokens
                    // Bad ROI on adding this test outright as we need lots of scripting
                    // to overcome the need for multiple mocked server wallets
                    atoms: config.rewardAmountTokenSats,
                },
            },
        ] as ScriptUtxo[]);

        app = startExpressServer(
            TEST_PORT,
            mockedChronikClient as unknown as ChronikClient,
            // We need higher rate limits so we do not rate limit ourselves in the tests
            rateLimit({
                windowMs: 60000,
                limit: 100, // Limit each IP to 10 requests per `window`
                standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
                legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
                message: 'You have rate limited your own unit tests.',
            }),
            // In tests, keep the same rate limits for token rewards
            rateLimit({
                windowMs: 60000,
                limit: 100, // Limit each IP to 10 requests per `window`
                standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
                legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
                message: 'You have rate limited your own unit tests.',
            }),
            'goodrecaptcha',
            mockServerWallet,
        );
    });
    afterEach(async () => {
        // Stop express server
        app.close();
    });
    it('/status returns expected status', function () {
        return request(app)
            .get('/status')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ status: 'running' });
    });
    it('/is-eligible/:address returns expected status for an ineligible address', function () {
        return request(app)
            .get(`/is-eligible/${INELIGIBLE_ADDRESS}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                address: INELIGIBLE_ADDRESS,
                isEligible: false,
                becomesEligible:
                    ineligibleTimeFirstSeen + config.eligibilityResetSeconds,
            });
    });
    it('/is-eligible/:address returns expected status for an eligible address', function () {
        return request(app)
            .get(`/is-eligible/${ELIGIBLE_ADDRESS}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ address: ELIGIBLE_ADDRESS, isEligible: true });
    });
    it('/is-eligible/:address returns expected error status if called with invalid address', function () {
        return request(app)
            .get(`/is-eligible/${INVALID_ADDRESS}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: INVALID_ADDRESS,
                error: 'Invalid eCash address',
            });
    });
    it('/is-eligible/:address returns expected error status on chronik error determining eligibility', function () {
        return request(app)
            .get(`/is-eligible/${ERROR_ADDRESS}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: ERROR_ADDRESS,
                error: 'chronik error determining address eligibility',
            });
    });
    it('/claim/:address returns 500 and expected msg if there is an error checking the recaptcha', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(500, new Error('some error'));

        return request(app)
            .post(`/claim/${USED_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: USED_ADDRESS,
                error: `Error validating recaptcha response, please try again later`,
            });
    });
    it('/claim/:address returns 500 and expected msg if the recaptcha is invalid (google returns success: false)', function () {
        const MOCK_RECAPTCHA_TOKEN = 'badrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, { success: false });

        return request(app)
            .post(`/claim/${USED_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: USED_ADDRESS,
                error: `Recaptcha check failed. Are you a bot?`,
            });
    });
    it('/claim/:address returns 500 and expected msg if recaptcha succeeds with insufficient score', function () {
        const MOCK_RECAPTCHA_TOKEN = 'badrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold - 0.01,
        });

        return request(app)
            .post(`/claim/${USED_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body without a "token" key
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: USED_ADDRESS,
                error: `Recaptcha check suspicious. Are you a bot?`,
                msg: `🤔`,
            });
    });
    it('/claim/:address returns expected status for an ineligible address', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';
        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });

        return request(app)
            .post(`/claim/${INELIGIBLE_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: INELIGIBLE_ADDRESS,
                error: `Address is not yet eligible for token rewards`,
                becomesEligible:
                    ineligibleTimeFirstSeen + config.eligibilityResetSeconds,
            });
    });
    it('/claim/:address returns expected error status if called with invalid address', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';
        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });
        return request(app)
            .post(`/claim/${INVALID_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: INVALID_ADDRESS,
                error: 'Invalid eCash address',
            });
    });
    it('/claim/:address returns expected error status on chronik error', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';
        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });
        return request(app)
            .post(`/claim/${ERROR_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: ERROR_ADDRESS,
                error: 'chronik error building token reward',
            });
    });
    it('/claim/:address returns expected status for an eligible address', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';
        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });
        return request(app)
            .post(`/claim/${ELIGIBLE_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                address: ELIGIBLE_ADDRESS,
                msg: 'Success',
                txid: mockCachetClaim.txid,
            });
    });
    it('/claimxec/:address returns 500 and expected msg if there is an error checking the recaptcha', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(500, new Error('some error'));

        return request(app)
            .post(`/claimxec/${USED_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: USED_ADDRESS,
                error: `Error validating recaptcha response, please try again later`,
            });
    });
    it('/claimxec/:address returns 500 and expected msg if the recaptcha is invalid (google returns success: false)', function () {
        const MOCK_RECAPTCHA_TOKEN = 'badrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, { success: false });

        return request(app)
            .post(`/claimxec/${USED_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: USED_ADDRESS,
                error: `Recaptcha check failed. Are you a bot?`,
            });
    });
    it('/claimxec/:address returns 500 and expected msg if recaptcha succeeds with insufficient score', function () {
        const MOCK_RECAPTCHA_TOKEN = 'badrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold - 0.01,
        });

        return request(app)
            .post(`/claimxec/${USED_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body without a "token" key
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: USED_ADDRESS,
                error: `Recaptcha check suspicious. Are you a bot?`,
                msg: `🤔`,
            });
    });
    it('/claimxec/:address returns 500 if called with an address that has tx history', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });

        return request(app)
            .post(`/claimxec/${USED_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: USED_ADDRESS,
                error: `Only unused addresses are eligible for XEC airdrops`,
            });
    });
    it('/claimxec/:address sends an airdrop if called with an address with no tx history', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });

        return request(app)
            .post(`/claimxec/${NEW_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                address: NEW_ADDRESS,
                msg: 'Success',
                txid: expectedXecAirdropTxid,
            });
    });
    it('/claimxec/:address returns expected error status on chronik error', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });

        return request(app)
            .post(`/claimxec/${ERROR_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: ERROR_ADDRESS,
                error: 'Error querying chronik for address history: Error: some chronik error',
            });
    });
    it('/claimxec/:address returns expected error status if called with invalid address', function () {
        const MOCK_RECAPTCHA_TOKEN = 'goodrecaptcha';

        // Mock successful recaptcha response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a successful API request
        mock.onPost(config.recaptchaUrl).reply(200, {
            success: true,
            score: config.recaptchaThreshold,
        });

        return request(app)
            .post(`/claimxec/${INVALID_ADDRESS}`)
            .send({ token: MOCK_RECAPTCHA_TOKEN }) // send the request body
            .set('Content-Type', 'application/json') // set the Content-Type header
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                address: INVALID_ADDRESS,
                error: 'Invalid eCash address',
            });
    });
    it('We get a 404 for any request not handled by other endpoints', function () {
        return request(app)
            .get(`/some/request/test`)
            .expect(404)
            .expect('Content-Type', /json/)
            .expect({
                error: 'Could not find /some/request/test',
            });
    });
});
