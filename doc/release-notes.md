# Bitcoin ABC 0.26.11 Release Notes

Bitcoin ABC version 0.26.11 is now available from:

  <https://download.bitcoinabc.org/0.26.11/>

 - An avalanche node that accepts no inbound connection will now behave as a
   poll-only node and will not advertise its proof to the avalanche network. A
   new `sharing` field is added to the `local` object returned by the
   `getavalancheinfo` info RPC to monitor the status.
