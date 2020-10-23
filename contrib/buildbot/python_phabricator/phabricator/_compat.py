import sys

PY3 = sys.version_info[0] >= 3

try:
    from collections.abc import MutableMapping
except ImportError:
    from collections import MutableMapping

try:
    from urllib import urlencode
except ImportError:
    from urllib.parse import urlencode

if PY3:
    str_type = str
    string_types = str,

    def iteritems(d, **kw):
        return iter(d.items(**kw))
else:
    str_type = unicode
    string_types = basestring,

    def iteritems(d, **kw):
        return d.iteritems(**kw)
