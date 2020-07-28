#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import datetime
import fcntl
import os
import sys
import xml.etree.ElementTree as ET


class TestSuite:
    def __init__(self, name, report_dir):
        self.name = name
        self.test_cases = {}
        self.report_file = os.path.join(report_dir, '{}.xml'.format(self.name))

    def add_test_case(self, test_case):
        self.test_cases[test_case.test_id] = test_case

    def get_failed_tests(self):
        return [t for t in self.test_cases.values() if not t.test_success]

    def dump(self):
        # Calculate test suite duration as the sum of all test case duraration
        duration = round(sum([
            float(t.node.get('time', 0.0)) for t in self.test_cases.values()
        ]), 3)

        test_suite = ET.Element(
            'testsuite',
            {
                'name': self.name,
                'id': '0',
                'timestamp': datetime.datetime.now().isoformat('T'),
                'time': str(duration),
                'tests': str(len(self.test_cases)),
                'failures': str(len(self.get_failed_tests())),
            }
        )

        for test_case in self.test_cases.values():
            test_suite.append(test_case.node)

        report_dir = os.path.dirname(self.report_file)
        os.makedirs(report_dir, exist_ok=True)
        ET.ElementTree(test_suite).write(
            self.report_file,
            'UTF-8',
            xml_declaration=True,
        )

    def load(self):
        tree = ET.parse(self.report_file)

        xml_root = tree.getroot()
        assert xml_root.tag == 'testsuite'
        assert self.name == xml_root.get('name')

        for test_case in xml_root.findall('testcase'):
            self.add_test_case(TestCase(test_case))


class TestCase:
    def __init__(self, node):
        self.node = node
        self.test_success = self.node.find('failure') is None

    def __getattr__(self, attribute):
        if attribute == 'test_id':
            return self.classname + '/' + self.name

        return self.node.attrib[attribute]


class Lock:
    def __init__(self, suite, lock_dir):
        self.lock_file = os.path.join(lock_dir, '{}.lock'.format(suite))

    def __enter__(self):
        os.makedirs(os.path.dirname(self.lock_file), exist_ok=True)
        self.fd = open(self.lock_file, 'w', encoding='utf-8')
        fcntl.lockf(self.fd, fcntl.LOCK_EX)

    def __exit__(self, type, value, traceback):
        fcntl.lockf(self.fd, fcntl.LOCK_UN)
        self.fd.close()


def main(report_dir, lock_dir, suite, test):
    junit = '{}-{}.xml'.format(suite, test)
    if not os.path.isfile(junit):
        return 0

    tree = ET.parse(junit)

    # Junit root can be a single test suite or multiple test suites. The
    # later case is unsupported.
    xml_root = tree.getroot()
    if xml_root.tag != 'testsuite':
        raise AssertionError(
            "The parser only supports a single test suite per report")

    test_suite_name = xml_root.get('name')

    lock = Lock(suite, lock_dir)
    with lock:
        test_suite = TestSuite(test_suite_name, report_dir)
        if os.path.isfile(test_suite.report_file):
            test_suite.load()

        for child in xml_root:
            if child.tag != 'testcase' or (child.find('skipped') is not None):
                continue

            test_suite.add_test_case(TestCase(child))

        test_suite.dump()

    sys.exit(
        1 if test in [case.classname for case in test_suite.get_failed_tests()]
        else 0
    )


main(
    report_dir=sys.argv[1],
    lock_dir=sys.argv[2],
    suite=sys.argv[3],
    test=sys.argv[4],
)
