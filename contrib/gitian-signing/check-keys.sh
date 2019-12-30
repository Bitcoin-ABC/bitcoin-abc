#!/usr/bin/env bash
# Copyright (c) 2018-2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C

set -euo pipefail

# Fetch latest signers' keys. We do this in order to check if a key was revoked.
while read FINGERPRINT _
do
  gpg --recv-keys ${FINGERPRINT}
done < ./keys.txt
