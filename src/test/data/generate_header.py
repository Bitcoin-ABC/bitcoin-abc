#!/usr/bin/env python3
# Copyright (c) 2018-2019 The Bitcoin developers

import sys


def main(test_name, input_file):
    with open(input_file, "rb") as f:
        contents = f.read()

    print("#include <string>\n")
    print("namespace json_tests {")
    print(f"static const std::string {test_name}{{")
    print(", ".join(f"0x{x:02x}" for x in contents))
    print("};")
    print("};")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("We need additional pylons!")
        sys.exit(1)

    main(sys.argv[1], sys.argv[2])
