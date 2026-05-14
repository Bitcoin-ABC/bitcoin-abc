# docs.e.cash

Next.js documentation hub for the **Bitcoin ABC** monorepo (starting with Chronik and related JS APIs). The app lives under `bitcoin-abc/web/docs.e.cash`.

## Development

```bash
pnpm install
pnpm run dev
```

`predev` and `prebuild` run `scripts/sync-abc-version.mjs`, which at **build time** fetches the latest non-draft release from the **[GitHub Releases API](https://api.github.com/repos/Bitcoin-ABC/bitcoin-abc/releases)** and writes **`src/data/bitcoin-abc-version.json`** (gitignored) for download links—aligned with assets on `download.bitcoinabc.org`. If the API is unreachable, it falls back to the monorepo **`CMakeLists.txt`** (`project(bitcoin-abc VERSION …)`), then to copying **`bitcoin-abc-version.sample.json`**. Set optional **`GITHUB_TOKEN`** in CI for a higher API rate limit. There is no `postinstall` hook (Docker installs dependencies before `scripts/` are copied); run **`pnpm run sync-version`** once after install if you need the JSON before the first `dev`/`build` (for example `tsc --noEmit`).

Interactive API examples on the **`/chronik/chronik-client/`** pages use **[react-live](https://github.com/FormidableLabs/react-live)** (`ChronikLivePlayground`): a **Live editor** and **Result** split, with default source in `src/components/chronik-live/liveDemoEditorCode.ts` (ported from the old Docusaurus `jsx live` blocks).

Open the site at **`http://localhost:3000/`** (hub). Chronik docs live under **`/chronik/`** (e.g. **`/chronik/chronik-client/install/`**); pay docs at **`/pay/`**. Production is **`https://docs.e.cash/`**.

## Generate chronik-client API (TypeDoc)

Point `BITCOIN_ABC_ROOT` at a checkout of [bitcoin-abc](https://github.com/Bitcoin-ABC/bitcoin-abc):

```bash
BITCOIN_ABC_ROOT=/path/to/bitcoin-abc pnpm run generate:api
pnpm run build
```

Markdown is emitted under `content/reference/chronik-client/`. Commit those files if you want them versioned in this repo, or generate them in CI before `next build`.

## Rust / node Chronik source docs

Server-side Rust crates (`chronik-lib`, `chronik-http`, etc.) already carry `///` documentation. Options:

- Run `cargo doc -p chronik-http --open` (and related crates) inside `bitcoin-abc/chronik`.
- Publish the generated `target/doc` somewhere static, or add a later pipeline to fold Rustdoc HTML into this app.

## Deploy on Vercel (same idea as charts.e.cash)

1. Create a project from this Git repository.
2. Framework preset: **Next.js** (Vercel detects `package.json` / `next.config`).
3. Default **Build** command `pnpm run build` and output `.next` match `vercel.json`.

Optionally set:

- `NEXT_PUBLIC_BITCOIN_ABC_VERSION` — overrides the download page version string at **runtime** (still generate `bitcoin-abc-version.json` at build when possible). If GitHub and CMake are both unavailable, sync may leave or copy the sample file; use this env or ensure `prebuild` can reach the API / monorepo.
- `GITHUB_TOKEN` — optional; passed to the Releases API request during **`sync-version`** / **`prebuild`** for rate limits (no special scopes required for public repo metadata).

If you attach a custom domain, serve this app at the host root (no path prefix required).

## License

MIT — consistent with Bitcoin ABC and chronik-client.
