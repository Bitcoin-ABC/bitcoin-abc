# Bitcoin ABC 0.27.0 Release Notes

Bitcoin ABC version 0.27.0 is now available from:

  <https://download.bitcoinabc.org/0.27.0/>

 - The `fee`, `modifiedfee`, `descendantfees` and `ancestorfees` fields from the
   `getrawmempool`, `getmempoolentry`, `getmempoolancestors`and
   `getmempooldescendants` RPCs which have been deprecated for a long time are
   now removed. They are superseded by the `fees` object field which provides
   the same information.
