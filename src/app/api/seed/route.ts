import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Créer une matière (Anatomie pour la 1ère année)
    const subject = await prisma.subject.create({
      data: {
        name: "Anatomie",
        anneeEtude: 1,
      },
    });

    // 2. Créer un chapitre (Thorax)
    const chapter = await prisma.chapter.create({
      data: {
        name: "Thorax",
        subjectId: subject.id,
      },
    });

    // 3. Créer un cas clinique
    const clinicalCase = await prisma.clinicalCase.create({
      data: {
        title: "Douleur thoracique aiguë",
        difficulty: "FACILE",
        xp: 10,
        statement: "Un patient de 45 ans se présente aux urgences avec une douleur thoracique aiguë, en coup de couteau, irradiant vers le bras gauche. Quel est votre diagnostic principal suspecté en premier lieu ?",
        options: [
          "Péricardite aiguë",
          "Infarctus du myocarde (IDM)",
          "Reflux gastro-œsophagien (RGO)",
          "Crise d'angoisse"
        ],
        correctAnswer: "Infarctus du myocarde (IDM)",
        explanation: "Une douleur thoracique irradiant vers le bras gauche chez un homme d'âge moyen est le signe classique d'un infarctus du myocarde. L'ECG et le dosage de la troponine sont les examens de première intention.",
        durationMax: 60, // 1 minute
        chapterId: chapter.id,
      },
    });

    return NextResponse.json({ 
      message: "Données injectées avec succès !", 
      data: { subject, chapter, clinicalCase } 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'injection." }, { status: 500 });
  }
}