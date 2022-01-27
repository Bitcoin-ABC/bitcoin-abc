# Bitcoin ABC 0.34.1 Release Notes

Bitcoin ABC version 0.34.1 is now available from:

  <https://download.bitcoinabc.org/0.34.1/>

- Add new format string placeholders for `walletnotify`:
  - `%b` - the hash of the block containting the transaction (`unconfirmed` if a mempool transaction)
  - `%h` - the height of the block containing the transaction (`-1` if a mempool transaction)
- Add a `shutdownnotify` option to specify a command to execute synchronously
  before Bitcoin ABC has begun its shutdown sequence.
- On non-Windows systems, an authenticated RPC caller allowed to create wallets
  could execute arbitrary commands as the node process account when
  `-walletnotify` was configured, by crafting a wallet name with regex
  replacement characters. Wallet notification placeholder replacement now
  treats wallet names literally.
- Add new endpoints to the REST API: `blockfilter` and `blockfilterheaders`. See
  doc/REST-interface.md for details.
- The `/headers/` endpoint of the REST API has been updated to use a query parameter
  instead of path parameter to specify the result count. The count parameter is
  now optional, and defaults to 5. Use
  `GET /rest/headers/<BLOCK-HASH>.<bin|hex|json>?count=<COUNT=5>`
  instead of
  `GET /rest/headers/<COUNT>/<BLOCK-HASH>.<bin|hex|json>` (deprecated)
