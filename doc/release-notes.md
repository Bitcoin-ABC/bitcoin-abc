# Bitcoin ABC 0.34.1 Release Notes

Bitcoin ABC version 0.34.1 is now available from:

  <https://download.bitcoinabc.org/0.34.1/>

- Add new format string placeholders for `walletnotify`:
  - `%b` - the hash of the block containting the transaction (`unconfirmed` if a mempool transaction)
  - `%h` - the height of the block containing the transaction (`-1` if a mempool transaction)
