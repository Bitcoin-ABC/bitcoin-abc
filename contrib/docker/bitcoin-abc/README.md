# Running the Bitcoin ABC node software inside a Docker container

## Building your Docker image

From this directory:
1. [Download](https://www.bitcoinabc.org/releases/) the release archive for your target system.
   This example assumes that you downloaded the file `bitcoin-abc-0.22.3-x86_64-linux-gnu.tar.gz`
2. Build the image:

```shell
docker build -t bitcoin-abc:0.22.3 --build-arg RELEASE_ARCHIVE=bitcoin-abc-0.22.3-x86_64-linux-gnu.tar.gz .
```

## Running the node software

By default the container will execute `bitcoind`:

```shell
docker run bitcoin-abc:0.22.3
```

To pass options to `bitcoind`, pass them as arguments to the container:

```shell
docker run bitcoin-abc:0.22.3 bitcoind -version
```

You can also run another tool by specifying it as an argument to the container:

```shell
docker run bitcoin-abc:0.22.3 bitcoin-cli -version
```

## Persistent data directory

The container uses `/data` volume as the default data directory.
To make this directory persistent across container runs, you can bind the
volume to your local filesystem:

```shell
mkdir ~/bitcoin-abc-data
docker run -v ~/bitcoin-abc-data:/data bitcoin-abc:0.22.3
```

**Note: Make sure the container has write access to you local folder.**

## Communication between bitcoin-cli and bitcoind

In order to make `bitcoin-cli` and `bitcoind` communicate together, they need to
use the same network. By using the same data directory, they also share the
authentication cookie:

```shell
# Run the bitcoind container in the background
docker run --name bitcoind -v ~/bitcoin-abc-data:/data --rm -d bitcoin-abc:0.22.3
docker run --network container:bitcoind -v ~/bitcoin-abc-data:/data --rm bitcoin-abc:0.22.3 bitcoin-cli getnetworkinfo
docker stop bitcoind
```
