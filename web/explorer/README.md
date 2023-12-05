# eCash Block Explorer

A no-frills eCash explorer focused on speed and providing in-depth information

## Development

### 1. Install dependencies

```
sudo apt install libssl-dev
sudo apt install -y protobuf-compiler libprotobuf-dev
```

### 2. Run

```
cd explorer-exe/
cp config.dist.toml config.toml
```

The config.dist.toml is just an example on which to base your config from:

```toml
host = "0.0.0.0:3035"
chronik_api_url = "https://chronik.fabien.cash"
```

You're all done! Now you can run the project.
In the /explorer-exe directory run:

```
cargo run
```

Go to http://localhost:3035 and you should see the homepage

## 3. Build

1. `cd` into explorer/explorer-exe and run `cargo build --release` (will take a while).
2. Compiled binary will be in `explorer/target/release/explorer-exe`. Copy it to `explorer/explorer-exe`
3. It is recommended to run `cargo clean` in both `bitcoinsuite` and `explorer` afterwards (will delete `explorer/target/release/explorer-exe` executable), as compilation artifacts can take up a lot of space.

Now you can run the project with `./explorer/explorer-exe/explorer-exe`
