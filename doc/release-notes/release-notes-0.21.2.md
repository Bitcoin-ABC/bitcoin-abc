Bitcoin ABC version 0.21.2 is now available from:

  <https://download.bitcoinabc.org/0.21.2/>

This release includes the following features and fixes:
 - Fixed block parking issue that led to park-then-unpark behavior during IBD.
 - IBD time reduced by up to 30%.
 - Minor tweaks to the bitcoin-qt wallet.

Account API removed
------------------
 - The 'account' API was deprecated in v0.20.6 and has been fully removed in v0.21.2
 - The 'label' API was introduced in v0.20.6 as a replacement for accounts.

 - See the release notes from v0.20.6 for a full description of the changes from the
'account' API to the 'label' API.
