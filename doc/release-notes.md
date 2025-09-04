# Bitcoin ABC 0.31.12 Release Notes

Bitcoin ABC version 0.31.12 is now available from:

  <https://download.bitcoinabc.org/0.31.12/>

This release includes the following features and fixes:
 - The Chronik Electrum blockchain.block.headers RPC now returns up to
   2016 block headers, as per the documentation. Previously, it mistakenly
   applied the page limits relevant to Chronik's block and headers endpoints
   and thus returned an error if more than 500 headers were requested.
 - The getblockchaininfo RPC now has a new field "finalized_blockhash" which
   gives the hash of the highest block that is finalized by Avalanche, or
   the hash of the genesis block if no block is finalized by Avalanche.
