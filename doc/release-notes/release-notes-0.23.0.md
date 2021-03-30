# Bitcoin ABC 0.23.0 Release Notes

Bitcoin ABC version 0.23.0 is now available from:

  <https://download.bitcoinabc.org/0.23.0/>

This release includes the following features and fixes:
 - A `download` permission has been extracted from the `noban` permission. For
   compatibility, `noban` implies the `download` permission, but this may change
   in future releases. Refer to the help of the affected settings `-whitebind`
   and `-whitelist` for more details.
 - The `getpeerinfo` RPC now has additional `last_block` and `last_transaction`
   fields that return the UNIX epoch time of the last block and the last valid
   transaction received from each peer.
 - A new `bitcoin-cli -netinfo` command provides a network peer connections
   dashboard that displays data from the `getpeerinfo` and `getnetworkinfo` RPCs
   in a human-readable format. An optional integer argument from `0` to `4` may
   be passed to see increasing levels of detail.
