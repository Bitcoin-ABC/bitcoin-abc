# cashtab-faucet

Server to manage Cashtab rewards tokens. May be modified to support other token back-end tasks.

## Development

`npm start` to run locally

## Production

You will need to configure environment variables in .env using your CI system, or

```
cp env.example .env
```

and manually edit

`cashtab-faucet` is deployed with docker.

You can test production deployment with

1. Add `EXPOSE 3333` just before `CMD [ "node", "dist/index.js" ]` in `Dockerfile`

2. Build docker container:

```
docker build -t cashtab-faucet_local .
```

3. Deploy docker container:

```
docker run -p 3333:3333 --init --rm --name cashtab-faucet cashtab-faucet_local
```

4. Test from web browser, e.g. navigate to `localhost:3333/status`
