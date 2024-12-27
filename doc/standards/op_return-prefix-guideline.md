# Prefix Guideline for OP_RETURN on eCash

This document extends the app dev OP_RETURN convention described [here](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/op_return-prefix-guideline.md).

If you are a developer using an OP_RETURN prefix for your app, please claim your protocol identifier by submitting a diff to this repo, including:

-   A display name for the protocol
-   An author (or list of authors)
-   A URL pointing to the specification of the protocol
-   An eCash address (to avoid ambiguity and to later modify names / authors / URL)

Protocol identifiers below are listed how they appear in eCash transaction outputs.

| Protocol Identifier | Display Name               | Authors                             | eCashAddress                                     | SpecificationUrl                                              | Payload                                      |
| ------------------- | -------------------------- | ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------- |
| 534c5000            | eToken                     | SLP devs                            | ecash:qq2p8mu0gmxfzva2g36kh70efp8hx7qg7qh20l0qls | https://github.com/simpleledger/slp-specifications            | See spec                                     |
| 46555a00            | CashFusion                 | Jonald Fyookball and Mark Lundeberg | ecash:qqqxxmjyavdkwdj6npa5w6xl0fzq3wc5fu6s5x69jj | https://github.com/cashshuffle/spec/blob/master/CASHFUSION.md | See spec                                     |
| 00746162            | Cashtab Message            | Bitcoin ABC                         | ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j | N/A                                                           | `<00746162> <utf8 msg>`                      |
| 65746162            | Cashtab Encrypted          | Bitcoin ABC                         | ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j | https://cashtab.com/                                          | `<65746162> <encrypted utf8 msg>`            |
| 64726f70            | Airdrop                    | Bitcoin ABC                         | ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j | https://cashtab.com/                                          | `<64726f70> <tokenId of airdrop recipients>` |
| 2E786563            | Namespace Alias            | Bitcoin ABC                         | ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j | See ../standards/ecash-alias.md                               | See spec                                     |
| 50415900            | PayButton                  | Blockchain Ventures                 | ecash:qrmm7edwuj4jf7tnvygjyztyy0a0qxvl7quss2vxek | See ../standards/paybutton.md                                 | See spec                                     |
| 63686174            | eCash Chat                 | eCashChat                           | ecash:qz9aa3yeuspe569xqtmn0f8aaxwmdjz4l58z6hzv9u | N/A                                                           | `<63686174> <utf8 msg>`                      |
| 70617977            | Paywall tx                 | eCashChat                           | ecash:qz9aa3yeuspe569xqtmn0f8aaxwmdjz4l58z6hzv9u | N/A                                                           | `<70617977> <txid>`                          |
| 61757468            | Authentication via dust tx | eCashChat                           | ecash:qz9aa3yeuspe569xqtmn0f8aaxwmdjz4l58z6hzv9u | N/A                                                           | `<61757468> <utf8 identifier>`               |
| 54424F58            | Token trollbox             | Cashtab                             | ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l | N/A                                                           | `<54424F58> <tokenId> <msg>`                 |
| 58454358            | XECX                       | XECX                                | ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79 | stakedXec.com                                                 | `<58454358> <00> <u64> <u64> <u64> <u16>`    |

---

### Resources

[op_return-prefix-guideline.md](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/op_return-prefix-guideline.md)

[protocols.csv](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/etc/protocols.csv)
