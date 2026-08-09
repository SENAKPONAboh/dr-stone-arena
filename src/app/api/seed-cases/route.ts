import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const casesToInject = [
      // --- ANATOMIE ---
      {
        year: 1, subjectName: "Anatomie", chapterName: "Notions de bases en anatomie",
        title: "Le plan qui coupe en deux", difficulty: "FACILE", xp: 10, durationMax: 60,
        statement: "Un enseignant montre une image du corps humain coupé verticalement en deux parties égales, gauche et droite, en passant par la ligne médiane. Quel est le nom de ce plan anatomique ?",
        options: ["Plan frontal", "Plan sagittal médian", "Plan transversal", "Plan oblique"],
        correctAnswer: "Plan sagittal médian",
        explanation: "Le plan sagittal médian divise le corps en deux moitiés symétriques (droite/gauche) en passant par la ligne médiane. Le plan frontal (A) sépare une partie antérieure et une partie postérieure ; le plan transversal (C) sépare une partie supérieure et une partie inférieure. Le plan oblique (D) n'est pas un plan de référence standard. À retenir : les 3 plans de référence sont sagittal, frontal et transversal."
      },
      {
        year: 1, subjectName: "Anatomie", chapterName: "Notions de bases en anatomie",
        title: "La posture de référence", difficulty: "FACILE", xp: 10, durationMax: 60,
        statement: "Avant de décrire la position d'un organe, tout anatomiste part d'une posture standardisée du corps. Dans cette position de référence, comment sont orientées les paumes des mains ?",
        options: ["Tournées vers l'arrière", "Tournées vers l'intérieur, vers le corps", "Tournées vers l'avant", "Tournées vers le bas"],
        correctAnswer: "Tournées vers l'avant",
        explanation: "Dans la position anatomique de référence, le sujet est debout, membres inférieurs joints, membres supérieurs le long du corps avec les paumes tournées vers l'avant. C'est cette posture standardisée qui sert de base à tous les termes de direction utilisés en anatomie (proximal, médial, antérieur...)."
      },
      {
        year: 1, subjectName: "Anatomie", chapterName: "Notions de bases en anatomie",
        title: "Du coude au poignet", difficulty: "MOYEN", xp: 20, durationMax: 90,
        statement: "Sur un membre supérieur, le coude est situé plus près du tronc que le poignet. Quel terme décrit correctement la position du coude par rapport au poignet ?",
        options: ["Le coude est distal par rapport au poignet", "Le coude est proximal par rapport au poignet", "Le coude est médial par rapport au poignet", "Le coude est superficiel par rapport au poignet"],
        correctAnswer: "Le coude est proximal par rapport au poignet",
        explanation: "Proximal désigne ce qui est plus proche de la racine du membre, distal ce qui en est plus éloigné. Le coude, plus proche du tronc que le poignet, est donc proximal par rapport à lui. Médial/latéral (C) concernent la proximité avec le plan médian du corps, pas la distance au tronc — une confusion fréquente entre ces deux axes de description."
      },
      {
        year: 1, subjectName: "Anatomie", chapterName: "Notions de bases en anatomie",
        title: "Le genou qui se plie", difficulty: "MOYEN", xp: 20, durationMax: 90,
        statement: "Un patient plie son genou pour amener son talon vers sa fesse, diminuant l'angle entre la cuisse et la jambe. Quel terme décrit ce mouvement ?",
        options: ["Extension", "Flexion", "Abduction", "Rotation externe"],
        correctAnswer: "Flexion",
        explanation: "La flexion correspond à une diminution de l'angle entre deux segments d'un membre, ici entre la cuisse et la jambe. L'extension (A) est le mouvement inverse. L'abduction (C) éloigne le membre de l'axe du corps, dans un tout autre plan. La rotation (D) fait pivoter le segment sur son axe longitudinal, sans changer l'angle de flexion."
      },
      {
        year: 1, subjectName: "Anatomie", chapterName: "Notions de bases en anatomie",
        title: "Lever le bras sur le côté", difficulty: "DIFFICILE", xp: 35, durationMax: 120,
        statement: "Un étudiant lève son bras sur le côté, en l'éloignant de l'axe du corps, jusqu'à l'horizontale. Dans quel plan ce mouvement se déroule-t-il principalement, et comment se nomme-t-il ?",
        options: ["Plan sagittal — flexion", "Plan frontal — abduction", "Plan transversal — rotation", "Plan frontal — adduction"],
        correctAnswer: "Plan frontal — abduction",
        explanation: "Écarter le bras latéralement (abduction) se produit dans le plan frontal, qui sépare une partie antérieure et une partie postérieure du corps. La flexion (A) se déroule typiquement dans le plan sagittal. L'adduction (D) est le mouvement inverse de l'abduction. Ce cas combine deux notions de base du chapitre : plans anatomiques et types de mouvements."
      },

      // --- PHYSIOLOGIE ---
      {
        year: 1, subjectName: "Physiologie", chapterName: "Comportement dipsique",
        title: "Après un repas salé", difficulty: "FACILE", xp: 10, durationMax: 60,
        statement: "Après avoir mangé un repas très salé, un étudiant ressent une envie intense de boire de l'eau. Quel est le principal mécanisme physiologique à l'origine de cette sensation de soif ?",
        options: ["Une baisse du volume sanguin", "Une augmentation de l'osmolarité plasmatique", "Une baisse de la température corporelle", "Une augmentation de la glycémie"],
        correctAnswer: "Une augmentation de l'osmolarité plasmatique",
        explanation: "L'ingestion de sel augmente la concentration de solutés dans le plasma. Cette hyperosmolarité est détectée par des récepteurs spécialisés et déclenche la soif, incitant à boire pour diluer le milieu intérieur. La baisse du volume sanguin (A) est un second mécanisme déclencheur de soif, mais n'est pas la cause principale ici."
      },
      {
        year: 1, subjectName: "Physiologie", chapterName: "Comportement dipsique",
        title: "Le capteur de la soif", difficulty: "FACILE", xp: 10, durationMax: 60,
        statement: "Le cerveau contient une structure capable de détecter les variations de concentration du plasma sanguin et de déclencher la sensation de soif. Quelle structure joue ce rôle principal ?",
        options: ["Le cervelet", "L'hypothalamus", "Le bulbe rachidien", "Le cortex occipital"],
        correctAnswer: "L'hypothalamus",
        explanation: "L'hypothalamus contient des osmorécepteurs sensibles aux variations de l'osmolarité plasmatique. Quand celle-ci augmente, ces neurones déclenchent la sensation de soif. Le cervelet (A) coordonne la motricité, le bulbe rachidien (C) gère des fonctions vitales automatiques, le cortex occipital (D) traite la vision."
      },
      {
        year: 1, subjectName: "Physiologie", chapterName: "Comportement dipsique",
        title: "Après une perte de sang", difficulty: "MOYEN", xp: 20, durationMax: 90,
        statement: "Une personne ayant perdu une quantité importante de sang ressent une soif intense, même si son osmolarité plasmatique n'a pas beaucoup changé. Quel mécanisme explique cette soif ?",
        options: ["La diminution du volume sanguin stimule des récepteurs de volume", "L'augmentation de la température corporelle", "La diminution du glucose sanguin", "L'augmentation de l'osmolarité plasmatique"],
        correctAnswer: "La diminution du volume sanguin stimule des récepteurs de volume",
        explanation: "En plus des osmorécepteurs, il existe des récepteurs sensibles à la baisse du volume sanguin et de la pression artérielle. Une hémorragie diminue le volume circulant, ce qui stimule ces récepteurs et déclenche la soif indépendamment de l'osmolarité (D) — un second circuit de régulation, complémentaire au premier."
      },
      {
        year: 1, subjectName: "Physiologie", chapterName: "Comportement dipsique",
        title: "La bouche sèche ne suffit pas", difficulty: "MOYEN", xp: 20, durationMax: 90,
        statement: "Un étudiant a la bouche sèche après avoir beaucoup parlé. Boire un peu d'eau supprime rapidement cette sensation, avant même que l'eau n'ait pu être absorbée par l'organisme. Comment expliquer cette disparition rapide ?",
        options: ["L'eau a immédiatement corrigé l'osmolarité plasmatique", "Des récepteurs de la bouche et du pharynx envoient un signal d'arrêt précoce de la soif", "Le volume sanguin a immédiatement augmenté", "L'ADH a été immédiatement supprimée"],
        correctAnswer: "Des récepteurs de la bouche et du pharynx envoient un signal d'arrêt précoce de la soif",
        explanation: "Le simple passage d'eau dans la bouche et le pharynx stimule des récepteurs qui inhibent transitoirement la soif, avant même que l'eau ne soit réellement absorbée et ne corrige l'osmolarité (A) ou le volume sanguin (C). Ce mécanisme évite de boire excessivement en attendant la correction réelle du milieu intérieur."
      },
      {
        year: 1, subjectName: "Physiologie", chapterName: "Comportement dipsique",
        title: "Deux réponses à la même cause", difficulty: "DIFFICILE", xp: 35, durationMax: 120,
        statement: "Lorsque l'osmolarité plasmatique augmente, l'organisme déclenche à la fois la sensation de soif et la libération d'ADH par l'hypophyse postérieure. Quel est l'intérêt physiologique de déclencher ces deux réponses en même temps ?",
        options: ["La soif élimine l'eau en excès pendant que l'ADH la retient", "La soif augmente les apports en eau pendant que l'ADH limite les pertes urinaires d'eau", "La soif et l'ADH agissent uniquement sur le sodium, pas sur l'eau", "La soif remplace l'ADH lorsque celle-ci est insuffisante"],
        correctAnswer: "La soif augmente les apports en eau pendant que l'ADH limite les pertes urinaires d'eau",
        explanation: "Face à une hyperosmolarité, l'organisme combine deux stratégies complémentaires : augmenter les entrées d'eau (soif) et réduire les sorties d'eau (ADH, qui augmente la réabsorption rénale d'eau). Ensemble, ces deux mécanismes ramènent plus efficacement l'osmolarité vers la normale."
      }
    ];

    let createdCount = 0;

    for (const c of casesToInject) {
      // 1. Trouver la matière
      const subject = await prisma.subject.findFirst({
        where: { name: c.subjectName, anneeEtude: c.year }
      });
      if (!subject) continue;

      // 2. Trouver le chapitre
      const chapter = await prisma.chapter.findFirst({
        where: { name: c.chapterName, subjectId: subject.id }
      });
      if (!chapter) continue;

      // 3. Vérifier si le cas existe déjà
      const existingCase = await prisma.clinicalCase.findFirst({
        where: { title: c.title, chapterId: chapter.id }
      });

      // 4. Créer le cas s'il n'existe pas
      if (!existingCase) {
        await prisma.clinicalCase.create({
          data: {
            title: c.title,
            difficulty: c.difficulty,
            xp: c.xp,
            statement: c.statement,
            options: c.options,
            correctAnswer: c.correctAnswer,
            explanation: c.explanation,
            durationMax: c.durationMax,
            anneeEtude: c.year,
            chapterId: chapter.id
          }
        });
        createdCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${createdCount} nouveaux cas cliniques ont été injectés avec succès !`
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'injection des cas." }, { status: 500 });
  }
}