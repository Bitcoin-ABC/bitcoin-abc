#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

"""XCode extractor
"""

import argparse
import sys
import struct
import zlib
import xml.etree.ElementTree as ET
import lzma

XAR_MAGIC = b'\x78\x61\x72\x21'
PBZX_MAGIC = b'\x70\x62\x7a\x78'
LZMA_MAGIC = b'\xfd\x37\x7a\x58\x5a\x00'

class io_wrapper(object):
    """Helper for stdin/stdout binary weirdness"""
    def __init__(self, filename, mode):
        self.filename = filename
        self.mode = mode
    def __enter__(self):
        if self.filename == '-':
            if self.mode is None or self.mode == '' or 'r' in self.mode:
                self.fh = sys.stdin
            else:
                self.fh = sys.stdout
        else:
            self.fh = open(self.filename, self.mode)
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.filename != '-':
            self.fh.close()
    def write(self, bytes):
        if self.filename != '-':
            return self.fh.write(bytes)
        return self.fh.buffer.write(bytes)
    def read(self, size):
        if self.filename != '-':
            return self.fh.read(size)
        return self.fh.buffer.read(size)
    def seek(self, size):
        return self.fh.seek(size)

def run():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter)

    parser.add_argument("-f", '--file', nargs='?', default="-")
    parser.add_argument('outfile', nargs='?', default="-")

    args = parser.parse_args()

    with io_wrapper(args.file, "rb") as infile, io_wrapper(args.outfile, "wb") as outfile:

        start_offset = 0
        magic = infile.read(4)
        if magic != XAR_MAGIC:
            print("bad xar magic", file=sys.stderr)
            sys.exit(1)

        bytes = infile.read(24)
        header_size, xar_version, toc_compressed, toc_uncompressed, checksum_type = struct.unpack('>HHQQI', bytes)
        start_offset += header_size
        start_offset += toc_compressed
        bytes = infile.read(toc_compressed)

        xml_toc = zlib.decompress(bytes).decode("utf-8") 

        root = ET.fromstring(xml_toc)

        content_offset = 0
        content_length = 0
        content_encoding = ""

        toc = root.find("toc")
        for elem in toc.findall("file"):
            name = elem.find("name").text
            if name == "Content":
                data = elem.find("data")
                content_offset = int(data.find("offset").text)
                content_length = int(data.find("length").text)
                content_encoding = data.find("encoding").get("style")
                content_uncompressed_length = int(data.find("size").text)
                found_content = True
                break

        if (content_length == 0):
            print("No \"Content\" file to extract.", file=sys.stderr)
            sys.exit(1)

        infile.seek(content_offset + start_offset)

        content_read_size = 0

        magic = infile.read(4)
        content_read_size += 4
        if magic != PBZX_MAGIC:
            print("bad pbzx magic", file=sys.stderr)
            sys.exit(2)

        bytes = infile.read(8)
        content_read_size += 8
        flags, = struct.unpack('>Q', bytes)
        bytes = infile.read(16)
        content_read_size += 16
        while (flags & 1 << 24):
            flags, size = struct.unpack('>QQ', bytes)
            bytes = infile.read(size)
            content_read_size += size
            compressed = size != 1 << 24
            if compressed:
                if bytes[0:6] != LZMA_MAGIC:
                    print("bad lzma magic: ", file=sys.stderr)
                    sys.exit(3)
                outfile.write(lzma.decompress(bytes))
            else:
                outfile.write(bytes)

            if content_read_size == content_length:
                break
                
            bytes = infile.read(16)
            content_read_size += 16

if __name__ == '__main__':
    run()
