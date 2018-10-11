# Wormhole v0.1.1

v0.1.1 is a release

Please report bugs using the issue tracker on GitHub:

  https://github.com/copernet/wormhole/issues

# Table of contents

- [wormhole v0.1.1](#wormhole-core-v011)
- [Upgrading and downgrading](#upgrading-and-downgrading)
  - [How to upgrade](#how-to-upgrade)
  - [Downgrading](#downgrading)
  - [Compatibility with Bitcoin ABC](#compatibility-with-bitcoin-abc)
- [Notable changes](#notable-changes)
  - [Add property freeze and unfreeze feature](#Add property freeze and unfreeze feature)
- [Change log](#change-log)
- [Credits](#credits)
- [Document](#document)

# Upgrading and downgrading

## How to upgrade

If you are running Bitcoin ABC or an older version of Wormhole Core, shut it down.

`wormhole-cli stop`

when you complie successfully and start the client using the following command at the first time:
`wormholed -daemon -startclean=1`

You can just use `wormhole -daemon` to restart the client after you have run successfully. 

During the first startup historical Wormhole transactions are reprocessed and Wormhole Core will not be usable for approximately 15 minutes up to two hours. The progress of the initial scan is reported on the console, the GUI and written to the `debug.log`. The scan may be interrupted, but can not be resumed, and then needs to start from the beginning.

## Downgrading

Downgrading to an Wormhole Core version prior 0.0.1 is generally not supported as older versions will not provide accurate information due to the changes in consensus rules.

## Compatibility with Bitcoin ABC

Wormhole Core is based on Bitcoin ABC v0.17.2.0-0d18a09 and can be used as replacement for Bitcoin ABC. Switching between Wormhole Core and Bitcoin ABC is fully supported at any time.

===============

## Add property freeze and unfreeze feature

Managed property freeze and unfreeze features were added Wormhole Core 0.1.1, As shown below:

- Managed property can be created with the ***previous token id*** reinterpreted as a switch of property freeze feature

- Managed property issuer can Initiate a transaction to freeze tokens or unfreeze tokens if the freeze feature has been opened for the managed token

# Change log

Pull request made on this release :

# Credits

Thanks to everyone who contributed to this release, and especially the Bitcoin ABC developers and Omni core developers for providing the foundation for Wormhole Core!

# Document

The following is the detailed wormhole document link:

1. WhitePaper : https://github.com/copernet/spec/blob/master/whcwhitepaper.md
2. YellowPaper : https://github.com/copernet/spec/blob/master/Wormhole-YellowPaper.md
3. Wormhole-Spec : https://github.com/copernet/spec/blob/master/wormhole-spec.md
4. RPC : https://github.com/copernet/spec/blob/master/wormhole-RPC.md
5. Test-Manual : https://github.com/copernet/spec/blob/master/wormhole-testmanual-0.1.1.md