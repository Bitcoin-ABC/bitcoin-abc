#!/usr/bin/env python3
#
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Lint python format : This program checks that the old python fomatting method
# is not being used (formatting with "string %s" % content).
# The new "{}".format(content) or f"{} content" method should be used instead.
# Usage of the % formatter is expected to be deprecated by python in the
# future.

import re
import sys
from doctest import testmod


def is_complete(snippet):
    r"""Check if a code snippet is complete.

    >>> is_complete("a = [1, 2, 3]")
    True
    >>> is_complete("a = [1,")
    False
    >>> is_complete("a = [1, (")
    False
    >>> is_complete("a = [")
    False
    >>> is_complete("a = [1, {")
    False
    >>> is_complete('a = [1, 2, "%d" %    \\')
    False
    >>> is_complete('a = [1, 2, \"\"\"')
    False
    >>> is_complete('"%s" %')
    False
    """
    can_continue = [',', '(', '[', '{', '\\', '"""', '%']
    return not any(snippet.strip().endswith(end) for end in can_continue)


def build_replacement(error):
    r"""Replace a snippet using the % formatter with a version using .format().

    >>> build_replacement('"test %s" % "1"')
    '"test {}".format("1")'
    >>> build_replacement('"test %s" % ("1")')
    '"test {}".format("1")'
    >>> build_replacement('"test %.2f" % 3.1415')
    '"test {:.2f}".format(3.1415)'
    >>> build_replacement('"test %s" \\\n% "1"')
    '"test {}".format("1")'
    >>> build_replacement('"test %s" %\\\n"1"')
    '"test {}".format("1")'
    >>> build_replacement('"test %s %s %s" % ("1", "2", "3")')
    '"test {} {} {}".format("1", "2", "3")'
    >>> build_replacement('"test %s %s %s" % \\\n("1", "2", "3")')
    '"test {} {} {}".format("1", "2", "3")'
    >>> build_replacement('"test %s %s %s" % \\\n("1",\n"2", "3")')
    '"test {} {} {}".format("1", "2", "3")'
    >>> build_replacement('"test %d" % 1')
    '"test {}".format(1)'
    >>> build_replacement('"test %i" % 1')
    '"test {}".format(1)'
    >>> build_replacement('"test %r" % "1"')
    '"test {!r}".format("1")'
    >>> build_replacement('"test %-10s" % "1"')
    '"test {:10s}".format("1")'
    >>> build_replacement('"test %s.%s" % ("1", "2")')
    '"test {}.{}".format("1", "2")'
    >>> build_replacement('"test %% %s %s" % ("1", "2")')
    '"test % {} {}".format("1", "2")'
    >>> build_replacement('"test %s %% %s" % ("1", "2")')
    '"test {} % {}".format("1", "2")'
    >>> build_replacement('"test %s %s %%" % ("1", "2")')
    '"test {} {} %".format("1", "2")'
    >>> build_replacement('"test %%%s%%%s%%" % ("1", "2")')
    '"test %{}%{}%".format("1", "2")'
    """
    # Inline the error snippet.
    # Replace line continuation ('\'), line breaks and their surrounding
    # spaces and indentation to a single space character
    replacement = re.sub(r"\s*\\\s+", " ", error, re.MULTILINE)
    replacement = re.sub(r"\s*(?:\r?\n|\r(?!\n))\s*",
                         " ", replacement, re.MULTILINE)

    # Escape the %% in 2 passes to avoid the % character to mess up with the
    # regexes
    # First change %% to \xec\xec then back \xec\xec to % (\xec is the infinity
    # symbol in extended ascii, it is unlikely to encounter it twice)
    replacement = re.sub(r"%%", "\xec\xec", replacement, re.MULTILINE)

    # Replace the specifiers, retaining their content.
    # E.g. %.2f => {:.2f}
    def specifier_sub(match):
        # There are some special cases to handle:
        #  - {:s} only works with strings, but %s worked with almost anything.
        #    To avoid type errors, just use {}
        #  - {:i} does not exists, it should be {:d} or better {}.
        #  - {:r} is invalid, the new syntax is {!r}
        #  - The left alignement marker (e.g. %-5s) is now the default, remove it
        specifier = match.group(1)
        specifier_converts_to_empty_brackets = ["s", "i", "d"]
        if specifier in specifier_converts_to_empty_brackets:
            return "{}"
        elif specifier == "r":
            return "{!r}"
        elif specifier.startswith("-"):
            return "{:" + specifier[1:] + "}"
        specifier = specifier.replace("i", "d")
        return "{:" + specifier + "}"

    (replacement, count) = re.subn(
        r"%([.-]?[0-9]*[a-zA-Z])", specifier_sub, replacement, flags=re.MULTILINE)

    # Replace the qualifier.
    # E.g % 42 => .format(42)
    # E.g. % (42, "my_string") => .format(42, "my_string")
    def single_qualifier_sub(match):
        qualifier = ".format(" + match.group(1).strip()
        # Where to close the parenthesis if there is a single specifier ?
        # It is whether at the end or before the first ',', ']', '}' (if
        # enclosed in a function call, a list or a dictionary).
        #
        # There is a special case to be handled when the qualifier is an array.
        # In this case, ensure there is one more ']' than '['.
        close_before = [",", "]", "}"]
        opening_count = 0
        for i, c in enumerate(qualifier):
            if c == "[":
                opening_count += 1
            if c in close_before:
                if(c == "]" and opening_count > 0):
                    opening_count -= 1
                    continue
                return qualifier[:i] + ")" + qualifier[i:]
        return qualifier + ")"

    def multi_qualifier_sub(match):
        # The closing parenthesis is already there as we are replacing a tuple
        qualifier = ".format(" + match.group(1).strip()
        return qualifier

    # There are 2 possible way to write the qualifier:
    #  - If there is a single qualifier, it can be set directly.
    #    E.g.: "%s" % "string"
    #  - It can always be set as a tuple:
    #    E.g.: "%s" % ("string")
    #    E.g.: "%s %s" % ("string1", "string2")
    #
    # Solution: try to find the pattern with the opening parenthesis first, then
    # fall back to no parenthesis.
    replacement = re.sub(r"\s*(?<!%)%\s+\(([^%]+)", multi_qualifier_sub,
                         replacement, flags=re.MULTILINE)
    replacement = re.sub(r"\s*(?<!%)%\s+([^%]+)", single_qualifier_sub, replacement,
                         flags=re.MULTILINE)

    # Second pass of %% escaping, replace \xec\xec with %
    replacement = re.sub(r"\xec\xec", "%", replacement, re.MULTILINE)

    return replacement


def find_snippets(file):
    """Find code snippets in the source file that contains the percent ('%')
    character"""
    with open(file, 'r', encoding='utf-8') as f:
        snippet_line = ""
        snippets = {}

        for line_number, line in enumerate(f):
            # Skip comments
            if not line.strip().startswith('#'):
                # If we are not already in a snippet and the line contains a %
                # character, start saving the snippet
                if not snippet_line and '%' in line:
                    snippet_line = str(line_number + 1)
                    snippets[snippet_line] = ""

                # In a snippet ?
                # - save the line
                # - check if the snippet is complete
                if snippet_line:
                    snippets[snippet_line] += line
                    if is_complete(line):
                        snippet_line = ""

    return snippets


def find_errors(file):
    """Extract snippets using the % symbol as a formatter with their line
    number"""
    pattern = re.compile(r"(?:\"|')\s*\\?\s+%\s+(?:\\\s+)?.+$", re.MULTILINE)
    snippets = find_snippets(file)
    return dict(
        [(l, s) for l, s in snippets.items() if pattern.search(s) is not None])


def main(file):
    r"""Print line number and code snippets using the % formatter from the file,
    and suggest a replacement using the .format() method.
    Output format is :
    (<line number>) <original snippet>
    => <replacement snippet>

    >>> main("test/lint/lint-python-format-tests.txt")
    (5) "test %s" % "string"
    => "test {}".format("string")
    (6) "pi %.2f" % 3.1415
    => "pi {:.2f}".format(3.1415)
    (9) "test %s" %
        "string"
    => "test {}".format("string")
    (11) "test %s" % \
        "string"
    => "test {}".format("string")
    (13) "test %s" \
        % "string"
    => "test {}".format("string")
    (15) "test %s %s %s" \
        % ("1", "2", "3")
    => "test {} {} {}".format("1", "2", "3")
    (17) "test %s %s %s" % \
        ("1", "2", "3")
    => "test {} {} {}".format("1", "2", "3")
    (19) "test %s %s %s" \
         % ("1",
        "2", "3")
    => "test {} {} {}".format("1", "2", "3")
    (22) "test %s %s %s" \
       % ("0" \
       + "1",
      "2", "3")
    => "test {} {} {}".format("0" + "1", "2", "3")
    (31) "test %s %s %s" \
        % ("1",
        "2", "3")
    => "test {} {} {}".format("1", "2", "3")
    (42) ["test %s" % "string"]
    => ["test {}".format("string")]
    (43) {"key1":"%s" % "value1", "key2":"value2"}
    => {"key1":"{}".format("value1"), "key2":"value2"}
    (44) f("%d" % len("string"), argument2)
    => f("{}".format(len("string")), argument2)
    (45) f("%d %s" % (len("string"), "argument1"), argument2)
    => f("{} {}".format(len("string"), "argument1"), argument2)
    (46) ["test %s %s" %
        ("string1", "string2")]
    => ["test {} {}".format("string1", "string2")]
    (50) ("%s" % "string1", "%s" % "string2")
    => ("{}".format("string1"), "{}".format("string2"))
    (51) ("%s" % "string1", "%s %s" % ("string2", "string3")
    => ("{}".format("string1"), "{} {}".format("string2", "string3")
    (52) ("%s %s" % ("string1", "string2"), "%s %s" % ("string3", "string4"))
    => ("{} {}".format("string1", "string2"), "{} {}".format("string3", "string4"))
    (55) ["test %05i %% %s" %
        (len("string1"),
        "%d %-10s %%" % (len("string2"),
            "string2"))]
    => ["test {:05d} % {}".format(len("string1"), "{} {:10s} %".format(len("string2"), "string2"))]
    (73) "test %s" % an_array[0]
    => "test {}".format(an_array[0])
    (75) "test %s" % an_array[0][0]
    => "test {}".format(an_array[0][0])
    (77) ["test %s" % an_array[0]]
    => ["test {}".format(an_array[0])]
    (79) {"test":" ["test %s" % an_array[0][0]]}
    => {"test":" ["test {}".format(an_array[0][0])]}
    """
    errors = find_errors(file)
    # Python dictionnaries do not guarantee ordering, sort by line number
    for line_number, error in sorted(errors.items(),
                                     key=lambda pair: int(pair[0])):
        replacement = build_replacement(error)
        print("({}) {}".format(line_number, error.rstrip()))
        print("=> " + replacement)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(testmod()[1])
    else:
        main(sys.argv[1])
