# Bitcoin ABC 0.28.8 Release Notes

Bitcoin ABC version 0.28.8 is now available from:

  <https://download.bitcoinabc.org/0.28.8/>

This release includes the following features and fixes:

Wallet changes
--------------

Bitcoin ABC will no longer automatically create new wallets on startup. It will
load existing wallets specified by `-wallet` options on the command line or in
`bitcoin.conf` or `settings.json` files. And by default it will also load a
top-level unnamed ("") wallet. However, if specified wallets don't exist,
Bitcoin ABC will now just log warnings instead of creating new wallets with
new keys and addresses like previous releases did.
New wallets can be created through the GUI , through the `bitcoin-cli createwallet`
or `bitcoin-wallet create` commands, or the `createwallet` RPC.


P2P and network changes
-----------------------

To address a potential denial-of-service, the logic to download headers from peers
has been reworked. This is particularly relevant for nodes starting up for the first
time (or for nodes which are starting up after being offline for a long time).

Whenever headers are received from a peer that have a total chainwork that is either
less than the node’s -minimumchainwork value or is sufficiently below the work at the
node’s tip, a “presync” phase will begin, in which the node will download the peer’s
headers and verify the cumulative work on the peer’s chain, prior to storing those
headers permanently. Once that cumulative work is verified to be sufficiently high,
the headers will be redownloaded from that peer and fully validated and stored.

This may result in initial headers sync taking longer for new nodes starting up for
the first time, both because the headers will be downloaded twice, and because the
effect of a peer disconnecting during the presync phase (or while the node’s best
headers chain has less than -minimumchainwork), will result in the node needing to
use the headers presync mechanism with the next peer as well.


Updated RPC
-----------

The getpeerinfo RPC has been updated with a new `presynced_headers` field, indicating
the progress on the presync phase mentioned in the “P2P and network changes” section
above.
