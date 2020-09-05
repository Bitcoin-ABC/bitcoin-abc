# Bitcoin ABC 0.24.11 Release Notes

Bitcoin ABC version 0.24.11 is now available from:

  <https://download.bitcoinabc.org/0.24.11/>

This release includes the following features and fixes:
 - Add a `-fixedseeds` option which can be set to 0 to disable the hardcoded seeds.
   This can be used in conjunction with `dsnssed=0` to create a trusted peer only setup.
   In this case the nodes need to be added manually with the `-addnode` option or the `addnode` RPC.
