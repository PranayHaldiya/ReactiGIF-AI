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

    // Count unique generation groups instead of individual records
    const allGroups = new Set(
      user.generations.map(g => g.generationGroupId || g.id)
    );

    const todayGenerations = user.generations.filter(
      (g) => g.createdAt >= today
    );
    const todayGroups = new Set(
      todayGenerations.map(g => g.generationGroupId || g.id)
    );

    const daysActive = Math.floor(
      (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Response.json({
      totalGenerations: allGroups.size,
      todayGenerations: todayGroups.size,
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
