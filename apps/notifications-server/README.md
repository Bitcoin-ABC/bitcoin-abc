# notifications-server

Push notification backend for Cashtab (FCM). Registers device tokens, watches
active addresses over Chronik websockets, and delivers push notifications.

## Development

1. Copy the environment template and fill in your values:

```
cp env.sample .env
```

2. Apply the database schema (once per database):

```
psql "$DATABASE_CONNECTION_STRING" -f schema.sql
```

3. Start the server:

```
pnpm start
```

See `env.sample` for required environment variables. Health check:
`GET http://localhost:3020/health`

Routes:

- `GET /health`
- `POST /api/push/register`
- `POST /api/push/unregister`

## Production

`notifications-server` is deployed with Docker.

Set environment variables (via `--env-file` or your deployment platform). See
`env.sample` for the full list. Apply `schema.sql` before first start.

You can test production deployment from the monorepo root:

```
docker build -f notifications-server.Dockerfile -t notifications-server_local .
docker run -p 3020:3020 --init --rm --name notifications-server \
  --env-file apps/notifications-server/.env \
  --mount type=bind,source="$(pwd)/apps/notifications-server/firebase-service-account.json",target=/app/apps/notifications-server/firebase-service-account.json,readonly \
  notifications-server_local
```

Then open `http://localhost:3020/health`.
