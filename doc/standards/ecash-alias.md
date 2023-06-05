# eCash Aliases

A serverless way to register user-selected address aliases.

## Background

Addresses are a robust yet user-unfriendly way to direct crypto payments. Giving users the option to choose a custom address would create the type of user experience more familiar in traditional apps and financial tools.

[CashAccounts](https://gitlab.com/cash-accounts/specification/-/blob/master/SPECIFICATION.md) are a technically sound solution to this problem. However, little traction has developed with users.

Ethereum's [ENS](https://ens.domains/), meanwhile, continues to enjoy tremendous success. ENS created its own token economy (valued at just under $300 million as of December 2022). The [ENS Airdrop](https://www.coindesk.com/business/2021/11/09/ethereum-name-service-tokens-soar-after-500m-airdrop/) rewarded users with 5 figure USD gains.

Key differences between ENS and CashAccounts:

1. ENS domains are unique and fully customizable. CashAccounts come with a number, and names are not unique.

2. ENS domains are owned by users and may be easily bought and sold. A competitive market has developed around trading ENS domains. CashAccounts are permanently tied to the registering user. Even if the infrastructure to sell them were readily available, selling CashAccounts would require perfect trust between buyers and sellers.

## Approach

In developing an alias system for eCash, it would be nice to preserve the simplicity (and permanence) of registration found in CashAccounts.

Features proven popular in ENS, like fully customizable registration and market tradeability, should be implemented.

## Implementation

eCash aliases will be implemented in phases.

Phase 1

-   Fully customizable aliases between 1 and 21 bytes
-   Aliases are permanently tied to their registering address

Phase 2

-   NFT airdrop to existing holders
-   Tradeable aliases; aliases tied to NFT possession

## Phase 1 details

Aliases are registered by creating a "Registration Transaction" with the following properties:

1. An output paying the required amount to a designated "Registration Address", and
2. An output with an OP_RETURN containing 4 data pushes:
    1. A push of the 4-byte protocol identifier. Must be pushed with `04`.
    2. A push of a version number. Must be pushed as `OP_0`.
    3. A push of the Alias. Must be pushed with `0x01-0x15`.
    4. A push of a CashAddr payload. This information defines the "Alias Address". Must be pushed with `15`

### The Registration Address

Registration fees are paid to a single address. This address is polled via the chronik client for its transaction history, whereby incoming txs are parsed for valid registration txs. Since the transaction history of this address cannot change, wallets supporting this alias system may cache valid aliases up to a known blockheight to minimize on-chain polling.

The designated registration address is the IFP address.

### The Registration Payment Amount

The required amount to be paid to the registration address is determined by the number of bytes in the alias, with shorter aliases having a higher fee. Aliases may be between 1 and 21 bytes.

This amount may change during Phase 1. This change may be enforced by verifying the correct fee against registration blockheight.

### The Protocol Identifier

This protocol adheres to the eCash [OP_RETURN Prefix Guideline](op_return-prefix-guideline.md) and uses the 2E786563 protocol identifier, which must be pushed with the 0x04 opcode.

### Version Number

The version is indicated using opcode OP_0 through OP_16. For Phase 1, only OP_0 is allowed. OP_1 through OP_16 are reserved for future use.

### The Alias

The intent of the alias feature is to get away from some of the clunkiness of addresses. One issue with addresses is that they are human unreadable and thus must always be copy pasted to ensure accuracy.

If one alias can be human indistinguishable from another alias, then all aliases will also be copy-paste only inputs.

In the initial release of this feature, aliases are limited to lowercase alphanumeric characters (a-z, 0-9) to mitigate edge cases such as zero-width spaces and language specific character similarities.

An alias may be between 1 and 21 bytes in length, inclusive.

### The Alias Address

The Alias Address is defined in a 21-byte push containing a CashAddr payload. The first byte is the version byte indicating the type of address, and the following 20 bytes are the hash.

An Alias Address may have many aliases. Each alias maps to one and only one Alias Address.

### Additional Validity Criteria:

-   Must be a valid, finalized eCash transaction with 1 confirmation
-   Have the lowest blockheight of any other alias registration transaction for the same alias
-   When the same alias is registered in the same block by different addresses, the valid alias is the registration with the alphabetically first txid.
-   For the case of an alias registration transaction with more than one alias registration OP_RETURN outputs:

1. If the registration fee covers the total required fee for all registered aliases, they are all valid. If not, none are valid.
2. If such a tx attempts to register the same alias multiple times, none of the registrations are valid

Invalid transactions that do not match the criteria above should be ignored by the app parsing the payment address history.

## Recommended Usage

It is recommended that user facing applications interpret the ".xec" extension to indicate an eCash Alias. For example, if a user wishes to send XEC to someone based on their Alias, they could enter the Alias with .xec extension (eg. "myalias.xec") into the "To:" field in the wallet. The wallet software would then send the XEC to the appropriate address by looking it up in the index of Aliases and the associated eCash addresses.

## Known risks

Resolving conflicting alias registrations at the same blockheight by choosing the alphabetically first txid is arbitrary. It would be possible for someone to watch for broadcast registration transactions, send multiple transactions registering the same alias, and have a good chance of securing the alias before the original registrant.

However, such an attack runs the risk of forfeiting multiple registration fees. In a sense, labeling such behavior "attack" is dubious.

The intent of Phase 1 is to determine popularity and viability of the system overall. If the system gains traction, a more sophisticated, extensible, and decentralized system may be rolled out by airdropping NFTs to registrants. If the system is unpopular, it may remain a single address permanent database.

Phase 1 is rolled out using the blockchain instead of a server so that the registrations may be permanent, even if the system later becomes unmaintained.

## Extensibility

Permanently tying an alias to a single address is not the desired endpoint for the system. Payment codes, support for HD wallets, and other novel ways of adding additional privacy and security into the system are all desired features. Since most of the technology for these features is either unavailable or not in current use, this will not be supported in Phase 1. Lessons learned from practical implementation of Phase 1 will support extensible implementation in Phase 2.
