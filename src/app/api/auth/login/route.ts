import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    // Vérifier si le compte est validé par l'admin
    if (user.statut === "EN_ATTENTE") {
      return NextResponse.json({ error: "Votre compte est en attente de validation par l'administration." }, { status: 403 });
    }

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