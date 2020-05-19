# Bitcoin ABC 0.23.0 Release Notes

Bitcoin ABC version 0.23.0 is now available from:

  <https://download.bitcoinabc.org/0.23.0/>

This release includes the following features and fixes:
 - The node's known peers are persisted to disk in a file called `peers.dat`. The
   format of this file has been changed in a backwards-incompatible way in order to
   accommodate the storage of Tor v3 and other BIP155 addresses. This means that if
   the file is modified by 0.23.0 or newer then older versions will not be able to
   read it. Those old versions, in the event of a downgrade, will log an error
   message that deserialization has failed and will continue normal operation
   as if the file was missing, creating a new empty one.
