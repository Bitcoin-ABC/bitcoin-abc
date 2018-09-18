Bitcoin ABC version 0.20.13 is now available from:

  <https://download.bitcoinabc.org/0.20.13/>

This release includes the following features and fixes:

- The RPC `getrpcinfo` returns runtime details of the RPC server. At the moment
  it returns the active commands and the corresponding execution time.


New RPC methods
------------
- `getnodeaddresses` returns peer addresses known to this node. It may be used to connect to nodes over TCP without using the DNS seeds.
