# ecash-lib-wasm

ecash-lib-wasm is a dependency of the ecash-lib library. Building `ecash-lib-wasm` generates the `src/ffi` folder in `modules/ecash-lib`.

## Building with Docker

1. Install Docker if you don't have it already.
   e.g. [Install guide for Ubuntu 22.04](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04)

2. Build ecash-lib-wasm via Docker

```
./dockerbuild.sh
```

## Building without Docker

Buildling with Docker is the recommended approach. You can also build with `./build-wasm.sh`, e.g. if you are building in CI inside a docker container and are unable to use `./dockerbuild.sh`. Review the `Dockerfile` and `./dockerbuild.sh` to ensure you are using the correct dependencies.
