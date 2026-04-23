# Docker Deployment

This app can run in Docker for staging.

## Build Image

```bash
docker build -t smart-document-gateway:staging .
```

## Run With Compose

Use `.env` for local compose runs, or copy the Docker example:

```bash
cp .env.docker.example .env
```

Fill in Google OAuth and Drive values, then run:

```bash
docker compose up --build
```

The service listens on:

```text
http://localhost:3900
```

Avoid sharing `docker compose config` output when using a real `.env`; Docker expands environment values and may print secrets.

## OAuth Redirect URI

For local Docker compose, the redirect URI should be:

```text
http://localhost:3900/oauth/google/callback
```

Add that exact URI in Google Cloud OAuth client settings.

For a real staging domain, use the staging URL instead:

```text
https://staging.example.com/oauth/google/callback
```

The value in Google Cloud and `GOOGLE_OAUTH_REDIRECT_URI` must match exactly.

## Token Persistence

OAuth tokens are stored at:

```text
/app/.tokens/google-oauth.json
```

`docker-compose.yml` mounts this path into a named volume:

```text
sdg_tokens
```

That means container rebuilds/restarts keep the OAuth token.

Your existing host token at `.tokens/google-oauth.json` is not automatically copied into the Docker named volume. For staging, authorize the app again through the container, or intentionally migrate the token file yourself.

If you delete the volume, the app loses the authorized target mailbox and must authorize again:

```bash
docker compose down -v
```

## Drive Folder

With the default `drive.file` scope, create a Drive folder through the app after OAuth:

```bash
curl -X POST http://localhost:3900/drive/setup-folder \
  -H 'content-type: application/json' \
  -d '{"name":"Smart Document Gateway"}'
```

Copy the returned `id` into:

```text
GOOGLE_DRIVE_DESTINATION_FOLDER_ID=...
```

Then restart the container:

```bash
docker compose restart
```

Validate:

```bash
curl http://localhost:3900/drive/folder/status
```

## Useful Commands

```bash
docker compose up --build
docker compose logs -f
docker compose restart
docker compose down
```

Check readiness:

```bash
curl http://localhost:3900/health
curl http://localhost:3900/oauth/google/status
curl http://localhost:3900/drive/folder/status
```
