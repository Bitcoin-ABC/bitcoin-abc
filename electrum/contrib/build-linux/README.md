Source tarballs
===============

✗ _This script does not produce reproducible output (yet!)._

1. To ensure no accidental local changes are included, run:

    ```
    $ contrib/make_clean
    ```

2. To create the source tarball (with the libsecp library included):

    ```
    $ contrib/make_linux_sdist
    ```

    Alternatively, you may use a docker with all required dependencies installed:

    ```
    $ contrib/build-linux/srcdist_docker/build.sh
    ```

3. A `.tar.gz` and a `.zip` file of Electrum ABC will be placed in the `dist/` subdirectory.


AppImage
===============

✓ _This binary is reproducible: you should be able to generate
   binaries that match the official releases (i.e. with the same sha256 hash)._

1. To create a deterministic Linux AppImage (standalone bundle):

    ```
    $ contrib/make_clean
    $ git checkout COMMIT_OR_TAG
    $ contrib/build-linux/appimage/build.sh
    ```

    Where `COMMIT_OR_TAG` is a git commit or branch or tag (eg `master`, `4.0.2`, etc).
    The `make_clean` command can be omitted for testing purposes.

3. The built stand-alone Linux program will be placed in `dist/`.

4. The above requires docker.  See [appimage/README.md](appimage/README.md).
