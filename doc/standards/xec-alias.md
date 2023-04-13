# XEC Aliases

A serverless way to register user-selected address aliases.

## Background

Addresses are a robust yet user-unfriendly way to direct crypto payments. Giving users the option to choose a custom address would create the type of user experience more familiar in traditional apps and financial tools.

[CashAccounts](https://gitlab.com/cash-accounts/specification/-/blob/master/SPECIFICATION.md) are a technically sound solution to this problem. However, little traction has developed with users.

Ethereum's [ENS](https://ens.domains/), meanwhile, continues to enjoy tremendous success. ENS created its own token economy (valued at just under $300 million as of December 2022). The [ENS Airdrop](https://www.coindesk.com/business/2021/11/09/ethereum-name-service-tokens-soar-after-500m-airdrop/) rewarded users with 5 figure USD gains.

Key differences between ENS and CashAccounts:

1. ENS domains are unique and fully customizable. CashAccounts come with a number, and names are not unique.

2. ENS domains are owned by users and may be easily bought and sold. A competitive market has developed around trading ENS domains. CashAccounts are permanently tied to the registering user. Even if the infrastructure to sell them were readily available, selling CashAccounts would require perfect trust between buyers and sellers.

## Approach

In developing an alias system for XEC, it would be nice to preserve the simplicity (and permanence) of registration found in CashAccounts.

Features proven popular in ENS, like fully customizable registration and market tradeability, should be implemented.

## Implementation

XEC aliases will be implemented in phases.

Phase 1

-   Fully customizable aliases between 1 and 21 characters
-   Aliases are permanently tied to their registering address

Phase 2

-   NFT airdrop to existing holders
-   Tradeable aliases; aliases tied to NFT possession

### Phase 1 details

Aliases are registered by paying a registration fee to a designated registration address. The registration fee is determined by the number of characters in the alias, with shorter aliases having a higher fee. Aliases may be between 1 and 21 characters.

Registration fees may change during Phase 1. This change may be enforced by verifying the correct fee against registration blockheight.

Registration transactions are broadcast from the address associated with the new alias. A registration address may have many aliases. Each alias maps to one and only one address.

This protocol adheres to the eCash OP_RETURN Prefix Guidelines and uses the 2E786563 protocol identifier, which must be pushed with the 0x04 opcode.

To be valid, an alias registration transaction must:

-   Be a valid eCash transaction with 1 confirmation
-   Include an OP_RETURN field with valid alias prefix and an alias between 1 and 21 characters in length, inclusive. Note: alias length and associated fee is determined by the number of bytes taken to store the alias in the OP_RETURN field of the registration transaction, and not the number of characters rendered by most front-ends. For example, emojis are typically 4 bytes in length and would thus be 4-character aliases, even if they may be rendered as one character.
-   Pay a valid fee for the associated character length and block height
-   Have the lowest blockheight of any other alias registration transaction for the same alias
-   Not have case-conflicts with any previously registered alias. For example, if someone registers "examplealias," then "ExampleAlias" or "EXAMPLEALIAS" may not be registered in the future.
-   When the same alias is registered in the same block by different addresses, the valid alias will be determined by the registration with the alphabetically first txid.

A valid transaction registers the address at the 0 index of the tx inputs to the alias in the OP_RETURN.

Invalid transactions may have the registration fee refunded to the address at the 0 index of the tx inputs.

### The Registration Address

Registration fees are paid to a single address. This address will be polled via the chronik client for its transaction history, whereby incoming txs are parsed for valid registration txs. Since the transaction history of this address cannot change, wallets supporting this alias system may cache valid aliases up to a known blockheight to minimize on-chain polling.

The designated registration address will either be the IFP address or an address that periodically sends funds from valid registrations to the IFP address. Automatically processing hot wallet refunds for invalid transactions would not be feasible from the IFP address.

### Valid Alias Inputs

The intent of the alias feature is to get away from some of the clunkiness of addresses. One issue with addresses is that they are human unreadable and thus must always be copy pasted to ensure accuracy.

If one alias can be human indistinguishable from another alias, then all aliases will also be copy-paste only inputs.

In the initial release of this feature, aliases are limited to lowercase alphanumeric characters (a-z, 0-9) to mitigate edge cases such as zero-width spaces and language specific character similarities.

### Reserved Aliases

A list of reserved Aliases should be defined which are not available for registration. These include trademarks as well as mitigation for common phishing websites and scammer usernames. For reference, Cashtab maintains such a reserved list via the `reservedAliases` array in `/Common/Ticker.js`.

As a matter of efficiency, the logic to check whether an alias is reserved should occur before checking local cache or onchain data to see whether the alias has been registered or not.

### Known risks

Resolving conflicting alias registrations at the same blockheight by choosing the alphabetically first txid is arbitrary. It would be possible for someone to watch for broadcast registration transactions, send multiple transactions registering the same alias, and have a good chance of securing the alias before the original registrant.

However, such an attack runs the risk of forfeiting multiple registration fees. In a sense, labeling such behavior "attack" is dubious.

The intent of Phase 1 is to determine popularity and viability of the system overall. If the system gains traction, a more sophisticated, extensible, and decentralized system may be rolled out by airdropping NFTs to registrants. If the system is unpopular, it may remain a single address permanent database.

Phase 1 is rolled out using the blockchain instead of a server so that the registrations may be permanent, even if the system later becomes unmaintained.

### Extensibility

Permanently tying an alias to a single address is not the desired endpoint for the system. Payment codes, support for HD wallets, and other novel ways of adding additional privacy and security into the system are all desired features. Since most of the technology for these features is either unavailable or not in current use, this will not be supported in Phase 1. Lessons learned from practical implementation of Phase 1 will support extensible implementation in Phase 2.
