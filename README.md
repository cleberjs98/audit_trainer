# Store Audit Trainer

A mobile-first PWA for conducting and managing store audits, built with Next.js, TypeScript, Tailwind CSS, Supabase, and OpenAI API.

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **AI**: OpenAI API
- **PWA**: Progressive Web App

## Setup

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Your Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=       # Your Supabase service role key (server-side only)
OPENAI_API_KEY=                  # Your OpenAI API key (server-side only)
NEXT_PUBLIC_APP_URL=             # Your app URL (e.g. http://localhost:3000)
```

> **Security**: Never commit `.env.local`. Service role key and OpenAI key must only be used server-side.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Start development server        |
| `npm run build`      | Build for production            |
| `npm run start`      | Start production server         |
| `npm run lint`       | Run ESLint                      |
| `npm run typecheck`  | Run TypeScript type checking    |

## Project Structure

```
app/              # Next.js App Router pages and layouts
components/       # React components (ui, auth, dashboard, audit, etc.)
lib/              # Utility functions and integrations
  supabase/       # Supabase client helpers
  scoring/        # Audit scoring logic
  ai/             # OpenAI prompt builders and parsers
  pdf/            # PDF generation helpers
data/             # Static data (default checklists, etc.)
types/            # TypeScript type definitions
docs/             # Project documentation (added manually)
supabase/         # Supabase migrations and policies
public/           # Static assets
```

## Documentation

Project documentation is located in `docs/` and will be added manually:

- `docs/app-bible.md` — Product vision and business rules
- `docs/engineering.md` — Technical architecture and decisions
- `docs/implementation-phases.md` — Feature implementation phases
- `docs/implementation-checklist.md` — Phase-by-phase checklist
- `docs/ui-ux-design-system.md` — Design system and UI guidelines

## Roles

- **Admin**: Full access
- **Area Manager**: Access to stores in their assigned area
- **Store Manager**: Access to reports and action plans for their store
- **Leader**: Access to audits from their store for learning and comparison

