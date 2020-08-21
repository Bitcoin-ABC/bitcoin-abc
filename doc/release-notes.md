# Bitcoin ABC 0.24.11 Release Notes

Bitcoin ABC version 0.24.11 is now available from:

  <https://download.bitcoinabc.org/0.24.11/>

This release includes the following features and fixes:
 - Add a `-fixedseeds` option which can be set to 0 to disable the hardcoded seeds.
   This can be used in conjunction with `dsnssed=0` to create a trusted peer only setup.
   In this case the nodes need to be added manually with the `-addnode` option or the `addnode` RPC.
 - The node will now limit the rate at which the addresses received via p2p messages are processed.
   This can be bypassed if needed by granting the `addr` permission to a peer(see the `-whitelist`
   option for details).
 - A bitcoind node will no longer gossip addresses to inbound peers by default.
   They will become eligible for address gossip after sending an ADDR, ADDRV2,
   or GETADDR message.
 - The `getpeerinfo` RPC returns two new boolean fields, `bip152_hb_to` and
   `bip152_hb_from`, that respectively indicate whether we selected a peer to be
   in compact blocks high-bandwidth mode or whether a peer selected us as a
   compact blocks high-bandwidth peer. High-bandwidth peers send new block
   announcements via a `cmpctblock` message rather than the usual inv/headers
   announcements. See BIP 152 for more details.
