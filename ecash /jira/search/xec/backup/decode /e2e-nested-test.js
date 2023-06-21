/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('bsert');
const {wallet, Network, protocol, FullNode} = require('bcoin');
const {NodeClient, WalletClient} = require('bcoin/lib/client');
const {Path, Signer, prepareSign, vendors} = require('../lib/bsigner');
const {getLogger, getTestVendors} = require('./utils/common');
const {sleep} = require('../lib/common');
const {phrase} = require('./utils/key');

const n = 'regtest';
const network = Network.get(n);

// set the network globally
Network.set(n);

const logger = getLogger();
const enabledVendors = getTestVendors();

let fullNode;
let nodeClient;
let manager;
let walletClient;
let primaryWallet;

// path to sign with
const path = Path.fromList([44, 1, 10], true);

const walletId = 'foobarman';

describe('Nested Signing', function() {
  this.timeout(1e7);

  const oldCBMaturity = protocol.consensus.COINBASE_MATURITY;
  const oldBaseReward = protocol.consensus.BASE_REWARD;
  before(async () => {
    // allow for spending coinbase outputs immediately
    protocol.consensus.COINBASE_MATURITY = 0;
    protocol.consensus.BASE_REWARD = protocol.consensus.COIN;

    fullNode = new FullNode({
      port: network.port,
      memory: true,
      workers: true,
      network: network.type,
      witness: true
    });

    nodeClient = new NodeClient({
      port: network.rpcPort,
      network: network.type
    });

    walletClient = new WalletClient({
      port: network.walletPort,
      network: network.type
    });

    manager = Signer.fromOptions({
      network,
      logger,
      vendor: enabledVendors,
      [vendors.LEDGER]: {
        timeout: 0
      },
      [vendors.MEMORY]: {
        // configure default device of memory device manager.
        device: { phrase }
      }
    });

    fullNode.use(wallet.plugin);

    // create wallet client specific for primary wallet
    primaryWallet = walletClient.wallet('primary');

    await logger.open();
    await manager.open();
    await fullNode.ensure();
    await fullNode.open();

    for (const vendor of enabledVendors) {
      try {
        const device = await manager.selectDevice(vendor);
        await device.open();
      } catch (e) {
        throw new Error(`Could not select device for ${vendor}.`);
      }
    }
  });

  after(async () => {
    protocol.consensus.COINBASE_MATURITY = oldCBMaturity;
    protocol.consensus.BASE_REWARD = oldBaseReward;

    await logger.close();
    await manager.close();
    await fullNode.close();
  });

  it('should start node and wallet', async () => {
    const info = await nodeClient.getInfo();
    assert.ok(info);

    const walletInfo = await primaryWallet.getInfo();
    assert.ok(walletInfo);
  });

  /*
  */
  it('should create new segwit wallet', async () => {
    // get account key
    const pubkey = await manager.getPublicKey(path);
    const accountKey = pubkey.xpubkey(network.type);

    const response = await walletClient.createWallet(walletId, {
      witness: true,
      watchOnly: true,
      accountKey: accountKey
    });

    assert.ok(response);

    const accountInfo = await walletClient.getAccount(walletId, 'default');

    assert.equal(accountInfo.watchOnly, true);
    assert.equal(accountInfo.accountKey, accountKey);
    assert.equal(accountInfo.witness, true);
    assert.ok(accountInfo.nestedAddress);
  });

  it('should mine blocks to the nested address', async () => {
    const {nestedAddress} = await walletClient.getAccount(walletId, 'default');
    const toMine = 4;

    await nodeClient.execute('generatetoaddress', [toMine, nestedAddress]);

    await sleep(300);
    const walletInfo = await walletClient.getAccount(walletId, 'default');

    assert.equal(walletInfo.balance.coin, toMine);
  });

  for (const vendor of enabledVendors) {
    it(`should be able to create a valid spend (${vendor})`, async () => {
      const device = await manager.selectDevice(vendor);
      await device.open();

      const {receiveAddress} = await walletClient.getAccount(walletId, 'default');

      const tx = await walletClient.createTX(walletId, {
        account: 'default',
        rate: 1e3,
        outputs: [{ value: 1e4, address: receiveAddress }],
        sign: false,
        template: true
      });

      const {inputData, mtx} = await prepareSign({
        tx: tx,
        wallet: walletClient.wallet(walletId),
        path,
        network
      });

      const signed = await manager.signTransaction(mtx, inputData);

      assert.ok(signed.verify());
      await device.close();
    });
  }
});

done 
done
loop
