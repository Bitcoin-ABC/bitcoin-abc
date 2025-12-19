# eCash Block Explorer

A no-frills eCash explorer focused on speed and providing in-depth information

## Development

### 1. Install dependencies

```
sudo apt install libssl-dev
sudo apt install -y protobuf-compiler libprotobuf-dev
```

Note: If running Ubuntu at Ubuntu 22.04.4, you may also need `pkg-config`. Install with `sudo apt install pkg-config`

### 2. Run

```
cd explorer-exe/
cp config.dist.toml config.toml
```

The config.dist.toml is just an example on which to base your config from:

```toml
host = "0.0.0.0:3035"
chronik_api_url = "https://chronik-native1.fabien.cash"
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

## 4. Caching

If any .js or .css fils is created that would be fetched from a `/code/` URL,
you need to update the `FileHashes` structure from `file_hashes.rs` and update
the templates that include your file accordingly. Doing so will ensure that the
file hash is appended to the URL and updated as the file changes to prevent
caching issues.
