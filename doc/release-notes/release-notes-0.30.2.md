# Bitcoin ABC 0.30.2 Release Notes

Bitcoin ABC version 0.30.2 is now available from:

  <https://download.bitcoinabc.org/0.30.2/>

This release fixes a bug introduced in version 0.30.1 that affects nodes running
with Chronik enabled. Under some rare circumstances the bug could cause Chronik
to crash. Only node operators running Chronik (disabled by default) are
affected. If you encountered the issue, please update your node to solve it. No
reindex is required.
