# Generating the man pages

## Generation

The man pages are generated on demand using the `help2man` helper. To install on
Debian:

```shell
sudo apt-get install help2man
```

To generate a man page, use the `doc-manpage-<executable>` where `executable` is the
name of the executable you want to generate the man page for:

```shell
ninja doc-manpage-bitcoind
```

An easiest solution to generate all the man pages at the same time is to use the
installation target. They will be copied to your installation directory as well:

```shell
ninja install-manpages
```

## Headless generation

Generating the man page for `bitcoin-qt` will require a X server. If you are
running headlessly, you can use the `xfvb-run` utility included in the `xvfb`
package:

```shell
sudo apt-get install xvfb
xvfb-run ninja install-manpages
```

## Generate as HTML

It is possible to convert the man pages to HTML using `pandoc`. Version 2.4 or
greater is required:

```shell
sudo apt-get install pandoc
ninja install-manpages-html
```
