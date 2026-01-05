# FieldMate - AI Farm Assistant

An AI-powered chat assistant for managing John Deere Operations Center data. Built with Next.js, Assistant UI, Mastra agents, and PostgreSQL.

## Features

- **Chat Interface**: Natural language interaction with your farm data
- **John Deere Integration**: OAuth connection to John Deere Operations Center
- **Field Management**: View fields, boundaries, and areas
- **Work Plans**: Access and query work plans (planting, harvest, tillage, applications)
- **GeoJSON Boundaries**: Retrieve field boundary geometry for mapping
- **Data Caching**: PostgreSQL caching reduces API calls

## Prerequisites

- **Node.js 18+** (uses native fetch)
- **Docker** (for PostgreSQL)
- **John Deere Developer Account** ([developer.deere.com](https://developer.deere.com))
- **OpenAI API Key** ([platform.openai.com](https://platform.openai.com))

## John Deere Developer Setup

1. Go to [developer.deere.com](https://developer.deere.com) and create an account
2. Create a new application
3. Configure OAuth settings:
   - **Redirect URI**: `http://localhost:3000/api/auth/callback`
   - **Scopes**: Select `ag1`, `ag2`, `ag3`, `work1`, `work2`, `offline_access`
4. Note your **Client ID**, **Client Secret**, and **Application ID**

## Local Development Setup

### 1. Start PostgreSQL

```bash
npm run docker:dev
```

This starts a PostgreSQL container on port 5432 with:
- User: `fieldmate`
- Password: `fieldmate_dev_password`
- Database: `fieldmate`

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-openai-api-key

# Database (required)
DATABASE_URL=postgresql://fieldmate:fieldmate_dev_password@localhost:5432/fieldmate

# John Deere OAuth (required)
JOHN_DEERE_CLIENT_ID=your_client_id
JOHN_DEERE_CLIENT_SECRET=your_client_secret
JOHN_DEERE_APPLICATION_ID=your_application_uuid
JOHN_DEERE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Set to 'true' for sandbox, 'false' for production
JOHN_DEERE_USE_SANDBOX=true

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Generate and Run Database Migrations

```bash
# Generate migration files from schema
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Connect John Deere Account

1. Click "Connect John Deere" in the header
2. Sign in with your John Deere account
3. Grant permissions to the application
4. Select which organizations to connect
5. Start chatting with FieldMate!

## Example Conversations

- "Show me my fields"
- "What's the total acreage of my farm?"
- "List my planting work plans for 2024"
- "Get the boundary for the north field"
- "Show me all completed harvest operations"

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |
| `npm run docker:dev` | Start PostgreSQL container |
| `npm run docker:build` | Build Docker image |
| `npm run docker:up` | Start full Docker stack |
| `npm run docker:down` | Stop Docker stack |

## Project Structure

```
fieldmate/
├── app/
│   ├── api/
│   │   ├── auth/           # OAuth routes
│   │   │   ├── connect/    # Initiate OAuth flow
│   │   │   ├── callback/   # OAuth callback
│   │   │   ├── disconnect/ # Disconnect account
│   │   │   └── status/     # Connection status
│   │   ├── chat/           # Mastra agent endpoint
│   │   └── health/         # Health check
│   ├── assistant.tsx       # Main chat UI
│   ├── layout.tsx
│   └── page.tsx
├── mastra/
│   ├── agents/
│   │   └── field-mate-agent.ts   # GPT-4o agent
│   ├── tools/
│   │   └── john-deere-tools.ts   # JD API tools
│   ├── utils/
│   │   ├── token-manager.ts      # Token CRUD
│   │   └── client-factory.ts     # JD client factory
│   └── index.ts
├── db/
│   ├── schema/
│   │   ├── oauth-tokens.ts       # Token storage
│   │   └── john-deere-cache.ts   # Data cache
│   ├── client.ts                 # DB connection
│   └── migrate.ts                # Migration runner
├── components/
│   ├── connection-status.tsx     # JD connection widget
│   └── ui/                       # shadcn/ui components
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml        # Full stack
│   └── docker-compose.dev.yml    # Postgres only
└── drizzle.config.ts
```

## Mastra Agent Tools

| Tool | Description |
|------|-------------|
| `check_connection` | Verify John Deere account is connected |
| `list_organizations` | List connected organizations |
| `list_fields` | List fields with names and areas |
| `get_field_boundaries` | Get GeoJSON boundary geometry |
| `list_work_plans` | List work plans (filter by type/status/year) |
| `get_work_plan` | Get detailed work plan information |

## Docker Deployment

### Build and Run Locally

```bash
# Build the image
npm run docker:build

# Start full stack (app + postgres)
npm run docker:up
```

### Deploy to Render.com

1. **Create PostgreSQL Database**
   - Go to Render Dashboard → New → PostgreSQL
   - Note the connection string

2. **Create Web Service**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm run db:migrate && npm start`
     - **Health Check Path**: `/api/health`

3. **Add Environment Variables**
   - `DATABASE_URL` - Your Render PostgreSQL connection string
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `JOHN_DEERE_CLIENT_ID` - Your JD client ID
   - `JOHN_DEERE_CLIENT_SECRET` - Your JD client secret
   - `JOHN_DEERE_APPLICATION_ID` - Your JD app UUID
   - `JOHN_DEERE_REDIRECT_URI` - `https://your-app.onrender.com/api/auth/callback`
   - `JOHN_DEERE_USE_SANDBOX` - `false` for production
   - `NEXT_PUBLIC_APP_URL` - `https://your-app.onrender.com`

4. **Update John Deere App Settings**
   - Add your Render URL to the redirect URIs in developer.deere.com

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **AI Agent**: [Mastra](https://mastra.ai/) with GPT-4o
- **Chat UI**: [Assistant UI](https://www.assistant-ui.com/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **John Deere API**: [@acreblitz/platform-integrations](../packages/platform-integrations)

## Troubleshooting

### "No John Deere connection found"
- Click "Connect John Deere" in the header to authenticate

### OAuth callback errors
- Verify your redirect URI matches exactly in both `.env` and developer.deere.com
- Check that all required scopes are enabled in your JD application

### Database connection errors
- Ensure PostgreSQL is running: `npm run docker:dev`
- Verify `DATABASE_URL` in `.env` is correct

### Build errors
- Run `npm run typecheck` to check for TypeScript errors
- Ensure all dependencies are installed: `npm install`

## License

Private - Part of the AcreBlitz monorepo.
