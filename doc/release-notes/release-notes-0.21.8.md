Bitcoin ABC version 0.21.8 is now available from:

  <https://download.bitcoinabc.org/0.21.8/>

This release includes the following features and fixes:

Updated RPCs
------------

- The `getrawtransaction` RPC no longer checks the unspent UTXO set for
  a transaction. The remaining behaviors are as follows: 1. If a
  blockhash is provided, check the corresponding block. 2. If no
  blockhash is provided, check the mempool. 3. If no blockhash is
  provided but txindex is enabled, also check txindex.
- `getaddressinfo` now reports `solvable`, a boolean indicating whether
  all information necessary for signing is present in the wallet
  (ignoring private keys).
- `getaddressinfo`, `listunspent`, and `scantxoutset` have a new output
  field `desc`, an output descriptor that encapsulates all signing information
  and key paths for the address (only available when `solvable` is true for
  `getaddressinfo` and `listunspent`).
- The `importmulti` RPC will now contain a new per-request `warnings`
  field with strings that explain when fields are being ignored or
  inconsistent, if any.
- Fixed a bug where `listreceivedaddress` would fail to take an address as a
  string.
- The `hdmasterkeyid` return field has been removed from `getaddressinfo` and
  `getwalletinfo`.  Use `hdseedid` instead.
- Descriptors with key origin information imported through `importmulti` will
  have their key origin information stored in the wallet for use with creating
  PSBTs.
- If `bip32derivs` of both `walletprocesspsbt` and `walletcreatefundedpsbt` is
  set to true but the key metadata for a public key has not been updated yet,
  then that key will have a derivation path as if it were just an independent
  key (i.e. no derivation path and its master fingerprint is itself)
- The -maxtxfee setting no longer has any effect on non-wallet RPCs.
- The `sendrawtransaction` and `testmempoolaccept` RPC methods previously
  accepted an `allowhighfees` parameter to fail the mempool acceptance in case
  the transaction's fee would exceed the value of the command line argument
  `-maxtxfee`. To uncouple the RPCs from the global option, they now have a
  hardcoded default for the maximum transaction fee, that can be changed for
  both RPCs on a per-call basis with the `maxfeerate` parameter. The
  `allowhighfees` boolean option has been removed and replaced by the
  `maxfeerate` numeric option.

Low-level RPC changes (primarily for testing)
---------------------------------------------

- The `sendmany` RPC had an argument `minconf` that was not well specified and
  would lead to RPC errors even when the wallet's coin selection would succeed.
  The `sendtoaddress` RPC never had this check, so to normalize the behavior,
  `minconf` is now ignored in `sendmany`. If the coin selection does not
  succeed due to missing coins, it will still throw an RPC error. Be reminded
  that coin selection is influenced by the `-spendzeroconfchange`,
  `-limitancestorcount`, `-limitdescendantcount` and `-walletrejectlongchains`
  command line arguments.

RPC importprivkey: new label behavior
-------------------------------------

Previously, `importprivkey` automatically added the default empty label
("") to all addresses associated with the imported private key.  Now it
defaults to using any existing label for those addresses.  For example:

- Old behavior: you import a watch-only address with the label "cold
  wallet".  Later, you import the corresponding private key using the
  default settings.  The address's label is changed from "cold wallet"
  to "".

- New behavior: you import a watch-only address with the label "cold
  wallet".  Later, you import the corresponding private key using the
  default settings.  The address's label remains "cold wallet".

In both the previous and current case, if you directly specify a label
during the import, that label will override whatever previous label the
addresses may have had.  Also in both cases, if none of the addresses
previously had a label, they will still receive the default empty label
("").  Examples:

- You import a watch-only address with the label "temporary".  Later you
  import the corresponding private key with the label "final".  The
  address's label will be changed to "final".

- You use the default settings to import a private key for an address that
  was not previously in the wallet.  Its addresses will receive the default
  empty label ("").

Descriptor import support
-------------------------

The `importmulti` RPC now supports importing of addresses from descriptors.
A `desc` parameter can be provided instead of the `scriptPubKey` in a request,
as well as an optional range for ranged descriptors to specify the start and
end of the range to import. More information about descriptors can be found
[here](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/descriptors.md).

New RPC methods
---------------

- `deriveaddresses` returns one or more addresses corresponding to an
  [output descriptor](/doc/descriptors.md).

Miscellaneous Wallet changes
----------------------------

- The key metadata will need to be upgraded the first time that the HD seed is
  available. For unencrypted wallets this will occur on wallet loading. For
  encrypted wallets this will occur the first time the wallet is unlocked.
