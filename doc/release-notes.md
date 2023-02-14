# Bitcoin ABC 0.27.0 Release Notes

Bitcoin ABC version 0.27.0 is now available from:

  <https://download.bitcoinabc.org/0.27.0/>

This release includes the following features and fixes:
  - The `softforks` field from the `getblockchaininfo` RPC is deprecated.
    To keep using this field, use the `-deprecatedrpc=softforks` option.
    Note that this field has been empty for a long time and will remain
    empty until its eventual removal.
  - The `ancestorcount`, `ancestorsize` and `ancestorcount` fields from the
    `listunspent` RPC have been deprecated and will be removed in a future
    version. To keep using these fields, use the
    `-deprecatedrpc=mempool_ancestors_descendants` option.
  - The RPC server can process a limited number of simultaneous RPC requests.
    Previously, if this limit was exceeded, `bitcoind` would respond with
    status code 500 (`HTTP_INTERNAL_SERVER_ERROR`). Now it returns status
    code 503 (`HTTP_SERVICE_UNAVAILABLE`).

Network upgrade
---------------

At the MTP time of `1684152000` (May 15, 2023 12:00:00 UTC), the following
changes will become activated:
  - New consensus rule: The `nVersion` field in `CTransaction` now must be either
    1 or 2. This has been a policy rule (i.e. wallets already cannot use anything
    other than 1 or 2), but miners were still able to mine transactions with
    versions other than 1 and 2. Disallowing them by consensus allows us to use
    the version field for e.g. a new & scalable transaction format.
  - The chained transactions limit policy will no longer be enforced by the
    mempool. All the related RPC statistics and options will become irrelevant
    and should no longer be relied upon.
  - Miner fund moves from consensus rule to policy rule. This will allow future
    seamless upgrades such as changes to the miner fund without delaying until
    a flag day upgrade.
  - Bump automatic replay protection to the next upgrade, timestamp `1700049600`
    (Nov 15, 2023 12:00:00 UTC).
