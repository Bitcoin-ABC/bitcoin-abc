#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers

import sys
from pathlib import Path


def main(input_file, output_file):
    with open(input_file, "rb") as f:
        contents = f.read()

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"static unsigned const char {Path(input_file).stem}_raw[] = {{\n")
        f.write(", ".join(f"0x{x:02x}" for x in contents))
        f.write("\n};\n")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            f"Invalid parameters\nUsage: {Path(sys.argv[0]).name} input_file output_file"
        )
        sys.exit(1)

    main(sys.argv[1], sys.argv[2])
