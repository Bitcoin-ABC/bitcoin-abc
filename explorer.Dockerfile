FROM rust:1.87.0-slim-bookworm

RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y libssl-dev pkg-config protobuf-compiler

WORKDIR /usr/src
COPY . .

WORKDIR /usr/src/web/explorer/explorer-exe
RUN mv config.dist.toml config.toml

RUN cargo build --release --locked

CMD ["cargo", "run", "--release"]
