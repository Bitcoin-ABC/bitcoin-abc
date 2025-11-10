#!/usr/bin/env python3
#
# Copyright (c) 2019-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from pprint import pformat


def AnyWith(cls, attrs=None):
    class AnyWith(cls):
        def __eq__(self, other):
            if not isinstance(other, cls):
                raise AssertionError(
                    f"Argument class type did not match.\nExpected:\n{pformat(cls)}\n\nActual:\n{pformat(other)}"
                )
            if attrs is not None:
                for attr, expectedValue in attrs.items():
                    if not hasattr(other, attr):
                        raise AssertionError(
                            f"Argument missing expected attribute:\n{pformat(attr)}\n\nArgument"
                            f" has:\n{pformat(dir(other))}"
                        )
                    actualValue = getattr(other, attr)
                    if not isinstance(expectedValue, type(actualValue)):
                        raise AssertionError(
                            "Argument attribute type did not"
                            f" match.\nExpected:\n{type(expectedValue).__name__}\n\nActual:\n{type(actualValue).__name__}\nFor expected"
                            f" value:\n{pformat(expectedValue)}"
                        )
                    if expectedValue != actualValue:
                        raise AssertionError(
                            "Argument attribute value did not"
                            f" match.\nExpected:\n{pformat(expectedValue)}\n\nActual:\n{pformat(actualValue)}"
                        )
            return True

    return AnyWith()
