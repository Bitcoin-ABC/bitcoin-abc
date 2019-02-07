Bitcoin ABC version 0.20.8 is now available from:

  <https://download.bitcoinabc.org/0.20.8/>

This release includes the following features and fixes:
 - When running bitcoind without `-daemon`, logging to stdout is now the 
   default behavior. Setting `-printtoconsole=1` no longer implicitly disables
   logging to debug.log. Instead, logging to file can be explicitly disabled by
   setting `-debuglogfile=0`.
 - `getlabeladdress` has been removed and replaced with `getaccountaddress`
   until v0.21 at which time `getaccountaddress` will also be removed.  To
   use `getaccountaddress` start `bitcoind` with the `-deprecatedrpc=accounts`
   option.  See the v0.20.6 release notes for more details.

Network
-------
 - When fetching a transaction announced by multiple peers, previous versions of
   Bitcoin ABC would sequentially attempt to download the transaction from each
   announcing peer until the transaction is received, in the order that those
   peers' announcements were received.  In this release, the download logic has
   changed to randomize the fetch order across peers and to prefer sending
   download requests to outbound peers over inbound peers. This fixes an issue
   where inbound peers can prevent a node from getting a transaction.
