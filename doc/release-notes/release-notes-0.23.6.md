# Bitcoin ABC 0.23.6 Release Notes

Bitcoin ABC version 0.23.6 is now available from:

  <https://download.bitcoinabc.org/0.23.6/>

This release includes the following features and fixes:
  - Add an -ecash option to support the eCash rebrand

Wallet
------

- Backwards compatibility has been dropped for two `getaddressinfo` RPC
  deprecations, as notified in the 0.22.10 release notes. The deprecated `label`
  field has been removed as well as the deprecated `labels` behavior of
  returning a JSON object containing `name` and `purpose` key-value pairs. Since
  0.22.4, the `labels` field returns a JSON array of label names.
