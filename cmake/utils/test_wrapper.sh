#!/bin/sh

export LC_ALL=C.UTF-8

# USAGE test_wrapper.sh executable log [args]
# Run the <executable> with supplied <args> arguments.
# The stdout and stderr outputs are redirected to the <log> file, which is only
# printed on error.

LOG="$1"
shift 1

"$@" > "${LOG}" 2>&1 || (cat "${LOG}" && exit 1)
