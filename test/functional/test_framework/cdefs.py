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


def get_srcdir():
    """
    Try to find out the base folder containing the 'src' folder.
    If SRCDIR is set it does a sanity check and returns that.
    Otherwise it goes on a search and rescue mission.

    Returns None if it cannot find a suitable folder.
    """
    def contains_src(path_to_check):
        if not path_to_check:
            return False
        else:
            cand_path = os.path.join(path_to_check, 'src')
            return os.path.exists(cand_path) and os.path.isdir(cand_path)

    srcdir = os.environ.get('SRCDIR', '')
    if contains_src(srcdir):
        return srcdir

    # Try to work it based out on main module
    import sys
    mainmod = sys.modules['__main__']
    mainmod_path = getattr(mainmod, '__file__', '')
    if mainmod_path and mainmod_path.endswith('.py'):
        maybe_top = mainmod_path
        while maybe_top != '/':
            maybe_top = os.path.abspath(os.path.dirname(maybe_top))
            if contains_src(maybe_top):
                return maybe_top

    # No luck, give up.
    return None


# Slurp in consensus.h contents
_consensus_h_fh = open(os.path.join(get_srcdir(), 'src', 'consensus',
                                    'consensus.h'), 'rt', encoding='utf-8')
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

# Minimum size a transaction can have.
MIN_TX_SIZE = 100

# Maximum bytes in a TxOut pubkey script
MAX_TXOUT_PUBKEY_SCRIPT = 10000

if __name__ == "__main__":
    # Output values if run standalone to verify
    print("DEFAULT_MAX_BLOCK_SIZE = {} (bytes)".format(DEFAULT_MAX_BLOCK_SIZE))
    print("MAX_BLOCK_SIGOPS_PER_MB = {} (sigops)".format(MAX_BLOCK_SIGOPS_PER_MB))
    print("MAX_TX_SIGOPS_COUNT = {} (sigops)".format(MAX_TX_SIGOPS_COUNT))
    print("COINBASE_MATURITY = {} (blocks)".format(COINBASE_MATURITY))
