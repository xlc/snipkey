# Snipkey

**Web App**: [snipkey.polka.codes](https://snipkey.polka.codes)

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
- **Optimization**: React Compiler (automatic memoization)
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

# Apply pending migrations
bun run db:migrate
```

### Environment Variables

Local development uses these defaults (see `wrangler.jsonc`):

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

Update `database_id` in `wrangler.jsonc` with the returned ID.

2. **Update environment variables** in `wrangler.jsonc`:

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
wrangler d1 migrations apply snipkey-db --remote
```

4. **Deploy**:

```bash
wrangler deploy
```

## Project Structure

```
snipkey/
├── src/
│   ├── components/          # React components
│   │   └── ui/              # shadcn/ui base components
│   ├── lib/
│   │   ├── auth/            # Client-side auth utilities
│   │   ├── constants/       # App constants
│   │   ├── hooks/           # Custom React hooks
│   │   └── server/          # Server-side utilities (auth, middleware, db)
│   ├── routes/              # TanStack Start file-based routes
│   ├── server/              # TanStack Start server functions
│   └── styles/              # Global styles
├── shared/
│   └── src/
│       ├── db/              # Database schema and utilities
│       ├── template/        # Placeholder parsing and rendering
│       ├── types/           # Shared TypeScript types
│       ├── utils/           # Shared utilities
│       └── validation/      # Zod schemas and validation limits
├── migrations/              # D1 database migrations
├── wrangler.jsonc           # Cloudflare Workers configuration
├── biome.json               # Linting/formatting config
└── package.json             # Single package at root
```

## Scripts

```bash
# Development
bun run dev              # Start dev server

# Code Quality
bun run check            # Run Biome linter/formatter (auto-fixes issues)
bun run typecheck        # TypeScript type checking
bun run lint             # Biome lint only
bun run format           # Biome format only

# Deployment
bun run build            # Production build
wrangler deploy          # Deploy to Workers

# Database
bun run db:migrate       # Apply pending D1 migrations (local)
bun run db:migration:create <name>  # Create a new migration
bun run db:migration:list   # List pending migrations
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
