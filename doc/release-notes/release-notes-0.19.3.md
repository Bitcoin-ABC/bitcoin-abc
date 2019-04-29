Bitcoin ABC version 0.19.3 is now available from:

  <https://download.bitcoinabc.org/0.19.3/>

This release includes the following features and fixes:
 - Added optional `blockhash` parameter to `getrawtransaction` to narrowly
   search for a transaction within a given block. New returned field
   `in_active_chain` will indicate if that block is part of the active chain.
 - `signrawtransaction` RPC is now deprecated. The new RPCs 
   `signrawtransactionwithkey` and `signrawtransactionwithwallet` should 
   be used instead. Use `-deprecatedrpc=signrawtransaction` to temporarily
   re-enable the old behavior while you migrate.
