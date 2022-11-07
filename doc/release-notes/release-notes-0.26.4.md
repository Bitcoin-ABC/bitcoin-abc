# Bitcoin ABC 0.26.4 Release Notes

Bitcoin ABC version 0.26.4 is now available from:

  <https://download.bitcoinabc.org/0.26.4/>

P2P and network changes
-----------------------

Before this release, Bitcoin ABC had a strong preference to try to connect only
to peers that listen on port 8333 (default). As a result of that, eCash nodes
listening on non-standard ports would likely not get any Bitcoin ABC peers
connecting to them. This preference has been removed.
