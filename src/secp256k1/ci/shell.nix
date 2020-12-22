{ pkgs ? import <nixpkgs> {} }:

with pkgs;

mkShell {
  buildInputs = [
      autoconf automake bash clang cmake file gcc gmp jdk11_headless libtool ninja openssl pkgconfig python3 valgrind
  ];
  shellHook = ''
      echo Running nix-shell with nixpkgs version: $(nix eval --raw nixpkgs.lib.version)
  '';
}
