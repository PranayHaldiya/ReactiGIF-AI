# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ReactiGIF** is a Next.js 16 app that generates AI-powered reaction GIFs with 3 unique perspectives (emotional, literal, sarcastic) based on user descriptions. It uses Clerk for authentication, Prisma 7 + Neon PostgreSQL for data persistence, and Upstash Redis for rate limiting. The app is free to use with a rate limit of 10 generation sessions (30 total GIFs) per 24 hours per authenticated user.

## Key Technologies

- **Framework**: Next.js 16 (App Router) with Turbopack
- **UI**: React 19, Tailwind CSS 4, Radix UI components
- **AI**: Vercel AI SDK with Google Gemini (Gemini 2.5 Flash for keyword extraction and GIF selection)
- **Authentication**: Clerk
- **Database**: Neon PostgreSQL with Prisma 7 ORM
- **Rate Limiting**: Upstash Redis (sliding window algorithm)
- **API Integration**: Giphy API for GIF search

## Common Commands

```bash
# Development
pnpm dev              # Start dev server on http://localhost:3000
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

## Environment Variables

Required in `.env.local`:

```
# AI Services
GOOGLE_GENERATIVE_AI_API_KEY=          # Get from https://aistudio.google.com/apikey
GIPHY_API_KEY=                         # Giphy API key for GIF search

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=     # Public Clerk key
CLERK_SECRET_KEY=                      # Server-side Clerk secret

# Neon PostgreSQL
DATABASE_URL=                          # PostgreSQL connection string with ?sslmode=require

# Upstash Redis
UPSTASH_REDIS_REST_URL=                # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=              # Upstash Redis REST token
```

## Architecture

### Authentication & Authorization Flow

The app uses Clerk for authentication with route protection:

**Middleware** (`middleware.ts`):
1. `clerkMiddleware()` protects all routes except `/sign-in` and `/sign-up`
2. Unauthenticated users are redirected to sign-in page
3. Uses `createRouteMatcher()` to define public routes

**Server-side** (`app/api/generate/route.ts`):
1. Verify authentication with `auth()` from Clerk
2. Check rate limit with Upstash Redis (10 per 24h sliding window)
3. Sync user data to Neon database using `prisma.user.upsert()`
4. Process GIF generation
5. Save generation to database
6. Return result with rate limit headers

**Client-side** (`components/gif-generator.tsx`):
1. Use standard `fetch()` for API calls
2. Handle 429 rate limit errors with reset time display
3. Display rate limit counter from response

### AI Generation Pipeline

The GIF generation uses a two-stage AI process:

1. **Keyword Extraction** (route.ts:70-90):
   - AI analyzes user text to extract 1-3 reaction keywords (emotions, gestures)
   - Optionally extracts a topic keyword only if it would improve search results
   - Uses structured output with Zod schema validation

2. **GIF Search** (route.ts:113-130):
   - Queries Giphy API with extracted keywords/topic
   - Fetches top 10 results (PG-13 rated)

3. **Selection** (route.ts:143-164):
   - AI evaluates all 10 GIFs based on title and alt text
   - Selects the best match for emotional tone and humor

### Component Structure

- `app/layout.tsx` - Root layout with ClerkProvider wrapper
- `app/providers.tsx` - Client component that wraps ClerkProvider with dark theme
- `app/page.tsx` - Home page with gradient background, UserButton, and History link
- `app/history/page.tsx` - Generation history page with pagination
- `components/gif-generator.tsx` - Main component with rate-limited fetch
- `components/ui/*` - Shadcn UI components (button, card, input, avatar)

### Database Models (Prisma 7)

**User Model:**
- Links to Clerk via `clerkUserId`
- Stores profile data (email, name, image)
- Has one-to-many relationship with generations

**Generation Model:**
- Stores all GIF generation metadata
- Foreign key to User with cascade delete
- Indexed for fast history queries

**Prisma 7 Changes:**
- No `url` in datasource (moved to `prisma.config.ts`)
- Uses adapter pattern (`@prisma/adapter-pg` + `pg`)
- Connection pooling via PostgreSQL Pool

## Important Implementation Details

### Rate Limiting

Uses Upstash Redis with sliding window algorithm:
- 10 generations per 24 hours per user
- User identified by Clerk `userId`
- Sliding window prevents burst attacks at window boundaries
- Returns rate limit info in headers and response body

### Clerk Integration

- `clerkMiddleware()` in middleware.ts protects all routes
- Must explicitly call `auth().protect()` (does NOT protect by default in 2025)
- `UserButton` component for profile/sign-out
- User data synced to database on each request

### AI Model Selection

- Keyword extraction: `gemini-2.5-flash-latest` via Google AI (1M token context, cost-effective, excellent for creative text understanding)
- GIF selection: `gemini-2.5-flash-latest` via Google AI (fast, accurate selection with strong reasoning capabilities)

### Prisma 7 Setup

**Generate client:**
```bash
npx prisma generate
```

**Run migrations:**
```bash
npx prisma migrate dev --name migration_name
```

**View database:**
```bash
npx prisma studio
```

### Path Aliases

Uses `@/*` alias that maps to project root (configured in tsconfig.json)

## Development Notes

- The app runs in dark mode by default (see `app/layout.tsx:22`)
- All client components must have `"use client"` directive
- Authentication is required for all routes (enforced by middleware)
- Rate limits reset 24 hours after first request (sliding window)
- Database uses Prisma 7 adapter pattern with `pg` driver
- For local testing, set up Clerk, Neon, and Upstash accounts

## API Routes

- `POST /api/generate` - Generate GIF (authenticated, rate-limited)
- `GET /api/history` - Fetch user's generation history (paginated)
- `GET /api/stats` - Get user statistics (total, today, days active)

## Migration History

See `MIGRATION_CHANGES.md` for complete details on the migration from thirdweb/x402 to Clerk + Prisma + Upstash (completed 2025-11-27).

DISTILLED_AESTHETICS_PROMPT = """
<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. 

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>
"""
