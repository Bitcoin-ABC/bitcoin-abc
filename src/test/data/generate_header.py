#!/usr/bin/env python3
# Copyright (c) 2018-2019 The Bitcoin developers

import sys


def main(test_name, input_file):
    with open(input_file, "rb") as f:
        contents = f.read()

    print("#include <cstdint>\n")
    print("namespace json_tests {")
    print("static const uint8_t {}[] = {{".format(test_name))
    print(", ".join(map(lambda x: "0x{:02x}".format(x), contents)))
    print("};")
    print("};")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("We need additional pylons!")
        sys.exit(1)

    main(sys.argv[1], sys.argv[2])
