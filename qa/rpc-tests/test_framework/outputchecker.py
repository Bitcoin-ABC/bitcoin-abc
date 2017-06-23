#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
The OutputChecker class offers a way for tests to check for expected
strings in captured output streams (it is used by abc-cmdline.py for
checking captured stderr output of bitcoind processes at the moment).
"""

import tempfile


# Maximum amount of output (in bytes) to keep in memory before
# flushing to temporary file.
# Set to 0 to avoid Travis CI test failure due to MemoryError.
# Refer https://reviews.bitcoinabc.org/T53
MEMORY_BUFFER_SIZE = 0


class OutputChecker(object):
    '''
    An object which can record and check and output stream for
    occurrences of expected strings.
    '''
    def __init__(self, spooled_file_obj=None):
        # If initialized with a file object, use it, otherwise
        # create our own.
        if spooled_file_obj:
            self.output_file_obj = spooled_file_obj
        else:
            self.output_file_obj = tempfile.SpooledTemporaryFile(max_size=MEMORY_BUFFER_SIZE)
        # The output content that has already been checked
        self.already_checked_output = ''
        # The output content that has not yet been checked
        self.unchecked_output = ''

    def get_connector(self):
        """
        Return the file object that can be attacked to subprocess by Popen.

        >>> o = OutputChecker()
        >>> type(o.get_connector())
        <class 'tempfile.SpooledTemporaryFile'>
        """
        return self.output_file_obj

    def contains(self, pattern, check_all=False):
        """
        Checks for pattern in collected output.
        Pattern must be a fixed string, not a regular expression.
        If check_all is set, then it checks in all output which
        has been received, otherwise it only checks in output which has
        not been previously checked for any patterns.

        >>> import tempfile
        >>> import outputchecker
        >>> spool = tempfile.SpooledTemporaryFile(max_size=0, buffering=0)
        >>> o = outputchecker.OutputChecker(spool)
        >>> spool.write('hello world'.encode('utf-8'))
        11
        >>> spool.seek(0)
        >>> o.contains('hello world')
        True
        >>> o.contains('hello world', check_all=False)
        False
        >>> o.contains('hello world', check_all=True)
        True
        >>> spool.write('life as a unit test'.encode('utf-8'))
        19
        >>> spool.seek(0)
        >>> o.contains('life')
        True
        >>> o.contains('unit test', check_all=False)
        False
        >>> o.contains('unit test', check_all=True)
        True
        """
        found = False
        # Read any pending data into the unchecked outputs buffer
        self.output_file_obj.seek(0)
        self.unchecked_output += self.output_file_obj.read().decode('utf-8')
        if not check_all:
            found = self.unchecked_output.find(pattern)
            self.already_checked_output += self.unchecked_output
            self.unchecked_output = ''
        else:
            self.already_checked_output += self.unchecked_output
            self.unchecked_output = ''
            found = self.already_checked_output.find(pattern)
        return found != -1


if __name__ == "__main__":
    import doctest
    doctest.testmod()
