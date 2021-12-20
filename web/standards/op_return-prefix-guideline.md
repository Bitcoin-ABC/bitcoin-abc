# Prefix Guideline for OP_RETURN on eCash

This document extends the app dev OP_RETURN convention described [here](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/op_return-prefix-guideline.md).

If you are a developer using an OP_RETURN prefix for your app, please claim your prefix by submitting a diff to this repo, including:

-   A display name for the protocol
-   An author (or list of authors)
-   A URL pointing to the specification of the protocol
-   An eCash address (to avoid ambiguity and to later modify names / authors / URL)

App prefixes below are little-endian, i.e. how they appear in eCash transaction outputs.

| Prefix(little-endian) | Display Name      | Authors                             | eCashAddress                                     | SpecificationUrl                                              | TxidRedirectUrl |
| --------------------- | ----------------- | ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- | --------------- |
| 534c5000              | eToken            | SLP devs                            | ecash:qq2p8mu0gmxfzva2g36kh70efp8hx7qg7qh20l0qls | http://simpleledger.cash/                                     | n/a             |
| 46555a00              | CashFusion        | Jonald Fyookball and Mark Lundeberg | ecash:qqqxxmjyavdkwdj6npa5w6xl0fzq3wc5fu6s5x69jj | https://github.com/cashshuffle/spec/blob/master/CASHFUSION.md | n/a             |
| 00746162              | Cashtab           | Bitcoin ABC                         | ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j | https://cashtab.com/                                          | n/a             |
| 65746162              | Cashtab Encrypted | Bitcoin ABC                         | ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j | https://cashtab.com/                                          | n/a             |

---

### Resources

[op_return-prefix-guideline.md](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/op_return-prefix-guideline.md)

[protocols.csv](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/etc/protocols.csv)
