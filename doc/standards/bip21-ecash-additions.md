# eCash-specific additions to BIP 21

## Abstract

[BIP 21](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki) proposed a URI scheme for making payments. This system is used by bitcoin forks, including XEC. eCash-specific variations from the original BIP21 spec are listed here.

### eCash URI parameters

Original spec for BIP21 parameters:

```
bitcoinurn     = "bitcoin:" bitcoinaddress [ "?" bitcoinparams ]
bitcoinaddress = *base58
bitcoinparams  = bitcoinparam [ "&" bitcoinparams ]
bitcoinparam   = [ amountparam / labelparam / messageparam / otherparam / reqparam ]
amountparam    = "amount=" *digit [ "." *digit ]
labelparam     = "label=" *qchar
messageparam   = "message=" *qchar
otherparam     = qchar *qchar [ "=" *qchar ]
reqparam       = "req-" qchar *qchar [ "=" *qchar ]
```

eCash modifications

1.  `bitcoin` prefix is replaced by `ecash`. `ecashaddress` must be a valid cashaddr format ecash address with an `ecash` prefix.

```
// BTC
bitcoinurn     = "bitcoin:" bitcoinaddress [ "?" bitcoinparams ]

// XEC
ecashurn       = ecashaddress [" ?" ecashparams ]
```

2. `addressparam` is a valid ecash address (which could be base 58, commonly referred to as `legacy` format)

```
// BTC
bitcoinaddress = *base58

// XEC
ecashaddress = cashaddr OR *base58
```

3. eCash params use descriptor `ecash` instead of `bitcoin`

```
// BTC
bitcoinparams  = bitcoinparam [ "&" bitcoinparams ]
bitcoinparam   = [ amountparam / labelparam / messageparam / otherparam / reqparam ]

// XEC
ecashparams  = ecashparam [ "&" ecashparams ]
ecashparam   = [ amountparam / labelparam / messageparam / otherparam / reqparam ]
```

4. eCash uses units of eCash (XEC), and not BTC, in the `amount` param

5. eCash supports the `opreturn` param

```
opreturnparam       = "opreturn=" *hex
```

-   A URI string may include the `opreturn` param no more than once. A URI string include multiple `opreturn` params is invalid.
-   The param must contain a valid hex string for a valid `OP_RETURN` output, not including the `OP_RETURN` `6a`. Hence, the hex string cannot exceed 222 bytes, and must follow the existing `OP_RETURN` spec.
-   The param cannot be an empty string
-   The `OP_RETURN` output will be the 0-index output
