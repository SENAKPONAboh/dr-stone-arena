import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { MAX_LIVES } from '@/lib/lives';
import { NIVEAU_OPTIONS } from '@/lib/niveau';
import { checkRateLimit, recordFailure, clientIp } from '@/lib/rate-limit';

const clean = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: Request) {
  try {
    // Freine les inscriptions en rafale depuis une même adresse
    const ipKey = `register:${clientIp(request)}`;
    const wait = checkRateLimit(ipKey, 10, 60 * 60 * 1000);
    if (wait > 0) return NextResponse.json({ error: "Trop de tentatives. Réessaie plus tard." }, { status: 429 });
    recordFailure(ipKey, 60 * 60 * 1000);

    const body = await request.json();

    // 🔒 Le rôle n'est JAMAIS lu depuis la requête : une inscription publique crée toujours un ÉTUDIANT.
    // (Avant, un champ « role » envoyé par le navigateur permettait de se créer un compte ADMIN.)
    const nom = clean(body?.nom);
    const prenom = clean(body?.prenom);
    const email = clean(body?.email, 200).toLowerCase();
    const password = typeof body?.password === 'string' ? body.password : '';
    const pays = clean(body?.pays);
    const universite = clean(body?.universite);
    const faculte = clean(body?.faculte);
    const ambassadorCode = clean(body?.ambassadorCode, 60);
    const annee = Number.parseInt(String(body?.anneeEtude ?? ''), 10);

    if (!nom || !prenom || !pays || !universite || !faculte) {
      return NextResponse.json({ error: "Tous les champs sont obligatoires." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }
    if (password.length > 200) {
      return NextResponse.json({ error: "Mot de passe trop long." }, { status: 400 });
    }
    if (!NIVEAU_OPTIONS.some(o => o.value === annee)) {
      return NextResponse.json({ error: "Niveau d'étude invalide." }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
    }

    // ===== Validation du code ambassadeur (AVANT la création du compte) =====
    let referredById: string | null = null;
    if (ambassadorCode !== '') {
      const ambassador = await prisma.ambassador.findFirst({
        where: { referralCode: { equals: ambassadorCode, mode: 'insensitive' } },
      });

      if (!ambassador || ambassador.status !== 'ACTIF') {
        return NextResponse.json({ error: "Code ambassadeur invalide." }, { status: 400 });
      }

      referredById = ambassador.id;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        password: hashedPassword,
        role: "ETUDIANT",
        pays,
        universite,
        faculte,
        anneeEtude: annee,
        lives: MAX_LIVES, // 10 vies dès l'inscription (le @default(5) du schéma reste documentaire)
        referredById, // attribution ambassadeur — VERROUILLÉE (jamais modifiable côté client)
        statut: "VALIDE", // L'étudiant est validé automatiquement
      },
    });

    // On ne renvoie jamais le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword, message: "Compte créé." }, { status: 201 });
  } catch (error: any) {
    // Deux inscriptions simultanées avec le même email : la base refuse la deuxième
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'inscription." }, { status: 500 });
  }
}
