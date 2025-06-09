ARG VERSION=latest
FROM bitcoinabc/bitcoin-abc-dev:$VERSION AS builder

WORKDIR /installed
WORKDIR /bitcoin-abc/build

RUN cmake -GNinja .. \
  -DBUILD_LIBBITCOINCONSENSUS=OFF \
  -DBUILD_CHAINSTATE=OFF \
  -DBUILD_QT=OFF \
  -DBUILD_SEEDER=OFF \
  -DBUILD_IGUANA=OFF \
  -DBUILD_TX=OFF \
  -DBUILD_CHRONIK=ON \
  -DBUILD_CHRONIK_PLUGINS=ON \
  -DCMAKE_INSTALL_PREFIX=/installed && \
  ninja install/strip

# From now we use a lighter base image to save space.
# WARNING this should be in sync with the base image from bitcoin-abc-dev !
FROM debian:bookworm-slim

RUN apt update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  libdb5.3++ \
  libevent-2.1-7 \
  libevent-pthreads-2.1-7 \
  libminiupnpc17 \
  libnatpmp1 \
  libprotobuf32 \
  libpython3.11 \
  libzmq5

COPY --from=builder /installed/bin/* /usr/local/bin/

RUN mkdir -p /bitcoin-abc/modules/ecash-agora
COPY --from=builder /bitcoin-abc/modules/ecash-agora/agora.py /bitcoin-abc/modules/ecash-agora/

RUN groupadd -g 1001 bitcoin
RUN useradd -u 1001 -mg bitcoin bitcoin

ENV BITCOIN_DATA /data

# Set permissions on the data directory
RUN mkdir "${BITCOIN_DATA}"
RUN chown -R bitcoin:bitcoin "${BITCOIN_DATA}"
RUN ln -sfn "$BITCOIN_DATA" /home/bitcoin/.bitcoin
RUN chown -h bitcoin:bitcoin /home/bitcoin/.bitcoin

# We need to declare the volume AFTER the directory is created and permissions
# are set, otherwise the changes won't be persistent
VOLUME "${BITCOIN_DATA}"

EXPOSE 8331 8332 8333 18331 18332 18333

USER bitcoin
WORKDIR /home/bitcoin

COPY copy_plugin_files.sh .
ENTRYPOINT [ "./copy_plugin_files.sh", "/bitcoin-abc" ]

CMD ["bitcoind"]
