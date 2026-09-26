import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

const XP_BY_DIFFICULTY: Record<string, number> = { FACILE: 10, MOYEN: 20, DIFFICILE: 35 };

type ParsedCase = {
  numero: number;
  titre: string; annee: number; matiere: string; chapitre: string | null;
  difficulte: string; temps: number; statement: string;
  options: string[]; letters: string[]; reponse: string | null; explication: string;
};

// ==================== OUTILS ====================

function normalizeLine(line: string): string {
  return line.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

// "TITRE", "TITRE :", "REPONSE CORRECTE" → nom de section standardisé
function detectSection(normalized: string): string | null {
  const cleaned = normalized.replace(/[:：]\s*$/, '').trim();
  const map: Record<string, string> = {
    'TITRE': 'TITRE', 'ANNEE': 'ANNEE', 'SEMESTRE': 'SEMESTRE', 'MATIERE': 'MATIERE',
    'CHAPITRE': 'CHAPITRE', 'DIFFICULTE': 'DIFFICULTE', 'TEMPS': 'TEMPS',
    'ENONCE': 'ENONCE', 'QUESTION': 'QUESTION', 'PROPOSITIONS': 'PROPOSITIONS',
    'PROPOSITION': 'PROPOSITIONS', 'REPONSE': 'REPONSE', 'REPONSE CORRECTE': 'REPONSE',
    'JUSTIFICATION': 'JUSTIFICATION', 'EXPLICATION': 'EXPLICATION',
    'OBJECTIF': 'OBJECTIF', 'OBJECTIF PEDAGOGIQUE': 'OBJECTIF',
  };
  return map[cleaned] ?? null;
}

function parseAnnee(raw: string): number {
  const v = raw.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (!v) return 0;
  if (v.includes('MEDECIN')) return 7;
  const em = v.match(/^EM\s*(\d)$/);
  if (em) return parseInt(em[1]);
  const an = v.match(/^(\d)\s*(RE|EME|E|IEME|ER)?\s*ANNEE/);
  if (an) return parseInt(an[1]);
  const num = parseInt(v);
  if (!isNaN(num) && num >= 1 && num <= 7) return num;
  return 0;
}

function parseDifficulte(raw: string): string {
  const stars = raw.match(/[⭐★]/g);
  const count = stars ? stars.length : 0;
  if (count === 1) return 'FACILE';
  if (count === 2) return 'MOYEN';
  if (count >= 3) return 'DIFFICILE';
  const t = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (t.includes('FACILE')) return 'FACILE';
  if (t.includes('DIFFICILE')) return 'DIFFICILE';
  return 'MOYEN';
}

// Propositions : "A. xxx" (multi-lignes), "- xxx", ou "xxx ; yyy"
function parsePropositions(raw: string): { options: string[]; letters: string[] } {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l !== '');
  if (lines.length === 0) return { options: [], letters: [] };

  const letterLines = lines.filter(l => /^[A-Fa-f]\s*[\.\)\:\-–]\s*\S/.test(l) || /^[A-Fa-f]\s{1,}\S/.test(l));
  const dashLines = lines.filter(l => /^[-*•]\s+\S/.test(l));

  if (letterLines.length >= 2) {
    const options: string[] = [];
    const letters: string[] = [];
    let curLetter: string | null = null;
    let curText: string[] = [];
    const flush = () => {
      if (curLetter !== null && curText.length) {
        options.push(curText.join(' ').trim());
        letters.push(curLetter);
      }
      curText = [];
      curLetter = null;
    };
    for (const line of lines) {
      const m = line.match(/^([A-Fa-f])\s*[\.\)\:\-–]?\s+(.+)$/);
      if (m) {
        flush();
        curLetter = m[1].toUpperCase();
        curText = [m[2].trim()];
      } else if (curLetter !== null) {
        curText.push(line);
      }
    }
    flush();
    return { options, letters };
  }

  if (dashLines.length >= 2) {
    return { options: dashLines.map(l => l.replace(/^[-*•]\s+/, '').trim()).filter(Boolean), letters: [] };
  }

  const options = lines.flatMap(l => l.split(/[;|]/)).map(s => s.trim()).filter(Boolean);
  return { options, letters: [] };
}

// Réponse : lettre (A, A., B)… ou texte exact
function resolveReponse(raw: string, options: string[], letters: string[]): string | null {
  const v = raw.trim();
  if (!v || options.length === 0) return null;

  const m1 = v.match(/^([A-Fa-f])\s*[\.\)\:\-–]?$/);
  if (m1) {
    const letter = m1[1].toUpperCase();
    if (letters.length === options.length) {
      const idx = letters.indexOf(letter);
      if (idx >= 0) return options[idx];
    }
    const code = letter.charCodeAt(0) - 65;
    if (code >= 0 && code < options.length) return options[code];
  }

  const m2 = v.match(/^([A-Fa-f])\s*[\.\)\:\-–]\s*(.+)$/);
  if (m2) {
    const letter = m2[1].toUpperCase();
    const text = m2[2].trim().toLowerCase();
    const direct = options.find(o => o.trim().toLowerCase() === text);
    if (direct) return direct;
    if (letters.length === options.length) {
      const idx = letters.indexOf(letter);
      if (idx >= 0) return options[idx];
    }
  }

  const norm = (s: string) => s.trim().toLowerCase();
  return options.find(o => norm(o) === norm(v)) ?? null;
}

// ==================== PARSEUR PRINCIPAL ====================

function parseContent(content: string): ParsedCase[] {
  const lines = content.split(/\r?\n/);

  // Découpage en blocs : "CAS 6" ou "===="
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    const norm = normalizeLine(line);
    if (/^CAS\s*\d+$/.test(norm) || /^\s*={3,}/.test(line)) {
      if (current.some(l => l.trim() !== '')) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.some(l => l.trim() !== '')) blocks.push(current);

  const cases: ParsedCase[] = [];
  let numero = 0;

  for (const block of blocks) {
    const fields: Record<string, string[]> = {};
    let currentKey: string | null = null;
    let hasSections = false;

    for (const raw of block) {
      const trimmed = raw.trim();
      const norm = normalizeLine(trimmed);

      // 1. Section seule ("Titre :", "Énoncé", "Réponse correcte")
      const section = detectSection(norm);
      if (section) {
        currentKey = section;
        hasSections = true;
        if (!fields[section]) fields[section] = [];
        continue;
      }

      // 2. Clé: valeur inline ("TITRE: Douleur" — ancien format)
      if (trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':');
        const key = detectSection(normalizeLine(trimmed.slice(0, colonIdx)));
        if (key) {
          currentKey = key;
          hasSections = true;
          if (!fields[key]) fields[key] = [];
          const value = trimmed.slice(colonIdx + 1).trim();
          if (value) fields[key].push(value);
          continue;
        }
      }

      // 3. Continuation du champ courant (texte multi-lignes)
      if (currentKey) {
        if (!fields[currentKey]) fields[currentKey] = [];
        fields[currentKey].push(trimmed);
      }
      // (sinon : ligne d'en-tête hors section → ignorée)
    }

    // Bloc sans aucune section = en-tête de fichier ("Pédiatrie · ...") → ignoré
    if (!hasSections) continue;

    numero++;
    const get = (k: string) => (fields[k] || []).join('\n').trim();

    const enonce = get('ENONCE');
    const question = get('QUESTION');
    const { options, letters } = parsePropositions(get('PROPOSITIONS'));

    cases.push({
      numero,
      titre: get('TITRE'),
      annee: parseAnnee(get('ANNEE')),
      matiere: get('MATIERE'),
      chapitre: get('CHAPITRE') || null,
      difficulte: parseDifficulte(get('DIFFICULTE')),
      temps: parseInt(get('TEMPS')) || 60,
      statement: [enonce, question].filter(Boolean).join('\n\n'),
      options,
      letters,
      reponse: resolveReponse(get('REPONSE'), options, letters),
      explication: get('JUSTIFICATION') || get('EXPLICATION'),
    });
  }

  return cases;
}

// ==================== ROUTE ====================

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
      return NextResponse.json({ error: "Aucun cas détecté. Vérifie que chaque cas commence par une ligne « CAS <numéro> »." }, { status: 400 });
    }

    const subjectCache = new Map<string, string>();
    const chapterCache = new Map<string, string>();
    const created: string[] = [];
    const ignored: { numero: number; titre: string; raison: string }[] = [];

    for (const c of parsed) {
      if (!c.titre) { ignored.push({ numero: c.numero, titre: '(sans titre)', raison: 'TITRE manquant' }); continue; }
      if (c.annee < 1) { ignored.push({ numero: c.numero, titre: c.titre, raison: "ANNEE non reconnue — formats acceptés : EM1 à EM6, Médecin, ou 1 à 7" }); continue; }
      if (!c.matiere) { ignored.push({ numero: c.numero, titre: c.titre, raison: 'MATIERE manquante' }); continue; }
      if (!c.statement) { ignored.push({ numero: c.numero, titre: c.titre, raison: 'ENONCE (et/ou QUESTION) manquant' }); continue; }
      if (c.options.length < 2) { ignored.push({ numero: c.numero, titre: c.titre, raison: 'PROPOSITIONS : au moins 2 requises (A. B. C. D.)' }); continue; }
      if (c.options.length > 6) { ignored.push({ numero: c.numero, titre: c.titre, raison: `PROPOSITIONS : ${c.options.length} (maximum 6)` }); continue; }
      if (!c.reponse) { ignored.push({ numero: c.numero, titre: c.titre, raison: 'REPONSE : la lettre (A/B/C/D) ou le texte exact doit correspondre à une proposition' }); continue; }
      if (!c.explication) { ignored.push({ numero: c.numero, titre: c.titre, raison: 'JUSTIFICATION manquante' }); continue; }

      // Matière (insensible à la casse, création si inexistante)
      const sKey = `${c.matiere.toLowerCase()}|${c.annee}`;
      let subjectId = subjectCache.get(sKey);
      if (!subjectId) {
        let subject = await prisma.subject.findFirst({
          where: { name: { equals: c.matiere, mode: 'insensitive' }, anneeEtude: c.annee },
        });
        if (!subject) subject = await prisma.subject.create({ data: { name: c.matiere, anneeEtude: c.annee } });
        subjectId = subject.id;
        subjectCache.set(sKey, subjectId);
      }

      // Chapitre (défaut : nom de la matière)
      const chapterName = c.chapitre || c.matiere;
      const chKey = `${chapterName.toLowerCase()}|${subjectId}`;
      let chapterId = chapterCache.get(chKey);
      if (!chapterId) {
        let chapter = await prisma.chapter.findFirst({
          where: { name: { equals: chapterName, mode: 'insensitive' }, subjectId },
        });
        if (!chapter) chapter = await prisma.chapter.create({ data: { name: chapterName, subjectId } });
        chapterId = chapter.id;
        chapterCache.set(chKey, chapterId);
      }

      // Anti-doublon
      const existing = await prisma.clinicalCase.findFirst({
        where: { title: { equals: c.titre, mode: 'insensitive' }, chapterId },
        select: { id: true },
      });
      if (existing) { ignored.push({ numero: c.numero, titre: c.titre, raison: 'Doublon : ce titre existe déjà dans ce chapitre' }); continue; }

      await prisma.clinicalCase.create({
        data: {
          title: c.titre,
          difficulty: c.difficulte,
          xp: XP_BY_DIFFICULTY[c.difficulte] ?? 10,
          statement: c.statement,
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

    return NextResponse.json({ success: true, total: parsed.length, created: created.length, createdTitles: created, ignored }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur pendant l'import." }, { status: 500 });
  }
}