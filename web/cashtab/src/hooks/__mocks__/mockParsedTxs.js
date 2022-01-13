// Expected result of applying parseTxData to mockTxDataWityhPassthrough[0]
export const mockSentCashTx = [
    {
        amountReceived: 0,
        amountSent: 0.000042,
        blocktime: 1614380741,
        confirmations: 2721,
        destinationAddress:
            'bitcoincash:qphpmfj0qn7znklqhrfn5dq7qh36l3vxavu346vqcl',
        height: 674993,
        outgoingTx: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: null,
        tokenTx: false,
        decryptionSuccess: false,
        txid: '089f2188d5771a7de0589def2b8d6c1a1f33f45b6de26d9a0ef32782f019ecf1',
    },
];

export const mockReceivedCashTx = [
    {
        amountReceived: 3,
        amountSent: 0,
        blocktime: 1612567121,
        confirmations: 5637,
        destinationAddress:
            'bitcoincash:qpmytrdsakt0axrrlswvaj069nat3p9s7ct4lsf8k9',
        height: 672077,
        outgoingTx: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: null,
        tokenTx: false,
        decryptionSuccess: false,
        txid: '42d39fbe068a40fe691f987b22fdf04b80f94d71d2fec20a58125e7b1a06d2a9',
    },
];

export const mockSentTokenTx = [
    {
        amountReceived: 0,
        amountSent: 0.00000546,
        blocktime: 1614027278,
        confirmations: 3270,
        destinationAddress:
            'bitcoincash:qzj5zu6fgg8v2we82gh76xnrk9njcregluzgaztm45',
        height: 674444,
        outgoingTx: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: null,
        tokenTx: true,
        decryptionSuccess: false,
        txid: 'ffe3a7500dbcc98021ad581c98d9947054d1950a7f3416664715066d3d20ad72',
    },
];
export const mockReceivedTokenTx = [
    {
        amountReceived: 0.00000546,
        amountSent: 0,
        blocktime: 1613859311,
        confirmations: 3571,
        destinationAddress:
            'bitcoincash:qpmytrdsakt0axrrlswvaj069nat3p9s7ct4lsf8k9',
        height: 674143,
        outgoingTx: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: null,
        tokenTx: true,
        decryptionSuccess: false,
        txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
    },
];
export const mockSentOpReturnMessageTx = [
    {
        amountReceived: 0,
        amountSent: 0,
        blocktime: 1635507345,
        confirmations: 59,
        destinationAddress: undefined,
        height: undefined,
        opReturnMessage: 'bingoelectrum',
        replyAddress: null,
        outgoingTx: false,
        tokenTx: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        decryptionSuccess: false,
        txid: 'dd35690b0cefd24dcc08acba8694ecd49293f365a81372cb66c8f1c1291d97c5',
    },
];
export const mockReceivedOpReturnMessageTx = [
    {
        amountReceived: 0,
        amountSent: 0,
        blocktime: 1635511136,
        confirmations: 70,
        destinationAddress: undefined,
        height: undefined,
        opReturnMessage: 'cashtabular',
        replyAddress: 'ecash:qrxkkzsmrxcjmz8x90fx2uztt83cuu0u254w09pq5p',
        outgoingTx: false,
        tokenTx: false,
        isCashtabMessage: true,
        isEncryptedMessage: false,
        decryptionSuccess: false,
        txid: '5adc33b5c0509b31c6da359177b19467c443bdc4dd37c283c0f87244c0ad63af',
    },
];
