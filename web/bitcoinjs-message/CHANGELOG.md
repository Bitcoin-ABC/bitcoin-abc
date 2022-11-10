# 2.2.0

**added**

-   Signer and SignerAsync interfaces
-   sign functions can accept Signer | SignerAsync interfaces in place of privateKey
-   Added an async signAsync function (needed if you use SignerAsync interface) that returns a promise.

# 2.1.4

**fixed**

-   Fixed TypeScript types

# 2.1.3

**added**

-   TypeScript types

# 2.1.2

**added**

-   Support for Segwit signatures compatible with Electrum. (See README)

# 2.1.1

**fixed**

-   Fix UTF8 handling of message.

# 2.1.0

**added**

-   Segwit support for P2WPKH and P2SH-P2WPKH addresses. This is based on Trezor implementation.

# 2.0.0

**breaking**

-   `messagePrefix` is now the last parameter for the `sign`, `verify` and `magicHash` functions
-   `messagePrefix` is now defaulted to the Bitcoin network message prefix
