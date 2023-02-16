# alias-server

A node backend for validating eCash alias registrations

## To-do

[x] Template node app
[x] Install chronik and add function for getting tx history
[x] Timestamped logging
[] **Match Cashtab alias functions and unit tests**
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
[] Initialize MongoDB
[] **API endpoints**

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
