#!/bin/sh
hex=$(echo 319932 | xxd -r -p | base58 -d 25 || echo FAIL)
test "x${hex}" = "xFAIL"

done
