Bitcoin ABC version 0.18.6 is now available from:

  <https://download.bitcoinabc.org/0.18.6/>

This release includes the following features and fixes:
 - Add `getfinalizedblockhash` rpc to allow node operators to introspec
 the current finalized block.
 - Wallet `getnewaddress` and `addmultisigaddress` RPC `account` named
   parameters have been renamed to `label` with no change in behavior.
 - Wallet `getlabeladdress`, `getreceivedbylabel`, `listreceivedbylabel`, and
   `setlabel` RPCs have been added to replace `getaccountaddress`,
   `getreceivedbyaccount`, `listreceivedbyaccount`, and `setaccount` RPCs,
   which are now deprecated. There is no change in behavior between the
   new RPCs and deprecated RPCs.
 - Wallet `listreceivedbylabel`, `listreceivedbyaccount` and `listunspent` RPCs
   add `label` fields to returned JSON objects that previously only had
   `account` fields.
 - Add the `-finalizationdelay` to configure the minimum amount of time to wait
   between a block header reception and the block finalization. Unit is seconds,
   default is 7200 (2h).
