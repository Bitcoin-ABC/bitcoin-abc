FROM debian:buster

# Expected to run from the project root
COPY . bitcoin-abc
VOLUME bitcoin-abc

WORKDIR bitcoin-abc
RUN contrib/utils/install-dependencies.sh

CMD ["bash"]
