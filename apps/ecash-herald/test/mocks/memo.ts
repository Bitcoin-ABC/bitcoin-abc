// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import opReturn from '../../constants/op_return';
interface MemoFixture {
    txid: string;
    outputScript: string;
    msg: string;
}
const memoFixtures: MemoFixture[] = [
    // 01 - Set name - <name> (1-217 bytes)
    {
        txid: '753e29e81cdea12dc5fa30ca89049ca7d538d4062c4bb1b19ecf2a209a3ac8d9',
        outputScript: '6a026d0106746573742032',
        msg: `${opReturn.memo['01']}|test 2`,
    },
    // 02 - Post memo - <message> (1-217 bytes)
    {
        txid: 'c7e91099923a28cf86685c9683c74c8c029c8965a5039f84ad79886b42720f9b',
        outputScript:
            '6a026d02374c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c6974',
        msg: `${opReturn.memo['02']}|Lorem ipsum dolor sit amet, consectetur adipiscing elit`,
    },
    // 03 - Reply to memo - <tx_hash> (32 bytes) <message> (1-184 bytes)
    {
        txid: '28f3ec1f134dc8ea2e37a0645774fa2aa19e0bc2871b6edcc7e99cd86d77b1b6',
        outputScript:
            '6a026d0320965689bc694d816ab0745b501c0e9dc8dbe7994a185fe37a37b808dc6b05750a4c8546726f6d20776861742049276d20676174686572696e672c206974207365656d73207468617420746865206d656469612077656e742066726f6d207175657374696f6e696e6720617574686f7269747920746f20646f696e672074686569722062696464696e67206173206120636f6c6c656374697665204e504320686976656d696e6421',
        msg: `${opReturn.memo['03']}|<a href="https://explorer.e.cash/tx/965689bc694d816ab0745b501c0e9dc8dbe7994a185fe37a37b808dc6b05750a">memo</a>|From what I'm gathering, it seems that the media went from questioning authority to doing their bidding as a collective NPC hivemind!`,
    },
    // 04 - Like / tip memo - <tx_hash> (32 bytes)
    {
        txid: 'b7b9376659920ecbaad794bfb1cd0a5da095f9231fe1f4243474c9606623fc14',
        outputScript:
            '6a026d04201f1f63293441c673033f9112bab1b3071b2f06f68d3032a23ba9eda819694520',
        msg: `${opReturn.memo['04']}|<a href="https://explorer.e.cash/tx/1f1f63293441c673033f9112bab1b3071b2f06f68d3032a23ba9eda819694520">memo</a>`,
    },
    // 05 - Set profile text - <text> (1-217 bytes)
    {
        txid: '89ce64d809cfdfc2b407e94fc6eae43f1bc370dfe85b33c06e780831a1934a50',
        outputScript:
            '6a026d0543566572696669636174696f6e3a2068747470733a2f2f747769747465722e636f6d2f6d656d6f6263682f7374617475732f393932303333363532373635373030303937',
        msg: `${opReturn.memo['05']}|Verification: https://twitter.com/memobch/status/992033652765700097`,
    },
    // 06 - Follow user - <address> (20 bytes)
    {
        txid: '89ce64d809cfdfc2b407e94fc6eae43f1bc370dfe85b33c06e780831a1934a50',
        outputScript: '6a026d0614fe686b9b2ab589a3cb3368d02211ca1a9b88aa42',
        msg: `${opReturn.memo['06']}|<a href="https://explorer.e.cash/address/ecash:qrlxs6um926cng7txd5dqgs3egdfhz92gg60t20kkn">qrl...kkn</a>`,
    },
    // 07 - Unfollow user - <address> (20 bytes)
    {
        txid: 'a9987c7643a3d5a033b2630cf7e3603385b7ab6ec7b6be690f37b9a58c780acd',
        outputScript: '6a026d0714fe686b9b2ab589a3cb3368d02211ca1a9b88aa42',
        msg: `${opReturn.memo['07']}|<a href="https://explorer.e.cash/address/ecash:qrlxs6um926cng7txd5dqgs3egdfhz92gg60t20kkn">qrl...kkn</a>`,
    },
    // 0a - Set profile picture - <url> (1-217 bytes)
    {
        txid: '71b69cf5872a3c13f3505f3261d715cc9cd3b5766f1849c830ce1d3741ef947e',
        outputScript:
            '6a026d0a1f68747470733a2f2f692e696d6775722e636f6d2f4a504c695664382e706e67',
        msg: `${opReturn.memo['0a']}|<a href="https://i.imgur.com/JPLiVd8.png">[img]</a>`,
    },
    // 0b - Repost memo - <tx_hash> (32 bytes)<message> (0-184 bytes) - Planned, no example
    // 0c - Post topic msg - <topic_name> (1-214 bytes) <message> (1-[214-len(topic_name)] bytes) - Broken link, no example
    // 0d - Topic follow - <topic_name> (1-214 bytes)
    {
        txid: '97d043dfa32249661f60783751f3823cc6093b3ff5f55e872a908560bbd33267',
        outputScript: '6a026d0d046d656d6f',
        msg: `${opReturn.memo['0d']}|memo`,
    },
    // 0e - Topic unfollow - <topic_name> (1-214 bytes)
    {
        txid: '7696fb35a8741a5962305156da3c29988d01c849e777ca3f497fe1867c769b2e',
        outputScript: '6a026d0e046d656d6f',
        msg: `${opReturn.memo['0e']}|memo`,
    },
    // 10 - Create poll - <poll_type> (1 byte) <option_count> (1 byte) <question> (1-209 bytes)
    {
        txid: '59bcb42861a826d273d56829824fe37a1d1015a5d081805005cf945c52d922e0',
        outputScript: '6a026d10525211f09fa780f09fa780206f7220f09fa7803f',
        msg: `${opReturn.memo['10']}|🧀🧀 or 🧀?`,
    },
    // 13 - Add poll option - <poll_tx_hash> (32 bytes)<option> (1-184 bytes)
    {
        txid: '3ca6715410679041a8308876de34dee369401b958b1395a3e911a74a5cecbb17',
        outputScript:
            '6a026d1320e022d9525c94cf05508081d0a515101d7ae34f822968d573d226a86128b4bc5908f09fa780f09fa780',
        msg: `${opReturn.memo['13']}|🧀🧀`,
    },
    // 14 - Poll vote - <poll_tx_hash> (32 bytes) <comment> (0-184 bytes)
    {
        txid: 'f190a04fe20546c665155a3893359c9cea81ceeee9b08b7e20be9e13e46be7bc',
        outputScript:
            '6a026d1420a79f81c1a84cd207053126ed6f1988c658111a0f2e1f60e1b4a61e5a313180f812446f776e207769746820f09fa780f09fa780',
        msg: `${opReturn.memo['14']}|Down with 🧀🧀`,
    },
    // 16 - Mute user - <address_hash> (20 bytes)
    {
        txid: '6ec6d1e8905aeeb64a94214e614197e65206a71ac08ba45035becbec3f39486e',
        outputScript: '6a026d1614a3d6bd16d38d9d39735256669e989b5a8772c21b',
        msg: `${opReturn.memo['16']}|<a href="https://explorer.e.cash/address/ecash:qz3ad0gk6wxe6wtn2ftxd85cnddgwukzrvtmhuzevg">qz3...evg</a>`,
    },
    // 17 - Unmute user - <address_hash> (20 bytes)
    {
        txid: 'b1fed4caffbe950a5598da8abaaf8a335bfe3344cd8bad1b1a5c0d873c3234a1',
        outputScript: '6a026d1714a3d6bd16d38d9d39735256669e989b5a8772c21b',
        msg: `${opReturn.memo['17']}|<a href="https://explorer.e.cash/address/ecash:qz3ad0gk6wxe6wtn2ftxd85cnddgwukzrvtmhuzevg">qz3...evg</a>`,
    },
    // 24 - Send money - <address_hash> (20 bytes) <message> (1-194 bytes)
    {
        txid: 'ee88a9b759b7db4055dee5b55a97bdc6a4ce04236e5955d6c6cab4aace770f13',
        outputScript:
            '6a026d24140ee6ad00b0d7c7365cceece9c6cf49b60f7e059d1057656c636f6d6520746f204d656d6f21',
        msg: `${opReturn.memo['24']}|<a href="https://explorer.e.cash/address/ecash:qq8wdtgqkrtuwdjuemkwn3k0fxmq7ls9n5hpj9crnf">qq8...rnf</a>|Welcome to Memo!`,
    },
    // 30 - Sell tokens https://github.com/memocash/mips/blob/master/mip-0009/mip-0009.md#specification
    {
        txid: '0caf0d8ec115ab3df173c8788aa82d43bf71bfee8a02070783f489e4d49b1f42',
        outputScript:
            '6a026d305120f93b31760cd076663b77eb1fd6474d49eb57bd4f2f89d09efad973ddb78dfcc702000153080000000000001388',
        msg: `${opReturn.memo['30']}`,
    },
    // 31 - Token buy offer https://github.com/memocash/mips/blob/master/mip-0009/mip-0009.md#specification
    {
        txid: '5ada9b8de24a126ebf5edb3ca1304a22815f0a57e81d91817ed4e4fde413051d',
        outputScript:
            '6a026d3120ad9bbf84ac54432bcd6a94c54059388f50dca4b964543bcfcb35df26e107b6e2512038439850348aaa39dc1ba8782740aa1aa0b69e1b7b46b7410d9a8c12531ee4ed0200045208000000000000000153080000000000004427',
        msg: `${opReturn.memo['31']}`,
    },
    // 32 - Attach token sale signature https://github.com/memocash/mips/blob/master/mip-0009/mip-0009.md#specification
    {
        txid: '841c66cba8c3c26f2175e6080ac1e150fcc44c4d652770622bb9740c67a1c9d0',
        outputScript:
            '6a026d32208d4feb76a2ebbadb77b14bca5eddb712f48bb9220e8cfb30a6dde338be8c81f1483045022100dc72d6781019b8d33c1c9f5af3aad77ebd204dcd52b279226d9a182774fc510302201068f89dd99fde0218eda0a6d8a1abb0d1087615c13d845c4c2b963e19bac154c3',
        msg: `${opReturn.memo['32']}`,
    },
    // 35 - Pin token post - <post_tx_hash> (30 bytes) <token_utxo_hash> (30 bytes) <token_utxo_index> (1 byte)
    {
        txid: '97045151698f94cba92abe536ad62514933b33f28ee0ef2f87b24e227d60672e',
        outputScript:
            '6a026d3520635d1ece418bf7b87f8b78cda684bdfa8e99ff18da6b9a606650c9d7d15d5010208f2f0ab9341cdcbbc3c5dea3e8341b005ec0735919f5d3e952eb7f9fe855f03e020001',
        msg: `${opReturn.memo['35']}`,
    },
    // 99, not a supported code
    {
        txid: 'N/A',
        outputScript: '6a026d99',
        msg: `Unknown memo action`,
    },
];

export default memoFixtures;
