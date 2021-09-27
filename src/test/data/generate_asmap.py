#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers

import sys
from pathlib import Path


def main(input_file, output_file):
    with open(input_file, 'rb') as f:
        contents = f.read()

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(
            "static unsigned const char {}_raw[] = {{\n".format(
                Path(input_file).stem))
        f.write(", ".join(map(lambda x: "0x{:02x}".format(x), contents)))
        f.write("\n};\n")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Invalid parameters\nUsage: {} input_file output_file".format(
            Path(sys.argv[0]).name))
        sys.exit(1)

    main(sys.argv[1], sys.argv[2])
