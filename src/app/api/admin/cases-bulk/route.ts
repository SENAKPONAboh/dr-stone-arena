import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

const XP_BY_DIFFICULTY: Record<string, number> = { FACILE: 10, MOYEN: 20, DIFFICILE: 35 };
const VALID_KEYS = ['TITRE', 'ANNEE', 'MATIERE', 'CHAPITRE', 'DIFFICULTE', 'TEMPS', 'ENONCE', 'OPTIONS', 'REPONSE', 'EXPLICATION'];

type ParsedCase = {
  titre: string; annee: number; matiere: string; chapitre: string | null;
  difficulte: string; temps: number; enonce: string;
  options: string[]; reponse: string | null; explication: string;
};

// ===== Parseur =====

function normalizeKey(line: string): { key: string; value: string } | null {
  const m = line.match(/^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/);
  if (!m) return null;
  const key = m[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (!VALID_KEYS.includes(key)) return null;
  return { key, value: m[2].trim() };
}

function parseContent(content: string): ParsedCase[] {
  const lines = content.split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^\s*={2,}\s*(CAS)?\s*={2,}\s*$/i.test(line)) {
      if (current.some(l => l.trim() !== '')) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.some(l => l.trim() !== '')) blocks.push(current);

  const cases: ParsedCase[] = [];
  for (const block of blocks) {
    const fields: Record<string, string[]> = {};
    let currentKey: string | null = null;
    for (const line of block) {
      const parsed = normalizeKey(line);
      if (parsed) {
        currentKey = parsed.key;
        if (!fields[currentKey]) fields[currentKey] = [];
        if (parsed.value) fields[currentKey].push(parsed.value);
      } else if (currentKey) {
        fields[currentKey].push(line);
      }
    }
    const get = (k: string) => (fields[k] || []).join('\n').trim();

    const titre = get('TITRE');
    const anneeRaw = get('ANNEE');
    const enonce = get('ENONCE');
    const explication = get('EXPLICATION');
    const matiere = get('MATIERE');
    const reponseBrute = get('REPONSE');

    // Options : lignes avec préfixe -, * ou • ; sinon séparées par ; ou |
    const optLines = (get('OPTIONS') || '').split('\n').map(l => l.trim()).filter(Boolean);
    const prefixed = optLines.filter(l => /^[-*•]\s+/.test(l));
    const options = (prefixed.length >= 2
      ? prefixed.map(l => l.replace(/^[-*•]\s+/, '').trim())
      : optLines.flatMap(l => l.split(/[;|]/))
    ).map(o => o.trim()).filter(Boolean);

    // Réponse : retrouver l'option exacte correspondante (comparaison du jeu : trim + minuscules)
    const norm = (s: string) => s.trim().toLowerCase();
    const matched = reponseBrute && options.length
      ? options.find(o => norm(o) === norm(reponseBrute)) ?? null
      : null;

    const difficulteRaw = get('DIFFICULTE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const difficulte = ['FACILE', 'MOYEN', 'DIFFICILE'].includes(difficulteRaw) ? difficulteRaw : 'MOYEN';
    const temps = parseInt(get('TEMPS')) || 60;
    const annee = parseInt(anneeRaw) || 0;

    cases.push({
      titre, annee, matiere,
      chapitre: get('CHAPITRE') || null,
      difficulte, temps: Math.max(10, temps), enonce, options,
      reponse: matched, explication,
    });
  }
  return cases;
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const content: string = body.content || '';
    if (!content.trim()) {
      return NextResponse.json({ error: "Contenu vide." }, { status: 400 });
    }

    const parsed = parseContent(content);
    if (parsed.length === 0) {
      return NextResponse.json({ error: "Aucun bloc de cas détecté. Vérifie le format (blocs séparés par === CAS ===)." }, { status: 400 });
    }

    // Caches pour éviter les requêtes répétées
    const subjectCache = new Map<string, string>();
    const chapterCache = new Map<string, string>();

    const created: string[] = [];
    const ignored: { numero: number; titre: string; raison: string }[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const c = parsed[i];

      // ===== Validations =====
      if (!c.titre) { ignored.push({ numero: i + 1, titre: '(sans titre)', raison: 'TITRE manquant' }); continue; }
      if (c.annee < 1 || c.annee > 7) { ignored.push({ numero: i + 1, titre: c.titre, raison: `ANNEE invalide (${c.anneeRaw ?? 'absente'}) — doit être 1 à 7` }); continue; }
      if (!c.matiere) { ignored.push({ numero: i + 1, titre: c.titre, raison: 'MATIERE manquante' }); continue; }
      if (!c.enonce) { ignored.push({ numero: i + 1, titre: c.titre, raison: 'ENONCE manquant' }); continue; }
      if (c.options.length < 2) { ignored.push({ numero: i + 1, titre: c.titre, raison: 'OPTIONS : au moins 2 options requises (lignes commençant par "- ")' }); continue; }
      if (c.options.length > 6) { ignored.push({ numero: i + 1, titre: c.titre, raison: `OPTIONS : ${c.options.length} options (maximum 6)` }); continue; }
      if (!c.reponse) { ignored.push({ numero: i + 1, titre: c.titre, raison: 'REPONSE absente ou ne correspond exactement à aucune option' }); continue; }
      if (!c.explication) { ignored.push({ numero: i + 1, titre: c.titre, raison: 'EXPLICATION manquante' }); continue; }

      // ===== Résolution matière (recherche insensible à la casse, création si inexistante) =====
      const sKey = `${c.matiere.toLowerCase()}|${c.annee}`;
      let subjectId = subjectCache.get(sKey);
      if (!subjectId) {
        let subject = await prisma.subject.findFirst({
          where: { name: { equals: c.matiere, mode: 'insensitive' }, anneeEtude: c.annee },
        });
        if (!subject) {
          subject = await prisma.subject.create({ data: { name: c.matiere, anneeEtude: c.annee } });
        }
        subjectId = subject.id;
        subjectCache.set(sKey, subjectId);
      }

      // ===== Résolution chapitre (défaut : même nom que la matière) =====
      const chapterName = c.chapitre || c.matiere;
      const chKey = `${chapterName.toLowerCase()}|${subjectId}`;
      let chapterId = chapterCache.get(chKey);
      if (!chapterId) {
        let chapter = await prisma.chapter.findFirst({
          where: { name: { equals: chapterName, mode: 'insensitive' }, subjectId },
        });
        if (!chapter) {
          chapter = await prisma.chapter.create({ data: { name: chapterName, subjectId } });
        }
        chapterId = chapter.id;
        chapterCache.set(chKey, chapterId);
      }

      // ===== Anti-doublon (même titre dans le même chapitre) =====
      const existing = await prisma.clinicalCase.findFirst({
        where: { title: { equals: c.titre, mode: 'insensitive' }, chapterId },
        select: { id: true },
      });
      if (existing) { ignored.push({ numero: i + 1, titre: c.titre, raison: 'Doublon : ce titre existe déjà dans ce chapitre' }); continue; }

      // ===== Création =====
      await prisma.clinicalCase.create({
        data: {
          title: c.titre,
          difficulty: c.difficulte,
          xp: XP_BY_DIFFICULTY[c.difficulte] ?? 10,
          statement: c.enonce,
          options: c.options,
          correctAnswer: c.reponse,
          explanation: c.explication,
          durationMax: c.temps,
          anneeEtude: c.annee,
          chapterId,
        },
      });
      created.push(c.titre);
    }

    return NextResponse.json({
      success: true,
      total: parsed.length,
      created: created.length,
      createdTitles: created,
      ignored,
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur pendant l'import." }, { status: 500 });
  }
}