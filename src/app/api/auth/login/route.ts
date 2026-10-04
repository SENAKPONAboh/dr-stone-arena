import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { checkRateLimit, recordFailure, clearFailures, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }

    // Anti « devinette » : trop d'échecs pour ce compte depuis cette adresse → pause
    const key = `login:${clientIp(request)}:${email}`;
    const wait = checkRateLimit(key);
    if (wait > 0) {
      return NextResponse.json({ error: `Trop d'essais. Réessaie dans ${Math.ceil(wait / 60)} minute(s).` }, { status: 429 });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        role: true,
        statut: true,
        nom: true,
        prenom: true,
      },
    });

    if (!user) {
      recordFailure(key);
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      recordFailure(key);
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    if (user.statut === "BANNI") {
      return NextResponse.json({ error: "Votre compte a été banni par l'administration." }, { status: 403 });
    }

    clearFailures(key);

    // Créer la session
    const { session, expiresAt } = await createSession(user.id, user.role);

    const response = NextResponse.json({
      user: { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom },
      message: "Connexion réussie"
    });

    // Stocker le token dans un cookie HttpOnly (sécurisé)
    response.cookies.set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la connexion." }, { status: 500 });
  }
}
