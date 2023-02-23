# Bitcoin ABC 0.26.13 Release Notes

Bitcoin ABC version 0.26.13 is now available from:

  <https://download.bitcoinabc.org/0.26.13/>

 - The `fee`, `modifiedfee`, `descendantfees` and `ancestorfees` fields from the
   `getrawmempool`, `getmempoolentry`, `getmempoolancestors`and
   `getmempooldescendants` RPCs which have been deprecated for a long time are
   now removed. They are superseded by the `fees` object field which provides
   the same information.
 - The `descendantcount`, `descendantsize`, `fees.descendant`, `ancestorcount`,
   `ancestorsize` and `fees.ancestor` fields from the `getrawmempool`,
   `getmempoolentry`, `getmempoolancestors`and `getmempooldescendants` RPCs are
   deprecated. To keep using these fields, use the
   `-deprecatedrpc=mempool_ancestors_descendants` option.
