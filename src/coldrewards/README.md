# Cold Rewards System Description

=============

- Copyright (c) 2019 The DeVault developers
- Copyright (c) 2019 Jon Spock
- Distributed under the MIT software license, see http://www.opensource.org/licenses/mit-license.php.



# Constants
---------------------

This is a list of constants used in this system

* BlocksPerYear
* PerCentPerYear 
* COLDREWARD_MIN_BLOCKS  - Rewards occur no more frequently than this
* COLDREWARD_MIN_BALANCE = 100 * COIN
* COLDREWARD_MAX_REWARD = 10000 * COIN
* COLDREWARD_MIN_REWARD =  COIN  - Only pay out reward if it's bigger than this

# Description
---------------------

Cold Rewards pays out coins to unspent transactions (UTXOs) that are greater than a minimum (**COLDREWARD_MIN_REWARD** coins) and are older than approximately one month (**COLDREWARD_MIN_BLOCKS** number of blocks). NOTE: Addresses are not evaluated by total amounts, each separate UTXO is considered.

These unspent transaction must come from regular transactions. Either miner rewards or previous cold rewards will not counted - as coinbase outputs are ignored.

At each block all of the valid UTXOs will be evaluated for possible reward payout. We use a concept of "differential" height to determine viability. The "differential" height is the different between the current block number and either 1) the block number when this UTXO was created or 2) the block number when this UTXO last got a rewards payout. That is, for the 1st payout, we will use 1) and afterwards 2). The coin address that will be rewarded will be the one with the biggest differential height, provided that the calculated reward is greater than (**COLDREWARD_MIN_REWARD**).

TODO: If multiple UTXOs have the same differential height, the largest (or smallest?) one will get paid out (unsorted values could cause problems)

In addition there is a limit of **COLDREWARD_MAX_REWARD** on the payout, to avoid people putting too much at one address (may help against exchange cold wallets accumulating) and also causing huge amounts of coins to be created in any one block. If people hit this limit they can simply move coins to another addresses/UTXO.

# Payout Amount
---------------------

**PerCentPerYear** determines the effective rate of return for payouts over 1 year. By dividing this by **BlocksPerYear** we'd get the return per block (as a very small number). We then multiply this by the "differential" height mentioned before to get the fractional return. We multiply by the balance at this UTXO to get the actual reward. Finally we quantize the reward to 1/10ths of a COIN for accounting simplicity and make sure it's greater than **COLDREWARD_MIN_REWARD** to be considered valid.

# Invalidating Rewards
---------------------

For a given UTXO, once rewards are considered valid (given conditions already mentioned), they will be continued to be paid out as long as the UTXO itself is not spent. Once the UTXO is spent, rewards will cease.
This mechanism allows you to collect rewards and spend the actual rewards themselves since they will be at new UTXOs that will not be considered valid for rewards. To do that, you can use "Coin Control" feature within the wallet. If you want the rewards to earn rewards in return, you'd also need to use coin control to send the rewards using a regular transaction to any one of the addresses under your control. However, keep in mind that UTXOs considered valid must have more than **COLDREWARD_MIN_BALANCE** amounts. If you have more than that amount at one address but they are spread out across many UTXOs, you may not get rewards at all. You can use coin control to view your UTXO holdings. 











