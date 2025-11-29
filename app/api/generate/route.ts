import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/rate-limit";

const strategiesSchema = z.object({
  strategies: z.array(
    z.object({
      keywords: z.array(z.string()).min(1).max(3)
        .describe("1-3 search keywords for this perspective"),
      topic: z.string().nullable()
        .describe("Optional topic keyword if it improves search"),
      perspective: z.enum(["emotional", "literal", "sarcastic"])
        .describe("The perspective this strategy takes"),
      reasoning: z.string()
        .describe("Brief explanation of keyword choices"),
    })
  ).length(3).describe("Exactly 3 strategies with different perspectives"),
});

const selectionSchema = z.object({
  selectedIndex: z
    .number()
    .int()
    .min(0)
    .describe("The index (0-based) of the best GIF from the list"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this GIF was selected"),
});

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate (optional - allow anonymous users)
    const { userId } = await auth();
    
    // Step 2: Rate limiting (only for authenticated users)
    let limit = 10;
    let reset = Date.now() + 24 * 60 * 60 * 1000;
    let remaining = 0;

    if (userId) {
      const rateLimitResult = await ratelimit.limit(userId);
      if (!rateLimitResult.success) {
        return Response.json(
          {
            error: "Rate limit exceeded. You've used all 10 generations for today.",
            limit: rateLimitResult.limit,
            remaining: 0,
            reset: rateLimitResult.reset
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": rateLimitResult.limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            },
          }
        );
      }
      limit = rateLimitResult.limit;
      reset = rateLimitResult.reset;
      remaining = rateLimitResult.remaining;

      // Step 3: Ensure user exists in database
      const user = await currentUser();
      await prisma.user.upsert({
        where: { clerkUserId: userId },
        update: {
          email: user?.emailAddresses[0]?.emailAddress,
          firstName: user?.firstName,
          lastName: user?.lastName,
          imageUrl: user?.imageUrl,
        },
        create: {
          clerkUserId: userId,
          email: user?.emailAddresses[0]?.emailAddress,
          firstName: user?.firstName,
          lastName: user?.lastName,
          imageUrl: user?.imageUrl,
        },
      });
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Text input is required" }, { status: 400 });
    }

    // Step 4: Use AI to generate 3 search strategies with different perspectives
    const { object: strategiesResult, usage } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: strategiesSchema,
      prompt: `You are a reaction GIF expert. Analyze the following text and create THREE different search strategies for finding the perfect reaction GIF, each with a distinct perspective.

Text to analyze: "${text}"

Generate exactly 3 strategies with these perspectives:

1. EMOTIONAL perspective: Focus on feelings, emotions, and mood. Keywords that capture the emotional reaction (e.g., "excited", "frustrated", "relieved", "nervous")

2. LITERAL perspective: Focus on actual actions, situations, or physical reactions. Keywords that describe what's happening literally (e.g., "typing fast", "head desk", "dancing", "facepalm")

3. SARCASTIC/HUMOROUS perspective: Focus on irony, exaggeration, or unexpected humor. Keywords that capture a witty or sarcastic reaction (e.g., "sure jan", "shocked pikachu", "this is fine", "eye roll")

For each strategy:
- Extract 1-3 keywords matching that perspective
- Optionally include a topic keyword ONLY if it would genuinely improve the search (same rules: specific, searchable, commonly used in GIFs)
- Provide reasoning for your choices

Make each strategy genuinely distinct - they should find different types of GIFs that complement each other.`,
    });

    console.log("Usage:", usage);
    console.log("Strategies generated:", strategiesResult.strategies.length);

    // Step 5: Execute parallel Giphy searches (5 results per strategy)
    const giphyApiKey = process.env.GIPHY_API_KEY;
    if (!giphyApiKey) {
      return Response.json(
        { error: "Giphy API key not configured" },
        { status: 500 }
      );
    }

    const searchPromises = strategiesResult.strategies.map(async (strategy) => {
      const reactionKeywords = strategy.keywords.join(" ");
      const searchQuery = strategy.topic
        ? `${reactionKeywords} ${strategy.topic}`
        : reactionKeywords;

      console.log(`[${strategy.perspective}] Search query:`, searchQuery);

      try {
        const response = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
            searchQuery
          )}&limit=5&rating=pg-13&lang=en`
        );

        if (!response.ok) {
          console.error(`[${strategy.perspective}] Giphy search failed:`, response.status);
          return { strategy, gifs: [], error: "Search failed" };
        }

        const data = await response.json();
        return {
          strategy,
          gifs: data.data || [],
          error: null,
        };
      } catch (error) {
        console.error(`[${strategy.perspective}] Giphy error:`, error);
        return { strategy, gifs: [], error: "Network error" };
      }
    });

    // Wait for all searches to complete
    const searchResults = await Promise.all(searchPromises);

    // Step 6: Use AI to select the best GIF from each strategy's results
    const selectionPromises = searchResults.map(async (result) => {
      // Skip selection if no GIFs found
      if (result.gifs.length === 0) {
        return {
          strategy: result.strategy,
          selectedGif: null,
          reasoning: result.error || "No GIFs found for this perspective",
          error: true,
        };
      }

      const gifOptions = result.gifs.map(
        (gif: { title: string; alt_text: string }, index: number) => ({
          index,
          title: gif.title,
          altText: gif.alt_text || "",
        })
      );

      try {
        const { object: selection } = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: selectionSchema,
          prompt: `You are selecting the perfect ${result.strategy.perspective.toUpperCase()} reaction GIF for someone's message.

Original message: "${text}"
Perspective: ${result.strategy.perspective}
Search keywords used: ${result.strategy.keywords.join(", ")}

Here are the available GIFs:
${gifOptions
  .map((g: { index: number; title: string; altText: string }) => {
    const desc = g.altText ? ` - ${g.altText}` : "";
    return `${g.index}. "${g.title}"${desc}`;
  })
  .join("\n")}

Select the GIF that:
1. Best captures the ${result.strategy.perspective} perspective
2. Matches the emotional tone and context of the original message
3. Would be the most relatable and engaging reaction
4. Has clear, expressive content

Return the index of the best GIF.`,
        });

        const selectedGif = result.gifs[selection.selectedIndex] || result.gifs[0];

        return {
          strategy: result.strategy,
          selectedGif,
          reasoning: selection.reasoning,
          error: false,
        };
      } catch (error) {
        console.error(`[${result.strategy.perspective}] Selection error:`, error);
        // Fallback: use first GIF if selection fails
        return {
          strategy: result.strategy,
          selectedGif: result.gifs[0],
          reasoning: "AI selection failed, using top result",
          error: true,
        };
      }
    });

    // Wait for all selections to complete
    const selections = await Promise.all(selectionPromises);

    // Filter out failed selections (partial results approach)
    const successfulSelections = selections.filter(s => s.selectedGif !== null);

    if (successfulSelections.length === 0) {
      return Response.json(
        { error: "No GIFs found for any perspective. Please try a different description." },
        { status: 404 }
      );
    }

    // Step 7: Save all successful generations to database with grouping (only for authenticated users)
    if (userId) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: userId },
      });

      if (dbUser) {
        // Generate a unique group ID for this generation session
        const generationGroupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create generation records for all successful selections
        await Promise.all(
          successfulSelections.map((selection) =>
            prisma.generation.create({
              data: {
                userId: dbUser.id,
                inputText: text,
                keywords: selection.strategy.keywords,
                topic: selection.strategy.topic,
                reasoning: selection.reasoning,
                gifUrl: selection.selectedGif.images.original.url,
                gifTitle: selection.selectedGif.title,
                perspective: selection.strategy.perspective,
                generationGroupId,
              },
            })
          )
        );
      }
    }

    // Build response with optional rate limit info
    const responseData: {
      results: Array<{
        url: string;
        keywords: string[];
        topic: string | null;
        reasoning: string;
        title: string;
        perspective: string;
      }>;
      totalFound: number;
      requestedPerspectives: number;
      rateLimit?: {
        remaining: number;
        limit: number;
        reset: string;
      };
    } = {
      results: successfulSelections.map((selection) => ({
        url: selection.selectedGif.images.original.url,
        keywords: selection.strategy.keywords,
        topic: selection.strategy.topic,
        reasoning: selection.reasoning,
        title: selection.selectedGif.title,
        perspective: selection.strategy.perspective,
      })),
      totalFound: successfulSelections.length,
      requestedPerspectives: 3,
    };

    // Only include rate limit info for authenticated users
    if (userId) {
      responseData.rateLimit = {
        remaining,
        limit,
        reset: new Date(reset).toISOString(),
      };
    }

    const headers: Record<string, string> = {};
    if (userId) {
      headers["X-RateLimit-Limit"] = limit.toString();
      headers["X-RateLimit-Remaining"] = remaining.toString();
      headers["X-RateLimit-Reset"] = reset.toString();
    }

    return Response.json(responseData, { headers });
  } catch (error) {
    console.error("Error generating GIF:", error);
    return Response.json(
      { error: "Failed to generate GIF recommendation" },
      { status: 500 }
    );
  }
}
