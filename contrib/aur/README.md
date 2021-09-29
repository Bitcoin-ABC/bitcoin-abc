# Update the AUR packages

Edit the `PKGBUILD` for the package you want to update:
 - To package a new version, update the `pkgver` value and reset `pkgrel` to 0.
 - To re-package the same version, only increment the `pkgrel` value.

You need to run in an archlinux environment and have write permission to the
AUR repositories. Then install the prerequisites and run the update script:

```shell
pacman -S --needed base-devel git pacman-contrib
./update-aur.sh <package> <commit message>
```
