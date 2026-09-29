import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ⚠️ Hypothèse : rôle admin = 'ADMIN' (une ligne à changer sinon)
const ADMIN_ROLE = 'ADMIN';

// ===== IMPORTATEUR DE QCM STRUCTURÉS — Dr. Stone Arena =====
// Optimisé gros volume : 70-500 cas d'un coup (cache matières/chapitres,
// anti-doublon en une requête, insertion groupée createMany).

const MEDECIN_ANNEE = 7; // ⚠️ valeur du niveau Médecin (une ligne à changer si votre base utilise autre chose)

// Valeurs VALIDÉES : XP 10/20/30 — durées 60/90/120 secondes
const DEFAULTS: Record<string, { xp: number; durationMax: number }> = {
  FACILE: { xp: 10, durationMax: 60 },
  MOYEN: { xp: 20, durationMax: 90 },
  DIFFICILE: { xp: 30, durationMax: 120 },
};

type ParsedProp = { letter: string; text: string };
type ParsedCase = {
  titre: string; anneeEtude: number | null; semestre: string;
  matiere: string; chapitre: string; difficulte: string;
  enonce: string; question: string; props: ParsedProp[];
  reponseLettre: string; justification: string; objectif: string;
};

const LABELS: Record<string, string> = {
  'titre': 'titre', 'annee': 'annee', 'semestre': 'semestre', 'matiere': 'matiere',
  'chapitre': 'chapitre', 'difficulte': 'difficulte', 'enonce': 'enonce',
  'question': 'question', 'propositions': 'propositions',
  'reponse correcte': 'reponse', 'reponse': 'reponse',
  'justification': 'justification', 'objectif pedagogique': 'objectif', 'objectif': 'objectif',
};

const flatKey = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[:：]/g, '').trim();

function detectHeader(line: string): { key: string; inline: string } | null {
  const raw = line.trim();
  if (!raw || raw.length > 60) return null;
  const m = raw.match(/^([^:：]{1,45})[:：]\s*(.*)$/);
  if (m) {
    const key = LABELS[flatKey(m[1])];
    if (key) return { key, inline: m[2].trim() };
  }
  const key2 = LABELS[flatKey(raw)];
  if (key2) return { key: key2, inline: '' };
  return null;
}

const PROP_RE = /^([A-Fa-f])\s*[.)\-:：]\s*(.+)$/;

function parseAll(text: string): ParsedCase[] {
  const lines = text.split(/\r?\n/);
  const cases: ParsedCase[] = [];
  let data: Record<string, string[]> = {};
  let props: ParsedProp[] = [];
  let currentKey: string | null = null;
  let started = false;

  const pushCase = () => {
    if (!started) return;
    cases.push(buildCase(data, props));
    data = {}; props = []; currentKey = null; started = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^-{3,}$/.test(trimmed)) continue;

    const header = detectHeader(trimmed);
    if (header) {
      if (header.key === 'titre') pushCase();
      started = true;
      currentKey = header.key;
      if (!data[header.key]) data[header.key] = [];
      if (header.inline) data[header.key].push(header.inline);
      continue;
    }

    const propMatch = trimmed.match(PROP_RE);
    if (propMatch && currentKey === 'propositions') {
      props.push({ letter: propMatch[1].toUpperCase(), text: propMatch[2].trim() });
      continue;
    }

    if (currentKey === 'propositions' && props.length > 0) {
      props[props.length - 1].text += ' ' + trimmed;
    } else if (currentKey) {
      if (!data[currentKey]) data[currentKey] = [];
      data[currentKey].push(trimmed);
    }
  }
  pushCase();
  return cases;
}

function buildCase(data: Record<string, string[]>, props: ParsedProp[]): ParsedCase {
  const get = (k: string) => (data[k] ?? []).join(' ').trim();
  const getMulti = (k: string) => (data[k] ?? []).join('\n').trim();

  const anneeRaw = get('annee');
  let anneeEtude: number | null = null;
  const em = anneeRaw.match(/EM\s*([1-6])/i);
  if (em) anneeEtude = parseInt(em[1], 10);
  else if (/m[ée]decin/i.test(anneeRaw)) anneeEtude = MEDECIN_ANNEE;

  const diffRaw = get('difficulte');
  const stars = (diffRaw.match(/⭐/g) ?? []).length;
  let difficulte = 'MOYEN';
  if (stars === 1 || /facile/i.test(diffRaw)) difficulte = 'FACILE';
  else if (stars >= 3 || /difficile/i.test(diffRaw)) difficulte = 'DIFFICILE';

  return {
    titre: get('titre'),
    anneeEtude,
    semestre: get('semestre'),
    matiere: get('matiere'),
    chapitre: get('chapitre'),
    difficulte,
    enonce: getMulti('enonce'),
    question: getMulti('question'),
    props,
    reponseLettre: get('reponse').toUpperCase().trim(),
    justification: getMulti('justification'),
    objectif: getMulti('objectif'),
  };
}

function validate(pc: ParsedCase): string | null {
  if (!pc.titre) return "Titre manquant";
  if (pc.anneeEtude === null) return "Année invalide ou manquante (attendu : EM1 à EM6 ou Médecin)";
  if (!pc.matiere) return "Matière manquante";
  if (!pc.chapitre) return "Chapitre manquant";
  if (!pc.enonce && !pc.question) return "Énoncé et Question manquants";
  if (pc.props.length < 2) return "Moins de 2 propositions détectées";
  if (!/^[A-F]$/.test(pc.reponseLettre)) return `Réponse correcte manquante ou invalide (« ${pc.reponseLettre || '—'} »)`;
  const idx = pc.reponseLettre.charCodeAt(0) - 65;
  if (idx >= pc.props.length) return `Réponse « ${pc.reponseLettre} » hors des ${pc.props.length} propositions`;
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== ADMIN_ROLE) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const { text } = await request.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: "Aucun texte fourni." }, { status: 400 });
    }

    const parsed = parseAll(text);
    if (parsed.length === 0) {
      return NextResponse.json({ error: "Aucun QCM détecté — chaque cas doit commencer par « Titre »." }, { status: 400 });
    }

    // ===== PHASE 1 : validation de tous les cas =====
    const rows: { index: number; titre: string; status: 'CRÉÉ' | 'DOUBLON' | 'ERREUR'; message: string }[] = [];
    const prepared: { pc: ParsedCase; anneeEtude: number; index: number }[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const pc = parsed[i];
      const err = validate(pc);
      if (err || pc.anneeEtude === null) {
        rows.push({ index: i + 1, titre: pc.titre || '(sans titre)', status: 'ERREUR', message: err ?? "Année invalide." });
        continue;
      }
      prepared.push({ pc, anneeEtude: pc.anneeEtude, index: i + 1 });
    }

    let created = 0, duplicates = 0;

    if (prepared.length > 0) {

      // ===== PHASE 2 : matières (avec CACHE — une requête par matière distincte) =====
      const subjectCache = new Map<string, { id: string }>();
      for (const p of prepared) {
        const key = `${p.anneeEtude}|${p.pc.matiere.toLowerCase()}`;
        if (subjectCache.has(key)) continue;
        let subject = await prisma.subject.findFirst({
          where: { name: { equals: p.pc.matiere, mode: 'insensitive' }, anneeEtude: p.anneeEtude },
        });
        if (!subject) {
          subject = await prisma.subject.create({ data: { name: p.pc.matiere, anneeEtude: p.anneeEtude } });
        }
        subjectCache.set(key, { id: subject.id });
      }

      // ===== PHASE 3 : chapitres (avec CACHE) =====
      const chapterCache = new Map<string, { id: string }>();
      for (const p of prepared) {
        const subject = subjectCache.get(`${p.anneeEtude}|${p.pc.matiere.toLowerCase()}`)!;
        const key = `${subject.id}|${p.pc.chapitre.toLowerCase()}`;
        if (chapterCache.has(key)) continue;
        let chapter = await prisma.chapter.findFirst({
          where: { name: { equals: p.pc.chapitre, mode: 'insensitive' }, subjectId: subject.id },
        });
        if (!chapter) {
          chapter = await prisma.chapter.create({ data: { name: p.pc.chapitre, subjectId: subject.id } });
        }
        chapterCache.set(key, { id: chapter.id });
      }

      // ===== PHASE 4 : anti-doublon en UNE SEULE requête =====
      const allTitles = [...new Set(prepared.map(p => p.pc.titre))];
      const existing = await prisma.clinicalCase.findMany({
        where: { title: { in: allTitles, mode: 'insensitive' } },
        select: { title: true, chapterId: true },
      });
      const existingKeys = new Set(existing.map(e => `${e.title.toLowerCase()}|${e.chapterId}`));

      // ===== PHASE 5 : construction + insertion groupée =====
      const toCreate: {
        title: string; difficulty: string; xp: number; statement: string;
        options: string[]; correctAnswer: string; explanation: string;
        durationMax: number; anneeEtude: number; chapterId: string;
      }[] = [];
      const localKeys = new Set<string>();

      for (const p of prepared) {
        const subject = subjectCache.get(`${p.anneeEtude}|${p.pc.matiere.toLowerCase()}`)!;
        const chapter = chapterCache.get(`${subject.id}|${p.pc.chapitre.toLowerCase()}`)!;
        const dupKey = `${p.pc.titre.toLowerCase()}|${chapter.id}`;

        if (existingKeys.has(dupKey) || localKeys.has(dupKey)) {
          duplicates++;
          rows.push({ index: p.index, titre: p.pc.titre, status: 'DOUBLON', message: "Ce titre existe déjà dans ce chapitre — ignoré." });
          continue;
        }
        localKeys.add(dupKey);

        const idx = p.pc.reponseLettre.charCodeAt(0) - 65;
        const defaults = DEFAULTS[p.pc.difficulte] ?? DEFAULTS.MOYEN;

        toCreate.push({
          title: p.pc.titre,
          difficulty: p.pc.difficulte,
          xp: defaults.xp,
          statement: [p.pc.enonce, p.pc.question].filter(Boolean).join('\n\n'),
          options: p.pc.props.map(prop => prop.text),
          correctAnswer: p.pc.props[idx].text,
          explanation: [p.pc.justification, p.pc.objectif ? `🎯 Objectif pédagogique : ${p.pc.objectif}` : null].filter(Boolean).join('\n\n') || '—',
          durationMax: defaults.durationMax,
          anneeEtude: p.anneeEtude,
          chapterId: chapter.id,
        });

        rows.push({ index: p.index, titre: p.pc.titre, status: 'CRÉÉ', message: `${p.pc.matiere} · ${p.pc.chapitre} · ${p.pc.difficulte}` });
      }

      if (toCreate.length > 0) {
        const res = await prisma.clinicalCase.createMany({ data: toCreate });
        created = res.count;
      }
    }

    rows.sort((a, b) => a.index - b.index);
    const errors = rows.filter(r => r.status === 'ERREUR').length;

    return NextResponse.json({
      total: parsed.length, created, duplicates, errors, results: rows,
      defaultsUsed: DEFAULTS, medecinAnnee: MEDECIN_ANNEE,
    });
  } catch (e: any) {
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}