---
layout: specification
title: Address format for eCash
category: spec
date: 2023-04-28
version: 1.1
---

## Abstract

This document describes the eCash address format. This is an implementation of the CashAddr address format using the eCash prefixes. It is the same as the Bitcoin Cash address format[[1]](#bitcoincash) using different prefixes.

CashAddr is a base32 encoded format using BCH[[2]](#bch) codes as checksum and that can be used directly in links or QR codes. It reuses the work done for Bech32[[3]](#bip173) and is similar in some aspects, but improves on others.

## Specification

The address is composed of

1. A prefix indicating the network on which this address is valid.
2. A separator, always `:`
3. A base32 encoded payload indicating the destination of the address and containing a checksum.

### Prefix

The prefix indicates the network on which this addess is valid. It is set to `ecash` for eCash main net, `ectest` for eCash testnet and `ecregtest` for eCash regtest.

The prefix is followed by the separator `:`.

When presented to users, the prefix may be omitted as it is part of the checksum computation. The checksum ensures that addresses on different networks will remain incompatible, even in the absence of an explicit prefix.

### Payload

The payload is a base32 encoded stream of data.

|     | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| --: | --- | --- | --- | --- | --- | --- | --- | --- |
|  +0 | q   | p   | z   | r   | y   | 9   | x   | 8   |
|  +8 | g   | f   | 2   | t   | v   | d   | w   | 0   |
| +16 | s   | 3   | j   | n   | 5   | 4   | k   | h   |
| +24 | c   | e   | 6   | m   | u   | a   | 7   | l   |

The payload is composed of 3 elements:

1. A version byte indicating the type of address.
2. A hash.
3. A 40 bits checksum.

#### Version byte

The version byte's most signficant bit is reserved and must be 0. The 4 next bits indicate the type of address and the 3 least significant bits indicate the size of the hash.

| Size bits | Hash size in bits |
| --------: | ----------------: |
|         0 |               160 |
|         1 |               192 |
|         2 |               224 |
|         3 |               256 |
|         4 |               320 |
|         5 |               384 |
|         6 |               448 |
|         7 |               512 |

Encoding the size of the hash in the version field ensure that it is possible to check that the length of the address is correct.

| Type bits | Meaning | Version byte value |
| --------: | :-----: | -----------------: |
|         0 |  P2KH   |                  0 |
|         1 |  P2SH   |                  8 |

Further types will be added as new features are added.

#### Hash

The hash part really deserves not much explanation as its meaning is dependent on the version field. It is the hash that represents the data, namely a hash of the public key for P2KH and the hash of the reedemScript for P2SH.

#### Checksum

The checksum is a 40 bits BCH codes defined over GF(2^5). It ensures the detection of up to 6 errors in the address and 8 in a row. Combined with the length check, this provides very strong guarantee against errors.

The checksum is computed per the code below:

```cpp
uint64_t PolyMod(const data &v) {
    uint64_t c = 1;
    for (uint8_t d : v) {
        uint8_t c0 = c >> 35;
        c = ((c & 0x07ffffffff) << 5) ^ d;

        if (c0 & 0x01) c ^= 0x98f2bc8e61;
        if (c0 & 0x02) c ^= 0x79b76d99e2;
        if (c0 & 0x04) c ^= 0xf33e5fb3c4;
        if (c0 & 0x08) c ^= 0xae2eabe2a8;
        if (c0 & 0x10) c ^= 0x1e4f43e470;
    }

    return c ^ 1;
}
```

The checksum is calculated over the following data (list of integers in range 0-31):

1. The lower 5 bits of each character of the prefix. - e.g. "bit..." becomes 2,9,20,...
2. A zero for the separator (5 zero bits).
3. The payload by chunks of 5 bits. If necessary, the payload is padded to the right with zero bits to complete any unfinished chunk at the end.
4. Eight zeros as a "template" for the checksum.

The 40-bit number returned by PolyMod is split into eight 5-bit numbers (msb first).
The payload and the checksum are then encoded according to the base32 character table.

To verify a base32-formatted address, it is split at the colon ":" into prefix and payload.
Input data (list of integers) for PolyMod function is assembled from these parts:

1. The lower 5 bits of each characters of the prefix.
2. A zero for the separator (5 zero bits).
3. Each base32 char of the payload mapped to it's respective number.
   If PolyMod returns non-zero, then the address was broken.

The following addresses can be used as test vector for checksum computation:

-   prefix:x64nx6hz
-   p:gpf8m4h7
-   ecash:qpzry9x8gf2tvdw0s3jn54khce6mua7llmm0t7vm
-   ectest:testnetaddresn2v3lpw7
-   ecregtest:5y5555555555555555555555555555555555555555555g3gfll4x

NB: These addresses do not have valid payload on purpose.

## Error correction

BCH codes allows for error correction. However, it is strongly advised that error correction is not done in an automatic manner as it may cause funds to be lost irrecoverably if done incorrectly. It may however be used to hint a user at a possible error.

## Uppercase/lowercase

Lower case is preferred for cashaddr, but uppercase is accepted. A mixture of lower case and uppercase must be rejected.

Allowing for uppercase ensures that the address can be encoded efficiently in QR codes using the alphanumeric mode[[4]](#alphanumqr).

## Double prefix

In some contexts, such as payment URLs or QR codes, the addresses are currently prefixed with `ecash:`. In these contexts, the address must not be double prefixed.

## Examples of address translation

The following addresses are given in the legacy and new format.

| Legacy                             | CashAddr                                         |
| :--------------------------------- | :----------------------------------------------- |
| 1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu | ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2 |
| 1KXrWXciRDZUpQwQmuM1DbwsKDLYAYsVLR | ecash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4ykdcjcn6n |
| 16w1D5WRVKJuZUsSRzdLp9w3YGcgoxDXb  | ecash:qqq3728yw0y47sqn6l2na30mcw6zm78dzq653y7pv5 |
| 3CWFddi6m4ndiGyKqzYvsFYagqDLPVMTzC | ecash:ppm2qsznhks23z7629mms6s4cwef74vcwv2zrv3l8h |
| 3LDsS579y7sruadqu11beEJoTjdFiFCdX4 | ecash:pr95sy3j9xwd2ap32xkykttr4cvcu7as4ypg9alspw |
| 31nwvkZwyPdgzjBJZXfDmSWsC4ZLKpYyUw | ecash:pqq3728yw0y47sqn6l2na30mcw6zm78dzqd3vtezhf |

## Larger Test Vectors

This table defines test vectors for various payloads of sizes 160-512 bits with various prefixes. These test vectors aren't given in legacy address format because the legacy format is limited to payloads of 160 bits.

| Payload Size (bytes) | Type | CashAddr                                                                                                                | Payload (hex)                                                                                                                    |
| :------------------- | :--- | :---------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| 20                   | 0    | ecash:qr6m7j9njldwwzlg9v7v53unlr4jkmx6eyx54vzvwa                                                                        | F5BF48B397DAE70BE82B3CCA4793F8EB2B6CDAC9                                                                                         |
| 20                   | 1    | ectest:pr6m7j9njldwwzlg9v7v53unlr4jkmx6eyh6krzzk3                                                                       | F5BF48B397DAE70BE82B3CCA4793F8EB2B6CDAC9                                                                                         |
| 20                   | 1    | pref:pr6m7j9njldwwzlg9v7v53unlr4jkmx6ey65nvtks5                                                                         | F5BF48B397DAE70BE82B3CCA4793F8EB2B6CDAC9                                                                                         |
| 20                   | 15   | prefix:0r6m7j9njldwwzlg9v7v53unlr4jkmx6ey3qnjwsrf                                                                       | F5BF48B397DAE70BE82B3CCA4793F8EB2B6CDAC9                                                                                         |
| 24                   | 0    | ecash:q9adhakpwzztepkpwp5z0dq62m6u5v5xtyj7j3h24pj4gqrx                                                                  | 7ADBF6C17084BC86C1706827B41A56F5CA32865925E946EA                                                                                 |
| 24                   | 1    | ectest:p9adhakpwzztepkpwp5z0dq62m6u5v5xtyj7j3h2yht5cqqt                                                                 | 7ADBF6C17084BC86C1706827B41A56F5CA32865925E946EA                                                                                 |
| 24                   | 1    | pref:p9adhakpwzztepkpwp5z0dq62m6u5v5xtyj7j3h2khlwwk5v                                                                   | 7ADBF6C17084BC86C1706827B41A56F5CA32865925E946EA                                                                                 |
| 24                   | 15   | prefix:09adhakpwzztepkpwp5z0dq62m6u5v5xtyj7j3h2p29kc2lp                                                                 | 7ADBF6C17084BC86C1706827B41A56F5CA32865925E946EA                                                                                 |
| 28                   | 0    | ecash:qgagf7w02x4wnz3mkwnchut2vxphjzccwxgjvvjmlsxqwkcplvqjxnq                                                           | 3A84F9CF51AAE98A3BB3A78BF16A6183790B18719126325BFC0C075B                                                                         |
| 28                   | 1    | ectest:pgagf7w02x4wnz3mkwnchut2vxphjzccwxgjvvjmlsxqwkc8dqmejns                                                          | 3A84F9CF51AAE98A3BB3A78BF16A6183790B18719126325BFC0C075B                                                                         |
| 28                   | 1    | pref:pgagf7w02x4wnz3mkwnchut2vxphjzccwxgjvvjmlsxqwkcrsr6gzkn                                                            | 3A84F9CF51AAE98A3BB3A78BF16A6183790B18719126325BFC0C075B                                                                         |
| 28                   | 15   | prefix:0gagf7w02x4wnz3mkwnchut2vxphjzccwxgjvvjmlsxqwkc5djw8s9g                                                          | 3A84F9CF51AAE98A3BB3A78BF16A6183790B18719126325BFC0C075B                                                                         |
| 32                   | 0    | ecash:qvch8mmxy0rtfrlarg7ucrxxfzds5pamg73h7370aa87d80gyhqxqwwcjq6wn                                                     | 3173EF6623C6B48FFD1A3DCC0CC6489B0A07BB47A37F47CFEF4FE69DE825C060                                                                 |
| 32                   | 1    | ectest:pvch8mmxy0rtfrlarg7ucrxxfzds5pamg73h7370aa87d80gyhqxqvutqznvr                                                    | 3173EF6623C6B48FFD1A3DCC0CC6489B0A07BB47A37F47CFEF4FE69DE825C060                                                                 |
| 32                   | 1    | pref:pvch8mmxy0rtfrlarg7ucrxxfzds5pamg73h7370aa87d80gyhqxq4k9m7qf9                                                      | 3173EF6623C6B48FFD1A3DCC0CC6489B0A07BB47A37F47CFEF4FE69DE825C060                                                                 |
| 32                   | 15   | prefix:0vch8mmxy0rtfrlarg7ucrxxfzds5pamg73h7370aa87d80gyhqxqsh6jgp6w                                                    | 3173EF6623C6B48FFD1A3DCC0CC6489B0A07BB47A37F47CFEF4FE69DE825C060                                                                 |
| 40                   | 0    | ecash:qnq8zwpj8cq05n7pytfmskuk9r4gzzel8qtsvwz79zdskftrzxtar994cgutavfklvv46vrney                                        | C07138323E00FA4FC122D3B85B9628EA810B3F381706385E289B0B25631197D194B5C238BEB136FB                                                 |
| 40                   | 1    | ectest:pnq8zwpj8cq05n7pytfmskuk9r4gzzel8qtsvwz79zdskftrzxtar994cgutavfklvxysxrq4s                                       | C07138323E00FA4FC122D3B85B9628EA810B3F381706385E289B0B25631197D194B5C238BEB136FB                                                 |
| 40                   | 1    | pref:pnq8zwpj8cq05n7pytfmskuk9r4gzzel8qtsvwz79zdskftrzxtar994cgutavfklv0vx5z0w3                                         | C07138323E00FA4FC122D3B85B9628EA810B3F381706385E289B0B25631197D194B5C238BEB136FB                                                 |
| 40                   | 15   | prefix:0nq8zwpj8cq05n7pytfmskuk9r4gzzel8qtsvwz79zdskftrzxtar994cgutavfklvwsvctzqy                                       | C07138323E00FA4FC122D3B85B9628EA810B3F381706385E289B0B25631197D194B5C238BEB136FB                                                 |
| 48                   | 0    | ecash:qh3krj5607v3qlqh5c3wq3lrw3wnuxw0sp8dv0zugrrt5a3kj6ucysfz8kxwv2k53krr7n933jfsunqmqjjtpwr                           | E361CA9A7F99107C17A622E047E3745D3E19CF804ED63C5C40C6BA763696B98241223D8CE62AD48D863F4CB18C930E4C                                 |
| 48                   | 1    | ectest:ph3krj5607v3qlqh5c3wq3lrw3wnuxw0sp8dv0zugrrt5a3kj6ucysfz8kxwv2k53krr7n933jfsunqy7wvdl6p                          | E361CA9A7F99107C17A622E047E3745D3E19CF804ED63C5C40C6BA763696B98241223D8CE62AD48D863F4CB18C930E4C                                 |
| 48                   | 1    | pref:ph3krj5607v3qlqh5c3wq3lrw3wnuxw0sp8dv0zugrrt5a3kj6ucysfz8kxwv2k53krr7n933jfsunqjntdfcwg                            | E361CA9A7F99107C17A622E047E3745D3E19CF804ED63C5C40C6BA763696B98241223D8CE62AD48D863F4CB18C930E4C                                 |
| 48                   | 15   | prefix:0h3krj5607v3qlqh5c3wq3lrw3wnuxw0sp8dv0zugrrt5a3kj6ucysfz8kxwv2k53krr7n933jfsunqakcssnmn                          | E361CA9A7F99107C17A622E047E3745D3E19CF804ED63C5C40C6BA763696B98241223D8CE62AD48D863F4CB18C930E4C                                 |
| 56                   | 0    | ecash:qmvl5lzvdm6km38lgga64ek5jhdl7e3aqd9895wu04fvhlnare5937w4ywkq57juxsrhvw8ym5d8qx7sz7zz0zvcypqsexktekqd              | D9FA7C4C6EF56DC4FF423BAAE6D495DBFF663D034A72D1DC7D52CBFE7D1E6858F9D523AC0A7A5C34077638E4DD1A701BD017842789982041                 |
| 56                   | 1    | ectest:pmvl5lzvdm6km38lgga64ek5jhdl7e3aqd9895wu04fvhlnare5937w4ywkq57juxsrhvw8ym5d8qx7sz7zz0zvcypqsd03rgsn0             | D9FA7C4C6EF56DC4FF423BAAE6D495DBFF663D034A72D1DC7D52CBFE7D1E6858F9D523AC0A7A5C34077638E4DD1A701BD017842789982041                 |
| 56                   | 1    | pref:pmvl5lzvdm6km38lgga64ek5jhdl7e3aqd9895wu04fvhlnare5937w4ywkq57juxsrhvw8ym5d8qx7sz7zz0zvcypqsammyqffl               | D9FA7C4C6EF56DC4FF423BAAE6D495DBFF663D034A72D1DC7D52CBFE7D1E6858F9D523AC0A7A5C34077638E4DD1A701BD017842789982041                 |
| 56                   | 15   | prefix:0mvl5lzvdm6km38lgga64ek5jhdl7e3aqd9895wu04fvhlnare5937w4ywkq57juxsrhvw8ym5d8qx7sz7zz0zvcypqsgjrqpnw8             | D9FA7C4C6EF56DC4FF423BAAE6D495DBFF663D034A72D1DC7D52CBFE7D1E6858F9D523AC0A7A5C34077638E4DD1A701BD017842789982041                 |
| 64                   | 0    | ecash:qlg0x333p4238k0qrc5ej7rzfw5g8e4a4r6vvzyrcy8j3s5k0en7calvclhw46hudk5flttj6ydvjc0pv3nchp52amk97tqa5zygg96m37thkp20  | D0F346310D5513D9E01E299978624BA883E6BDA8F4C60883C10F28C2967E67EC77ECC7EEEAEAFC6DA89FAD72D11AC961E164678B868AEEEC5F2C1DA08884175B |
| 64                   | 1    | ectest:plg0x333p4238k0qrc5ej7rzfw5g8e4a4r6vvzyrcy8j3s5k0en7calvclhw46hudk5flttj6ydvjc0pv3nchp52amk97tqa5zygg96mjjad5wtw | D0F346310D5513D9E01E299978624BA883E6BDA8F4C60883C10F28C2967E67EC77ECC7EEEAEAFC6DA89FAD72D11AC961E164678B868AEEEC5F2C1DA08884175B |
| 64                   | 1    | pref:plg0x333p4238k0qrc5ej7rzfw5g8e4a4r6vvzyrcy8j3s5k0en7calvclhw46hudk5flttj6ydvjc0pv3nchp52amk97tqa5zygg96mg7pj3lh8   | D0F346310D5513D9E01E299978624BA883E6BDA8F4C60883C10F28C2967E67EC77ECC7EEEAEAFC6DA89FAD72D11AC961E164678B868AEEEC5F2C1DA08884175B |
| 64                   | 15   | prefix:0lg0x333p4238k0qrc5ej7rzfw5g8e4a4r6vvzyrcy8j3s5k0en7calvclhw46hudk5flttj6ydvjc0pv3nchp52amk97tqa5zygg96ms92w6845 | D0F346310D5513D9E01E299978624BA883E6BDA8F4C60883C10F28C2967E67EC77ECC7EEEAEAFC6DA89FAD72D11AC961E164678B868AEEEC5F2C1DA08884175B |

## References

<a name="bitcoincash">[1]</a> https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md

<a name="bch">[2]</a> https://en.wikipedia.org/wiki/BCH_code

<a name="bip173">[3]</a> https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki

<a name="alphanumqr">[4]</a> http://www.thonky.com/qr-code-tutorial/alphanumeric-mode-encoding
