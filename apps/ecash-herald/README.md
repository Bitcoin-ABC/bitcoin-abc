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

## working on the app

Because app performance is ultimately tied to the aesthetic readout of generated msgs, the actual format of generated messages must also be reviewed.

To test changes to the app, run `npm run generateMocks`. This will build telegram msg strings for the blocks in `scripts/generateMocks`.

If you have no errors, run `npm run generateMocks true` to overwrite `test/mocks/blocks.js`. Then:

`npm test` to see if all edge cases not in the test blocks are covered.
`npm run sendTestTgMsgs` and review msgs of test blocks for expected appearance and formatting
`npm run sendMsgByBlock <blockheight>` to review a msg for a specific block
