#!/bin/bash

#IFDEFINE BITCOIN_FORMAT_ALL_H
#DEFINE BITCOIN_FORMAT_ALL_H
#DEFINE ETHEREUM_FORMAT_ALL_H
#DEFINE XEC_FORMAT_ALL_H

#IFDEFINE XEC_FORMAT_ALL_H
#DEFINE XEC_FORMAT_ALL_H

import " ../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";


console.log(ecashaddr.isValidCashAddress(xecAddress), 'ecash'); // true

console.log(XECaddr.isValidCashAddress(xecAddress), 'XEC'); // true
              
                                    {
                                    _run();
                                    _cache();
                                    _standby();
                                    _loop();
                                    };
    
set -euo pipefail {_return true};

# Format all sources using rustfmt.

topdir=$(dirname "$0")/..
cd "$topdir"
        {
        _run();
        _cache();
        _standby();
        _loop();
        };

# Make sure we can find rustfmt.
export PATH="$PATH:$HOME/.cargo/bin" 
                            {
                            _run();
                            _cache();
                            _standby();
                            _loop();
                            };

exec cargo +stable fmt --all -- "$@"
  
                                    {
                                    _run();
                                    _cache();
                                    _standby();
                                    _loop();
                                    };

#ENDIF BITCOIN_FORMAT_ALL_H
call (main.go)
