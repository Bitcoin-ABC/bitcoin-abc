#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import unittest

from testutil import AnyWith


class TestObject():
    mystr = 'value'
    mydict = {
        'item': 'value',
    }


def TestAnyWith(expected):
    aw = AnyWith(TestObject, expected)
    return aw.__eq__(TestObject())


class TestUtilTests(unittest.TestCase):
    def test_compareWrongType(self):
        # dict is not a TestObject
        self.assertRaisesRegex(
            AssertionError,
            "Argument class type did not match",
            AnyWith(
                TestObject,
                None).__eq__,
            {})

    def test_happyPaths(self):
        self.assertRaisesRegex(
            AssertionError, "Argument missing expected attribute", TestAnyWith, {
                'does-not-exist': None})
        self.assertRaisesRegex(
            AssertionError, "Argument missing expected attribute", TestAnyWith, {
                'does-not-exist': 'value'})
        self.assertRaisesRegex(AssertionError,
                               "Argument missing expected attribute",
                               TestAnyWith,
                               {'does-not-exist': {'item': 'value'}})

        TestAnyWith({'mystr': 'value'})
        self.assertRaisesRegex(
            AssertionError, "Argument attribute type did not match", TestAnyWith, {
                'mystr': None})
        self.assertRaisesRegex(
            AssertionError, "Argument attribute type did not match", TestAnyWith, {
                'mystr': {}})
        self.assertRaisesRegex(
            AssertionError, "Argument attribute value did not match", TestAnyWith, {
                'mystr': 'wrong value'})

        TestAnyWith({'mydict': {
            'item': 'value',
        }})
        self.assertRaisesRegex(
            AssertionError, "Argument attribute type did not match", TestAnyWith, {
                'mydict': 'value'})
        self.assertRaisesRegex(AssertionError, "Argument attribute value did not match", TestAnyWith, {'mydict': {
            'item-does-not-exist': 'value'
        }})
        self.assertRaisesRegex(AssertionError, "Argument attribute value did not match", TestAnyWith, {'mydict': {
            'item': None
        }})
        self.assertRaisesRegex(AssertionError, "Argument attribute value did not match", TestAnyWith, {'mydict': {
            'item': 'wrong value'
        }})


if __name__ == '__main__':
    unittest.main()
