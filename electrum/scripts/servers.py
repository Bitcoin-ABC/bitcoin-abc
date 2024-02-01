#!/usr/bin/env python3

import json

import util

from electrumabc.network import filter_version
from electrumabc.printerror import set_verbosity

set_verbosity(False)

servers = filter_version(util.get_peers())
print(json.dumps(servers, sort_keys=True, indent=4))
