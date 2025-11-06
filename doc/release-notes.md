# Bitcoin ABC 0.32.2 Release Notes

Bitcoin ABC version 0.32.2 is now available from:

  <https://download.bitcoinabc.org/0.32.2/>

This release includes the following features and fixes:
 - The "blk-bad-inputs (parallel script check failed)" error message in the debug log
   is replaced with a more descriptive "mandatory-script-verify-flag-failed" with
   an exact script error. Note that parallel validation is non-deterministic in what
   error it may encounter first if there are multiple issues.

Security
---------

Mitigations have been backported to address the following vulnerabilities
disclosed by Bitcoin Core. All these vulnerabilities are low severity and very
unlikely to be exploited.
 - CVE-2025-54604 and CVE-2025-54605: a rate limiter for the log has been
   implemented to prevent disk filling attacks.
   Some messages are unconditionally logged by the node and this behavior
   could be exploited to fill the disk space of a node over time. This attack
   would require a lot of patience as the disk will fill very slowly, and the
   rate limiter makes it totally impractical.
 - CVE-2025-46598: improvements to script caching makes the script validation
   faster.
   It is possible for a miner to include a specially crafted non standard
   transaction in a block that would take up to a few seconds to validate.
   In the event of a block filled with such transactions, this could cause the
   node to spend a lot of time validating the block and thus delay the block
   propagation, slowing down the network. The new cache is a mitigation that
   makes the validation faster for such transactions.
 - CVE-2025-46597: the `-maxmempool` and `-dbcache` options are now limited to
   prevent any integer overflow on 32-bit systems.
   A 32-bit version of the node could use large values for these options that
   would cause a memory overflow and crash the node.
   Note that it requires a special build of the node software as there is no
   32-bit official release anymore, and even so the default options are safe.
