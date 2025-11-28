import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

interface Generation {
  id: string;
  inputText: string;
  keywords: string[];
  topic: string | null;
  gifUrl: string;
  gifTitle: string;
  createdAt: Date;
  perspective: string | null;
  generationGroupId: string | null;
}

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
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    // Fetch all generations for the user
    const allGenerations = await prisma.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Group generations by generationGroupId
    const grouped = new Map<string, Generation[]>();

    allGenerations.forEach((gen) => {
      // Handle legacy records without groupId (treat each as its own group)
      const groupKey = gen.generationGroupId || gen.id;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(gen);
    });

    // Convert to array and sort by newest first
    const groupedArray = Array.from(grouped.entries()).map(([groupId, gifs]) => ({
      groupId,
      inputText: gifs[0].inputText,
      createdAt: gifs[0].createdAt,
      gifs: gifs.sort((a, b) => {
        // Sort within group: emotional, literal, sarcastic
        const order = { emotional: 0, literal: 1, sarcastic: 2 };
        const aOrder = order[a.perspective as keyof typeof order] ?? 999;
        const bOrder = order[b.perspective as keyof typeof order] ?? 999;
        return aOrder - bOrder;
      }),
    }));

    // Apply pagination to groups (not individual GIFs)
    const paginatedGroups = groupedArray.slice(skip, skip + limit);

    return Response.json({
      generations: paginatedGroups,
      pagination: {
        total: groupedArray.length,
        page,
        limit,
        totalPages: Math.ceil(groupedArray.length / limit),
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
