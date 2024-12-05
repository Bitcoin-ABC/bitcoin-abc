FROM rust:1.72-slim-bookworm

RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y libssl-dev pkg-config protobuf-compiler

WORKDIR /usr/src/explorer
COPY web/explorer .

WORKDIR /usr/src/explorer/explorer-exe
RUN mv config.dist.toml config.toml

RUN cargo build --release --locked

CMD ["cargo", "run", "--release", "--locked"]
