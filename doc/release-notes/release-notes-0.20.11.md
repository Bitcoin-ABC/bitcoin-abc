Bitcoin ABC version 0.20.11 is now available from:

  <https://download.bitcoinabc.org/0.20.11/>

This release includes the following features and fixes:
 - The `prioritisetransaction` RPC no longer takes a `priority_delta` argument,
   which is replaced by a `dummy` argument for backwards compatibility with
   clients using positional arguments. The RPC is still used to change the
   apparent fee-rate of the transaction by using the `fee_delta` argument.
 - Bare multisig outputs to our keys are no longer automatically treated as
   incoming payments. As this feature was only available for multisig outputs for
   which you had all private keys in your wallet, there was generally no use for
   them compared to single-key schemes. Furthermore, no address format for such
   outputs is defined, and wallet software can't easily send to it. These outputs
   will no longer show up in `listtransactions`, `listunspent`, or contribute to
   your balance, unless they are explicitly watched (using `importaddress` or
   `importmulti` with hex script argument). `signrawtransaction*` also still
   works for them.
 - The RPC `createwallet` now has an optional `blank` argument that can be used
   to create a blank wallet. Blank wallets do not have any keys or HD seed.
   They cannot be opened in software older than 0.20.11
   Once a blank wallet has a HD seed set (by using `sethdseed`) or private keys,
   scripts, addresses, and other watch only things have been imported, the wallet
   is no longer blank and can be opened in 0.20.x.
   Encrypting a blank wallet will also set a HD seed for it.
