# Migration Changes: Thirdweb/x402 to Clerk + Prisma + Neon DB

**Date:** 2025-11-27  
**Project:** x402-gif-generator (ReactiGIF)  
**Next.js Version:** 16.0.4  
**Prisma Version:** 7.0.1

> **⚠️ IMPORTANT FOR CONTRIBUTORS:**  
> This document describes a **completed migration** from a paid model to a free model. The current codebase uses Clerk, Prisma, and Upstash Redis. This file is kept for historical reference and technical documentation purposes.
>
> **If you're a new contributor**, you don't need to worry about the old Thirdweb implementation. Just follow the setup instructions in [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Overview

ReactiGIF was originally built as a demonstration of the [Thirdweb x402 payment protocol](https://thirdweb.com/x402), which enabled micropayments for API calls using cryptocurrency (USDC on Monad chain). Users paid $0.01 per GIF generation.

In November 2025, the project was migrated to a **free, authenticated service** to:
- Make the app more accessible to users
- Eliminate cryptocurrency/wallet requirements
- Add user accounts and generation history
- Implement fair-use rate limiting (10 generations per day)

The app now uses:
- **Clerk** for authentication (replaces wallet connection)
- **Prisma 7 + Neon PostgreSQL** for data persistence
- **Upstash Redis** for rate limiting (replaces payment verification)

---

## Dependencies Changes

### Removed
```json
{
  "thirdweb": "^5.114.1"
}
```

### Added
```json
{
  "@clerk/nextjs": "6.35.5",
  "@prisma/client": "7.0.1",
  "@prisma/adapter-pg": "7.0.1",
  "@upstash/redis": "1.35.7",
  "@upstash/ratelimit": "2.0.7",
  "@radix-ui/react-avatar": "1.1.11",
  "date-fns": "4.1.0",
  "pg": "8.16.3",
  "prisma": "7.0.1" (devDependency),
  "@types/pg": "8.15.6" (devDependency)
}
```

---

## New Files Created

### 1. Database Schema
**File:** `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id            String        @id @default(cuid())
  clerkUserId   String        @unique
  email         String?       @unique
  firstName     String?
  lastName      String?
  imageUrl      String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  generations   Generation[]
  @@index([clerkUserId])
  @@map("users")
}

model Generation {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  inputText       String    @db.Text
  keywords        String[]
  topic           String?
  reasoning       String    @db.Text
  gifUrl          String    @db.Text
  gifTitle        String
  createdAt       DateTime  @default(now())
  @@index([userId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("generations")
}
```

**Purpose:** Defines database models for users and their GIF generations.

---

### 2. Prisma Configuration (Prisma 7 Requirement)
**File:** `prisma/prisma.config.ts`
```typescript
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
    },
  },
});
```

**Purpose:** New Prisma 7 requirement for datasource configuration.

---

### 3. Prisma Client Singleton
**File:** `lib/prisma.ts`
```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For Prisma 7, we need to use a database adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Purpose:** Singleton pattern for Prisma client with Prisma 7 adapter pattern.

---

### 4. Rate Limiter
**File:** `lib/rate-limit.ts`
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 requests per 24 hours using sliding window
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "24 h"),
  analytics: true,
  prefix: "gif-generator",
});
```

**Purpose:** Serverless-friendly rate limiting using Upstash Redis with sliding window algorithm.

---

### 5. Authentication Middleware
**File:** `middleware.ts` (root level)
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes (everything else will be protected)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**Purpose:** Protects all routes except sign-in/sign-up using Clerk authentication.

---

### 6. History API Route
**File:** `app/api/history/route.ts`
```typescript
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return Response.json({ generations: [] });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.generation.count({
        where: { userId: user.id },
      }),
    ]);

    return Response.json({
      generations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return Response.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
```

**Purpose:** Fetches user's generation history with pagination.

---

### 7. Stats API Route
**File:** `app/api/stats/route.ts`
```typescript
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        generations: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return Response.json({
        totalGenerations: 0,
        todayGenerations: 0,
        daysActive: 0,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayGenerations = user.generations.filter(
      (g) => g.createdAt >= today
    ).length;

    const daysActive = Math.floor(
      (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Response.json({
      totalGenerations: user.generations.length,
      todayGenerations,
      daysActive: Math.max(1, daysActive),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return Response.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
```

**Purpose:** Provides user statistics (total generations, today's count, days active).

---

### 8. History Page
**File:** `app/history/page.tsx`
```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Generation {
  id: string;
  inputText: string;
  keywords: string[];
  topic: string | null;
  gifUrl: string;
  gifTitle: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/history?page=${page}&limit=12`);
      const data = await response.json();
      setGenerations(data.generations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Generation History</h1>
          <p className="text-muted-foreground">
            View all your past GIF generations
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Generator</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : generations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No generations yet. Create your first GIF!
            </p>
            <Link href="/">
              <Button className="mt-4">Generate GIF</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((gen) => (
              <Card key={gen.id} className="overflow-hidden">
                <img
                  src={gen.gifUrl}
                  alt={gen.gifTitle}
                  className="w-full aspect-video object-cover"
                />
                <CardContent className="p-4">
                  <p className="text-sm font-medium line-clamp-2 mb-2">
                    {gen.inputText}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {gen.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(gen.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Purpose:** Displays user's generation history with pagination and date formatting.

---

### 9. Avatar Component
**File:** `components/ui/avatar.tsx`
```typescript
"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
```

**Purpose:** Reusable avatar component using Radix UI.

---

## Modified Files

### 1. Providers Component
**File:** `app/providers.tsx`

**Before:**
```typescript
"use client";

import { ThirdwebProvider } from "thirdweb/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
```

**After:**
```typescript
"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "oklch(0.75 0.18 55)",
        },
        elements: {
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          card: "bg-card",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
```

**Changes:**
- Replaced `ThirdwebProvider` with `ClerkProvider`
- Added dark theme configuration matching existing app theme
- Customized appearance with primary color and button styles

---

### 2. Generate API Route
**File:** `app/api/generate/route.ts`

**Key Changes:**

**Removed:**
- Lines 1-15: All thirdweb imports (`settlePayment`, `facilitator`, `createThirdwebClient`, `monad`)
- Lines 46-61: Payment settlement logic

**Added:**
```typescript
// New imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/rate-limit";

// Step 1: Authentication
const { userId } = await auth();
if (!userId) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

// Step 2: Rate limiting
const { success, limit, reset, remaining } = await ratelimit.limit(userId);
if (!success) {
  return Response.json({
    error: "Rate limit exceeded. You've used all 10 generations for today.",
    limit,
    remaining: 0,
    reset
  }, { status: 429, headers: {...} });
}

// Step 3: User upsert in database
const user = await currentUser();
await prisma.user.upsert({
  where: { clerkUserId: userId },
  update: { email, firstName, lastName, imageUrl },
  create: { clerkUserId, email, firstName, lastName, imageUrl },
});

// Step 7: Save generation to database (after GIF selection)
const dbUser = await prisma.user.findUnique({
  where: { clerkUserId: userId },
});

if (dbUser) {
  await prisma.generation.create({
    data: {
      userId: dbUser.id,
      inputText: text,
      keywords: object.keywords,
      topic: object.topic,
      reasoning: selection.reasoning,
      gifUrl: selectedGif.images.original.url,
      gifTitle: selectedGif.title,
    },
  });
}

// Updated response with rate limit info
return Response.json({
  url: selectedGif.images.original.url,
  keywords: object.keywords,
  topic: object.topic,
  reasoning: selection.reasoning,
  title: selectedGif.title,
  rateLimit: { remaining, limit, reset: new Date(reset).toISOString() },
}, {
  headers: {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": reset.toString(),
  },
});
```

**Summary:**
- Replaced payment verification with Clerk authentication
- Added rate limiting (10 per 24 hours)
- Added user synchronization with database
- Added generation history saving
- Added rate limit headers to response

---

### 3. GIF Generator Component
**File:** `components/gif-generator.tsx`

**Removed:**
```typescript
import {
  useActiveAccount,
  useAutoConnect,
  useFetchWithPayment,
  useWalletBalance,
  useInvalidateBalances
} from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { monad } from "thirdweb/chains";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const usdcAddress = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
```

**Added:**
```typescript
import { useUser } from "@clerk/nextjs";

interface GifResult {
  // ... existing fields
  rateLimit?: {
    remaining: number;
    limit: number;
    reset: string;
  };
}

const [isPending, setIsPending] = useState(false);
const { user } = useUser();
```

**handleSubmit Changes:**
```typescript
// Before: Used fetchWithPayment
const data = await fetchWithPayment("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: input }),
});

// After: Standard fetch with error handling
const response = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: input }),
});

const data = await response.json();

if (!response.ok) {
  if (response.status === 429) {
    const resetDate = new Date(data.reset);
    setError(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
  } else {
    setError(data.error || "Something went wrong");
  }
  return;
}

setResult(data);
```

**UI Changes:**
```typescript
// Removed balance display
- <p className="text-sm text-muted-foreground">
-   Your balance: ${balance?.displayValue || "--.--"}
- </p>

// Added rate limit display
+ {result?.rateLimit && (
+   <div className="flex flex-col items-center justify-center gap-1">
+     <p className="text-sm text-muted-foreground">
+       {result.rateLimit.remaining} of {result.rateLimit.limit} generations remaining today
+     </p>
+   </div>
+ )}
```

---

### 4. Home Page
**File:** `app/page.tsx`

**Added Imports:**
```typescript
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
```

**Added Header:**
```typescript
{/* Header with user profile */}
<div className="absolute top-4 right-4 flex items-center gap-4">
  <Link
    href="/history"
    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    History
  </Link>
  <UserButton afterSignOutUrl="/" />
</div>
```

**Updated Pricing Badge:**
```typescript
// Before
<span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
  $0.01 per generation
</span>

// After
<span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
  10 free generations per day
</span>
```

---

### 5. Environment Variables
**File:** `.env.example`

**Before:**
```
OPENAI_API_KEY=
GIPHY_API_KEY=
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
THIRDWEB_SECRET_KEY=
THIRDWEB_SERVER_WALLET_ADDRESS=
```

**After:**
```
# AI Services
OPENAI_API_KEY=
GIPHY_API_KEY=

# Clerk Authentication (Get from: https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Neon PostgreSQL (Get from: https://console.neon.tech)
DATABASE_URL=

# Upstash Redis (Get from: https://console.upstash.com)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Architecture Changes

### Before (Thirdweb/x402)
1. **Payment Flow:**
   - Client: `useFetchWithPayment()` hook → 402 Payment Required → Wallet connection → Payment → Retry with `x-payment` header
   - Server: `settlePayment()` → Verify payment → Process request
   - Cost: $0.01 per generation (USDC on Monad chain)

2. **User Management:**
   - No user accounts
   - No data persistence
   - Wallet address as identity

3. **Access Control:**
   - Pay-per-use model
   - No authentication required
   - Anyone can pay and generate

### After (Clerk + Prisma + Upstash)
1. **Authentication Flow:**
   - Client: Middleware redirects unauthenticated users to sign-in
   - Server: `auth()` verifies session → Process request
   - Storage: User data synchronized to Neon PostgreSQL

2. **Rate Limiting:**
   - Upstash Redis with sliding window algorithm
   - 10 generations per 24 hours per user
   - Serverless-friendly HTTP-based connection

3. **Data Persistence:**
   - User profiles stored in PostgreSQL
   - Generation history with full metadata
   - Cascade delete (user deletion removes their generations)

4. **Access Control:**
   - Free tier with rate limits
   - Authentication required for all routes
   - User-specific data isolation

---

## Database Schema Design

### Users Table (`users`)
- `id` (String, CUID) - Primary key
- `clerkUserId` (String, Unique) - Links to Clerk user
- `email` (String?, Unique) - User email
- `firstName` (String?) - First name
- `lastName` (String?) - Last name
- `imageUrl` (String?) - Profile image URL
- `createdAt` (DateTime) - Account creation
- `updatedAt` (DateTime) - Last update

**Indexes:**
- `clerkUserId` for fast Clerk lookups

### Generations Table (`generations`)
- `id` (String, CUID) - Primary key
- `userId` (String, FK) - References users.id
- `inputText` (Text) - User's input prompt
- `keywords` (String[]) - Extracted AI keywords
- `topic` (String?) - Optional topic keyword
- `reasoning` (Text) - AI's selection reasoning
- `gifUrl` (Text) - URL to GIF
- `gifTitle` (String) - GIF title from Giphy
- `createdAt` (DateTime) - Generation timestamp

**Indexes:**
- `[userId, createdAt DESC]` for user history queries
- `[createdAt DESC]` for global recent queries

**Relationships:**
- `User.generations` → One-to-Many
- `Generation.user` → Many-to-One with cascade delete

---

## API Endpoints

### New Endpoints
1. **GET `/api/history`**
   - Query params: `page`, `limit`
   - Returns: User's generation history with pagination
   - Authentication: Required (Clerk)

2. **GET `/api/stats`**
   - Returns: User statistics (total, today, days active)
   - Authentication: Required (Clerk)

### Modified Endpoints
1. **POST `/api/generate`**
   - Before: Required `x-payment` header
   - After: Requires Clerk session
   - New behavior:
     - Authenticates with Clerk
     - Rate limits with Upstash
     - Saves to database
     - Returns rate limit info in response

---

## Features Added

1. **User Profiles**
   - Clerk UserButton component
   - Profile images
   - Sign in/out functionality

2. **Generation History**
   - `/history` page
   - Grid view of past generations
   - Pagination (12 per page)
   - Date formatting with date-fns

3. **Rate Limiting**
   - 10 generations per 24 hours
   - Sliding window algorithm
   - Rate limit counter display
   - Reset time notification

4. **Data Persistence**
   - All generations saved
   - User metadata synchronized
   - Historical data queryable

---

## Breaking Changes

### Client-Side
1. No more wallet connection required
2. No more payment flow
3. Must sign in to use app
4. Rate limits enforced

### Server-Side
1. All routes protected by Clerk middleware
2. No thirdweb environment variables
3. Requires database connection
4. Requires Redis connection

### Environment
1. New required variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DATABASE_URL`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

2. Removed variables:
   - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
   - `THIRDWEB_SECRET_KEY`
   - `THIRDWEB_SERVER_WALLET_ADDRESS`

---

## Prisma 7 Specific Changes

### Configuration Pattern
- **Old:** Connection URL in `schema.prisma`
- **New:** Connection URL in `prisma.config.ts` + adapter pattern

### Required Files
1. `prisma/schema.prisma` - Models only, no datasource URL
2. `prisma/prisma.config.ts` - Datasource configuration
3. `lib/prisma.ts` - Client with adapter (`@prisma/adapter-pg` + `pg`)

### Migration Commands
```bash
npx prisma generate          # Generate client
npx prisma migrate dev       # Run migrations in dev
npx prisma studio            # Database GUI
```

---

## Testing Checklist

### Authentication
- [x] Unauthenticated users redirected to sign-in
- [ ] Sign up creates user in database
- [ ] Sign in loads existing user
- [ ] UserButton displays correctly
- [ ] Sign out works

### Rate Limiting
- [ ] Rate limit displays (X of 10)
- [ ] After 10 generations, returns 429
- [ ] Error shows reset time
- [ ] Different users have separate limits
- [ ] Sliding window works correctly

### Data Persistence
- [ ] Generations saved with all fields
- [ ] History page shows user's GIFs only
- [ ] Pagination works
- [ ] Date formatting correct
- [ ] User metadata synced from Clerk

### UI/UX
- [ ] Dark theme matches Clerk components
- [ ] Rate limit counter updates after generation
- [ ] History link works
- [ ] Download button works
- [ ] Error messages display correctly

---

## Performance Considerations

1. **Database Queries:**
   - Indexed on `clerkUserId` for fast user lookups
   - Indexed on `[userId, createdAt]` for history queries
   - Uses `Promise.all` for parallel queries

2. **Rate Limiting:**
   - HTTP-based Redis (no connection pooling)
   - Sub-millisecond latency
   - Analytics enabled for monitoring

3. **Prisma Client:**
   - Singleton pattern prevents multiple instances
   - Connection pooling via `pg` Pool
   - Logging in development only

---

## Security Improvements

1. **Authentication:**
   - All routes protected by middleware
   - No anonymous access
   - Session-based authentication

2. **Data Isolation:**
   - Users can only see their own data
   - Database queries filtered by `userId`
   - Cascade delete prevents orphaned records

3. **Rate Limiting:**
   - Prevents abuse
   - User-specific limits
   - Cannot be bypassed without valid session

---

## Future Enhancements

1. **Premium Tiers:**
   - Paid plans with higher limits
   - Stripe integration
   - Add `tier` field to User model

2. **Features:**
   - Favorite/bookmark GIFs
   - Collections/folders
   - Social sharing
   - Export history as JSON
   - Search within history

3. **Analytics:**
   - Track popular keywords
   - Generation success rates
   - User engagement metrics

---

## Resources & Documentation

- **Next.js 16:** https://nextjs.org/blog/next-16
- **Clerk (Next.js 16):** https://clerk.com/docs/quickstarts/nextjs
- **Prisma 7:** https://www.prisma.io/docs/orm/overview/databases/neon
- **Upstash Rate Limiting:** https://github.com/upstash/ratelimit-js
- **Neon PostgreSQL:** https://neon.com/docs/guides/prisma

---

## Notes for Future AI Context

1. **Prisma 7 is different** - Uses adapter pattern, no URL in schema
2. **Clerk middleware** - Does NOT protect by default in 2025, must explicitly call `auth().protect()`
3. **Next.js 16** - Uses `middleware.ts` not `proxy.ts` for Clerk compatibility
4. **Rate limiting** - Sliding window is better than fixed window for UX
5. **Database adapter** - Required for Prisma 7, uses `@prisma/adapter-pg` + `pg`
6. **User sync** - Upsert pattern ensures Clerk users exist in database
7. **Type safety** - All database operations are type-safe with Prisma generated types

---

**End of Migration Documentation**
