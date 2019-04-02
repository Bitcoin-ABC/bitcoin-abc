Bitcoin ABC version 0.19.2 is now available from:

  <https://download.bitcoinabc.org/0.19.2/>

This release includes the following features and fixes:
 - Added parameter `include_removed` to `listsinceblock` for better tracking of
   transactions during a reorg. See `bitcoin-cli help listsinceblock` for more
   details.
 - `listsinceblock` will now throw an error if an unknown `blockhash` argument
   value is passed, instead of returning a list of all wallet transactions since
   the genesis block.
 - Various minor fixes to RPC parameter validation
 - Minor wallet performance improvements
 - `errors` in getmininginfo rpc commmand has been deprecated.  Use `warnings` now instead.
