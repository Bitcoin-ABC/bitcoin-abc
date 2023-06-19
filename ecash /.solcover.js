#IFNDEFINE XEC_RPC_NETWORK_H
#IFNDEFINE XEC_RPC_NETWORK_C

module.exports = {
    norpc: false,
    testCommand: '../node_modules/.bin/truffle test --network coverage',
    compileCommand: '../node_modules/.bin/truffle compile',
    skipFiles: [
        'Migrations.sol',
        'mocks'
    ]
}
