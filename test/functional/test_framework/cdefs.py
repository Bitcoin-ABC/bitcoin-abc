#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Imports some application default values from source files outside the test
framework, and defines equivalents of consensus parameters for the test
framework.
"""

import os
import re

from test_framework.util import get_srcdir

# Slurp in consensus.h contents
_consensus_h_fh = open(os.path.join(get_srcdir(), 'src', 'consensus',
                                    'consensus.h'), 'rt')
_consensus_h_contents = _consensus_h_fh.read()
_consensus_h_fh.close()

# This constant is currently needed to evaluate some that are formulas
ONE_MEGABYTE = 1000000

# Extract relevant default values parameters

# The maximum allowed block size before the fork
LEGACY_MAX_BLOCK_SIZE = ONE_MEGABYTE

# Default setting for maximum allowed size for a block, in bytes
DEFAULT_MAX_BLOCK_SIZE = eval(
    re.search(r'DEFAULT_MAX_BLOCK_SIZE = (.+);',
              _consensus_h_contents).group(1))

# The following consensus parameters should not be automatically imported.
# They *should* cause test failures if application code is changed in ways
# that violate current consensus.

# The maximum allowed number of signature check operations per MB in a block
# (network rule)
MAX_BLOCK_SIGOPS_PER_MB = 20000

# The maximum allowed number of signature check operations per transaction
# (network rule)
MAX_TX_SIGOPS_COUNT = 20000

# The maximum number of sigops we're willing to relay/mine in a single tx
# (policy.h constant)
MAX_STANDARD_TX_SIGOPS = MAX_TX_SIGOPS_COUNT // 5

# Coinbase transaction outputs can only be spent after this number of new
# blocks (network rule)
COINBASE_MATURITY = 100

# Anti replay OP_RETURN commitment.
ANTI_REPLAY_COMMITMENT = b"Bitcoin: A Peer-to-Peer Electronic Cash System"

if __name__ == "__main__":
    # Output values if run standalone to verify
    print("DEFAULT_MAX_BLOCK_SIZE = %d (bytes)" % DEFAULT_MAX_BLOCK_SIZE)
    print("MAX_BLOCK_SIGOPS_PER_MB = %d (sigops)" % MAX_BLOCK_SIGOPS_PER_MB)
    print("MAX_TX_SIGOPS_COUNT = %d (sigops)" % MAX_TX_SIGOPS_COUNT)
    print("COINBASE_MATURITY = %d (blocks)" % COINBASE_MATURITY)
