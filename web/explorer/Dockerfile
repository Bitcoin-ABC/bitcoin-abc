FROM rust:slim-bullseye

RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y libssl-dev pkg-config protobuf-compiler

WORKDIR /usr/src/explorer
COPY . .

WORKDIR /usr/src/explorer/explorer-exe
RUN mv config.dist.toml config.toml

RUN cargo build --release

CMD ["cargo", "run", "--release"]
