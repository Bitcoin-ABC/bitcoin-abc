Wormhole v0.2.3
===================

v0.2.3 is a release

Please report bugs using the issue tracker on GitHub:

  https://github.com/copernet/wormhole/issues

Table of contents
=================

- [wormhole v0.2.3](#wormhole-core-v023)
- [Upgrading and downgrading](#upgrading-and-downgrading)
  - [How to upgrade](#how-to-upgrade)
  - [Downgrading](#downgrading)
  - [Compatibility with Bitcoin ABC](#compatibility-with-bitcoin-abc)
- [Notable changes](#notable-changes)
  - [Fix RPC `whc_gettransaction` issue](#Fix RPC issue)
  - [Fix block creation failure on regtest network due to the activation of new rules in 'Bitcoin-ABC 0.18.2'](#Block creation failure on regtest network)
  - [Modify some integration tests ](#Modify some integration tests )	
- [Change log](#change-log)
- [Credits](#credits)
- [Document](#document)

Upgrading and downgrading
=========================

How to upgrade
--------------

If you are running Bitcoin ABC or an older version of Wormhole Core, shut it down.

`wormhole-cli stop`

when you complie successfully and start the client using the following command at the first time:
`wormholed -daemon -startclean=1`

You can just use `wormhole -daemon` to restart the client after you have run successfully. 

During the first startup historical Wormhole transactions are reprocessed and Wormhole Core will not be usable for approximately 15 minutes up to two hours. The progress of the initial scan is reported on the console, the GUI and written to the `debug.log`. The scan may be interrupted, but can not be resumed, and then needs to start from the beginning.

Downgrading
-----------

Downgrading to an Wormhole Core version prior 0.2.1 is generally not supported as older versions will not provide accurate information due to the changes in consensus rules.

Compatibility with Bitcoin ABC
-------------------------------

Wormhole Core is based on Bitcoin ABC v0.18.2-6a51d4f and can be used as replacement for Bitcoin ABC. Switching between Wormhole Core and Bitcoin ABC is fully supported at any time.

===============

Fix RPC issue
---------------------------------
- Query information of crowdfunding transactions is incompleted
- Add field ` amount` for Frozen/Unfrozen transaction

Block creation failure on regtest network
---------------------------------
- The consensus requires that the minmal size of transactions in blocks is 100 bytes after `Bitcoin-ABC 0.18.2` activation.  So the block is invalid because the size of coinbase transaction is less than 100 bytes in regression network.


The `Wormhole 0.2.3` node is compatible with the `Bitcoin-Abc 0.18.2` version.

Change log
==========

Pull request made on this release :

Credits
=======

Thanks to everyone who contributed to this release, and especially the Bitcoin ABC developers and Omni core developers for providing the foundation for Wormhole Core!

Document
========
The following is the detailed wormhole document link:
1. WhitePaper : https://github.com/copernet/spec/blob/master/wormhole-spec-en.md
2. YellowPaper : https://github.com/copernet/spec/blob/master/wormhole-yellowpaper-en.md
3. Wormhole-Spec : https://github.com/copernet/spec/blob/master/wormhole-spec-en.md
4. RPC : https://github.com/copernet/spec/blob/master/wormhole-rpc-en.md

