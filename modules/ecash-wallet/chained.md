# Chained Transactions

## Background

A number of crypto user actions cannot be completed in a single transaction. For example,

- A user may wish to send XEC to thousands of outputs. Such a transaction could exceed the node broadcast limt of 100,000 bytes, aka `MAX_TX_SERSIZE`.
- A user may wish to send a token to more outputs than allowed by token protocol restrictions
- A user may wish to intentionally burn an SLP token but not have an exactly-sized utxo. At least 1 tx is required to prepare this utxo.
- A user may wish to mint an SLP1 NFT and not have a properly-sized parent input
- A user may wish to list an SLP Agora OneShot or PARTIAL offer. Such actions (may) require a preparatory tx to support indexing.
- A user may need to consolidate utxos before most normal actions are possible, if they have a wallet that regularly receives small utxos
- Other as-yet unknown onchain actions

The `ecash-wallet` library implements simple 2-part chained txs to cover NFT minting and SLP intentional burns. These do not need a generic spec as they are one-off and ultimately specified by the SLP protocol. Likewise the `ecash-agora` library provides the spec of record for two-step SLP listings.

However there is no defined spec for chained txs that handle the first two examples mentioned above. In this document we make an initial spec for these two cases.

## Design considerations

- We should minimize the total bytes taken to fulfill the user action.
- We should be able to identify when onchain txs were part of a chain
- We should completely fulfill the user action
- The spec should be conveniently implemented in a library to support standardization

If a user knows, say, five thousand addresses he wants to send XEC to, there are any number of ways he could go about making the necessary transactions to fulfill this action. However the number of payment recipients and even the amount they should receive may itself depend on variable data. For example, Cashtab supports airdropping XEC to token holders. An app that conducts these airdrops at regular intervals could expect the size and count of the payment outputs no change with changing token activity. It would be better to have a standardized approach to handle such payments than to come up with a custom approach for every payment. We can reasonable expect to see similar use cases in the future.

## Approach

We do not, for now, handle the case of a user needing to consolidate utxos. This could be specified separately.

- The first tx in the chain must have enough utxos to cover every tx in the chain.
- A chained tx includes 2 or more txs. There is no upper limit.
- Every tx in the chain should use the same feePerKb
- For a non-token tx with an OP_RETURN, the OP_RETURN should occur at minimum in the first tx. For a token tx with a data push in the EMPP, this data push should occur at minimum in the first tx. To support indexing or facilitate tracking chained txs, a user may wish to modify OP_RETURN or EMPP data pushes for each tx in a chain. This is beyond the scope of chained txs and such uses should define their own spec.
- A chained tx must be either XEC-only or for a single token.

## Definitions

_chainedTxAlpha_, the first tx in a chain.
_chainedTx_, tx 2 thru `n-1` in a chain.
_chainedTxOmega_, the last tx in a chain.

`chainedTxAlpha` should include

- Sufficient utxos to cover all txs in the chain
- The maximum number of outputs possible according to the relevant limiting factor (i.e. `MAX_TX_SERSIZE` or the maximum number of outputs allowed for the token protocol of this chain).
- At the last outIdx, a change output exactly sized to cover the rest of the chain
- At the second to last outIdx, if necessary, a user change output for user change (distinct from the sats required to complete the rest of the chain).

Every `chainedTx` will have exactly 1 input and the maximum number of outputs possible according to the relevant limiting factor in this chain. It must include, at the last outIdx, an output with exactly enough satoshis (or satoshis + token atoms) to be the input for the next chain in the tx. So, this output must include:

- exactly enough satoshis to cover all specified outputs in the rest of the chain, plus fees
- exactly enough token atoms to cover all specified outputs in the rest of the chain

`chainedTxOmega`

- All remaining user-specified outputs
- No change

This spec can be applied to XEC or token transactions on SLP. Note that, for token transactions, the token change output used in the next tx's input could also include sufficient satoshis to cover token dust and fees for subsequent txs, minimizing the required outputs of each tx.
