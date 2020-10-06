# Building Bitcoin ABC inside a Docker container

## Building your Docker image

From the project root:

```shell
docker build -t bitcoin-abc-dev -f contrib/docker/bitcoin-abc-dev/Dockerfile
```

This will build an image with all the required dependencies for running any kind
of build.

## Start building

Start the container. This will run a `bashè shell with your prompt located at
the project root.

```shell
docker run -it bitcoin-abc-dev
```

Build the project:

```shell
mkdir build
cd build
cmake -GNinja ..
ninja
```

Run the tests:

```shell
ninja check
```
