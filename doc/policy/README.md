# Transaction Relay Policy

**Policy** (Mempool or Transaction Relay Policy) is the node's set of validation rules, in addition
to consensus, enforced for unconfirmed transactions before submitting them to the mempool. These
rules are local to the node and some are configurable (e.g. `-minrelaytxfee`).
Policy may include restrictions on the transaction itself, the transaction
in relation to the current chain tip, and the transaction in relation to the node's mempool
contents. Policy is *not* applied to transactions in blocks.

This documentation is not an exhaustive list of all policy rules.

- [Packages](packages.md)
