# Trollbox

A spec for on-chain discussions about an agora offer (or any tokenId)

## Background

Trollboxes are a legacy crypto feature that were popular when trading was less professionalized. With eCash again on the frontier, we can bring this back.

Advantages to doing it on-chain

-   We can index these txs with a chronik plugin, making it easy to see messages related to a particular token
-   We can enforce a fee to reduce spam and make the Cashtab faucet self-sustaining
-   We can identify trollbox messages from token creators
-   We can use chronik's `timeFirstSeen` to accurately arrange msg order
-   Trollbox messages are associated with a sending address, so the token minter can reward messages with XEC or tokens

## Approach

Trollbox msgs are on-spec if they meet the following criteria.

Messages are pushdata in eMPP, where the pushed bytes have the following form:

1. Lokad ID `54424f58`, `strToBytes(TBOX);`
2. A version byte (currently always `0`)
3. A message type byte (currently `0`, a standard utf8 message)
4. 32 bytes for the `tokenId` (little-endian) (e.g. `aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1`)
5. The remaining bytes are the utf8 message

Only the first pushdata of that form is processed, all others are to be ignored.

We keep the `tokenId` after the message type because we could (conceivably) omit the `tokenId` from some types of messages. For example, if we add this kind of EMPP message to an ALP token buy, we could potentially get the `tokenId` from other details in the tx.

So, for version 0:

`OP_RETURN OP_RESERVED "<LOKAD ID:[u8;4]><version:u8><message type:u8><token ID:[u8;32]><utf8 message:[u8]>"`

All fields are required.

While the spec includes any tx that meets the above conditions, developers may choose to filter trollbox messages with other rules.

Planned Cashtab implementation:

1. Cashtab will only render trollbox txs that include an output of 4200 satoshis to address `ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l` (the Cashtab faucet). Such txs will be created automatically in Cashtab's UI.
2. Trollbox messages that include any utxo input from the token's genesis address will be flagged with a "creator" icon.
3. The token's genesis address is defined as the 0-index input of the token's genesis tx.

### Example

Commenting on the merits of a token's price

`6a506f54424f580000055fbac9fc2170675867b3466868b1523d69dcbeee0b3fa2b5dc1850f2fd19676120666577207472696c6c696f6e20646f6c6c61727320666f72207468697320746f6b656e207365656d73206b696e64612073746565702062757420c2af5c5f28e38384292a2fc2af`

Breaking this down:

`6a` - OP_RETURN
`50` - OP_RESERVED, signifying EMPP encoding
`6f` - hex 111, the size of this EMPP push in bytes
`54424f58` - lokad, ascii `TBOX`
`00` - version byte, 0
`00` - message type, 0
`055fbac9fc2170675867b3466868b1523d69dcbeee0b3fa2b5dc1850f2fd1967` - tokenId
`6120666577207472696c6c696f6e20646f6c6c61727320666f72207468697320746f6b656e207365656d73206b696e64612073746565702062757420c2af5c5f28e38384292a2fc2af` - utf8 msg, "a few trillion dollars for this token seems kinda steep but ¯\_(ツ)\*/¯"
