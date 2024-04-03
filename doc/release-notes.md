# Bitcoin ABC 0.29.0 Release Notes

Bitcoin ABC version 0.29.0 is now available from:

  <https://download.bitcoinabc.org/0.29.0/>

Chronik
-------

The Chronik indexer is now available as an opt-in option to the Bitcoin ABC
node software for Linux and Windows. Chronik gives you access to a brand new API
to get notified of finalized blocks, retrieve transaction history by eCash
address, gather eToken transaction data, and much more. To enable Chronik,
simply turn it on with the `-chronik` option.

Take a look at the full [setup and API documentation](https://docs.chronik.xyz/)
to get an overview of the features, and start building your own application with
the [chronik-client](https://www.npmjs.com/package/chronik-client) npm package.

Network upgrade
---------------

At the MTP time of `1715774400` (May 15, 2024 12:00:00 UTC), the following
changes will become activated:
 - Bump automatic replay protection to the next upgrade, timestamp `1731672000`
   (November 15, 2024 12:00:00 UTC).
