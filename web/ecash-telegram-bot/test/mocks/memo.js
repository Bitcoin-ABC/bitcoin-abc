const config = require('../../config');
module.exports = [
    // Set name
    {
        txid: '753e29e81cdea12dc5fa30ca89049ca7d538d4062c4bb1b19ecf2a209a3ac8d9',
        action: config.opReturn.memo['01'],
        outputScript: '6a026d0106746573742032',
        parsed: `${config.opReturn.memo['01']}|test 2`,
    },
    // Post memo
    {
        txid: 'c7e91099923a28cf86685c9683c74c8c029c8965a5039f84ad79886b42720f9b',
        action: config.opReturn.memo['02'],
        outputScript:
            '6a026d02374c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c6974',
        parsed: `${config.opReturn.memo['02']}|Lorem ipsum dolor sit amet, consectetur adipiscing elit`,
    },
    // Reply to memo, parsing not yet fully supported
    {
        txid: '28f3ec1f134dc8ea2e37a0645774fa2aa19e0bc2871b6edcc7e99cd86d77b1b6',
        action: config.opReturn.memo['03'],
        outputScript:
            '6a026d0320965689bc694d816ab0745b501c0e9dc8dbe7994a185fe37a37b808dc6b05750a4c8546726f6d20776861742049276d20676174686572696e672c206974207365656d73207468617420746865206d656469612077656e742066726f6d207175657374696f6e696e6720617574686f7269747920746f20646f696e672074686569722062696464696e67206173206120636f6c6c656374697665204e504320686976656d696e6421',
        parsed: `${config.opReturn.memo['03']}|�V��iM�j�t[P\u001c\u000e����J\u0018_�z7�\b�k\u0005u\n|From what I'm gathering, it seems that the media went from questioning authority to doing their bidding as a collective NPC hivemind!`,
    },
];
