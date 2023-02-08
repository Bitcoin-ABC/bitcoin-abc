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
[] Handle duplicate alias registrations at different blockheights
[] Handle duplicate alias registrations in the same blockheight
[] unit tests for getAliases function
[] **Database**
[] **API endpoints**

## Development

1. Copy `config.sample.js` to `config.js` and update parameters

`cp config.sample.js config.js`

2. Run `index.js` to test current functionality

`node index.js`

## Production
