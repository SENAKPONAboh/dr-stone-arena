import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const badges = [
      { name: "Premier Cas", description: "Résoudre votre tout premier cas clinique", icon: "🥇" },
      { name: "Série de 7 jours", description: "Maintenir une série de 7 jours d'affilée", icon: "🔥" },
      { name: "Série de 30 jours", description: "Maintenir une série de 30 jours d'affilée", icon: "🚀" },
      { name: "Centurion", description: "Résoudre 100 cas cliniques au total", icon: "💯" },
    ];

    let createdCount = 0;
    for (const badge of badges) {
      const existing = await prisma.badge.findFirst({ where: { name: badge.name } });
      if (!existing) {
        await prisma.badge.create({ data: badge });
        createdCount++;
      }
    }

    return NextResponse.json({ success: true, message: `${createdCount} badges créés avec succès !` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'injection des badges." }, { status: 500 });
  }
}