# Bitcoin ABC 0.22.14 Release Notes

Bitcoin ABC version 0.22.14 is now available from:

  <https://download.bitcoinabc.org/0.22.14/>

This release includes the following features and fixes:
 - The node's known peers are persisted to disk in a file called `peers.dat`. The
   format of this file has been changed in a backwards-incompatible way in order to
   accommodate the storage of Tor v3 and other BIP155 addresses. This means that if
   the file is modified by 0.22.14 or newer then older versions will not be able to
   read it. Those old versions, in the event of a downgrade, will log an error
   message "Incorrect keysize in addrman deserialization" and will continue normal
   operation as if the file was missing, creating a new empty one.
 - The Tor onion service that is automatically created by setting the
   `-listenonion` configuration parameter will now be created as a Tor v3 service
   instead of Tor v2. The private key that was used for Tor v2 (if any) will be
   left untouched in the `onion_private_key` file in the data directory (see
   `-datadir`) and can be removed if not needed. Bitcoin ABC will no longer
   attempt to read it. The private key for the Tor v3 service will be saved in a
   file named `onion_v3_private_key`. To use the deprecated Tor v2 service (not
   recommended), then `onion_private_key` can be copied over
   `onion_v3_private_key`, e.g.
   `cp -f onion_private_key onion_v3_private_key`.
