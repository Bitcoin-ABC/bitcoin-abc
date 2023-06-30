# ecash-herald

A telegram bot to broadcast ecash chain activity

## development

To monitor the blockchain and send messages with your own telegram bot:

1. `npm i`
2. `cp secrets.sample.js secrets.js`
3. Get telegram bot API keys from https://t.me/BotFather
4. Create your own Telegram channel and invite your bot there.
5. Fill out `secrets.js` with information for your telegram bot and channel
6. `node index.js`

## features

-   Send messages when new blocks are found with total number of txs in block
-   Show the total number of eToken txs in new blocks
-   Blocks with eToken genesis txs will include a short description of the newly minted eToken

## potential features

[] Parse coinbase script to match with miner
[] Genesis tx description should link to explorer txid
[] Parse OP_RETURN msgs
[] Parse eToken txs and summarize
[] Parse conventional txs and summarize
