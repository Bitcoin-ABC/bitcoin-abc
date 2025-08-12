# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the Iguana Script debugger."""

import os
import subprocess

from test_framework.hash import hash160
from test_framework.key import ECKey
from test_framework.messages import COutPoint, CTransaction, CTxIn
from test_framework.script import (
    OP_2DUP,
    OP_ADD,
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_DROP,
    OP_DUP,
    OP_EQUAL,
    OP_HASH160,
    OP_NOP,
    OP_NOT,
    OP_TOALTSTACK,
    CScript,
)
from test_framework.signature_hash import (
    SIGHASH_ALL,
    SIGHASH_FORKID,
    SignatureHashForkId,
)


def iguana(*args, expected_stderr="", expected_returncode=None):
    if expected_returncode is None:
        expected_returncode = 255 if expected_stderr else 0

    command = [os.environ["IGUANA_BIN"], *args]
    if emulator := os.environ.get("EMULATOR", None):
        command.insert(0, emulator)

    child = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    actual_stdout, actual_stderr = child.communicate()
    assert actual_stderr.decode() == expected_stderr
    assert child.returncode == expected_returncode
    return actual_stdout.decode()


def test_version():
    assert iguana("-version").startswith(
        f"Iguana v{os.environ['CMAKE_PROJECT_VERSION']}"
    )


def test_help():
    assert iguana("-?").startswith("Usage:  iguana")


def test_parse_error():
    iguana(
        "-invalidarg",
        expected_stderr="Error parsing command line arguments: Invalid parameter -invalidarg\n",
    )


def test_invalid_format():
    iguana(
        "-format=doesntexist",
        expected_stderr="Unsupported output format doesntexist\n",
    )


def test_invalid_inputindex():
    tx = CTransaction()
    iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=",
        "-value=0",
        expected_stderr="Transaction doesn't have input index 0\n",
    )


def test_sig_push_only():
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"\x31", OP_DUP]))]

    def run(fmt, expected_stderr):
        return iguana(
            "-tx=" + tx.serialize().hex(),
            "-inputindex=0",
            "-scriptpubkey=",
            "-value=0",
            f"-format={fmt}",
            expected_stderr=expected_stderr,
            expected_returncode=255,
        )

    assert (
        run(
            "human",
            expected_stderr="scriptSig failed execution: Only push operators allowed in signatures\n",
        )
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 31
       Stack (1 item):
         0: 31
OP  1: OP_DUP
"""
    )
    assert (
        run("csv", "")
        == """\
scriptName,index,opcode,stack 0,
scriptSig,0,0x31,"31",
scriptSig,1,OP_DUP,
scriptSig failed execution: Only push operators allowed in signatures
"""
    )


def test_script_sig_success():
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"\x31"]))]

    def run(fmt):
        return iguana(
            "-tx=" + tx.serialize().hex(),
            "-inputindex=0",
            "-scriptpubkey=",
            "-value=0",
            f"-format={fmt}",
        )

    assert (
        run("human")
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 31
======= scriptPubKey =======
       Stack (1 item):
         0: 31
Script executed without errors
"""
    )
    assert (
        run("csv")
        == """\
scriptName,index,opcode,stack 0,
scriptSig,0,0x31,"31",
#sigChecks,0
Script executed without errors
"""
    )


def test_script_sig_invalid_opcode_encoding():
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript(b"\x01"))]

    def run(fmt, expected_stderr):
        return iguana(
            "-tx=" + tx.serialize().hex(),
            "-inputindex=0",
            "-scriptpubkey=",
            "-value=0",
            f"-format={fmt}",
            expected_stderr=expected_stderr,
            expected_returncode=255,
        )

    assert (
        run(
            "human",
            expected_stderr="scriptSig failed execution: Invalidly encoded opcode\n",
        )
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
"""
    )
    assert (
        run("csv", "")
        == """\
scriptName,index,opcode,
scriptSig failed execution: Invalidly encoded opcode
"""
    )


def test_script_pub_key_success():
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"\x31", b"\x32"]))]
    script_pub_key = CScript([OP_ADD, b"\x63", OP_EQUAL])

    def run(fmt):
        return iguana(
            "-tx=" + tx.serialize().hex(),
            "-inputindex=0",
            "-scriptpubkey=" + script_pub_key.hex(),
            "-value=0",
            f"-format={fmt}",
        )

    assert (
        run("human")
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 31
       Stack (1 item):
         0: 31
OP  1: 0x01 32
======= scriptPubKey =======
       Stack (2 items):
         0: 31
         1: 32
OP  0: OP_ADD
       Stack (1 item):
         0: 63
OP  1: 0x01 63
       Stack (2 items):
         0: 63
         1: 63
OP  2: OP_EQUAL
       Stack (1 item):
         0: 01
Script executed without errors
"""
    )
    assert (
        run("csv")
        == """\
scriptName,index,opcode,stack 0,stack 1,
scriptSig,0,0x31,"31",
scriptSig,1,0x32,"31","32",
scriptPubKey,0,OP_ADD,"63",
scriptPubKey,1,0x63,"63","63",
scriptPubKey,2,OP_EQUAL,"01",
#sigChecks,0
Script executed without errors
"""
    )


def test_script_pub_key_failure():
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"\x31"]))]
    script_pub_key = CScript([OP_EQUAL])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="scriptPubKey failed execution: Operation not valid with the current stack size\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 31
======= scriptPubKey =======
       Stack (1 item):
         0: 31
OP  0: OP_EQUAL
"""
    )


def test_script_pub_key_empty_stack():
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"\x31"]))]
    script_pub_key = CScript([OP_DROP])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="scriptPubKey failed execution: Script evaluated without error but finished with a false/empty top stack element\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 31
======= scriptPubKey =======
       Stack (1 item):
         0: 31
OP  0: OP_DROP
"""
    )


def test_script_pub_key_false_stack():
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"\x31"]))]
    script_pub_key = CScript([OP_NOT])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="scriptPubKey failed execution: Script evaluated without error but finished with a false/empty top stack element\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 31
======= scriptPubKey =======
       Stack (1 item):
         0: 31
OP  0: OP_NOT
"""
    )


def test_script_pub_key_cleanstack():
    tx = CTransaction()
    script_pub_key = CScript([1])
    tx.vin = [CTxIn(COutPoint(), CScript([0]))]
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="scriptPubKey failed execution: Stack size must be exactly one after execution\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: OP_0
======= scriptPubKey =======
       Stack (1 item):
         0: ""
OP  0: OP_1
       Stack (2 items):
         0: ""
         1: 01
"""
    )


def test_redeem_script_success():
    redeem_script = CScript([OP_TOALTSTACK, b"\x63", OP_EQUAL])
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"\x63", b"alt!", bytes(redeem_script)]))]
    script_hash = hash160(redeem_script)
    script_pub_key = CScript([OP_HASH160, script_hash, OP_EQUAL])

    def run(fmt):
        return iguana(
            "-tx=" + tx.serialize().hex(),
            "-inputindex=0",
            "-scriptpubkey=" + script_pub_key.hex(),
            "-value=0",
            f"-format={fmt}",
        )

    assert (
        run("human")
        == f"""\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 63
       Stack (1 item):
         0: 63
OP  1: 0x04 {b"alt!".hex()}
       Stack (2 items):
         0: 63
         1: {b"alt!".hex()}
OP  2: 0x04 {redeem_script.hex()}
======= scriptPubKey =======
       Stack (3 items):
         0: 63
         1: {b"alt!".hex()}
         2: {redeem_script.hex()}
OP  0: OP_HASH160
       Stack (3 items):
         0: 63
         1: {b"alt!".hex()}
         2: {script_hash.hex()}
OP  1: 0x14 {script_hash.hex()}
       Stack (4 items):
         0: 63
         1: {b"alt!".hex()}
         2: {script_hash.hex()}
         3: {script_hash.hex()}
OP  2: OP_EQUAL
       Stack (3 items):
         0: 63
         1: {b"alt!".hex()}
         2: 01
======= redeemScript =======
       Stack (2 items):
         0: 63
         1: {b"alt!".hex()}
OP  0: OP_TOALTSTACK
       Stack (1 item):
         0: 63
       Altstack (1 item):
         0: {b"alt!".hex()}
OP  1: 0x01 63
       Stack (2 items):
         0: 63
         1: 63
       Altstack (1 item):
         0: {b"alt!".hex()}
OP  2: OP_EQUAL
       Stack (1 item):
         0: 01
       Altstack (1 item):
         0: {b"alt!".hex()}
Script executed without errors
"""
    )
    assert (
        run("csv")
        == f"""\
scriptName,index,opcode,stack 0,stack 1,stack 2,stack 3,altstack 0,
scriptSig,0,0x63,"63",
scriptSig,1,0x{b"alt!".hex()},"63","{b"alt!".hex()}",
scriptSig,2,0x{redeem_script.hex()},"63","{b"alt!".hex()}","{redeem_script.hex()}",
scriptPubKey,0,OP_HASH160,"63","{b"alt!".hex()}","{script_hash.hex()}",
scriptPubKey,1,0x{script_hash.hex()},"63","{b"alt!".hex()}","{script_hash.hex()}","{script_hash.hex()}",
scriptPubKey,2,OP_EQUAL,"63","{b"alt!".hex()}","01",
redeemScript,0,OP_TOALTSTACK,"63",,,,"{b"alt!".hex()}",
redeemScript,1,0x63,"63","63",,,"{b"alt!".hex()}",
redeemScript,2,OP_EQUAL,"01",,,,"{b"alt!".hex()}",
#sigChecks,0
Script executed without errors
"""
    )


def test_redeem_script_error():
    redeem_script = CScript([OP_CHECKSIG])
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"wrong", b"sig", bytes(redeem_script)]))]
    script_pub_key = CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="redeemScript failed execution: Non-canonical DER signature\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x05 77726f6e67
       Stack (1 item):
         0: 77726f6e67
OP  1: 0x03 736967
       Stack (2 items):
         0: 77726f6e67
         1: 736967
OP  2: 0x01 ac
======= scriptPubKey =======
       Stack (3 items):
         0: 77726f6e67
         1: 736967
         2: ac
OP  0: OP_HASH160
       Stack (3 items):
         0: 77726f6e67
         1: 736967
         2: 17be79cf51aa88feebb0a25e9d6a153ead585e59
OP  1: 0x14 17be79cf51aa88feebb0a25e9d6a153ead585e59
       Stack (4 items):
         0: 77726f6e67
         1: 736967
         2: 17be79cf51aa88feebb0a25e9d6a153ead585e59
         3: 17be79cf51aa88feebb0a25e9d6a153ead585e59
OP  2: OP_EQUAL
       Stack (3 items):
         0: 77726f6e67
         1: 736967
         2: 01
======= redeemScript =======
       Stack (2 items):
         0: 77726f6e67
         1: 736967
OP  0: OP_CHECKSIG
"""
    )


def test_redeem_script_exception():
    redeem_script = CScript([OP_ADD])
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([b"111111", b"222222", bytes(redeem_script)]))]
    script_hash = hash160(redeem_script)
    script_pub_key = CScript([OP_HASH160, script_hash, OP_EQUAL])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="redeemScript failed execution: Integer overflow\n",
    )
    assert (
        stdout
        == f"""\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x06 313131313131
       Stack (1 item):
         0: 313131313131
OP  1: 0x06 323232323232
       Stack (2 items):
         0: 313131313131
         1: 323232323232
OP  2: 0x01 93
======= scriptPubKey =======
       Stack (3 items):
         0: 313131313131
         1: 323232323232
         2: 93
OP  0: OP_HASH160
       Stack (3 items):
         0: 313131313131
         1: 323232323232
         2: {script_hash.hex()}
OP  1: 0x14 {script_hash.hex()}
       Stack (4 items):
         0: 313131313131
         1: 323232323232
         2: {script_hash.hex()}
         3: {script_hash.hex()}
OP  2: OP_EQUAL
       Stack (3 items):
         0: 313131313131
         1: 323232323232
         2: 01
======= redeemScript =======
       Stack (2 items):
         0: 313131313131
         1: 323232323232
OP  0: OP_ADD
"""
    )


def test_redeem_script_empty_stack():
    redeem_script = CScript([OP_NOP])
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([bytes(redeem_script)]))]
    script_pub_key = CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="redeemScript failed execution: Script evaluated without error but finished with a false/empty top stack element\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 61
======= scriptPubKey =======
       Stack (1 item):
         0: 61
OP  0: OP_HASH160
       Stack (1 item):
         0: 994355199e516ff76c4fa4aab39337b9d84cf12b
OP  1: 0x14 994355199e516ff76c4fa4aab39337b9d84cf12b
       Stack (2 items):
         0: 994355199e516ff76c4fa4aab39337b9d84cf12b
         1: 994355199e516ff76c4fa4aab39337b9d84cf12b
OP  2: OP_EQUAL
       Stack (1 item):
         0: 01
======= redeemScript =======
       Stack (0 items): (empty stack)
OP  0: OP_NOP
"""
    )


def test_redeem_script_false():
    redeem_script = CScript([0])
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([bytes(redeem_script)]))]
    script_pub_key = CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="redeemScript failed execution: Script evaluated without error but finished with a false/empty top stack element\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x01 00
======= scriptPubKey =======
       Stack (1 item):
         0: 00
OP  0: OP_HASH160
       Stack (1 item):
         0: 9f7fd096d37ed2c0e3f7f0cfc924beef4ffceb68
OP  1: 0x14 9f7fd096d37ed2c0e3f7f0cfc924beef4ffceb68
       Stack (2 items):
         0: 9f7fd096d37ed2c0e3f7f0cfc924beef4ffceb68
         1: 9f7fd096d37ed2c0e3f7f0cfc924beef4ffceb68
OP  2: OP_EQUAL
       Stack (1 item):
         0: 01
======= redeemScript =======
       Stack (0 items): (empty stack)
OP  0: OP_0
"""
    )


def test_redeem_script_cleanstack():
    redeem_script = CScript([0, 1])
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint(), CScript([bytes(redeem_script)]))]
    script_pub_key = CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=0",
        expected_stderr="redeemScript failed execution: Stack size must be exactly one after execution\n",
    )
    assert (
        stdout
        == """\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x02 0051
======= scriptPubKey =======
       Stack (1 item):
         0: 0051
OP  0: OP_HASH160
       Stack (1 item):
         0: 5cbe818a2be9df5479d201af59df9c0bdfaaf21e
OP  1: 0x14 5cbe818a2be9df5479d201af59df9c0bdfaaf21e
       Stack (2 items):
         0: 5cbe818a2be9df5479d201af59df9c0bdfaaf21e
         1: 5cbe818a2be9df5479d201af59df9c0bdfaaf21e
OP  2: OP_EQUAL
       Stack (1 item):
         0: 01
======= redeemScript =======
       Stack (0 items): (empty stack)
OP  0: OP_0
       Stack (1 item):
         0: ""
OP  1: OP_1
       Stack (2 items):
         0: ""
         1: 01
"""
    )


def test_redeem_script_input_sigchecks():
    key = ECKey()
    key.set(b"12345678" * 4, True)
    redeem_script = CScript([OP_2DUP, OP_CHECKSIGVERIFY] * 3 + [OP_CHECKSIG])
    script_hash = hash160(redeem_script)
    script_pub_key = CScript([OP_HASH160, script_hash, OP_EQUAL])
    tx = CTransaction()
    tx.vin = [CTxIn(COutPoint())]
    amount = 1999
    sighash = SignatureHashForkId(
        redeem_script, tx, 0, SIGHASH_ALL | SIGHASH_FORKID, amount
    )
    sig = key.sign_schnorr(sighash) + b"\x41"
    pubkey = key.get_pubkey().get_bytes()
    tx.vin[0].scriptSig = CScript([sig, pubkey, bytes(redeem_script)])
    stdout = iguana(
        "-tx=" + tx.serialize().hex(),
        "-inputindex=0",
        "-scriptpubkey=" + script_pub_key.hex(),
        "-value=1999",
        expected_stderr="redeemScript failed execution: Input SigChecks limit exceeded\n",
    )
    assert (
        stdout
        == f"""\
======= scriptSig =======
       Stack (0 items): (empty stack)
OP  0: 0x41 {sig.hex()}
       Stack (1 item):
         0: {sig.hex()}
OP  1: 0x21 {pubkey.hex()}
       Stack (2 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
OP  2: 0x07 {redeem_script.hex()}
======= scriptPubKey =======
       Stack (3 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
         2: {redeem_script.hex()}
OP  0: OP_HASH160
       Stack (3 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
         2: {script_hash.hex()}
OP  1: 0x14 {script_hash.hex()}
       Stack (4 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
         2: {script_hash.hex()}
         3: {script_hash.hex()}
OP  2: OP_EQUAL
       Stack (3 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
         2: 01
======= redeemScript =======
       Stack (2 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
OP  0: OP_2DUP
       Stack (4 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
         2: {sig.hex()}
         3: {pubkey.hex()}
OP  1: OP_CHECKSIGVERIFY
       Stack (2 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
OP  2: OP_2DUP
       Stack (4 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
         2: {sig.hex()}
         3: {pubkey.hex()}
OP  3: OP_CHECKSIGVERIFY
       Stack (2 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
OP  4: OP_2DUP
       Stack (4 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
         2: {sig.hex()}
         3: {pubkey.hex()}
OP  5: OP_CHECKSIGVERIFY
       Stack (2 items):
         0: {sig.hex()}
         1: {pubkey.hex()}
OP  6: OP_CHECKSIG
       Stack (1 item):
         0: 01
Number of sigChecks: 4
"""
    )
