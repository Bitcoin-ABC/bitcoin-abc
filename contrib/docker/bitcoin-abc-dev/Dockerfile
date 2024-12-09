FROM debian:bookworm

# Expected to run from the project root
COPY . /bitcoin-abc
VOLUME /bitcoin-abc

# Run the dependency installation script in its own directory so we can clean
# it after it's done
RUN mkdir -p /install
WORKDIR /install
RUN /bitcoin-abc/contrib/utils/install-dependencies-bookworm.sh

WORKDIR /bitcoin-abc
RUN rm -rf /install

CMD ["bash"]
