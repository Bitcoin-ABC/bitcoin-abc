FROM debian:bookworm-slim

ARG RELEASE_ARCHIVE
COPY "${RELEASE_ARCHIVE}" /tmp

RUN tar xzf "/tmp/${RELEASE_ARCHIVE}" -C /usr/local --strip-components=1 --exclude="*-qt"
RUN rm -f "/tmp/${RELEASE_ARCHIVE}"

RUN groupadd -r bitcoin
RUN useradd -rmg bitcoin bitcoin

ENV BITCOIN_DATA /data

# Set permissions on the data directory
RUN mkdir "${BITCOIN_DATA}"
RUN chown -R bitcoin:bitcoin "${BITCOIN_DATA}"
RUN ln -sfn "$BITCOIN_DATA" /home/bitcoin/.bitcoin
RUN chown -h bitcoin:bitcoin /home/bitcoin/.bitcoin

# We need to declare the volume AFTER the directory is created and permissions
# are set, otherwise the changes won't be persistent
VOLUME "${BITCOIN_DATA}"

EXPOSE 8332 8333 18332 18333

USER bitcoin
CMD ["bitcoind"]
