# Bitcoin ABC 0.24.2 Release Notes

Bitcoin ABC version 0.24.2 is now available from:

  <https://download.bitcoinabc.org/0.24.2/>

This release includes the following features and fixes:
 - The message signature prefix has been rebranded to `eCash Signed Message:`
   (previously was `Bitcoin Signed Message:`).
 - A new `getindexinfo` RPC returns the actively running indices of the node,
   including their current sync status and height. It also accepts an `index_name`
   to specify returning only the status of that index.