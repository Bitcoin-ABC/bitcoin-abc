# libsecp256k1-0 for Electrum ABC
## Mini HOW-TO

### About libsecp256k1-0

This library was originally developed by
[Peter Wuille](https://twitter.com/pwuille?lang=en) for Bitcoin, and has since
been adapted and used in many major cryptocurrencies for fast elliptic curve
operations.
Bitcoin ABC maintains a fork of the library with additional features
required by Electrum ABC, such as the eCash variant of Schnorr signatures.

### Using libsecp with Electrum ABC

You have a few options:

  - If on **Windows**, it's recommended you run one of the
    [release .exe files available here](https://github.com/Bitcoin-ABC/ElectrumABC/releases).
    The library is included in the `.exe`.
    If you insist on running from source on Windows, 7-zip can be used to extract the library
    libsecp256k1-0.dll from the `.exe` file.

  - If on **macOS**, it's recommended you install Electrum ABC from the
    [release .dmg available here](https://github.com/Bitcoin-ABC/ElectrumABC/releases).
    The library is included in the `.app` bundle.
  - For **Linux x86_64** (the most common architecture), the Electrum ABC
    [release srcdist .tar.gz available here](https://github.com/Bitcoin-ABC/ElectrumABC/releases)
    should have the library pre-compiled and living in the `electrumabc/`
    subfolder of the tarball. You can simply run Electrum ABC "from source"
    (which, paradoxically, does include a compiled library embedded within
    it), and it should work.
  - For other architectures and/or Unixey OS's, or if running from *git head*
    then proceed to the sections below.

### If running from github head -- dev mode ;)

   - `git clone` the latest git head from
     [https://github.com/Bitcoin-ABC/ElectrumABC](https://github.com/Bitcoin-ABC/ElectrumABC)
     (or `git pull` from master if you already  have it cloned).
   - run the script `contrib/make_secp`
   - **Done!** If all goes well, `libsecp256k1` should low live alongside the
     Python files in the `electrumabc/` subfolder of Electrum ABC.  If not,
     make sure you have a C-compiler installed on the system as well as automake,
     and libtool installed and try again.

### If you are running from the "srcdist" (.tar.gz) but the provided .so file doesn't work...

Chances are you either are on an exotic architecture (such as 32 bit Intel,
non-x86_64, etc) or are on a non-Linux Unix such as BSD, HURD, etc.
Don't despair! You can still get this working provided the below preconditions
are met:

- You must be on a "Unix-like" OS that can execute Bash scripts and/or run
  `configure` scripts successfully.  Windows using MSYS should work fine
  (but admitedly is untested by us).
- You must have a C compiler, automake, & libtool installed.
- You must have git installed.

The steps are as follows:

   - You will need to `git clone` the repository from
     [https://github.com/Bitcoin-ABC/ElectrumABC/](https://github.com/Bitcoin-ABC/ElectrumABC/)
   - Proceed to the **"github head"** section above.

#### The above all failed! What now?!

[Open an issue](https://github.com/Bitcoin-ABC/ElectrumABC/issues)
in our github issue tracker.
