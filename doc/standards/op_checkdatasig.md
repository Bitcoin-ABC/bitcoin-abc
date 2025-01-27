---
layout: specification
title: OP_CHECKDATASIG and OP_CHECKDATASIGVERIFY Specification
category: spec
date: 2018-08-20
activation: 1542300000
version: 0.6
---

OP_CHECKDATASIG
===============

OP_CHECKDATASIG and OP_CHECKDATASIGVERIFY check whether a signature is valid with respect to a message and a public key.

OP_CHECKDATASIG permits data to be imported into a script, and have its validity checked against some signing authority such as an "Oracle".

OP_CHECKDATASIG and OP_CHECKDATASIGVERIFY are designed to be implemented similarly to OP_CHECKSIG [1]. Conceptually, one could imagine OP_CHECKSIG functionality being replaced by OP_CHECKDATASIG, along with a separate Op Code to create a hash from the transaction based on the SigHash algorithm.

OP_CHECKDATASIG Specification
-----------------------------

### Semantics

OP_CHECKDATASIG fails immediately if the stack is not well formed. To be well formed, the stack must contain at least three elements [`<sig>`, `<msg>`, `<pubKey>`] in this order where `<pubKey>` is the top element and
  * `<pubKey>` must be a validly encoded public key
  * `<msg>` can be any string
  * `<sig>` must follow the strict DER encoding as described in [2] and the S-value of `<sig>` must be at most the curve order divided by 2 as described in [3]

If the stack is well formed, then OP_CHECKDATASIG pops the top three elements [`<sig>`, `<msg>`, `<pubKey>`] from the stack and pushes true onto the stack if `<sig>` is valid with respect to the raw single-SHA256 hash of `<msg>` and `<pubKey>` using the secp256k1 elliptic curve. Otherwise, it pops three elements and pushes false onto the stack in the case that `<sig>` is the empty string and fails in all other cases.

Nullfail is enforced the same as for OP_CHECKSIG [3]. If the signature does not match the supplied public key and message hash, and the signature is not an empty byte array, the entire script fails.

### Opcode Number

OP_CHECKDATASIG uses the previously unused opcode number 186 (0xba in hex encoding)

### SigOps

Signature operations accounting for OP_CHECKDATASIG shall be calculated the same as OP_CHECKSIG. This means that each OP_CHECKDATASIG shall be counted as one (1) SigOp.

### Activation

Use of OP_CHECKDATASIG, unless occuring in an unexecuted OP_IF branch, will make the transaction invalid if it is included in a block where the median timestamp of the prior 11 blocks is less than 1542300000.

### Unit Tests

 - `<sig> <msg> <pubKey> OP_CHECKDATASIG` fails if 15 November 2018 protocol upgrade is not yet activated.
 - `<sig> <msg> OP_CHECKDATASIG` fails if there are fewer than 3 items on stack.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIG` fails if `<pubKey>` is not a validly encoded public key.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIG` fails if `<sig>` is not a validly encoded signature with strict DER encoding.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIG` fails if signature `<sig>` is not empty and does not pass the Low S check.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIG` fails if signature `<sig>` is not empty and does not pass signature validation of `<msg>` and `<pubKey>`.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIG` pops three elements and pushes false onto the stack if `<sig>` is an empty byte array.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIG` pops three elements and pushes true onto the stack if `<sig>` is a valid signature of `<msg>` with respect to `<pubKey>`.

OP_CHECKDATASIGVERIFY Specification
-----------------------------------

### Semantics

OP_CHECKDATASIGVERIFY is equivalent to OP_CHECKDATASIG followed by OP_VERIFY. It leaves nothing on the stack, and will cause the script to fail immediately if the signature check does not pass.

### Opcode Number

OP_CHECKDATASIGVERIFY uses the previously unused opcode number 187 (0xbb in hex encoding)

### SigOps

Signature operations accounting for OP_CHECKDATASIGVERIFY shall be calculated the same as OP_CHECKSIGVERIFY. This means that each OP_CHECKDATASIGVERIFY shall be counted as one (1) SigOp.

### Activation

Use of OP_CHECKDATASIGVERIFY, unless occuring in an unexecuted OP_IF branch, will make the transaction invalid if it is included in a block where the median timestamp of the prior 11 blocks is less than 1542300000.

### Unit Tests

 - `<sig> <msg> <pubKey> OP_CHECKDATASIGVERIFY` fails if 15 November 2018 protocol upgrade is not yet activated.
 - `<sig> <msg> OP_CHECKDATASIGVERIFY` fails if there are fewer than 3 item on stack.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIGVERIFY`fails if `<pubKey>` is not a validly encoded public key.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIGVERIFY` fails if `<sig>` is not a validly encoded signature with strict DER encoding.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIGVERIFY` fails if signature `<sig>` is not empty and does not pass the Low S check.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIGVERIFY` fails if `<sig>` is not a valid signature of `<msg>` with respect to `<pubKey>`.
 - `<sig> <msg> <pubKey> OP_CHECKDATASIGVERIFY` pops the top three stack elements if `<sig>` is a valid signature of `<msg>` with respect to `<pubKey>`.

Sample Implementation [4, 5]
----------------------------

```c++
                    case OP_CHECKDATASIG:
                    case OP_CHECKDATASIGVERIFY: {
                        // Make sure this remains an error before activation.
                        if ((flags & SCRIPT_ENABLE_CHECKDATASIG) == 0) {
                            return set_error(serror, SCRIPT_ERR_BAD_OPCODE);
                        }

                        // (sig message pubkey -- bool)
                        if (stack.size() < 3) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        valtype &vchSig = stacktop(-3);
                        valtype &vchMessage = stacktop(-2);
                        valtype &vchPubKey = stacktop(-1);

                        if (!CheckDataSignatureEncoding(vchSig, flags,
                                                        serror) ||
                            !CheckPubKeyEncoding(vchPubKey, flags, serror)) {
                            // serror is set
                            return false;
                        }

                        bool fSuccess = false;
                        if (vchSig.size()) {
                            valtype vchHash(32);
                            CSHA256()
                                .Write(vchMessage.data(), vchMessage.size())
                                .Finalize(vchHash.data());
                            uint256 message(vchHash);
                            CPubKey pubkey(vchPubKey);
                            fSuccess = pubkey.Verify(message, vchSig);
                        }

                        if (!fSuccess && (flags & SCRIPT_VERIFY_NULLFAIL) &&
                            vchSig.size()) {
                            return set_error(serror, SCRIPT_ERR_SIG_NULLFAIL);
                        }

                        popstack(stack);
                        popstack(stack);
                        popstack(stack);
                        stack.push_back(fSuccess ? vchTrue : vchFalse);
                        if (opcode == OP_CHECKDATASIGVERIFY) {
                            if (fSuccess) {
                                popstack(stack);
                            } else {
                                return set_error(serror,
                                                 SCRIPT_ERR_CHECKDATASIGVERIFY);
                            }
                        }
                    } break;
```

Sample Usage
------------

The following example shows a spend and redeem script for a basic use of CHECKDATASIG.  This example validates the signature of some data, provides a placeholder where you would then process that data, and finally allows one of 2 signatures to spend based on the outcome of the data processing.

### spend script:
```
push txsignature
push txpubkey
push msg
push sig
```
### redeem script:
```
                                (txsig, txpubkey msg, sig)
OP_OVER                         (txsig, txpubkey, msg, sig, msg)
push data pubkey                (txsig, txpubkey, msg, sig, msg, pubkey)
OP_CHECKDATASIGVERIFY           (txsig, txpubkey, msg)
```
Now that msg is on the stack top, the script can write predicates on it,
resulting in the message being consumed and a true/false condition left on the stack: (txpubkey, txsig, boolean)
```
OP_IF                           (txsig, txpubkey)
  OP_DUP                        (txsig, txpubkey, txpubkey)
  OP_HASH160                    (txsig, txpubkey, address)
  push <p2pkh spend address>    (txsig, txpubkey, address, p2pkh spend address)
  OP_EQUALVERIFY                (txsig, txpubkey)
  OP_CHECKSIG
OP_ELSE
  (same as if clause but a different <p2pkh spend address>)
OP_ENDIF
```

History
-------

This specification is based on Andrew Stone’s OP_DATASIGVERIFY proposal [6, 7]. It is modified from Stone's original proposal based on a synthesis of all the peer-review and feedback received [8].

References
----------

[1] [OP_CHECKSIG](https://en.bitcoin.it/wiki/OP_CHECKSIG)

[2] [Strict DER Encoding](https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki)

[3] [Low-S and Nullfail Specification](https://github.com/bitcoin/bips/blob/master/bip-0146.mediawiki)

[4] [Bitcoin ABC implementation](https://reviews.bitcoinabc.org/D1621)

[5] [Bitcoin ABC implementation update](https://reviews.bitcoinabc.org/D1646)

[6] [Andrew Stone’s OP_DATASIGVERIFY](https://github.com/BitcoinUnlimited/BitcoinUnlimited/blob/bucash1.3.0.0/doc/opdatasigverify.md)

[7] [Andrew Stone's article on Scripting](https://medium.com/@g.andrew.stone/bitcoin-scripting-applications-decision-based-spending-8e7b93d7bdb9)

[8] [Peer Review of Andrew Stone's Proposal](https://github.com/bitcoincashorg/bitcoincash.org/pull/10)
