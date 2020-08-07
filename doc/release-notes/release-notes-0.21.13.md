Bitcoin ABC version 0.21.13 is now available from:

  <https://download.bitcoinabc.org/0.21.13/>

This release includes the following features and fixes:

- Various fixes to logging and error messages.

RPC changes
-----------
- `createwallet` now returns a warning if an empty string is used as an
encryption password, and does not encrypt the wallet, instead of raising an
error. This makes it easier to disable encryption but also specify other
options when using the `bitcoin-cli` tool.

Low-level changes
=================

Tests
-----
- `-fallbackfee` was 0 (disabled) by default for the main chain, but 20000 by
default for the test chains. Now it is 0 by default for all chains. Testnet
and regtest users will have to add fallbackfee=20000 to their configuration if
they weren't setting it and they want it to keep working like before. (#16524)

