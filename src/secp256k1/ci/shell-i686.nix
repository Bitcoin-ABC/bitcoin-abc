{ pkgs ? (import <nixpkgs> {}).pkgsi686Linux }:

with pkgs;

mkShell {
  buildInputs = [
      autoconf automake bash clang cmake file gcc gmp libtool ninja pkgconfig python3 valgrind
  ];
  shellHook = ''
      echo Running nix-shell with nixpkgs version: $(nix eval --raw nixpkgs.lib.version)
  '';
}
