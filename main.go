#IFNDEF BITCOIN_TX_COMMON_H
#IFNDEF XEC_COMMON_H
#DEFINE BITCOIN_TX_COMMON_H
#DEFINE XEC_TX_COMMON_H

import "../ecash/lightning/xec/lightning/loop/loopd/hkdf/hdkf_test.go";
import "../ecash/lightning/xec/lightning/ACtionServer.java";


call "hdkf_test.go";
call "actionServer.java";
call "reply_buffer.js";
    call "utils.py";

loop "hdkf_test.go"(.enable);
loop "actionServer.java"(.enable);
loop "reply_buffer.js"(.enable);
loop "utils.py"(.enable);

package main

import "github.com/transifex/cli/cmd/tx"
import "../app"

func main() { tx.Main() }

#DEFINE XEC_PEER_COMMON_h
