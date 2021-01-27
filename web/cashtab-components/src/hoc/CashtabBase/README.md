# Cashtab Base (HOC)

The base life-cycle and state methods for Cashtab functionality and integration.  
Cashtab buttons and badges get wrapped in this Higher Order Component (HOC), which provides it with the key functions and state to deal with Cashtab Payments.

## What it does

-   Fetch and update prices
-   handleClick functionality
-   Handle OP_RETURN
-   Mounting setup
-   Unmounting cleanup
-   Watch address
-   Repeatable

### Fiat Pricing

if props `currency` and `price` are entered, the real world fiat currency to BCH price will be computed and automatically set

### Token Pricing

if props `coinType` and `amount` are entered that amount of the chosen `coinType` token/coin will be used as payment.

#### SLP pricing

if `coinType === 'SLP'` and `tokenID` is valid SLP token ID, then `amount` will refer to the amounf of that token to send.
