# Bitcoin ABC 0.25.8 Release Notes

Bitcoin ABC version 0.25.8 is now available from:

  <https://download.bitcoinabc.org/0.25.8/>

This release includes the following features and fixes:
- Users can start their node with the option `-coinstatsindex` which syncs an
  index of coin statistics in the background. After the index is synced the user
  can use `gettxoutsetinfo` with hash_type=none or hash_type=muhash and will get
  the response instantly out of the index
- Users can specify a height or block hash when calling `gettxoutsetinfo` to
  see coin statistics at a specific block height when they use the `-coinstatsindex`
  option.
- Additional amount tracking information has been added to the output of
  `gettxoutsetinfo` when the `-coinstatsindex` option is set.
