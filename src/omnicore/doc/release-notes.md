wormhole v0.0.4
===================

v0.0.4 is a pre release

Please report bugs using the issue tracker on GitHub:

  https://github.com/copernet/wormhole/issues

Table of contents
=================

- [wormhole v0.0.4](#wormhole-core-v004)
- [Upgrading and downgrading](#upgrading-and-downgrading)
  - [How to upgrade](#how-to-upgrade)
  - [Downgrading](#downgrading)
  - [Compatibility with Bitcoin ABC](#compatibility-with-bitcoin-abc)
- [Notable changes](#notable-changes)
  - [Various bug fixes and improvements](#various-bug-fixes-and-improvements)
- [Change log](#change-log)
- [Credits](#credits)

Upgrading and downgrading
=========================

How to upgrade
--------------

If you are running Bitcoin ABC or an older version of Wormhole Core, shut it down.

During the first startup historical Wormhole transactions are reprocessed and Wormhole Core will not be usable for approximately 15 minutes up to two hours. The progress of the initial scan is reported on the console, the GUI and written to the `debug.log`. The scan may be interrupted, but can not be resumed, and then needs to start from the beginning.

Downgrading
-----------

Downgrading to an Wormhole Core version prior 0.0.4 is generally not supported as older versions will not provide accurate information due to the changes in consensus rules.

Compatibility with Bitcoin ABC
-------------------------------

Wormhole Core is based on Bitcoin ABC v0.17.2.0-0d18a09 and can be used as replacement for Bitcoin ABC. Switching between Wormhole Core and Bitcoin ABC is fully supported at any time.

===============

Various bug fixes and improvements
----------------------------------

Various smaller improvements were added Wormhole Core 0.0.3 such as:

- fix logic bug for parse transaction
- fix logic bug for receiver address

Change log
==========

Issues resolved on this release :

```
- #1 https://github.com/copernet/wormhole/issues/1
- #2 https://github.com/copernet/wormhole/issues/2

```

Credits
=======

Thanks to everyone who contributed to this release, and especially the Bitcoin ABC developers and Omni core developers for providing the foundation for Wormhole Core!
