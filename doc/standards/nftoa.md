# NFToa

A specification for encoding data with NFToa txs.

## Abstract

This idea was born out of a challenge I faced while integrating PayButton into Flutter. One key principle I’ve committed to is maintaining user trust by always directing them to Cashtab.com in an external browser, rather than embedding it in an in-app webview. The reason is simple: in-app browsers can spark suspicion or hesitation among users when accessing our applications.

With this initiative, I aim to create my own button solution — one that blends seamlessly with Flutter, upholds transparency, and reinforces the trust users place in our ecosystem.

## Introduction

A new protocol identifier **`NFT\0`** (`0x4E465400`) is introduced for use in **OP_RETURN outputs** within the **NFToa ecosystem**.
This identifier represents the **NFToa protocol layer**, designed to extend eCash transactions with programmable and verifiable data payloads — enabling features such as access authentication, on-chain messaging, and decentralized interaction between NFToa apps.

All transactions following this protocol are anchored to the official NFToa address:

```
ecash:qrrn6yvaah3p4jjm8uwet935hdh7apufjc6m9w8prz
```

This address acts as the **canonical protocol identity** within the NFToa ecosystem.

This protocol defines a **consistent and predictable output structure**, ensuring that every NFToa transaction follows the same sequence of data fields:

```
[OP_RETURN] [NFT\0] [message] [nonce?]
```

* **[NFT\0]** — A 4-byte protocol identifier that uniquely marks NFToa transactions on-chain.
* **[message]** — A variable-length UTF-8 or binary payload containing application data, such as NFT access metadata or transaction context.
* **[nonce?]** — A random or sequential value that ensures uniqueness. It helps authenticate users across the ecosystem and identify which user is currently logged in. This field is **optional**, but when included, it always appears **after the message field** to maintain structural consistency.

Even when the nonce is omitted, the output format remains predictable because all fields appear in a fixed order. This allows wallets and indexers to reliably parse NFToa transactions regardless of whether the nonce is present.

All NFToa applications adhere to this structure to maintain interoperability, simplify parsing, and enable **brand-specific rendering**, such as displaying the **NFToa logo** in supported wallets (e.g., Cashtab).

This design ensures that NFToa protocol messages are easily distinguishable on-chain while remaining fully compatible with existing `OP_RETURN` parsing standards.

## Implementation

NFToa adopts the [BIP21](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki) URI scheme to encode payment and protocol data in a standardized way, allowing interoperability across eCash wallets such as **Cashtab**.

### Example (Authentication Transaction)

```
https://cashtab.com/#/send?bip21=ecash:qrrn6yvaah3p4jjm8uwet935hdh7apufjc6m9w8prz?amount=5.5&op_return_raw=044e465400134c6f67696e20746f2047617564696f2041707008eb0c601b84975437
```

#### Breakdown

| Section | Description |
|----------|-------------|
| `ecash:qrrn6yvaah3p4jjm8uwet935hdh7apufjc6m9w8prz` | The official NFToa protocol address. |
| `amount=5.5` | Transaction amount in XEC. |
| `op_return_raw=...` | Raw OP_RETURN payload (in hex) containing protocol data. |


#### OP_RETURN Data Structure

| Segment | Bytes | Description |
|----------|--------|-------------|
| `04` | 1 | Pushdata length (4 bytes) |
| `4e465400` | 4 | NFToa protocol identifier (`NFT\0`) |
| `13` | 1 | Pushdata length (19 bytes) |
| `4c6f67696e20746f2047617564696f20417070` | 19 | UTF-8 string `"Login to Gaudio App"` (message) |
| `08` | 1 | Pushdata length (8 bytes) |
| `eb0c601b84975437` | 8 | Hexadecimal representation of 8 random bytes (nonce) |


> **Purpose:**
> This format represents an **authenticated login transaction** in NFToa, where the random 8-byte nonce provides replay protection and proof of request origin.

### Example (Regular Message Transaction)

```
https://cashtab.com/#/send?bip21=ecash:qrrn6yvaah3p4jjm8uwet935hdh7apufjc6m9w8prz?amount=5.5&op_return_raw=044e4654001648656c6c6f20576f726c642066726f6d204e46546f61
```

#### OP_RETURN Data Structure

| Segment | Bytes | Description |
|----------|--------|-------------|
| `04` | 1 | Pushdata length (4 bytes) |
| `4e465400` | 4 | NFToa protocol identifier (`NFT\0`) |
| `16` | 1 | Pushdata length (22 bytes) |
| `48656c6c6f20576f726c642066726f6d204e46546f61` | 22 | UTF-8 string `"Hello World from NFToa"` (message) |


> **Purpose:**
> This format represents a **regular NFToa message transaction**, used for on-chain communication, announcements, or general signaling without nonce verification.

## Summary

| Type | Description | Nonce | Example |
|------|--------------|-------|----------|
| **Authentication TX** | Login or request integrity is established using a unique, randomly generated Session ID (Nonce). This ID ensures the correct transaction data is returned to the original sender. | ✅ | `...Login to Gaudio App...08eb0c601b84975437` |
| **Regular TX** | Simple message or signal (no nonce). | ❌ | `...Hello World from NFToa...` |
