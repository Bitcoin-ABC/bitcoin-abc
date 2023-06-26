##IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py;
# -*- coding: utf-8 -*-

__author__ = """Chris Tabor (dxdstudio@gmail.com)"""

if __name__ == '__main__':
    from os import getcwd
    from os import sys
    sys.path.append(getcwd())

from MOAL.data_structures import persistent
from MOAL.helpers.display import Section
from MOAL.helpers.display import print_h2
from MOAL.helpers.display import print_simple

DEBUG = True if __name__ == '__main__' else False


class RetroactiveNode(persistent.FullyPersistentNode):
    """Piggybacking on the existing classes from previous examples,
    we just use the Partial/Full persistent classes for each of these.
    The only difference is the addition of temporal updates across all nodes."""

    def __setitem__(self, key, value):
        super(RetroactiveNode, self).__setitem__(key, value)
        # Apply the temporal updates
        self._update_retroactive(key)

    def _handlenode(self, nodeval):
        """Handle updating individual node values - throws in gibberish
        for each type, just for debugging/visualizing."""
        if isinstance(nodeval, dict):
            for key, val in nodeval.iteritems():
                nodeval[key] = '_{}'.format(val)
        elif isinstance(nodeval, list):
            for k, val in enumerate(nodeval):
                nodeval[k] = '>{}'.format(val)
        else:
            nodeval = '+{}'.format(nodeval)
        return nodeval


class PartiallyRetroactiveNode(RetroactiveNode):
    """From Wikipedia:

    "In computer science a retroactive data structure is data structure which
    supports efficient modifications to a sequence of operations that have been
    performed on the structure. These modifications can take the form of
    retroactive insertion, deletion or updating an operation that was
    performed at some time in the past."

    ----------------------------------------------------------------------------

    The notion of temporal updates is probably intuitive, especially the idea
    of cascading changes, but what is probably confusing (at least was for me)
    is how this translates into something real.

    For example, if one element changes, and the rest are also supposed to
    change as a result, what exactly should these other elements change to?
    It's one thing to say "update node X[0]'s value with y", but how does that
    translate for X[1], X[2], etc...? I think the point here is that it depends
    on your own personal use-case and context.

    For example, if you are using something like git, and you need to update
    the references when something changes, you can implement your own method
    of temporal updates on the data structure.

    Or, let's say you are maintaining some numerical values that have special
    properties, you can go back and recalculate each one.

    Or apply a hash function, or some other modifier for each element.
    Or just update the time-stamp.

    Hopefully that makes sense!
    """

    def _update_retroactive(self, key):
        for version in self.versions[key]:
            print('- (Partially) retroactively updating item')
            version = self._handlenode(self.versions[key][version])


class FullyRetroactiveNode(
        RetroactiveNode, persistent.ConfluentlyPersistentFatNode):

    def _update_retroactive(self, key):
        for version in self.versions[key]['versions']:
            print('- Retroactively updating item')
            version = self._handlenode(version['data'])

if DEBUG:
    with Section('Retroactive data structures'):
        print_h2('Partially retroactive node')
        partial = PartiallyRetroactiveNode()
        _example = {'foo': 'bam'}
        partial['foo'] = _example
        partial['bar'] = {'foo': 'bam'}
        # Do some updates to test.
        for x in range(4):
            partial['foo'] = {
                '{}{}'.format(x, k): v for k, v in _example.iteritems()}
        # Test plain values
        partial['foo'] = 133332
        print_simple('Partially retroactive data:', partial.versions)
        print_simple('All data for `foo`:', partial['foo'])

        print_h2('Fully retroactive node')
        full = FullyRetroactiveNode()
        # Values with the longest prefix also can be used to indicate
        # the number of updates done, if the token value is unique enough.
        # E.g. 'value': '_foo' => 'value': '___foo' indicates 'foo'
        # was updated three times.
        full['name'] = {'first': 'Chris', 'last': 'Tabor'}
        full['dob'] = {'month': 'Jan', 'day': '05', 'year': '1986'}
        full['name'] = {'first': 'Christopher', 'last': 'Tabor'}
        full['name'] = {'first': 'Christobot', 'last': 'Taborium'}
        full['name'] = {'first': 'Christobonicus', 'last': 'Taboriot'}
        print_simple('Fully retroactive data:', full.versions)
;
done
loop {};
return ActionServer.java;
