# token-server

Server to manage token-icons rendered in Cashtab. Also manages agora blacklist.

## Development

1. Copy the environment template and fill in your values:

```
cp env.sample .env
```

2. Start the server:

```
pnpm start
```

Note: you will have to adjust the `imageDir` param in `config` to test serving of static image files.

See `env.sample` for required environment variables. Tests use defaults from `test/setupEnv.ts` when `.env` is not present.

For the full upgrade roadmap (PostgreSQL, 1024 icons, signed uploads), see [UPGRADE.md](./UPGRADE.md).

## Production

Before running `token-server` in production, you must first set up the file system on your desired server (see "Setting up the file system", below).

Set environment variables (via `--env-file` or your deployment platform). See `env.sample` for the full list.

`token-server` is deployed with docker.

You can test production deployment with

1. Add `EXPOSE 3333` just before `CMD [ "node", "dist/index.js" ]` in `Dockerfile`

2. Build docker container:

```
docker build -t token-server_local .
```

3. Deploy docker container:

Note: replace `/path/to/token-icons` below with your local absolute path

```
docker run -p 3333:3333 --init --rm --name token-server \
  --env-file .env \
  --mount type=bind,source=/path/to/token-icons,target=/token-icons \
  token-server_local
```

4. Test from web browser, e.g. navigate to `localhost:3333/status`

## Setting up the file system

The server file system must be configured for image serving.

1. Create directory for `config.imageDir`
2. Create subdirectories at `config.imageDir` for all supported `config.iconSizes`

For example,

```
mkdir token-icons
mkdir token-icons/32
mkdir token-icons/64
mkdir token-icons/128
```

3. Repeat the above steps for `config.rejectedDir`

e.g.

```
mkdir rejected
mkdir rejected/32
mkdir rejected/64
mkdir rejected/128
```
