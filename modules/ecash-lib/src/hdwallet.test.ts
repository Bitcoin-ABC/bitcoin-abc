// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { HdNode } from './hdwallet.js';
import './initNodeJs.js';

// Tests are based on https://github.com/bitcoinjs/bip32/blob/master/test/fixtures/index.json

describe('hdwallet', () => {
    it('hdwallet 000102030405060708090a0b0c0d0e0f', () => {
        const seed = fromHex('000102030405060708090a0b0c0d0e0f');
        const master = HdNode.fromSeed(seed);
        expect(toHex(master.seckey()!)).to.equal(
            'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35',
        );
        expect(toHex(master.pubkey())).to.equal(
            '0339a36013301597daef41fbe593a02cc513d0b55527ec2df1050e2e8ff49c85c2',
        );
        expect(toHex(master.pkh())).to.equal(
            '3442193e1bb70916e914552172cd4e2dbc9df811',
        );
        expect(toHex(master.fingerprint())).to.equal('3442193e');
        expect(toHex(master.chainCode())).to.equal(
            '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508',
        );
        expect(master.index()).to.equal(0);
        expect(master.depth()).to.equal(0);

        const child0 = master.deriveHardened(0);
        expect(toHex(child0.seckey()!)).to.equal(
            'edb2e14f9ee77d26dd93b4ecede8d16ed408ce149b6cd80b0715a2d911a0afea',
        );
        expect(toHex(child0.pubkey())).to.equal(
            '035a784662a4a20a65bf6aab9ae98a6c068a81c52e4b032c0fb5400c706cfccc56',
        );
        expect(toHex(child0.pkh())).to.equal(
            '5c1bd648ed23aa5fd50ba52b2457c11e9e80a6a7',
        );
        expect(toHex(child0.fingerprint())).to.equal('5c1bd648');
        expect(toHex(child0.chainCode())).to.equal(
            '47fdacbd0f1097043b78c63c20c34ef4ed9a111d980047ad16282c7ae6236141',
        );
        expect(child0.index()).to.equal(0x80000000);
        expect(child0.depth()).to.equal(1);

        const child01 = child0.derive(1);
        expect(toHex(child01.seckey()!)).to.equal(
            '3c6cb8d0f6a264c91ea8b5030fadaa8e538b020f0a387421a12de9319dc93368',
        );
        expect(toHex(child01.pubkey())).to.equal(
            '03501e454bf00751f24b1b489aa925215d66af2234e3891c3b21a52bedb3cd711c',
        );
        expect(toHex(child01.pkh())).to.equal(
            'bef5a2f9a56a94aab12459f72ad9cf8cf19c7bbe',
        );
        expect(toHex(child01.fingerprint())).to.equal('bef5a2f9');
        expect(toHex(child01.chainCode())).to.equal(
            '2a7857631386ba23dacac34180dd1983734e444fdbf774041578e9b6adb37c19',
        );
        expect(child01.index()).to.equal(1);
        expect(child01.depth()).to.equal(2);

        expect(toHex(master.derivePath("m/0'").seckey()!)).to.equal(
            toHex(child0.seckey()!),
        );
        expect(toHex(master.derivePath("m/0'/1").seckey()!)).to.equal(
            toHex(child01.seckey()!),
        );

        const child012 = master.derivePath("m/0'/1/2'");
        expect(toHex(child012.seckey()!)).to.equal(
            'cbce0d719ecf7431d88e6a89fa1483e02e35092af60c042b1df2ff59fa424dca',
        );
        expect(toHex(child012.pubkey())).to.equal(
            '0357bfe1e341d01c69fe5654309956cbea516822fba8a601743a012a7896ee8dc2',
        );
        expect(toHex(child012.pkh())).to.equal(
            'ee7ab90cde56a8c0e2bb086ac49748b8db9dce72',
        );
        expect(toHex(child012.fingerprint())).to.equal('ee7ab90c');
        expect(toHex(child012.chainCode())).to.equal(
            '04466b9cc8e161e966409ca52986c584f07e9dc81f735db683c3ff6ec7b1503f',
        );
        expect(child012.index()).to.equal(0x80000002);
        expect(child012.depth()).to.equal(3);

        const child0122 = master.derivePath("m/0'/1/2'/2");
        expect(toHex(child0122.seckey()!)).to.equal(
            '0f479245fb19a38a1954c5c7c0ebab2f9bdfd96a17563ef28a6a4b1a2a764ef4',
        );
        expect(toHex(child0122.pubkey())).to.equal(
            '02e8445082a72f29b75ca48748a914df60622a609cacfce8ed0e35804560741d29',
        );
        expect(toHex(child0122.pkh())).to.equal(
            'd880d7d893848509a62d8fb74e32148dac68412f',
        );
        expect(toHex(child0122.fingerprint())).to.equal('d880d7d8');
        expect(toHex(child0122.chainCode())).to.equal(
            'cfb71883f01676f587d023cc53a35bc7f88f724b1f8c2892ac1275ac822a3edd',
        );
        expect(child0122.index()).to.equal(2);
        expect(child0122.depth()).to.equal(4);

        const child = master.derivePath("m/0'/1/2'/2/1000000000");
        expect(toHex(child.seckey()!)).to.equal(
            '471b76e389e528d6de6d816857e012c5455051cad6660850e58372a6c3e6e7c8',
        );
        expect(toHex(child.pubkey())).to.equal(
            '022a471424da5e657499d1ff51cb43c47481a03b1e77f951fe64cec9f5a48f7011',
        );
        expect(toHex(child.pkh())).to.equal(
            'd69aa102255fed74378278c7812701ea641fdf32',
        );
        expect(toHex(child.fingerprint())).to.equal('d69aa102');
        expect(toHex(child.chainCode())).to.equal(
            'c783e67b921d2beb8f6b389cc646d7263b4145701dadd2161548a8b078e65e9e',
        );
        expect(child.index()).to.equal(1000000000);
        expect(child.depth()).to.equal(5);
    });

    it('hdwallet fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9...', () => {
        const seed = fromHex(
            'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542',
        );
        const master = HdNode.fromSeed(seed);
        expect(toHex(master.seckey()!)).to.equal(
            '4b03d6fc340455b363f51020ad3ecca4f0850280cf436c70c727923f6db46c3e',
        );
        expect(toHex(master.pubkey())).to.equal(
            '03cbcaa9c98c877a26977d00825c956a238e8dddfbd322cce4f74b0b5bd6ace4a7',
        );
        expect(toHex(master.pkh())).to.equal(
            'bd16bee53961a47d6ad888e29545434a89bdfe95',
        );
        expect(toHex(master.fingerprint())).to.equal('bd16bee5');
        expect(toHex(master.chainCode())).to.equal(
            '60499f801b896d83179a4374aeb7822aaeaceaa0db1f85ee3e904c4defbd9689',
        );
        expect(master.index()).to.equal(0);
        expect(master.depth()).to.equal(0);

        const child0 = master.derivePath('m/0');
        expect(toHex(child0.seckey()!)).to.equal(
            'abe74a98f6c7eabee0428f53798f0ab8aa1bd37873999041703c742f15ac7e1e',
        );
        expect(toHex(child0.pubkey())).to.equal(
            '02fc9e5af0ac8d9b3cecfe2a888e2117ba3d089d8585886c9c826b6b22a98d12ea',
        );
        expect(toHex(child0.pkh())).to.equal(
            '5a61ff8eb7aaca3010db97ebda76121610b78096',
        );
        expect(toHex(child0.fingerprint())).to.equal('5a61ff8e');
        expect(toHex(child0.chainCode())).to.equal(
            'f0909affaa7ee7abe5dd4e100598d4dc53cd709d5a5c2cac40e7412f232f7c9c',
        );
        expect(child0.index()).to.equal(0);
        expect(child0.depth()).to.equal(1);

        const child1 = master.derivePath("m/0/2147483647'");
        expect(toHex(child1.seckey()!)).to.equal(
            '877c779ad9687164e9c2f4f0f4ff0340814392330693ce95a58fe18fd52e6e93',
        );
        expect(toHex(child1.pubkey())).to.equal(
            '03c01e7425647bdefa82b12d9bad5e3e6865bee0502694b94ca58b666abc0a5c3b',
        );
        expect(toHex(child1.pkh())).to.equal(
            'd8ab493736da02f11ed682f88339e720fb0379d1',
        );
        expect(toHex(child1.fingerprint())).to.equal('d8ab4937');
        expect(toHex(child1.chainCode())).to.equal(
            'be17a268474a6bb9c61e1d720cf6215e2a88c5406c4aee7b38547f585c9a37d9',
        );
        expect(child1.index()).to.equal(0xffffffff);
        expect(child1.depth()).to.equal(2);

        const child2 = master.derivePath("m/0/2147483647'/1");
        expect(toHex(child2.seckey()!)).to.equal(
            '704addf544a06e5ee4bea37098463c23613da32020d604506da8c0518e1da4b7',
        );
        expect(toHex(child2.pubkey())).to.equal(
            '03a7d1d856deb74c508e05031f9895dab54626251b3806e16b4bd12e781a7df5b9',
        );
        expect(toHex(child2.pkh())).to.equal(
            '78412e3a2296a40de124307b6485bd19833e2e34',
        );
        expect(toHex(child2.fingerprint())).to.equal('78412e3a');
        expect(toHex(child2.chainCode())).to.equal(
            'f366f48f1ea9f2d1d3fe958c95ca84ea18e4c4ddb9366c336c927eb246fb38cb',
        );
        expect(child2.index()).to.equal(1);
        expect(child2.depth()).to.equal(3);

        const child3 = master.derivePath("m/0/2147483647'/1/2147483646'");
        expect(toHex(child3.seckey()!)).to.equal(
            'f1c7c871a54a804afe328b4c83a1c33b8e5ff48f5087273f04efa83b247d6a2d',
        );
        expect(toHex(child3.pubkey())).to.equal(
            '02d2b36900396c9282fa14628566582f206a5dd0bcc8d5e892611806cafb0301f0',
        );
        expect(toHex(child3.pkh())).to.equal(
            '31a507b815593dfc51ffc7245ae7e5aee304246e',
        );
        expect(toHex(child3.fingerprint())).to.equal('31a507b8');
        expect(toHex(child3.chainCode())).to.equal(
            '637807030d55d01f9a0cb3a7839515d796bd07706386a6eddf06cc29a65a0e29',
        );
        expect(child3.index()).to.equal(0xfffffffe);
        expect(child3.depth()).to.equal(4);

        const child4 = master.derivePath("m/0/2147483647'/1/2147483646'/2");
        expect(toHex(child4.seckey()!)).to.equal(
            'bb7d39bdb83ecf58f2fd82b6d918341cbef428661ef01ab97c28a4842125ac23',
        );
        expect(toHex(child4.pubkey())).to.equal(
            '024d902e1a2fc7a8755ab5b694c575fce742c48d9ff192e63df5193e4c7afe1f9c',
        );
        expect(toHex(child4.pkh())).to.equal(
            '26132fdbe7bf89cbc64cf8dafa3f9f88b8666220',
        );
        expect(toHex(child4.fingerprint())).to.equal('26132fdb');
        expect(toHex(child4.chainCode())).to.equal(
            '9452b549be8cea3ecb7a84bec10dcfd94afe4d129ebfd3b3cb58eedf394ed271',
        );
        expect(child4.index()).to.equal(2);
        expect(child4.depth()).to.equal(5);
    });
});
