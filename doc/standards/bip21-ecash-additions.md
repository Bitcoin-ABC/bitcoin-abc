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

1.  `bitcoin` prefix is replaced by the standard `ecash` prefix of the leading ecash address. The URI must begin with a valid `ecash:`-prefixed cash address.

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

5. eCash supports the `op_return_raw` param

```
opreturnparam       = "op_return_raw=" *hex
```

-   A URI string may include the `op_return_raw` param no more than once. A URI string include multiple `op_return_raw` params is invalid.
-   The param must contain a valid hex string for a valid `OP_RETURN` output, not including the `OP_RETURN` `6a`. Hence, the hex string cannot exceed 222 bytes, and must follow the existing `OP_RETURN` spec.
-   The param cannot be an empty string
-   The `OP_RETURN` output will be the 0-index output
-   In a multi-address URI, the `op_return_raw` param must appear in first position

6. eCash supports multiple outputs

-   Each additional output must include both a valid `addr` and valid `amount` for the URI to be valid.
-   `addr` values must be valid cashaddresses that pass checksum validation for the `ecash` prefix. The prefix itself is not required.
-   There is no spec limitation on the number of additional outputs a BIP21 URI may request. However, there are practical limitations. The node will not broadcast a transaction greater than 100KB, and QR codes cannot store more than 4,296 alphanumeric characters.
-   Addresses may be repeated. You may send more than one output to the same address.
-   If `op_return_raw` is specified, the output index of each specified output will be determined by its order in the URI. If no `op_return_raw` is specified, the output index of each specified output may not necessarily correspond to its order in the URI.

Because BIP21 was originally designed for single-address transactions and a valid BIP21 URI begins with an address, the `addr` param is introduced for additional outputs.

Additional outputs will be sent at the `nth` output index, where `n` is the order of appearance of the `addr` param.

7. eCash supports simple token sends

-   bip21 token send txs are limited to one recipient and one specified token qty recipient output
-   Token output value is dust (546 satoshis)
-   Any token type is supported. Support for some token types may be constrained by the implementing wallet (i.e. there are different tx construction rules for ALP vs SLP tokens, but both have tokenIds)
-   `token_id` param, a valid token id.
-   `token_decimalized_qty` param, decimalized qty to be sent
-   A bip21 string with `token_id` can only be parsed as a token send tx
-   A bip21 string with `token_id` is invalid if `token_decimalized_qty` is not specified
-   If the `token_id` param is present in a bip21 query string, all params apart from `token_decimalized_qty` will be ignored.

It is up to the implementing wallet to properly handle and convert `token_decimalized_qty`. A bip21 string is invalid if `token_decimalized_qty` specifies a decimal amount not supported by the specified `token_id`. This must be handled by the implementing wallet, as there is no way to check token decimals without referencing the token's genesis tx or cached info.

Specifying token satoshis instead of `token_decimalized_qty` was considered and rejected. Users think in terms of the actual amount being sent. Wallet developers must handle the complex interface between token protocol amounts and user input amounts. bip21 uses XEC for the `amount` param instead of satoshis for the same reason.

Note that more complicated token txs (or this type of simple token tx) may be manually constructed with `op_return_raw` and existing bip21 support for multiple outputs.

### Examples

#### Bip-21 URI with no `op_return_raw` and 2 additional outputs

`ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=100&addr=prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07&amount=200&addr=prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07&amount=300`

An amount of `100` XEC will be sent to `ecash:prf...z07` at the index 0, 1, or 2 output
An amount of `200` XEC will be sent to `ecash:prf...z07` at the index 0, 1, or 2 output
An amount of `300` XEC will be sent to `ecash:prf...z07` at the index 0, 1, or 2 output

#### Bip-21 URI with `op_return_raw` and 2 additional outputs

`ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=100&op_return_raw=0401020304&addr=prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07&amount=200&addr=prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07&amount=300`

An `OP_RETURN` output of `6a0401020304` at the index 0 output
An amount of `100` XEC will be sent to `ecash:prf...z07` at the index 1 output
An amount of `200` XEC will be sent to `ecash:prf...z07` at the index 2 output
An amount of `300` XEC will be sent to `ecash:prf...z07` at the index 3 output

#### Bip-21 URI for an SLP or ALP Send tx

`ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?token_id=aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1&token_decimalized_qty=100.12`

100.12 CACHET tokens will be sent to `ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07` in an output containing 546 satoshis. It is up to the implementing wallet to handle validation and change.
