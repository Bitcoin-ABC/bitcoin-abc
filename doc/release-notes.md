Bitcoin ABC version 0.21.10 is now available from:

  <https://download.bitcoinabc.org/0.21.10/>

This release includes the following features and fixes:

RPC changes
-----------
The RPC `joinpsbts` will shuffle the order of the inputs and outputs of the resulting joined psbt.
Previously inputs and outputs were added in the order that the PSBTs were provided which makes correlating inputs to outputs extremely easy.

The `utxoupdatepsbt` RPC method has been updated to take a `descriptors`
argument. When provided, input and output scripts and keys will be filled in
when known.

See the RPC help text for full details.
