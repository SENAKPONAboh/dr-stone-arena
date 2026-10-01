import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { sendPushToUser } from '@/lib/push';

export async function POST(request: Request) {
  const admin = await getCurrentUserCore();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { title, body } = await request.json();

    // Étudiants qui ont activé les notifications sur au moins un appareil
    const users = await prisma.user.findMany({
      where: { role: 'ETUDIANT' },
      select: { id: true, pushSubscription: true },
    });
    const targets = users.filter(u => !!u.pushSubscription);

    const payload = {
      title: title || "Dr. Stone Arena",
      body: body || "Un nouveau cas clinique vient d'être publié !",
      url: '/etudiant/challenge',
    };

    // Envoi par paquets de 20 (rapide, sans saturer le serveur) ; les abonnements expirés sont nettoyés
    let sentCount = 0;
    let failed = 0;
    let firstProblem = '';
    for (let i = 0; i < targets.length; i += 20) {
      const results = await Promise.all(targets.slice(i, i + 20).map(u => sendPushToUser(u.id, payload)));
      for (const r of results) {
        if (r.ok) sentCount++;
        else { failed++; if (!firstProblem && r.reason !== 'EXPIRED') firstProblem = r.detail ?? ''; }
      }
    }

    const message = targets.length === 0
      ? "Aucun étudiant n'a encore activé les notifications."
      : `Notification envoyée à ${sentCount} étudiant${sentCount > 1 ? 's' : ''}${failed ? ` (${failed} échec${failed > 1 ? 's' : ''}${firstProblem ? ` : ${firstProblem}` : ''})` : ''}.`;
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
