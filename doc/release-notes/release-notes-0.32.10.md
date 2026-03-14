# Bitcoin ABC 0.32.10 Release Notes

Bitcoin ABC version 0.32.10 is now available from:

  <https://download.bitcoinabc.org/0.32.10/>

Chronik now includes the transactions from the submitted batch for token
validation when broadcasting several transactions via the `broadcast-txs`
endpoint. This fixes a bug where chronik would reject chained token
transactions sent via this endpoint.
