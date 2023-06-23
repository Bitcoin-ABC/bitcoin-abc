#!/usr/bin/env python3
#
# Electron Cash - a lightweight Bitcoin Cash client
# CashFusion - an advanced coin anonymizer
#
# Copyright (C) 2020 Mark B. Lundeberg
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
from electrumabc.i18n import _

fullname = _("CashFusion")
description = [
    _(
        "Protect your privacy and anonymize your coins (UTXOs) by shuffling them with"
        " other users of CashFusion."
    ),
    "\n\n",
    _(
        "A commitment and anonymous announcement scheme is used so that none of the"
        " participants know the inputs nor outputs of the other participants."
    ),
    " ",
    _(
        "In addition, a blame protocol is used to mitigate time-wasting"
        " denial-of-service type attacks."
    ),
]
description_delimiter = ""
available_for = ["qt", "cmdline"]
# If default_on is set to True, this plugin is loaded by default on new installs
default_on = True
