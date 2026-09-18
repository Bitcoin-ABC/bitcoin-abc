# Bitcoin ABC 0.33.13 Release Notes

Bitcoin ABC version 0.33.13 is now available from:

  <https://download.bitcoinabc.org/0.33.13/>

This release includes the following features and fixes:

Updated REST APIs
-----------------
- Parameter validation for `/rest/getutxos` has been improved by rejecting
  truncated or overly large txids and malformed outpoint indices by raising an
  HTTP_BAD_REQUEST "Parse error". Previously, these malformed requests would be
  silently handled.
