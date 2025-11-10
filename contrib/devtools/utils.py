#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Common utility functions
"""

import os
import shutil
import sys
from typing import List


def determine_wellknown_cmd(envvar, progname) -> List[str]:
    maybe_env = os.getenv(envvar)
    maybe_which = shutil.which(progname)
    if maybe_env:
        # Well-known vars are often meant to be word-split
        return maybe_env.split(" ")
    elif maybe_which:
        return [maybe_which]
    else:
        sys.exit(f"{progname} not found")
