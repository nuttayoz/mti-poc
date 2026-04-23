# Google Cloud Setup

This guide prepares Google Cloud for the Smart Document Gateway MVP.

The app will use:

- Gmail API to find messages, download attachments, and move labels.
- Google Drive API to upload processed documents.
- OAuth 2.0 Web Application credentials because the NestJS app will receive a browser callback.

## 1. Create or Select a Google Cloud Project

1. Open the Google Cloud Console.
2. Create a new project, or select an existing project.
3. Suggested project name: `smart-document-gateway`.

Keep the selected project active for every step below.

## 2. Enable Required APIs

Enable these APIs in the same Google Cloud project:

- Gmail API
- Google Drive API

## 3. Configure Google Auth Platform

Open Google Auth Platform and configure the app branding/consent screen.

Suggested values for local MVP:

- App name: `Smart Document Gateway`
- User support email: your email
- Audience:
  - Use `Internal` if this is a Google Workspace account and the app is only for your organization.
  - Use `External` if this is a regular Gmail account or you need to test with non-Workspace users.
- Contact email: your email

For an `External` testing app, add your own Gmail account as a test user.

## 4. Add OAuth Scopes

Add the minimum scopes for this MVP:

```text
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/drive.file
```

Why these scopes:

- `gmail.modify` lets the app read Gmail messages/attachments and update labels.
- `drive.file` lets the app create and manage Drive files it creates or is allowed to use.

Avoid the broader scopes for now:

- Do not use `https://mail.google.com/` unless we need full mailbox control later.
- Do not use `https://www.googleapis.com/auth/drive` unless we need broad Drive access later.

## 5. Create OAuth Client

Create an OAuth client:

- Application type: `Web application`
- Name: `Smart Document Gateway Local`

Authorized redirect URI:

```text
http://localhost:3000/oauth/google/callback
```

The redirect URI must exactly match the app configuration, including scheme, host, port, path, and trailing slash.

After creating the client, copy:

- Client ID
- Client secret

## 6. Create Google Drive Destination Folder

Recommended MVP path:

1. Complete Google OAuth first.
2. Start the app.
3. Let the app create the folder:

```bash
curl -X POST http://localhost:3900/drive/setup-folder \
  -H 'content-type: application/json' \
  -d '{"name":"Smart Document Gateway"}'
```

4. Copy the returned `id` into `GOOGLE_DRIVE_DESTINATION_FOLDER_ID`.
5. Restart the app.
6. Validate the folder:

```bash
curl http://localhost:3900/drive/folder/status
```

This works well with the narrow `drive.file` scope because the folder is created by the app.

Alternative manual path:

1. Create a folder for processed documents.
2. Suggested folder name: `Smart Document Gateway`.
3. Open the folder.
4. Copy the folder ID from the URL.

Example URL shape:

```text
https://drive.google.com/drive/folders/FOLDER_ID_IS_HERE
```

Manual folders might not be visible with the `drive.file` scope unless the app has explicit per-file access. If a manual folder returns `404 File not found`, use the recommended app-created folder path above.

## 7. Create Local `.env`

Copy the example file:

```bash
cp .env.example .env
```

Fill in these values:

```text
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/google/callback
GOOGLE_TOKEN_STORAGE_PATH=.tokens/google-oauth.json
GOOGLE_DRIVE_DESTINATION_FOLDER_ID=your-drive-folder-id
```

Keep the Gmail labels as defaults for the MVP:

```text
GMAIL_INPUT_LABEL=SDG/Process
GMAIL_PROCESSING_LABEL=SDG/Processing
GMAIL_PROCESSED_LABEL=SDG/Processed
GMAIL_FAILED_LABEL=SDG/Failed
GMAIL_SKIPPED_LABEL=SDG/Skipped
```

## 8. Create Gmail Labels

In Gmail, create these labels manually:

```text
SDG/Process
SDG/Processing
SDG/Processed
SDG/Failed
SDG/Skipped
```

Later, the app can create missing labels automatically.

## 9. Local MVP Checklist

- [ ] Google Cloud project exists.
- [ ] Gmail API is enabled.
- [ ] Google Drive API is enabled.
- [ ] Google Auth Platform is configured.
- [ ] OAuth consent audience is selected.
- [ ] Test user is added if app audience is `External`.
- [ ] OAuth scopes are added:
  - [ ] `gmail.modify`
  - [ ] `drive.file`
- [ ] OAuth Web Application client is created.
- [ ] Redirect URI is set to `http://localhost:3000/oauth/google/callback`.
- [ ] Client ID is copied into `.env`.
- [ ] Client secret is copied into `.env`.
- [ ] Drive destination folder is created.
- [ ] Drive folder ID is copied into `.env`.
- [ ] Gmail labels are created.

## 10. Authorize the Local App

After `.env` is filled in, build and start the service:

```bash
bun run build
bun run start
```

The app must run on the same port used in the OAuth redirect URI. With the default setup, that is port `3000`.

Check OAuth status:

```bash
curl http://localhost:3000/oauth/google/status
```

Start OAuth in your browser:

```text
http://localhost:3000/oauth/google/start
```

Google will redirect back to:

```text
http://localhost:3000/oauth/google/callback
```

After a successful callback, the app stores tokens at:

```text
.tokens/google-oauth.json
```

Expected status after authorization:

```json
{
  "configured": true,
  "driveFolderConfigured": true,
  "hasRefreshToken": true,
  "tokenStored": true
}
```

The response also includes the configured scopes and token storage path.

If Google returns `redirect_uri_mismatch`, update either the Google Cloud OAuth client redirect URI or `GOOGLE_OAUTH_REDIRECT_URI` so they match exactly.

## 11. Switch Target Mailbox

The current MVP stores one OAuth token:

```text
.tokens/google-oauth.json
```

The authenticated account represented by that file is the target Gmail mailbox and Drive account.

To switch to a different target mailbox:

1. Reset the stored token:

```bash
curl -X POST http://localhost:3900/oauth/google/reset
```

2. Authorize again:

```text
http://localhost:3900/oauth/google/start
```

3. Sign in as the new target mailbox.
4. Create a new app-owned Drive folder for that account:

```bash
curl -X POST http://localhost:3900/drive/setup-folder \
  -H 'content-type: application/json' \
  -d '{"name":"Smart Document Gateway"}'
```

5. Copy the returned `id` into `GOOGLE_DRIVE_DESTINATION_FOLDER_ID`.
6. Restart the app.

Resetting OAuth does not delete the old Drive folder or files. With the default `drive.file` scope, a new target account should create its own app-owned folder.

## Official References

- Gmail API Node.js quickstart: https://developers.google.com/workspace/gmail/api/quickstart/nodejs
- Gmail message label modification: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify
- Gmail attachment download: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get
- Google Drive API Node.js quickstart: https://developers.google.com/workspace/drive/api/quickstart/nodejs
- Google Drive file upload: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
- OAuth 2.0 web server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- OAuth 2.0 scopes: https://developers.google.com/identity/protocols/oauth2/scopes
