# ecash-herald

A telegram bot to broadcast eCash chain activity

## development

To monitor the blockchain and send messages with your own telegram bot:

1. `pnpm i`
2. `cp secrets.sample.js secrets.js`
3. Get telegram bot API keys from https://t.me/BotFather
4. Create your own Telegram channel and invite your bot there.
5. Fill out `secrets.ts` with information for your telegram bot and channel
6. `npx tsx index.ts` (or `pnpm run build`, then `node dist/index.js`)

## working on the app

Because app performance is ultimately tied to the aesthetic readout of generated msgs, the actual format of generated messages must also be reviewed.

1. Get telegram bot API keys from https://t.me/BotFather
2. `cp secrets.sample.ts secrets.ts` and fill out with your Telegram bot information
3. To test changes to the app, run `pnpm run generateMock`. This will build and broadcast telegram msg strings for a mocked block containing txids listed in `scripts/generateMock`.
4. If your diff includes new features that are not covered by this mocked block, add relevant txids to the `txids` array in `scripts/generateMock.js`. You may also need to update `outputscriptInfoMap` and `tokenInfoMap` in `test/mocks/block.js`.
5. If test messages look good, run `pnpm test` to confirm all unit tests still pass
6. Run `pnpm run sendMsgByBlock <blockheight>` to review a msg for a specific block using live API calls
7. Run `pnpm getDailySummary` to review txs from the last 24 hrs
