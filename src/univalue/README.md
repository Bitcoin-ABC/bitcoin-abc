
# UniValue

## Summary

A universal value class, with JSON encoding and decoding.

UniValue is an abstract data type that may be a null, boolean, string,
number, array container, or a key/value dictionary container, nested to
an arbitrary depth.

This class is aligned with the JSON standard, [RFC
7159](https://tools.ietf.org/html/rfc7159.html).

## Motivation

UniValue is a reaction to json_spirit, seeking to minimize template
and memory use, providing a straightforward RAII class compatible with
link-time optimization and embedded uses.

## Installation

This project is a standard GNU
[autotools](https://www.gnu.org/software/automake/manual/html_node/Autotools-Introduction.html)
project.  Build and install instructions are available in the `INSTALL`
file provided with GNU autotools.

```
$ ./autogen.sh
$ ./configure
$ make
```

