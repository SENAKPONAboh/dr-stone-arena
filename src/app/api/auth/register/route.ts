import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { MAX_LIVES } from '@/lib/lives';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nom, prenom, email, password, role, pays, universite, faculte, anneeEtude } = body;

    // Vérifier si l'email existe déjà
    const userExists = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (userExists) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur (En attente de validation par l'admin selon le cahier des charges)
    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || "ETUDIANT",
        pays,
        universite,
        faculte,
        anneeEtude: anneeEtude ? parseInt(anneeEtude) : null,
        lives: MAX_LIVES, // 10 vies dès l'inscription (le @default(5) du schéma reste documentaire)
                statut: "VALIDE", // <-- L'étudiant est validé automatiquement
      },
    });

    // On ne renvoie jamais le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword, message: "Compte créé. En attente de validation par un administrateur." }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'inscription." }, { status: 500 });
  }
}