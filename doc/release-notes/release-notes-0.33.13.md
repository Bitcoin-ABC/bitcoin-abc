# Bitcoin ABC 0.33.13 Release Notes

Bitcoin ABC version 0.33.13 is now available from:

  <https://download.bitcoinabc.org/0.33.13/>

This release includes the following features and fixes:
 - A new `-chronikelectrumidletimeout` option is added to disconnect the
   electrum peers that have been inactive (did not send any request) for that
   amount of time. Default value is 600 (10 minutes) which should work fine with
   Electrum ABC clients.
 - Two new Chronik options, `-chronikmaxsubs` and `-chronikmaxsubsperip` have
   been added to let a Chronik node operator set limits to the total number of
   subscriptions and the number per IP address.

Updated REST APIs
-----------------
 - Parameter validation for `/rest/getutxos` has been improved by rejecting
   truncated or overly large txids and malformed outpoint indices by raising an
   HTTP_BAD_REQUEST "Parse error". Previously, these malformed requests would be
   silently handled.
