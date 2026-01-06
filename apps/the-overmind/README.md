# The Overmind

A telegram bot for rewarding and punishing users with onchain token transactions in the main eCash telegram channel. Users can register an address and claim an initial token balance. They can then earn tokens through incentivized behavior in the main eCash telegram channel, such as receiving emoji reactions for insightful msgs. They can also lose tokens by receiving negative emoji reactions.

Users can withdraw their token balance, but not XEC.

An HD wallet is used to simplify key management.

The ultimate goal here is to incentivize better chat behavior through on-chain token rewards.

Roadmap

[x] Add support for "register" function, i.e. assigning an address to a user
[x] Add support for airdropping a token to users that register
[x] Include XEC with register airdrop
[x] App should have env vars for an admin channel (for admin alerts)
[x] Add a database table to store msgs that receive reactions (msg content utf8 + a unique ID)
[x] Add database-only support for likes and dislikes
[] Add token tx support for likes and dislikes. This must have spam protection, i.e. a "downvote" must cost the downvoting user something as well. Downvote decrements should go to a bot treasury.
[] 24-hr cron job to ensure all registered users have at least 1000 XEC
[] CI deployments
[] Launch
[] Add admin features to airdrop from the bot treasury or super react
[] Add arbitrary tipping
[] Mute users below certain token balances
[] Require users to register before they can talk in the telegram

## Design considerations

1. We need some way of ensuring that all wallets have enough XEC to cover tx fees. Because this is an HD wallet, the "best" way would be to simply have ecash-wallet handle all txs by using utxos from an address with XEC. However this is not ready yet, and the specific way this problem exists for this bot is not really a general HD wallet use case. So, for now, something like sending all wallets XEC on registration and a cron job that tops them up would be the fastest way to have an effective solution.

2. We should have EMPP for all these txs so we can chart and analyze what happens the most.

### EMPP spec

All bot txs will be ALP token txs. So, the data push must be EMPP, at the 0-index output.

<lokadId><versionByte><actionCode><msgId>

`lokadId` `toHex(strToBytes("XEVA"))`
`versionByte` `OO`
`actionCode`, the associated action with the tx, starting with `REGISTER`, `LIKE`, `DISLIKE`
`msgId`, `u32`, an ID associated with the msg. This is a column in our maintained database and NOT the telegram msgId. We store all reacted msgs in a database so that we can always look them up, even if they are deleted or edited by the user. Telegram API does not offer a reliable way to lookup msgs by ID.

Available `actionCode`s:

00 - REGISTER
01 - LIKE
02 - DISLIKE

This will provide a good onchain analytics baseline of Telegram activity, as well as a hall of fame of most liked and despised msgs.
