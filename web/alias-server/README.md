# alias-server

A node backend for validating eCash alias registrations

## To-do

[x] Template node app
[x] Install chronik and add function for getting tx history
[x] Timestamped logging

[x] **Alias parsing functions and unit tests**
[x] getAliases function
[x] util function getAddressFromHash160
[x] return addresses in parseAliasTx
[x] Complete getAliases function
[x] Refactor alias functions to accept constants as inputs, so unit tests can test different fees and addresses
[x] Handle duplicate alias registrations at different blockheights
[x] Handle duplicate alias registrations in the same blockheight
[x] unit tests for getAliases function
[x] Mocks and unit tests for sorting function
[x] Mocks with unconfirmed aliases
[x] Mocks with unconfirmed and conflicting alias registrations

[] **Database**
[x] Initialize MongoDB
[x] Insert alias info into db
[x] Improve insert logic so that only aliases that are not already in the database are inserted

[] **App**
[] Connect to chronik websockets for blocks and txs at registration address
[] Functions to update database on new txs
[] Finalize unit test matching with Cashtab

[] **API endpoints**
[] Make alias info available at endpoint
[] Add validBlockheight to endpoint result, so user can know given aliases are valid up to a certain blockheight

[] **Deployment**
[] Update README
[] CI

[] **Other Features**
[] pendingAlias database logic (entries must be removed after they exist in validAliasTxs)

## Requirements

You will need a local instance of MongoDB. See installation instructions [here](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/).

## Development

Run `index.js` to test current functionality

`node index.js`

Run `db.js` to test database functionality.

1. Install `mongodb`
2. `sudo systemctl start mongod`
3. `node db.js` and confirm data is successfully written.

## Production
