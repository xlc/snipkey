# Snipkey

A private snippet manager with placeholder support and inline editing. Built with TanStack Start, Cloudflare Workers, and D1.

## Features

- **Private Snippets**: Each user has their own private snippet vault
- **Placeholders**: Use `{{name:type}}` or `{{name:type=default}}` syntax for dynamic values
- **Real-time Parsing**: See placeholders highlighted as you type
- **Inline Editing**: Tap placeholder chips to edit values (Popover on desktop, Sheet on mobile)
- **Passkey Auth**: Passwordless authentication using WebAuthn
- **Tag Organization**: Filter snippets by tags
- **Search**: Full-text search across titles and bodies
- **Offline-ready**: Placeholder values persist in localStorage

## Tech Stack

- **Framework**: TanStack Start (React SSR with file-based routing)
- **Backend**: Cloudflare Workers + D1 (SQLite)
- **Database**: Kysely (type-safe query builder)
- **Auth**: SimpleWebAuthn (passkey authentication)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Validation**: Zod schemas
- **Linting**: Biome (fast linter/formatter)
- **Runtime**: Bun

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.3.5+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for Cloudflare Workers

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

The app will be available at `http://localhost:5173`.

### Database Setup

```bash
# Create local D1 database
wrangler d1 create snipkey-db --local

# Run migrations
wrangler d1 execute snipkey-db --local --file=./migrations/0001_init.sql
wrangler d1 execute snipkey-db --local --file=./migrations/0002_add_users.sql
wrangler d1 execute snipkey-db --local --file=./migrations/0003_snippets_user_id.sql
```

### Environment Variables

Local development uses these defaults (see `wrangler.json`):

```bash
RP_ID=localhost
ORIGIN=http://localhost:5173
CHALLENGE_TTL_MS=300000        # 5 minutes
SESSION_TTL_MS=604800000       # 7 days
```

## Placeholder Syntax

Placeholders use double curly braces with type information:

```text
Hello {{name:text=World}}, you are {{age:number=30}} years old.
Tone: {{tone:enum(formal,casual,slang)=formal}}
```

### Supported Types

- `text` - Text input (renders as Textarea)
- `number` - Numeric input with validation
- `enum(option1,option2,...)` - Select from predefined options

### Defaults

Optional default values are specified with `=`:

```text
{{name:text=World}}     # Default: "World"
{{age:number=30}}        # Default: 30
{{tone:enum(formal,casual)=formal}}  # Default: "formal"
```

## Build & Deploy

### Production Build

```bash
bun run build
```

### Deploy to Cloudflare Workers

1. **Create production D1 database**:

```bash
wrangler d1 create snipkey-db
```

Update `database_id` in `wrangler.json` with the returned ID.

2. **Update environment variables** in `wrangler.json`:

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

3. **Run migrations in production**:

```bash
wrangler d1 execute snipkey-db --file=./migrations/0001_init.sql
wrangler d1 execute snipkey-db --file=./migrations/0002_add_users.sql
wrangler d1 execute snipkey-db --file=./migrations/0003_snippets_user_id.sql
```

4. **Deploy**:

```bash
wrangler deploy
```

## Project Structure

```
snipkey/
├── apps/web/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/
│   │   │   ├── server/      # Server-side utilities
│   │   │   └── hooks/       # Custom React hooks
│   │   ├── routes/          # File-based routing
│   │   └── server/          # TanStack Start server functions
│   └── package.json
├── shared/
│   └── src/
│       ├── db/              # Database utilities
│       ├── template/        # Template parsing & rendering
│       ├── types/           # Shared TypeScript types
│       └── validation/      # Zod schemas & limits
├── migrations/              # D1 database migrations
├── wrangler.json            # Cloudflare Workers config
├── biome.json               # Linting/formatting config
└── package.json             # Root package.json
```

## Scripts

```bash
# Development
bun run dev              # Start dev server

# Code Quality
bun run check            # Run Biome linter/formatter
bun run test             # Run tests

# Deployment
bun run build            # Production build
wrangler deploy          # Deploy to Workers

# Database (local)
wrangler d1 execute snipkey-db --local --command="SELECT * FROM snippets"
```

## Limits

To ensure performance and security, these limits are enforced:

- **Max placeholders per snippet**: 20
- **Max tags per snippet**: 10
- **Max snippet title length**: 200 characters
- **Max snippet body length**: 50,000 characters
- **Max snippets per page**: 100

## License

MIT

## Contributing

This is a personal project, but feel free to fork and customize for your own use!

## Roadmap

- [ ] Replace MOCK_USER_ID with real session management
- [ ] Add snippet import/export
- [ ] Public snippet sharing
- [ ] Folder organization
- [ ] Snippet templates
- [ ] Rich text editing
- [ ] Version history for snippets
