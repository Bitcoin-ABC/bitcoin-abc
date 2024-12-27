# XECX

Summary of XECX payouts

## Background

XECX is a token project that distributes avalanche staking rewards to token holders. The supply of XECX exactly matches an active Avalanche stake.

Every 24 hours, avalanche rewards are divided evenly among XECX holders, less a service fee and tx fee(s).

Some data about the payout event is encoded in an EMPP push to support future analysis.

`minBalanceTokenSatoshisToReceivePaymentThisRound`
XEC txs cannot have an output of less than 546 satoshis at a non-OP_RETURN script. Holders of XECX whose proportional share of daily rewards is less than 546 satoshis are ineligible for a payout. It can be useful to track this parameter over time to have an idea of about how much XECX is needed to ensure payout eligibility.

`eligibleTokenSatoshis`
The supply of XECX that is NOT excluded from this payment round.

`ineligibleTokenSatoshis`
The supply of XECX that is excluded from this payment round.

`excludedHoldersCount`
How many `p2pkh` addresses were excluded from this payment round (for not having a high enough balance to earn more than dust).

## Approach

1. Lokad ID `58454358`, `strToBytes(XECX);`
2. A version byte (currently always `0`)
3. `minBalanceTokenSatoshisToReceivePaymentThisRound` as a `u64`
4. `eligibleTokenSatoshis` as a `u64`
5. `ineligibleTokenSatoshis` as a `u64`
6. `excludedHoldersCount` as a `u16`

### Example

XECX payout txs are currently sent every day from `ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79`

1. https://explorer.e.cash/tx/1167821e140eaf7b4b35a71619a6cbd44a38f29aab9b523dd5d941be18ee18b0

OP_RETURN: `6a501f5845435800a42d2300000000000e21fdc39e01000000000000000000000000`

```
{
  minBalanceTokenSatoshisToReceivePaymentThisRound: 2305444,
  eligibleTokenSatoshis: 1781404606734,
  ineligibleTokenSatoshis: 0,
  excludedHoldersCount: 0
}
```

2. https://explorer.e.cash/tx/ca7057d9d878e17d105a732d723c84e10156c61627c9e4330e15a0dfe5ab37a5

OP_RETURN: `6a501f584543580008c43400000000000e21fdc39e01000000000000000000000000`

```
{
  minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
  eligibleTokenSatoshis: 1781404606734,
  ineligibleTokenSatoshis: 0,
  excludedHoldersCount: 0
}
```

3. https://explorer.e.cash/tx/49dd09d830d0dfc7f41d9e4357cd85e092aae0221f97e5d19830ed2a749d2184

OP_RETURN: `6a501f58454358000feb830000000000e0d6bdc29e0100002e4a3f01000000000400`

```
{
  minBalanceTokenSatoshisToReceivePaymentThisRound: 8645391,
  eligibleTokenSatoshis: 1781383681760,
  ineligibleTokenSatoshis: 20924974,
  excludedHoldersCount: 4
}
```
