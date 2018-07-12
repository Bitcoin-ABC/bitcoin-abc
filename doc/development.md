
Dependencies
------------
Boost >= 1.53

Installation
------------

You will need appropriate libraries to run Omni Core on Unix,
please see [doc/build-unix.md](doc/build-unix.md) for the full listing.

You will need to install git & pkg-config:

```
sudo apt-get install git
sudo apt-get install pkg-config
```

Clone the Omni Core repository:

```
git clone https://github.com/OmniLayer/omnicore.git
cd omnicore/
```

Then, run:

```
./autogen.sh
./configure
make
```
Once complete:

```
cd src/
```
And start Omni Core using `./omnicored` (or `./qt/omnicore-qt` if built with UI). The inital parse step for a first time run
will take up to 60 minutes or more, during this time your client will scan the blockchain for Omni Layer transactions. You can view the
output of the parsing at any time by viewing the log located in your datadir, by default: `~/.bitcoin/omnicore.log`.

Omni Core requires the transaction index to be enabled. Add an entry to your bitcoin.conf file for `txindex=1` to enable it or Omni Core will refuse to start.

If a message is returned asking you to reindex, pass the `-reindex` flag as startup option. The reindexing process can take serveral hours.

To issue RPC commands to Omni Core you may add the `-server=1` CLI flag or add an entry to the bitcoin.conf file (located in `~/.bitcoin/` by default).

In bitcoin.conf:
```
server=1
```

After this step completes, check that the installation went smoothly by issuing the following command `./omnicore-cli omni_getinfo` which should return the `omnicoreversion` as well as some
additional information related to the client.

The documentation for the RPC interface and command-line is located in [src/omnicore/doc/rpc-api.md] (src/omnicore/doc/rpc-api.md).

Docker Deploy:
--------------

```
docker build -t omnicore:prod .
docker run -d -p 8333:8333 -p 18332:18332 -v /home/{username}/.omnicore:/root/.bitcion --name omnicore-prod omnicore:prod
```
