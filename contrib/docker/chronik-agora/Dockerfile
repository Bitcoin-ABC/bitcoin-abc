FROM bitcoinabc/bitcoin-abc-dev:0.30.8 AS builder

WORKDIR /bitcoin-abc/build

RUN cmake -GNinja .. \
  -DBUILD_BITCOIN_QT=OFF \
  -DBUILD_BITCOIN_SEEDER=OFF \
  -DBUILD_BITCOIN_IGUANA=OFF \
  -DBUILD_BITCOIN_TX=OFF \
  -DBUILD_BITCOIN_CHRONIK=ON \
  -DBUILD_BITCOIN_CHRONIK_PLUGINS=ON && \
  ninja install/strip

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
