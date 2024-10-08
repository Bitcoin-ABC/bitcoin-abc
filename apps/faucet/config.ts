// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const config = {
    // *** Faucet behavior options ***
    /// Delay between two legitimate requests in hours
    requestDelayHours: 24,
    /// The amount to send upon request, in satoshi
    amount: 1000000,
    /// The wallet private key in hex format. Keep this secret !
    walletPrivateKey:
        '000102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f',

    // *** Server options ***
    /// The port the faucet is listening for requests
    port: 18300,
    /// A list of the chronik instances we try to connect to
    chronikServerList: ['https://my-chronik-instance.example'],
    /// Whether the balance endpoint is available. This endpoint will not be
    /// rate limited.
    enableBalanceEndpoint: true,

    // *** Coin options ***
    /// The eCash address prefix, i.e. prefix:payload
    prefix: 'ectest',
    /// The coin ticker, used for displaying the amounts
    ticker: 'tXEC',
    /// The faucet transaction fees in satoshi/kB
    feeSatPerKB: 1000,
    /// The dust transaction amount in satoshi
    dust: 546,

    // *** Rate limiting options ***
    /// How many eCash addresses to store for rate limiting
    addressMapLimit: 1000,
    /// How frequently to check if an address is eligible for a new request in
    /// seconds. Don't choose a low value is the addressMapLimit is high.
    addressEligibilityCheckIntervalSeconds: 3600,
    /// Whitelist of the remotes that are allowed to connect the faucet. Leave
    /// empty to disable the whitelisting.
    originWhitelist: ['http://127.0.0.1'],
};
