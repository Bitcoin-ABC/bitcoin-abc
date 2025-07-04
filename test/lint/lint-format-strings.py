#!/usr/bin/env python3
#
# Copyright (c) 2018-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Lint format strings: This program checks that the number of arguments passed
# to a variadic format string function matches the number of format specifiers
# in the format string.

import argparse
import doctest
import re
import sys

FALSE_POSITIVES = [
    ("src/dbwrapper.cpp", "vsnprintf(p, limit - p, format, backup_ap)"),
    ("src/index/base.cpp", "FatalError(const char *fmt, const Args &...args)"),
    (
        "src/netbase.cpp",
        (
            "LogConnectFailure(bool manual_connection, const char *fmt, const Args"
            " &...args)"
        ),
    ),
    (
        "src/clientversion.cpp",
        "strprintf(_(COPYRIGHT_HOLDERS).translated, COPYRIGHT_HOLDERS_SUBSTITUTION)",
    ),
    ("src/test/translation_tests.cpp", "strprintf(format, arg)"),
    (
        "src/validationinterface.cpp",
        'LogPrint(BCLog::VALIDATION, fmt "\\n", __VA_ARGS__)',
    ),
    ("src/tinyformat.h", "printf(const char *fmt, const Args &...args)"),
    ("src/tinyformat.h", "printf(const char *fmt, TINYFORMAT_VARARGS(n))"),
    (
        "src/wallet/wallet.h",
        'LogPrintf(("%s " + fmt).c_str(), GetDisplayName(), parameters...)',
    ),
    (
        "src/wallet/scriptpubkeyman.h",
        "WalletLogPrintf(std::string fmt, Params... parameters)",
    ),
    (
        "src/wallet/scriptpubkeyman.h",
        'LogPrintf(("%s " + fmt).c_str(), m_storage.GetDisplayName(), parameters...)',
    ),
    (
        "src/wallet/scriptpubkeyman.h",
        "WalletLogPrintf(const std::string& fmt, const Params&... parameters)",
    ),
]

FUNCTION_NAMES_AND_NUMBER_OF_LEADING_ARGUMENTS = [
    ("FatalError", 0),
    ("fprintf", 1),
    ("LogConnectFailure", 1),
    ("LogError", 0),
    ("LogWarning", 0),
    ("LogInfo", 0),
    ("LogDebug", 1),
    ("LogTrace", 1),
    ("LogPrint", 1),
    ("LogPrintf", 0),
    ("printf", 0),
    ("snprintf", 2),
    ("sprintf", 1),
    ("strprintf", 0),
    ("tfm::format", 1),  # Assuming tfm::::format(std::ostream&, ...
    ("vfprintf", 1),
    ("vprintf", 1),
    ("vsnprintf", 1),
    ("vsprintf", 1),
]


def parse_function_calls(function_name, source_code):
    """Return an array with all calls to function function_name in string source_code.
    Preprocessor directives and C++ style comments ("//") in source_code are removed.

    >>> len(parse_function_calls("foo", "foo();bar();foo();bar();"))
    2
    >>> parse_function_calls("foo", "foo(1);bar(1);foo(2);bar(2);")[0].startswith("foo(1);")
    True
    >>> parse_function_calls("foo", "foo(1);bar(1);foo(2);bar(2);")[1].startswith("foo(2);")
    True
    >>> len(parse_function_calls("foo", "foo();bar();// foo();bar();"))
    1
    >>> len(parse_function_calls("foo", "#define FOO foo();"))
    0
    """
    assert (
        isinstance(function_name, str)
        and isinstance(source_code, str)
        and function_name
    )
    lines = [
        re.sub("// .*", " ", line).strip()
        for line in source_code.split("\n")
        if not line.strip().startswith("#")
    ]
    return re.findall(
        r"[^a-zA-Z_](?=({}\(.*).*)".format(function_name), f" {' '.join(lines)}"
    )


def normalize(s):
    """Return a normalized version of string s with newlines, tabs and C style comments ("/* ... */")
    replaced with spaces. Multiple spaces are replaced with a single space.

    >>> normalize("  /* nothing */   foo\tfoo  /* bar */  foo     ")
    'foo foo foo'
    """
    assert isinstance(s, str)
    s = s.replace("\n", " ")
    s = s.replace("\t", " ")
    s = re.sub(r"/\*.*?\*/", " ", s)
    s = re.sub(" {2,}", " ", s)
    return s.strip()


ESCAPE_MAP = {
    r"\n": "[escaped-newline]",
    r"\t": "[escaped-tab]",
    r"\"": "[escaped-quote]",
}


def escape(s):
    """Return the escaped version of string s with "\\\"", "\\n" and "\\t" escaped as
    "[escaped-backslash]", "[escaped-newline]" and "[escaped-tab]".

    >>> unescape(escape("foo")) == "foo"
    True
    >>> escape(r'foo \\t foo \\n foo \\\\ foo \\ foo \\"bar\\"')
    'foo [escaped-tab] foo [escaped-newline] foo \\\\\\\\ foo \\\\ foo [escaped-quote]bar[escaped-quote]'
    """
    assert isinstance(s, str)
    for raw_value, escaped_value in ESCAPE_MAP.items():
        s = s.replace(raw_value, escaped_value)
    return s


def unescape(s):
    """Return the unescaped version of escaped string s.
    Reverses the replacements made in function escape(s).

    >>> unescape(escape("bar"))
    'bar'
    >>> unescape("foo [escaped-tab] foo [escaped-newline] foo \\\\\\\\ foo \\\\ foo [escaped-quote]bar[escaped-quote]")
    'foo \\\\t foo \\\\n foo \\\\\\\\ foo \\\\ foo \\\\"bar\\\\"'
    """
    assert isinstance(s, str)
    for raw_value, escaped_value in ESCAPE_MAP.items():
        s = s.replace(escaped_value, raw_value)
    return s


def parse_function_call_and_arguments(function_name, function_call):
    """Split string function_call into an array of strings consisting of:
    * the string function_call followed by "("
    * the function call argument #1
    * ...
    * the function call argument #n
    * a trailing ");"

    The strings returned are in escaped form. See escape(...).

    >>> parse_function_call_and_arguments("foo", 'foo("%s", "foo");')
    ['foo(', '"%s",', ' "foo"', ')']
    >>> parse_function_call_and_arguments("foo", 'foo("%s", "foo");')
    ['foo(', '"%s",', ' "foo"', ')']
    >>> parse_function_call_and_arguments("foo", 'foo("%s %s", "foo", "bar");')
    ['foo(', '"%s %s",', ' "foo",', ' "bar"', ')']
    >>> parse_function_call_and_arguments("fooprintf", 'fooprintf("%050d", i);')
    ['fooprintf(', '"%050d",', ' i', ')']
    >>> parse_function_call_and_arguments("foo", 'foo(bar(foobar(barfoo("foo"))), foobar); barfoo')
    ['foo(', 'bar(foobar(barfoo("foo"))),', ' foobar', ')']
    >>> parse_function_call_and_arguments("foo", "foo()")
    ['foo(', '', ')']
    >>> parse_function_call_and_arguments("foo", "foo(123)")
    ['foo(', '123', ')']
    >>> parse_function_call_and_arguments("foo", 'foo("foo")')
    ['foo(', '"foo"', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>,wchar_t>().to_bytes(buf), err);')
    ['strprintf(', '"%s (%d)",', ' std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>,wchar_t>().to_bytes(buf),', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo<wchar_t>().to_bytes(buf), err);')
    ['strprintf(', '"%s (%d)",', ' foo<wchar_t>().to_bytes(buf),', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo().to_bytes(buf), err);')
    ['strprintf(', '"%s (%d)",', ' foo().to_bytes(buf),', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo << 1, err);')
    ['strprintf(', '"%s (%d)",', ' foo << 1,', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo<bar>() >> 1, err);')
    ['strprintf(', '"%s (%d)",', ' foo<bar>() >> 1,', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo < 1 ? bar : foobar, err);')
    ['strprintf(', '"%s (%d)",', ' foo < 1 ? bar : foobar,', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo < 1, err);')
    ['strprintf(', '"%s (%d)",', ' foo < 1,', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo > 1 ? bar : foobar, err);')
    ['strprintf(', '"%s (%d)",', ' foo > 1 ? bar : foobar,', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo > 1, err);')
    ['strprintf(', '"%s (%d)",', ' foo > 1,', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo <= 1, err);')
    ['strprintf(', '"%s (%d)",', ' foo <= 1,', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo <= bar<1, 2>(1, 2), err);')
    ['strprintf(', '"%s (%d)",', ' foo <= bar<1, 2>(1, 2),', ' err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo>foo<1,2>(1,2)?bar:foobar,err)');
    ['strprintf(', '"%s (%d)",', ' foo>foo<1,2>(1,2)?bar:foobar,', 'err', ')']
    >>> parse_function_call_and_arguments("strprintf", 'strprintf("%s (%d)", foo>foo<1,2>(1,2),err)');
    ['strprintf(', '"%s (%d)",', ' foo>foo<1,2>(1,2),', 'err', ')']
    """
    assert (
        isinstance(function_name, str)
        and isinstance(function_call, str)
        and function_name
    )
    remaining = normalize(escape(function_call))
    expected_function_call = f"{function_name}("
    assert remaining.startswith(expected_function_call)
    parts = [expected_function_call]
    remaining = remaining[len(expected_function_call) :]
    open_parentheses = 1
    open_template_arguments = 0
    in_string = False
    parts.append("")
    for i, char in enumerate(remaining):
        parts.append(parts.pop() + char)
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "(":
            open_parentheses += 1
            continue
        if char == ")":
            open_parentheses -= 1
        if open_parentheses > 1:
            continue
        if open_parentheses == 0:
            parts.append(parts.pop()[:-1])
            parts.append(char)
            break
        prev_char = remaining[i - 1] if i - 1 >= 0 else None
        next_char = remaining[i + 1] if i + 1 <= len(remaining) - 1 else None
        if (
            char == "<"
            and next_char not in [" ", "<", "="]
            and prev_char not in [" ", "<"]
        ):
            open_template_arguments += 1
            continue
        if (
            char == ">"
            and next_char not in [" ", ">", "="]
            and prev_char not in [" ", ">"]
            and open_template_arguments > 0
        ):
            open_template_arguments -= 1
        if open_template_arguments > 0:
            continue
        if char == ",":
            parts.append("")
    return parts


def parse_string_content(argument):
    """Return the text within quotes in string argument.

    >>> parse_string_content('1 "foo %d bar" 2')
    'foo %d bar'
    >>> parse_string_content('1 foobar 2')
    ''
    >>> parse_string_content('1 "bar" 2')
    'bar'
    >>> parse_string_content('1 "foo" 2 "bar" 3')
    'foobar'
    >>> parse_string_content('1 "foo" 2 " " "bar" 3')
    'foo bar'
    >>> parse_string_content('""')
    ''
    >>> parse_string_content('')
    ''
    >>> parse_string_content('1 2 3')
    ''
    """
    assert isinstance(argument, str)
    string_content = ""
    in_string = False
    for char in normalize(escape(argument)):
        if char == '"':
            in_string = not in_string
        elif in_string:
            string_content += char
    return string_content


def count_format_specifiers(format_string):
    """Return the number of format specifiers in string format_string.

    >>> count_format_specifiers("foo bar foo")
    0
    >>> count_format_specifiers("foo %d bar foo")
    1
    >>> count_format_specifiers("foo %d bar %i foo")
    2
    >>> count_format_specifiers("foo %d bar %i foo %% foo")
    2
    >>> count_format_specifiers("foo %d bar %i foo %% foo %d foo")
    3
    >>> count_format_specifiers("foo %d bar %i foo %% foo %*d foo")
    4
    >>> count_format_specifiers("%%%u")
    1
    >>> [count_format_specifiers(i * "%" + "u") for i in range(10)]
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
    >>> count_format_specifiers("foo %5$d")
    5
    >>> count_format_specifiers("foo %5$*7$d")
    7
    """
    assert isinstance(format_string, str)
    # remove any number of escaped % characters
    format_string = format_string.replace("%%", "")
    n = max_pos = 0
    for m in re.finditer("%(.*?)[aAcdeEfFgGinopsuxX]", format_string, re.DOTALL):
        # Increase the max position if the argument has a position number like
        # "5$", otherwise increment the argument count.
        (pos_num,) = re.match(r"(?:(^\d+)\$)?", m.group(1)).groups()
        if pos_num is not None:
            max_pos = max(max_pos, int(pos_num))
        else:
            n += 1

        # Increase the max position if there is a "*" width argument with a
        # position like "*7$", and increment the argument count if there is a
        # "*" width argument with no position.
        star, star_pos_num = re.match(r"(?:.*?(\*(?:(\d+)\$)?)|)", m.group(1)).groups()
        if star_pos_num is not None:
            max_pos = max(max_pos, int(star_pos_num))
        elif star is not None:
            n += 1
    return max(n, max_pos)


def main(args_in):
    """Return a string output with information on string format errors

    >>> main(["test/lint/lint-format-strings-tests.txt"])
    test/lint/lint-format-strings-tests.txt: Expected 2 argument(s) after format string but found 3 argument(s): LogError("%d%s", 1, some_path, spam)
    test/lint/lint-format-strings-tests.txt: Expected 3 argument(s) after format string but found 2 argument(s): LogWarning("%d%s%f", 1, some_path)
    test/lint/lint-format-strings-tests.txt: Expected 1 argument(s) after format string but found 2 argument(s): printf("%d", 1, 2)
    test/lint/lint-format-strings-tests.txt: Expected 2 argument(s) after format string but found 3 argument(s): printf("%a %f", 1, 2, "anything")
    test/lint/lint-format-strings-tests.txt: Expected 2 argument(s) after format string but found 3 argument(s): printf("%1$d%2$d%1$d", 1, 2, 3)
    test/lint/lint-format-strings-tests.txt: Expected 1 argument(s) after format string but found 0 argument(s): printf("%d")
    test/lint/lint-format-strings-tests.txt: Expected 3 argument(s) after format string but found 2 argument(s): printf("%a%s%f", 1, "anything")
    test/lint/lint-format-strings-tests.txt: Expected 5 argument(s) after format string but found 1 argument(s): printf("%5$d", 1)
    test/lint/lint-format-strings-tests.txt: Expected 0 argument(s) after format string but found 1 argument(s): strprintf("%%%%u", scope_id)
    test/lint/lint-format-strings-tests.txt: Expected 1 argument(s) after format string but found 0 argument(s): strprintf("%%%u")

    >>> main(["test/lint/lint-format-strings-tests-skip-arguments.txt"])
    test/lint/lint-format-strings-tests-skip-arguments.txt: Expected 1 argument(s) after format string but found 2 argument(s): fprintf(skipped, "%d", 1, 2)
    test/lint/lint-format-strings-tests-skip-arguments.txt: Expected 1 argument(s) after format string but found 0 argument(s): fprintf(skipped, "%d")
    test/lint/lint-format-strings-tests-skip-arguments.txt: Expected 1 argument(s) after format string but found 2 argument(s): LogDebug(skipped, "%d", 1, 2)
    test/lint/lint-format-strings-tests-skip-arguments.txt: Expected 2 argument(s) after format string but found 1 argument(s): LogTrace(skipped, "%d%f", 1)
    test/lint/lint-format-strings-tests-skip-arguments.txt: Expected 1 argument(s) after format string but found 2 argument(s): snprintf(skip1, skip2, "%d", 1, 2)
    test/lint/lint-format-strings-tests-skip-arguments.txt: Expected 1 argument(s) after format string but found 0 argument(s): snprintf(skip1, skip2, "%d")
    test/lint/lint-format-strings-tests-skip-arguments.txt: Could not parse function call string "snprintf(...)": snprintf(skip1, "%d")
    """
    parser = argparse.ArgumentParser(
        description=(
            "This program checks that the number of arguments passed "
            "to a variadic format string function matches the number of format "
            "specifiers in the format string."
        )
    )
    parser.add_argument(
        "file",
        type=argparse.FileType("r", encoding="utf-8"),
        nargs="*",
        help="C++ source code file (e.g. foo.cpp)",
    )
    args = parser.parse_args(args_in)

    for f in args.file:
        file_content = f.read()
        for (
            function_name,
            skip_arguments,
        ) in FUNCTION_NAMES_AND_NUMBER_OF_LEADING_ARGUMENTS:
            for function_call_str in parse_function_calls(function_name, file_content):
                parts = parse_function_call_and_arguments(
                    function_name, function_call_str
                )
                relevant_function_call_str = unescape("".join(parts))[:512]
                if (f.name, relevant_function_call_str) in FALSE_POSITIVES:
                    continue
                if len(parts) < 3 + skip_arguments:
                    print(
                        '{}: Could not parse function call string "{}(...)": {}'.format(
                            f.name, function_name, relevant_function_call_str
                        )
                    )
                    continue
                argument_count = len(parts) - 3 - skip_arguments
                format_str = parse_string_content(parts[1 + skip_arguments])
                format_specifier_count = count_format_specifiers(format_str)
                if format_specifier_count != argument_count:
                    print(
                        "{}: Expected {} argument(s) after format string but found {}"
                        " argument(s): {}".format(
                            f.name,
                            format_specifier_count,
                            argument_count,
                            relevant_function_call_str,
                        )
                    )
                    continue


if __name__ == "__main__":
    doctest.testmod()
    main(sys.argv[1:])
