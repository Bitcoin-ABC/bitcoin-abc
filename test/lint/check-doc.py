#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

'''
This checks if all command line args are documented.
Return value is 0 to indicate no error.

Author: @MarcoFalke
'''

from subprocess import check_output
from pprint import PrettyPrinter
import glob
import re

TOP_LEVEL = 'git rev-parse --show-toplevel'
FOLDER_SRC = '/src/**/'
FOLDER_TEST = '/src/**/test/'

EXTENSIONS = ["*.c", "*.h", "*.cpp", "*.cc", "*.hpp"]
REGEX_ARG = r'(?:ForceSet|SoftSet|Get|Is)(?:Bool)?Args?(?:Set)?\(\s*"(-[^"]+)"'
REGEX_DOC = r'AddArg\(\s*"(-[^"=]+?)(?:=|")'

# list false positive unknows arguments
SET_FALSE_POSITIVE_UNKNOWNS = set(['-zmqpubhashblock',
                                   '-zmqpubhashtx',
                                   '-zmqpubrawblock',
                                   '-zmqpubrawtx'])


def main():
    top_level = check_output(TOP_LEVEL, shell=True,
                             universal_newlines=True).strip()
    source_files = []
    test_files = []

    for extension in EXTENSIONS:
        source_files += glob.glob(top_level +
                                  FOLDER_SRC + extension, recursive=True)
        test_files += glob.glob(top_level + FOLDER_TEST +
                                extension, recursive=True)

    files = set(source_files) - set(test_files)

    args_used = set()
    args_docd = set()
    for file in files:
        with open(file, 'r') as f:
            content = f.read()
            args_used |= set(re.findall(re.compile(REGEX_ARG), content))
            args_docd |= set(re.findall(re.compile(REGEX_DOC), content))

    args_used |= SET_FALSE_POSITIVE_UNKNOWNS
    args_need_doc = args_used - args_docd
    args_unknown = args_docd - args_used

    pp = PrettyPrinter()
    print("Args used        : {}".format(len(args_used)))
    print("Args documented  : {}".format(len(args_docd)))
    print("Args undocumented: {}".format(len(args_need_doc)))
    pp.pprint(args_need_doc)
    print("Args unknown     : {}".format(len(args_unknown)))
    pp.pprint(args_unknown)


if __name__ == "__main__":
    main()
