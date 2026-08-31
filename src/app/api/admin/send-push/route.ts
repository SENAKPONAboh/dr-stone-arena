import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import webpush from 'web-push';



export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  // Configurer web-push avec les clés (au moment de l'envoi, pas au chargement du module)
  webpush.setVapidDetails(
    'mailto:contact@drstonearena.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  try {
    const { title, body } = await request.json();

       // Récupérer tous les étudiants
    const users = await prisma.user.findMany({
      where: { role: 'ETUDIANT' },
      select: { pushSubscription: true }
    });
    const payload = JSON.stringify({ 
      title: title || "Dr. Stone Arena", 
      body: body || "Un nouveau cas clinique vient d'être publié !",
      url: '/etudiant/challenge'
    });

    // Envoyer la notification à chaque téléphone
    let sentCount = 0;
    for (const u of users) {
          if (!u.pushSubscription) continue; // 
          
      try {
        await webpush.sendNotification(u.pushSubscription as any, payload);
        sentCount++;
      } catch (error) {
        console.error('Erreur envoi push à un utilisateur', error);
      }
    }

    return NextResponse.json({ success: true, message: `Notification envoyée à ${sentCount} étudiants.` });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}