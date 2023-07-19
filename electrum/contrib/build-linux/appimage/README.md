AppImage binary for Electrum ABC
================================

✓ _This binary is reproducible: you should be able to generate
   binaries that match the official releases (i.e. with the same sha256 hash)._

This assumes an Ubuntu host, but it should not be too hard to adapt to another
similar system. The docker commands should be executed in the project's root
folder.

1. Install Docker

    See `contrib/docker_notes.md`.

2. Build binary

    ```shell
    git checkout REVISION_TAG_OR_BRANCH_OR_COMMIT_TAG
    contrib/build-linux/appimage/build.sh
    ```

    _Note:_ If you are using a MacOS host, run the above **without** `sudo`.

3. The generated .AppImage binary is in `./dist`.


## FAQ

### How can I see what is included in the AppImage?
Execute the binary as follows: `./ElectrumABC*.AppImage --appimage-extract`
