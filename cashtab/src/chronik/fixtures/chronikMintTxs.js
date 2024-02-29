// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const mintingTxTabCash = {
    txid: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                outIdx: 2,
            },
            inputScript:
                '483045022100e28006843eb071ec6d8dd105284f2ca625a28f4dc85418910b59a5ab13fc6c2002205921fb12b541d1cd1a63e7e012aca5735df3398525f64bac04337d21029413614121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            value: '91048',
            sequenceNo: 4294967295,
            slpBurn: {
                token: {
                    amount: '0',
                    isMintBaton: false,
                },
                tokenId:
                    'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
            },
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
        },
        {
            value: '546',
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            slpToken: {
                amount: '100',
                isMintBaton: false,
            },
            spentBy: {
                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                outIdx: 1,
            },
        },
        {
            value: '546',
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            slpToken: {
                amount: '0',
                isMintBaton: true,
            },
        },
        {
            value: '89406',
            outputScript: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            spentBy: {
                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
        },
        genesisInfo: {
            tokenTicker: 'TBC',
            tokenName: 'tabcash',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
        },
    },
    block: {
        height: 674143,
        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
        timestamp: '1613859311',
    },
    timeFirstSeen: '0',
    size: 336,
    isCoinbase: false,
    network: 'XEC',
};
export const mintingHash160TabCash = 'b8d9512d2adf8b4e70c45c26b6b00d75c28eaa96';
export const mintingAddressBchFormatTabCash =
    'bitcoincash:qzudj5fd9t0cknnsc3wzdd4sp46u9r42jcnqnwfss0';
export const mintingAddressTabCash =
    'etoken:qzudj5fd9t0cknnsc3wzdd4sp46u9r42jcynw8ydj0';

export const mintingTxPoW = {
    txid: 'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '33938d6bd403e4ffef94de3e9e2ba487f095dcba3544ac8fad4a93808cea0116',
                outIdx: 1,
            },
            inputScript:
                '483045022100dad1d237b541b4a4d29197dbb01fa9755c2e17bbafb42855f38442b428f0df6b02205772d3fb00b7a053b07169e1534770c091fce42b9e1d63199f46ff89856b3fc6412102ceb4a6eca1eec20ff8e7780326932e8d8295489628c7f2ec9acf8f37f639235e',
            outputScript: '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
            value: '49998867',
            sequenceNo: 4294967295,
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c500001010747454e4553495303504f571850726f6f666f6657726974696e672e636f6d20546f6b656e2168747470733a2f2f7777772e70726f6f666f6677726974696e672e636f6d2f32364c0001004c000800000000000f4240',
        },
        {
            value: '546',
            outputScript: '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
            slpToken: {
                amount: '1000000',
                isMintBaton: false,
            },
            spentBy: {
                txid: '69238630eb9e6a9864bf6970ff5d326800cea41a819feebecfe1a6f0ed651f5c',
                outIdx: 1,
            },
        },
        {
            value: '49997563',
            outputScript: '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
            spentBy: {
                txid: '3c665488929f852d93a5dfb6e4b4df7bc8f7a25fb4a2480d39e3de7a30437f69',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
        },
        genesisInfo: {
            tokenTicker: 'POW',
            tokenName: 'ProofofWriting.com Token',
            tokenDocumentUrl: 'https://www.proofofwriting.com/26',
            tokenDocumentHash: '',
            decimals: 0,
        },
    },
    block: {
        height: 685949,
        hash: '0000000000000000436e71d5291d2fb067decc838dcb85a99ff6da1d28b89fad',
        timestamp: '1620712051',
    },
    timeFirstSeen: '0',
    size: 329,
    isCoinbase: false,
    network: 'XEC',
};
export const mintingHash160PoW = '85bab3680833cd9b3cc60953344fa740a2235bbd';
export const mintingAddressBchFormatPoW =
    'bitcoincash:qzzm4vmgpqeumxeuccy4xdz05aq2yg6mh52phz3zy5';
export const mintingAddressPoW =
    'etoken:qzzm4vmgpqeumxeuccy4xdz05aq2yg6mh5aj2tulx5';

export const mintingTxAlita = {
    txid: '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '72eeff7b43dc066164d92e4c3fece47af3a40e89d46e893df1647cd29dd9f1e3',
                outIdx: 0,
            },
            inputScript:
                '473044022075166617aa473e86c72f34a5576029eb8766a035b481864ebc75759155efcce00220147e2d7e662123bd728fac700f109a245a0278959f65fc402a1e912e0a5732004121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            value: '1000',
            sequenceNo: 4294967295,
        },
        {
            prevOut: {
                txid: '46b6f61ca026e243d55668bf304df6a21e1fcb2113943cc6bd1fdeceaae85612',
                outIdx: 2,
            },
            inputScript:
                '4830450221009e98db4b91441190bb7e4745b9f249201d0b54c81c0a816af5f3491ffb21a7e902205a4d1347a5a9133c14e4f55319af00f1df836eba6552f30b44640e9373f4cabf4121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            value: '750918004',
            sequenceNo: 4294967295,
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c500001010747454e4553495305416c69746105416c6974610a616c6974612e636173684c0001044c00080000befe6f672000',
        },
        {
            value: '546',
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            slpToken: {
                amount: '210000000000000',
                isMintBaton: false,
            },
            spentBy: {
                txid: '2c336374c05f1c8f278d2a1d5f3195a17fe1bc50189ff67c9769a6afcd908ea9',
                outIdx: 1,
            },
        },
        {
            value: '750917637',
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            spentBy: {
                txid: 'ca70157d5cf6275e0a36adbc3fabf671e3987f343cb35ec4ee7ed5c8d37b3233',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
        },
        genesisInfo: {
            tokenTicker: 'Alita',
            tokenName: 'Alita',
            tokenDocumentUrl: 'alita.cash',
            tokenDocumentHash: '',
            decimals: 4,
        },
    },
    block: {
        height: 756373,
        hash: '00000000000000000d62f1b66c08f0976bcdec2f08face2892ae4474b50100d9',
        timestamp: '1662611972',
    },
    timeFirstSeen: '1662611666',
    size: 436,
    isCoinbase: false,
    network: 'XEC',
};
export const mintingHash160Alita = 'f5f740bc76e56b77bcab8b4d7f888167f416fc68';
export const mintingAddressBchFormatAlita =
    'bitcoincash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqf8w5lusm';
export const mintingAddressAlita =
    'etoken:qr6lws9uwmjkkaau4w956lugs9nlg9hudq75najpjm';

export const mintingAddressBchFormatBuxSelfMint =
    'bitcoincash:qzzjdnmph2s8z5vf0vqpvr24tfue5krkdsnh48utfn';
export const mintingAddressBuxSelfMint =
    'etoken:qzzjdnmph2s8z5vf0vqpvr24tfue5krkdsyygw3ktn';
export const mintingHash160BuxSelfMint =
    '8526cf61baa07151897b00160d555a799a58766c';
export const mintingTxBuxSelfMint = {
    txid: 'c1eeede277658dfbf69f96feb1576c6cbb4f979a3026c371d3672fac5b876056',
    version: 1,
    inputs: [
        {
            prevOut: {
                txid: 'f9c2812290dc2328b02ac75e971dbfae7c86dccc2acd1a132cc4a4aa09e03f1a',
                outIdx: 590,
            },
            inputScript:
                '4199c7c743428f1fa40496da8c715a0c07b6efc6c067010a1577083a1e68551e7c9a66f7eb4d9f42c2d15dba641ca0d8d2a3b2b15121ebba51da380c5e034af808412102897c9d315d70c7d84f2b4ddf80623c14b03ca365f88c34d3705d3f26614e9c1d4d0f010100000082b18043d5fda9bdfe01e832ed93cea0333be9da8948b27b71469b6b4efdfe1b752adad0a7b9ceca853768aebb6965eca126a62965f698a0c1bc43d83db632ad1a3fe009aaa4c42c131acd2accdc867caebf1d975ec72ab02823dc902281c2f94e020000726e01247f7576567901687f7501447f77887c76014e7f7701147f755779a9880284007f757e537a7c21027e6cf8229495afadcb5a7e40365bbc82afcf145eacca3193151e68a61fc81743bb527a76820128947f7c547f7701207f75537aaa8801207f757baa88a86f7b828c7f757c7bbb75acfc08000000000000ffffffffe775acb81af19a90bc586b40c64bee792daa010dea0fce2989b9de1a4ad412a30000000041000000473045022100cf4296727eeebaac8bcae5c67abee0e48b9f86fe577e0d370133fc0ccd23d6b5022018fe1ac98fd312f223ac5ca97bdf3f0bd8d94527099dacdecf841b283d7b01324c840000000000000000396a04534c50000101044d494e54207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50102080000000000072bf022020000000000001976a9148526cf61baa07151897b00160d555a799a58766c88ac220200000000000017a91420d151c5ab4ca4154407626069eaafd8ce6306fc87481a3fe009aaa4c42c131acd2accdc867caebf1d975ec72ab02823dc902281c2f94e020000365a97e65945869279dc943f86cc1cbc81febdf67313c0c2cdfefcb117cceff5020000004c726e01247f7576567901687f7501447f77887c76014e7f7701147f755779a9880284007f757e537a7c21027e6cf8229495afadcb5a7e40365bbc82afcf145eacca3193151e68a61fc81743bb527a76820128947f7c547f7701207f75537aaa8801207f757baa88a86f7b828c7f757c7bbb75ac',
            outputScript: 'a9144d80de3cda49fd1bd98eb535da0f2e4880935ea987',
            value: '2300',
            sequenceNo: 4294967295,
        },
        {
            prevOut: {
                txid: 'f5efcc17b1fcfecdc2c01373f6bdfe81bc1ccc863f94dc7992864559e6975a36',
                outIdx: 2,
            },
            inputScript:
                '412dd1c2c1f5daece7ddbfafd7b83726427941db3bf12f89a872632732f7fcecd7e9df8e41258e5ab7b19e05d0a2cd3a914090088cdd5818a72596810e7d5ec0f6412102897c9d315d70c7d84f2b4ddf80623c14b03ca365f88c34d3705d3f26614e9c1d4d03010100000082b18043d5fda9bdfe01e832ed93cea0333be9da8948b27b71469b6b4efdfe1b752adad0a7b9ceca853768aebb6965eca126a62965f698a0c1bc43d83db632ad365a97e65945869279dc943f86cc1cbc81febdf67313c0c2cdfefcb117cceff502000000666e01247f757c76014e7f7701147f755779a9880284007f757e537a7c21027e6cf8229495afadcb5a7e40365bbc82afcf145eacca3193151e68a61fc81743bb527a76820128947f7c547f7701207f75537aaa8801207f757baa88a86f7b828c7f757c7bbb75ac2202000000000000ffffffffe775acb81af19a90bc586b40c64bee792daa010dea0fce2989b9de1a4ad412a30000000041000000473045022100cf4296727eeebaac8bcae5c67abee0e48b9f86fe577e0d370133fc0ccd23d6b5022018fe1ac98fd312f223ac5ca97bdf3f0bd8d94527099dacdecf841b283d7b01324c840000000000000000396a04534c50000101044d494e54207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50102080000000000072bf022020000000000001976a9148526cf61baa07151897b00160d555a799a58766c88ac220200000000000017a91420d151c5ab4ca4154407626069eaafd8ce6306fc87481a3fe009aaa4c42c131acd2accdc867caebf1d975ec72ab02823dc902281c2f94e020000365a97e65945869279dc943f86cc1cbc81febdf67313c0c2cdfefcb117cceff5020000004c666e01247f757c76014e7f7701147f755779a9880284007f757e537a7c21027e6cf8229495afadcb5a7e40365bbc82afcf145eacca3193151e68a61fc81743bb527a76820128947f7c547f7701207f75537aaa8801207f757baa88a86f7b828c7f757c7bbb75ac',
            outputScript: 'a91420d151c5ab4ca4154407626069eaafd8ce6306fc87',
            value: '546',
            sequenceNo: 4294967295,
            slpToken: {
                amount: '0',
                isMintBaton: true,
            },
        },
    ],
    outputs: [
        {
            value: '0',
            outputScript:
                '6a04534c50000101044d494e54207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50102080000000000072bf0',
        },
        {
            value: '546',
            outputScript: '76a9148526cf61baa07151897b00160d555a799a58766c88ac',
            slpToken: {
                amount: '470000',
                isMintBaton: false,
            },
            spentBy: {
                txid: '3f14af158be922cc9c5328b6075be7ab528cea9464e8b3fca253f442541b9769',
                outIdx: 0,
            },
        },
        {
            value: '546',
            outputScript: 'a91420d151c5ab4ca4154407626069eaafd8ce6306fc87',
            slpToken: {
                amount: '0',
                isMintBaton: true,
            },
        },
    ],
    lockTime: 0,
    slpTxData: {
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'MINT',
            tokenId:
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
        },
    },
    block: {
        height: 763770,
        hash: '000000000000000009ecc653951db1cc89172c3f43daf48cd01bb5e0429d12b9',
        timestamp: '1667043609',
    },
    timeFirstSeen: '1667043013',
    size: 1742,
    isCoinbase: false,
    network: 'XEC',
};
