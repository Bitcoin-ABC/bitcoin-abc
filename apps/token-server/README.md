# token-server

Server to manage Cashtab rewards tokens. May be modified to support other token back-end tasks.

## Development

`npm start` to run locally

Note: you will have to adjust the `imageDir` param in `config` to test serving of static image files

## Production

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
docker run -p 3333:3333 --init --rm --name token-server --mount type=bind,source=/path/to/token-icons,target=/token-icons token-server_local
```

4. Test from web browser, e.g. navigate to `localhost:3333/status`
