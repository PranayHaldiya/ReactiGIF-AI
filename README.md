# ReactiGIF

An AI-powered app that generates **3 perfect reaction GIFs** with unique perspectives for any situation. Describe a feeling or scenario, and ReactiGIF uses AI to find the most relevant GIFs from emotional, literal, and sarcastic angles.

**Try it free!** No sign-in required for your first generation. Sign up for 10 generations per day (30 total GIFs via 24-hour sliding window).

## ✨ Features

- 🎭 **3 Unique Perspectives**: Get emotional, literal, and sarcastic GIF options for every situation
- 🤖 **AI-Powered Selection**: Uses Groq's Kimi K2 (state-of-the-art reasoning model) to analyze your description
- ⚡ **Parallel Processing**: Generates 3 GIFs simultaneously in ~1.5 seconds
- 🆓 **Free Trial**: Try it once without signing in (localStorage-based)
- 🔐 **Secure Authentication**: Sign in with Clerk (email, Google, GitHub, etc.)
- 📊 **Generation History**: View all your past generation sessions with grouped display
- 📤 **Native Sharing**: Share GIFs directly to any platform (WhatsApp, Instagram, etc.)
- 💾 **Download Option**: Save GIFs locally with one click
- 🎯 **Smart Rate Limiting**: 10 sessions per 24 hours (1 session = 3 GIFs)
- 💾 **Data Persistence**: All generations saved with perspective labels
- 📱 **Responsive Design**: 3-column grid on desktop, stacks on mobile
- 🎨 **Modern UI**: Glassmorphism effects, sticky header, collapsible sidebar

## 🚀 How It Works

1. **Visit the app** - No sign-in required for first try!
2. **Enter a description** (e.g., "when my code finally compiles")
3. **AI analyzes** - Groq Kimi K2 generates 3 search strategies:
   - **Emotional**: Focuses on feelings and mood (pink badge)
   - **Literal**: Focuses on actual actions and situations (blue badge)
   - **Sarcastic**: Focuses on irony and humor (purple badge)
4. **Parallel search** - Queries Giphy API for each perspective simultaneously
5. **AI selection** - Picks the best GIF from each perspective's results
6. **Instant results** - Get 3 GIFs with color-coded perspective badges
7. **Share or download** - Use native share sheet or download locally
8. **Sign in for more** - Get 10 sessions per day + history tracking

## 📚 Project History

ReactiGIF was originally built as a demonstration of the [Thirdweb x402 payment protocol](https://thirdweb.com/x402), charging $0.01 per generation using cryptocurrency. In November 2025, it was migrated to a free, authenticated service to make it more accessible to users.

**For technical details on the migration**, see [MIGRATION_CHANGES.md](MIGRATION_CHANGES.md).

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **UI**: React 19, Tailwind CSS 4, Radix UI
- **AI**: Vercel AI SDK with Groq (Kimi K2 Instruct - beats GPT-5 & Claude 4.5, free tier available!)
- **Authentication**: Clerk
- **Database**: Neon PostgreSQL with Prisma 7 ORM
- **Rate Limiting**: Upstash Redis (sliding window algorithm)
- **API Integration**: Giphy API

## Getting Started

1. Clone the repo and install dependencies:

```bash
pnpm install
```

2. Create `.env.local` with your API keys:

```env
# AI Services
GROQ_API_KEY=your_groq_api_key                              # Get from https://console.groq.com
GIPHY_API_KEY=your_giphy_api_key                            # Get from https://developers.giphy.com

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key # Get from https://dashboard.clerk.com
CLERK_SECRET_KEY=your_clerk_secret_key

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require # Get from https://console.neon.tech

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url               # Get from https://console.upstash.com
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

3. Set up your database:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to try it out.

## 📖 Project Structure

```
app/
├── api/
│   ├── generate/route.ts    # Main GIF generation endpoint
│   ├── history/route.ts     # User history API
│   └── stats/route.ts       # User statistics API
├── history/page.tsx         # Generation history page
├── layout.tsx               # Root layout with sidebar
└── page.tsx                 # Home page

components/
├── ui/                      # Shadcn UI components
├── app-sidebar.tsx          # Collapsible sidebar with auth
└── gif-generator.tsx        # Main GIF generation component

lib/
├── gif-actions.ts           # Reusable share/download utilities
├── prisma.ts                # Prisma client singleton
├── rate-limit.ts            # Upstash Redis rate limiter
└── utils.ts                 # Utility functions

prisma/
└── schema.prisma            # Database schema (User, Generation)
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Learn More

- [Groq Documentation](https://console.groq.com/docs) — Learn about Groq's fast AI inference
- [Vercel AI SDK](https://ai-sdk.dev) — AI SDK documentation
- [Clerk Documentation](https://clerk.com/docs) — Authentication documentation
- [Prisma 7 Documentation](https://www.prisma.io/docs) — Database ORM documentation
- [Upstash Redis](https://upstash.com/docs/redis) — Serverless Redis for rate limiting
- [Shadcn UI](https://ui.shadcn.com) — Beautiful UI components

## ⭐ Show Your Support

If you find ReactiGIF useful, please consider giving it a star on GitHub!

