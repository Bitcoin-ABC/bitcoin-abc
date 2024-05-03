# Bitcoin ABC 0.29.3 Release Notes

Bitcoin ABC version 0.29.3 is now available from:

  <https://download.bitcoinabc.org/0.29.3/>

Chronik LOKAD ID index
--------------

To allow users to build applications on top of eCash, the LOKAD ID index has been added.

**This is enabled by default, and after restarting, it takes a few hours to sync the index. If you don't need it, you should disable it with `-chroniklokadidindex=0`.**

The [LOKAD ID spec](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/op_return-prefix-guideline.md) has been around for a while, and has been used in a few prominent protocols, such as [SLP](https://github.com/simpleledger/slp-specifications/blob/master/slp-token-type-1.md).

However, usage hasn't been too high, which is probably because the indexing infrastructure simply wasn't as good as it could be.

Chronik's new LOKAD ID index finds all txs that follow the spec, and also extends it by allowing LOKAD ID prefixes in eMPP pushdata to be detected, as well as LOKAD ID push op prefixes in scriptSigs. The latter is especially useful for apps building on top of SLP, which can't handle additional protocols in the OP_RETURN.

There are endpoints for `/lokad-id/<lokad id hex>/{confirmed-txs,unconfirmed-txs,history}`, as well as listening to WebSocket updates on LOKAD IDs. A UTXOs endpoint is not available as LOKAD IDs are per-tx, not per-output.
