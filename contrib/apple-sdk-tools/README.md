Simple script(s) to extract from XCode .xip files.

These files are simple enough to extract in simple python without dragging in
dependencies.

This is a working POC. The code is sloppy and there is very little error
handling, but it works for all files tested.

It contains a very simple python port of [pbzx](https://github.com/NiklasRosenstein/pbzx), thank you to NiklasRosenstein
and PHPdev32.

### Usage:
./extract_xcode.py -f Xcode_*.xip | cpio -d -i

### Maintainer Wanted

Please feel free to fork and rewrite it into a more generally useful tool.
