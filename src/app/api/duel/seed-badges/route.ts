import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const badges = [
      { name: "Premier Duel", description: "Participer à son premier duel", icon: "🥉" },
      { name: "Combattant", description: "Remporter 5 duels", icon: "⚔️" },
      { name: "Rival", description: "Remporter 10 duels", icon: "🔥" },
      { name: "Champion Arena", description: "Remporter 50 duels", icon: "🏆" },
      { name: "Maître du Duel", description: "Remporter 100 duels", icon: "👑" },
      { name: "Légende Arena", description: "Remporter 200 duels", icon: "💎" },
    ];

    let createdCount = 0;
    for (const badge of badges) {
      const existing = await prisma.badge.findFirst({ where: { name: badge.name } });
      if (!existing) {
        await prisma.badge.create({ data: badge });
        createdCount++;
      }
    }

    return NextResponse.json({ success: true, message: `${createdCount} badges de duel créés !` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'injection des badges." }, { status: 500 });
  }
}