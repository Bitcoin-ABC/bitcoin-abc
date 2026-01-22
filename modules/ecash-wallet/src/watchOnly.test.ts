// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
    Ecc,
    fromHex,
    shaRmd160,
    Address,
    HdNode,
    mnemonicToSeed,
} from 'ecash-lib';
import { ChronikClient, ScriptUtxo, OutPoint } from 'chronik-client';
import { MockChronikClient } from 'mock-chronik-client';
import { WatchOnlyWallet } from './watchOnly';

const expect = chai.expect;
chai.use(chaiAsPromised);

const DUMMY_TIPHEIGHT = 800000;
const DUMMY_TIPHASH =
    '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe';
const DUMMMY_TXID = '11'.repeat(32);
const DUMMY_SK = fromHex('22'.repeat(32));
const testEcc = new Ecc();
const DUMMY_PK = testEcc.derivePubkey(DUMMY_SK);
const DUMMY_HASH = shaRmd160(DUMMY_PK);
const DUMMY_ADDRESS = Address.p2pkh(DUMMY_HASH).toString();
const DUMMY_OUTPOINT: OutPoint = {
    txid: DUMMMY_TXID,
    outIdx: 0,
};
const DUMMY_UTXO: ScriptUtxo = {
    outpoint: DUMMY_OUTPOINT,
    blockHeight: DUMMY_TIPHEIGHT,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
};

const testMnemonic =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';

describe('WatchOnlyWallet', () => {
    describe('fromAddress (non-HD)', () => {
        it('Creates a non-HD watch-only wallet from an address', () => {
            const mockChronik = new MockChronikClient();
            const wallet = WatchOnlyWallet.fromAddress(
                DUMMY_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(wallet.isHD).to.equal(false);
            expect(wallet.address).to.equal(DUMMY_ADDRESS);
            expect(wallet.baseHdNode).to.equal(undefined);
            expect(wallet.accountNumber).to.equal(0);
            expect(wallet.receiveIndex).to.equal(0);
            expect(wallet.changeIndex).to.equal(0);
            expect(wallet.keypairs.size).to.equal(0); // Non-HD doesn't use keypairs map
            expect(wallet.utxos).to.deep.equal([]);
            expect(wallet.balanceSats).to.equal(0n);
        });

        it('Throws error when initialized without address or xpub', () => {
            const mockChronik = new MockChronikClient();
            // @ts-expect-error - Testing invalid constructor call
            expect(
                () =>
                    new WatchOnlyWallet(
                        mockChronik as unknown as ChronikClient,
                    ),
            ).to.throw(
                'WatchOnlyWallet must be initialized with either an address or xpub',
            );
        });

        it('Syncs single address wallet', async () => {
            const mockChronik = new MockChronikClient();
            const wallet = WatchOnlyWallet.fromAddress(
                DUMMY_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            mockChronik.setBlockchainInfo({
                tipHash: DUMMY_TIPHASH,
                tipHeight: DUMMY_TIPHEIGHT,
            });

            const utxo1: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 0 },
                sats: 1000n,
            };
            const utxo2: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 1 },
                sats: 2000n,
            };

            mockChronik.setUtxosByAddress(DUMMY_ADDRESS, [utxo1, utxo2]);

            await wallet.sync();

            expect(wallet.utxos.length).to.equal(2);
            expect(wallet.utxos[0]).to.deep.equal({
                ...utxo1,
                address: DUMMY_ADDRESS,
            });
            expect(wallet.utxos[1]).to.deep.equal({
                ...utxo2,
                address: DUMMY_ADDRESS,
            });
            expect(wallet.balanceSats).to.equal(3000n);
        });

        it('Updates balanceSats correctly', async () => {
            const mockChronik = new MockChronikClient();
            const wallet = WatchOnlyWallet.fromAddress(
                DUMMY_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            mockChronik.setBlockchainInfo({
                tipHash: DUMMY_TIPHASH,
                tipHeight: DUMMY_TIPHEIGHT,
            });

            const utxo1: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 0 },
                sats: 1000n,
            };
            const utxo2: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 1 },
                sats: 2000n,
            };
            const utxoWithToken: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 2 },
                sats: 500n,
                token: {
                    tokenId: 'token123',
                    amount: '1000',
                    tokenType: 1,
                },
            };

            mockChronik.setUtxosByAddress(DUMMY_ADDRESS, [
                utxo1,
                utxo2,
                utxoWithToken,
            ]);

            await wallet.sync();

            // balanceSats should only include sats-only UTXOs (not token UTXOs)
            expect(wallet.balanceSats).to.equal(3000n);
            expect(wallet.utxos.length).to.equal(3);
        });
    });

    describe('fromXpub (HD)', () => {
        it('Creates an HD watch-only wallet from xpub', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            expect(wallet.isHD).to.equal(true);
            expect(wallet.baseHdNode).to.not.equal(undefined);
            expect(wallet.accountNumber).to.equal(0);
            expect(wallet.receiveIndex).to.equal(0);
            expect(wallet.changeIndex).to.equal(0);
            expect(wallet.keypairs.size).to.equal(1); // First receive address is cached
            expect(wallet.address).to.equal(
                'ecash:qq86jv6h0y97q8l63ndynvk3fn9aq8fqru3exew8gl',
            );
        });

        it('Creates HD wallet with custom account number', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/5'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { accountNumber: 5 },
            );

            expect(wallet.isHD).to.equal(true);
            expect(wallet.accountNumber).to.equal(5);
            // Address is distinct from the 0' account in prev test
            expect(wallet.address).to.equal(
                'ecash:qqqgkdsn4ushvx94h6wxwz8nhjwdwcsugsshv4nc49',
            );
        });

        it('Creates HD wallet with custom receive and change indices', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { receiveIndex: 10, changeIndex: 3 },
            );

            expect(wallet.isHD).to.equal(true);
            expect(wallet.receiveIndex).to.equal(10);
            expect(wallet.changeIndex).to.equal(3);
        });

        it('Throws error for invalid xpub depth', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            // Derive to a non-account-level node (depth 1, not 3)
            const wrongNode = master.derivePath("m/44'");
            const xpub = wrongNode.xpub();

            expect(() =>
                WatchOnlyWallet.fromXpub(
                    xpub,
                    mockChronik as unknown as ChronikClient,
                ),
            ).to.throw('Invalid xpub depth: expected depth 3 (account level)');
        });

        it('Throws error for invalid xpub format', () => {
            const mockChronik = new MockChronikClient();

            expect(() =>
                WatchOnlyWallet.fromXpub(
                    'invalid-xpub',
                    mockChronik as unknown as ChronikClient,
                ),
            ).to.throw();
        });

        it('HD wallet caches first receive address on creation', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            expect(wallet.keypairs.size).to.equal(1);
            expect(wallet.address).to.not.equal(undefined);
            expect(wallet.keypairs.has(wallet.address!)).to.equal(true);

            const keypair = wallet.keypairs.get(wallet.address!);
            expect(keypair).to.not.equal(undefined);
            expect(keypair!.address).to.equal(wallet.address);
            // Watch-only keypairs don't have private keys
            // @ts-expect-error - Testing private key access
            expect(keypair!.sk).to.equal(undefined);
            // But hey have everything else
            expect(keypair!.pk).to.not.equal(undefined);
            expect(keypair!.pkh).to.not.equal(undefined);
            expect(keypair!.script).to.not.equal(undefined);
        });

        it('HD wallets with same xpub generate same addresses', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet1 = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );
            const wallet2 = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            expect(wallet1.address).to.equal(wallet2.address);
            expect(wallet1.getReceiveAddress(0)).to.equal(
                wallet2.getReceiveAddress(0),
            );
            expect(wallet1.getReceiveAddress(1)).to.equal(
                wallet2.getReceiveAddress(1),
            );
        });

        it('getReceiveAddress returns correct address and caches it', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            const address0 = wallet.getReceiveAddress(0);
            const address1 = wallet.getReceiveAddress(1);
            const address2 = wallet.getReceiveAddress(2);

            expect(address0).to.not.equal(address1);
            expect(address1).to.not.equal(address2);
            expect(wallet.keypairs.size).to.equal(3); // All three are cached

            // Calling again should return cached address
            expect(wallet.getReceiveAddress(0)).to.equal(address0);
            expect(wallet.keypairs.size).to.equal(3); // Still 3, not 4
        });

        it('getChangeAddress returns correct address and caches it', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            const change0 = wallet.getChangeAddress(0);
            const change1 = wallet.getChangeAddress(1);

            expect(change0).to.not.equal(change1);
            expect(wallet.keypairs.size).to.equal(3); // First receive + 2 change addresses

            // Change addresses should be different from receive addresses
            expect(change0).to.not.equal(wallet.getReceiveAddress(0));
        });

        it('getNextReceiveAddress increments receiveIndex', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            const initialIndex = wallet.receiveIndex;
            const address0 = wallet.getNextReceiveAddress();
            expect(wallet.receiveIndex).to.equal(initialIndex + 1);

            const address1 = wallet.getNextReceiveAddress();
            expect(wallet.receiveIndex).to.equal(initialIndex + 2);
            expect(address1).to.not.equal(address0);
        });

        it('getNextChangeAddress increments changeIndex', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            const initialIndex = wallet.changeIndex;
            const address0 = wallet.getNextChangeAddress();
            expect(wallet.changeIndex).to.equal(initialIndex + 1);

            const address1 = wallet.getNextChangeAddress();
            expect(wallet.changeIndex).to.equal(initialIndex + 2);
            expect(address1).to.not.equal(address0);
        });

        it('getAllAddresses returns all cached addresses', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
            );

            const initialAddresses = wallet.getAllAddresses();
            expect(initialAddresses.length).to.equal(1); // First receive address

            wallet.getReceiveAddress(1);
            wallet.getReceiveAddress(2);
            wallet.getChangeAddress(0);
            wallet.getChangeAddress(1);

            const allAddresses = wallet.getAllAddresses();
            expect(allAddresses.length).to.equal(5);
            expect(allAddresses).to.include(wallet.address!);
        });

        it('HD wallet methods throw error on non-HD wallet', () => {
            const mockChronik = new MockChronikClient();
            const wallet = WatchOnlyWallet.fromAddress(
                DUMMY_ADDRESS,
                mockChronik as unknown as ChronikClient,
            );

            expect(() => wallet.getReceiveAddress(0)).to.throw(
                'getReceiveAddress can only be called on HD wallets',
            );
            expect(() => wallet.getChangeAddress(0)).to.throw(
                'getChangeAddress can only be called on HD wallets',
            );
            expect(() => wallet.getNextReceiveAddress()).to.throw(
                'getNextReceiveAddress can only be called on HD wallets',
            );
            expect(() => wallet.getNextChangeAddress()).to.throw(
                'getNextChangeAddress can only be called on HD wallets',
            );
        });

        it('HD wallet sync queries UTXOs for all addresses at or below current indices', async () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { receiveIndex: 2, changeIndex: 1 },
            );

            // Get addresses for indices 0, 1, 2 (receive) and 0, 1 (change)
            const receive0 = wallet.getReceiveAddress(0);
            const receive1 = wallet.getReceiveAddress(1);
            const receive2 = wallet.getReceiveAddress(2);
            const change0 = wallet.getChangeAddress(0);
            const change1 = wallet.getChangeAddress(1);

            // Set up mock UTXOs for each address
            const utxo0: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 0 },
                sats: 1000n,
            };
            const utxo1: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 1 },
                sats: 2000n,
            };
            const utxo2: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 2 },
                sats: 3000n,
            };
            const utxo3: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 3 },
                sats: 4000n,
            };
            const utxo4: ScriptUtxo = {
                ...DUMMY_UTXO,
                outpoint: { ...DUMMY_OUTPOINT, outIdx: 4 },
                sats: 5000n,
            };

            mockChronik.setBlockchainInfo({
                tipHash: DUMMY_TIPHASH,
                tipHeight: DUMMY_TIPHEIGHT,
            });
            mockChronik.setUtxosByAddress(receive0, [utxo0]);
            mockChronik.setUtxosByAddress(receive1, [utxo1]);
            mockChronik.setUtxosByAddress(receive2, [utxo2]);
            mockChronik.setUtxosByAddress(change0, [utxo3]);
            mockChronik.setUtxosByAddress(change1, [utxo4]);

            await wallet.sync();

            // All UTXOs should be merged
            expect(wallet.utxos.length).to.equal(5);
            expect(wallet.balanceSats).to.equal(15000n);
        });

        it('HD wallet sync derives missing addresses if needed', async () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { receiveIndex: 1, changeIndex: 1 },
            );

            // Don't pre-derive addresses - let sync() do it
            expect(wallet.keypairs.size).to.equal(1); // Only first receive address

            mockChronik.setBlockchainInfo({
                tipHash: DUMMY_TIPHASH,
                tipHeight: DUMMY_TIPHEIGHT,
            });

            const receive0 = wallet.getReceiveAddress(0);
            const receive1 = wallet.getReceiveAddress(1);
            const change0 = wallet.getChangeAddress(0);
            const change1 = wallet.getChangeAddress(1);

            mockChronik.setUtxosByAddress(receive0, []);
            mockChronik.setUtxosByAddress(receive1, []);
            mockChronik.setUtxosByAddress(change0, []);
            mockChronik.setUtxosByAddress(change1, []);

            await wallet.sync();

            // All addresses should now be cached
            expect(wallet.keypairs.size).to.equal(4); // 2 receive + 2 change
        });
    });

    describe('Testnet (ectest prefix) support', () => {
        it('WatchOnlyWallet.fromAddress extracts prefix from testnet address', () => {
            const mockChronik = new MockChronikClient();
            // Create a testnet address
            const testnetAddress = Address.p2pkh(
                shaRmd160(DUMMY_PK),
                'ectest',
            ).toString();

            const wallet = WatchOnlyWallet.fromAddress(
                testnetAddress,
                mockChronik as unknown as ChronikClient,
            );

            expect(wallet.isHD).to.equal(false);
            expect(wallet.address).to.equal(testnetAddress);
            expect(wallet.prefix).to.equal('ectest');
        });

        it('WatchOnlyWallet.fromXpub creates HD wallet with ectest prefix', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { prefix: 'ectest' },
            );

            expect(wallet.isHD).to.equal(true);
            expect(wallet.baseHdNode).to.not.equal(undefined);
            expect(wallet.accountNumber).to.equal(0);
            expect(wallet.prefix).to.equal('ectest');
            expect(wallet.address).to.equal(
                'ectest:qq86jv6h0y97q8l63ndynvk3fn9aq8fqruhjcef2tw',
            );
        });

        it('WatchOnlyWallet.fromXpub generates testnet addresses for receive addresses', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const wallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { prefix: 'ectest' },
            );

            const receiveAddr0 = wallet.getReceiveAddress(0);
            const receiveAddr1 = wallet.getReceiveAddress(1);
            const changeAddr0 = wallet.getChangeAddress(0);

            expect(receiveAddr0).to.include('ectest');
            expect(receiveAddr1).to.include('ectest');
            expect(changeAddr0).to.include('ectest');
            expect(wallet.prefix).to.equal('ectest');
        });

        it('WatchOnlyWallet.fromXpub with testnet prefix generates different addresses than mainnet', () => {
            const mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(testMnemonic);
            const master = HdNode.fromSeed(seed);
            const baseNode = master.derivePath("m/44'/1899'/0'");
            const xpub = baseNode.xpub();

            const mainnetWallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { prefix: 'ecash' },
            );

            const testnetWallet = WatchOnlyWallet.fromXpub(
                xpub,
                mockChronik as unknown as ChronikClient,
                { prefix: 'ectest' },
            );

            // Same derivation path, different prefix
            expect(mainnetWallet.address).to.include('ecash:');
            expect(testnetWallet.address).to.include('ectest');
            expect(mainnetWallet.address).to.not.equal(testnetWallet.address);

            // But the addresses should have the same hash (just different prefix)
            const mainnetAddrObj = Address.fromCashAddress(
                mainnetWallet.address,
            );
            const testnetAddrObj = Address.fromCashAddress(
                testnetWallet.address,
            );
            expect(mainnetAddrObj.hash).to.equal(testnetAddrObj.hash);
        });
    });
});
