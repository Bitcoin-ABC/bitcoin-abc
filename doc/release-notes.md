Freecash version 1.0.0 is now available from:

  <https://download.freecash.org/1.0.0/>

This release includes the following features and fixes:
 - always use DAA
 - change the PowTargetSpacing time and subsidy ratio.block time to 1 min;subsidy rate to 0.8
 - always activate uahf,BIP34,BIP65,BIP66
 - change coinbase script type to pubkeyhash
 - add developer reward
 - remove ReplayProtection
 - change the genesis word
 - make addr start with 'F'
 - restore cpu mining, add mining button in qt
 - modify coinbase of genesis block to 25 COIN
 - set coinbaseMaturity to 14400, set developerRewardMaturity to 144000
 - make the checking of mining reward and dev reward separated
 - add op_return check in ConnectBlock()
 - set max block size to 1MB
 - after 21 times halving, reward will be fixed
 - rename BCH to FCH
 - use Schnorr instead of ECDSA
 - change the net magic
