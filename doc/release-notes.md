# Bitcoin ABC 0.22.10 Release Notes

Bitcoin ABC version 0.22.10 is now available from:

  <https://download.bitcoinabc.org/0.22.10/>

This release includes the following features and fixes:

Deprecated or removed RPCs
--------------------------

- RPC `getaddressinfo` changes:

  - the `label` field has been deprecated in favor of the `labels` field and
    will be removed in a future version. It can be re-enabled in the interim by launching
    with `-deprecatedrpc=label`.

  - the `labels` behavior of returning an array of JSON objects containing name
    and purpose key/value pairs has been deprecated in favor of an array of
    label names and will be removed in a future release. The previous behavior can be
    re-enabled in the interim by launching with `-deprecatedrpc=labelspurpose`.

Command line
------------

Command line options prefixed with main/test/regtest network names like
`-main.port=8333` `-test.server=1` previously were allowed but ignored. Now
they trigger "Invalid parameter" errors on startup.

Light Clients
-------------

The [BIP157](https://github.com/bitcoin/bips/blob/master/bip-0157.mediawiki)
protocol is now supported. To enable the feature, use the `-blockfilterindex` and
`-peerblockfilters` flags.

Misc
----

Building Bitcoin ABC for the BCHN network is no longer supported.
