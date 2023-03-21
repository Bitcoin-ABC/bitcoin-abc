# Bitcoin ABC 0.27.2 Release Notes

Bitcoin ABC version 0.27.2 is now available from:

  <https://download.bitcoinabc.org/0.27.2/>

This release includes the following features and fixes:
  - `getavalanchepeerinfo` returns a new field `availability_score` that
    indicates how responsive a peer's nodes are (collectively) to polls from
    this node. Higher scores indicate a peer has at least one node that that
    responds to polls often. Lower scores indicate a peer has nodes that do not
    respond to polls reliably.
