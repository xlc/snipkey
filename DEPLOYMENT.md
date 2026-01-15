# Deployment Guide

This guide covers deploying Snipkey to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Create a free account at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally
   ```bash
   bun install -g wrangler
   ```
3. **Authenticate Wrangler**:
   ```bash
   wrangler login
   ```

## Step 1: Create Production D1 Database

```bash
wrangler d1 create snipkey-db
```

You'll receive output like:

```
✅ Successfully created DB 'snipkey-db'

database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` and update `wrangler.json`:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "snipkey-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

## Step 2: Configure Environment Variables

Update the `vars` section in `wrangler.json`:

```json
{
  "vars": {
    "RP_ID": "your-domain.com",
    "ORIGIN": "https://your-app.workers.dev",
    "CHALLENGE_TTL_MS": "300000",
    "SESSION_TTL_MS": "604800000"
  }
}
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `RP_ID` | Relying Party ID for WebAuthn (your domain) | `snipkey.com` |
| `ORIGIN` | Full origin URL of your app | `https://snipkey.workers.dev` |
| `CHALLENGE_TTL_MS` | How long auth challenges persist (ms) | `300000` (5 minutes) |
| `SESSION_TTL_MS` | How long user sessions persist (ms) | `604800000` (7 days) |

### Finding Your ORIGIN

After deploying, your Workers app will have a URL like:
- `https://snipkey.your-subdomain.workers.dev`

Use this as the `ORIGIN` value.

The `RP_ID` should match your domain:
- If using a Workers.dev subdomain: `snipkey.workers.dev`
- If using a custom domain: `snipkey.com`

## Step 3: Run Database Migrations

Apply all migrations to the production database:

```bash
# Create tables
wrangler d1 execute snipkey-db --file=./migrations/0001_init.sql

# Add users table
wrangler d1 execute snipkey-db --file=./migrations/0002_add_users.sql

# Add user_id to snippets
wrangler d1 execute snipkey-db --file=./migrations/0003_snippets_user_id.sql
```

Verify migrations:

```bash
wrangler d1 execute snipkey-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Expected output:
```
┌─────────────────┐
│ name            │
├─────────────────┤
│ challenges      │
│ sessions        │
│ users           │
│ snippets        │
└─────────────────┘
```

## Step 4: Build the Application

```bash
bun run build
```

This creates a production-optimized build in the `.worker` directory.

## Step 5: Deploy

```bash
wrangler deploy
```

Expected output:

```
✅ Successfully deployed your Worker to Workers.dev
https://snipkey.your-subdomain.workers.dev
```

## Step 6: Update Environment Variables (if needed)

If your deployment URL differs from what you set in `wrangler.json`, update it:

```json
{
  "vars": {
    "ORIGIN": "https://snipkey.your-subdomain.workers.dev"
  }
}
```

Then redeploy:

```bash
wrangler deploy
```

## Step 7: Verify Deployment

1. **Visit your app**: Open the deployed URL
2. **Test registration**: Try registering with a passkey
3. **Create a snippet**: Test creating a snippet with placeholders
4. **Test editing**: Verify inline placeholder editing works
5. **Test mobile**: Open on mobile to verify Sheet editor

## Custom Domain (Optional)

### 1. Add Custom Domain in Cloudflare Dashboard

1. Go to **Workers & Pages**
2. Select your Worker
3. Click **Settings** → **Triggers**
4. Click **Add Custom Domain**
5. Enter your domain (e.g., `snipkey.com`)

### 2. Update DNS

Cloudflare will automatically add the necessary DNS records.

### 3. Update Environment Variables

Update `wrangler.json`:

```json
{
  "vars": {
    "RP_ID": "snipkey.com",
    "ORIGIN": "https://snipkey.com"
  }
}
```

Redeploy:

```bash
wrangler deploy
```

## Troubleshooting

### Passkey Registration Fails

**Problem**: Registration errors on production

**Solution**: Ensure `RP_ID` and `ORIGIN` are correctly set:
- `RP_ID` must match the domain (no protocol, no port)
- `ORIGIN` must include protocol (https://)
- For Workers.dev subdomains: `RP_ID` = `snipkey.workers.dev`

### Database Errors

**Problem**: "Database not found" errors

**Solution**: Verify `database_id` in `wrangler.json` matches your production database ID

```bash
wrangler d1 list
```

### Migration Failures

**Problem**: Migrations don't apply

**Solution**: Check migration files exist and run one at a time:

```bash
wrangler d1 execute snipkey-db --file=./migrations/0001_init.sql --json
```

### CORS Issues

**Problem**: API calls fail in browser

**Solution**: Ensure `ORIGIN` in `wrangler.json` matches your deployment URL exactly

## Production Checklist

- [ ] Production D1 database created
- [ ] `database_id` updated in `wrangler.json`
- [ ] Environment variables configured (`RP_ID`, `ORIGIN`)
- [ ] All migrations applied successfully
- [ ] Application builds without errors
- [ ] Deployment successful
- [ ] Can register new user with passkey
- [ ] Can create/edit/delete snippets
- [ ] Placeholder parsing works correctly
- [ ] Inline editing works (desktop + mobile)
- [ ] Copy to clipboard works
- [ ] Search and tag filtering work
- [ ] Passkey auth works on mobile devices

## Monitoring

### View Logs

```bash
wrangler tail
```

### Database Queries

```bash
# Query snippets table
wrangler d1 execute snipkey-db --command="SELECT * FROM snippets LIMIT 10"

# Query users table
wrangler d1 execute snipkey-db --command="SELECT id, created_at FROM users"
```

### Analytics

View analytics in the Cloudflare Dashboard:
1. Go to **Workers & Pages**
2. Select your Worker
3. Click **Analytics**

## Rollback

If you need to rollback to a previous version:

```bash
# View deployment history
wrangler deployments list

# Rollback to specific deployment
wrangler rollback [deployment-id]
```

## Updates

To deploy updates:

```bash
# 1. Make changes
# 2. Test locally
bun run dev

# 3. Build
bun run build

# 4. Deploy
wrangler deploy
```

No need to re-run migrations unless you add new migration files.

## Support

For issues specific to:
- **Cloudflare Workers**: [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- **D1 Database**: [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- **Wrangler CLI**: [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
