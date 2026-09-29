import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';

// ⚠️ Hypothèse : rôle admin = 'ADMIN' (une ligne à changer sinon)
const ADMIN_ROLE = 'ADMIN';

// ===== JOURNAL DES SUSPECTS — Dr. Stone Arena =====
// Analyse des 30 derniers jours (modes classique + monétisé combinés).
// Seuils ajustables ci-dessous :

const PERIOD_DAYS = 30;
const ULTRA_FAST_RATIO = 0.3;    // réponse en < 30 % du temps imparti = "ultra-rapide"
const MIN_CORRECT_FOR_RATE = 8; // minimum de bonnes réponses pour qu'un taux soit signifiant

// ⚠️ Doit rester IDENTIQUE à la chaîne envoyée par CaseGuard dans les 3 clients
const VIOLATION_ANSWER = "Cas annulé — sortie de l'application";

export async function GET(request: Request) {
  const user = await getCurrentUserCore();
  if (!user || user.role !== ADMIN_ROLE) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const since = new Date(Date.now() - PERIOD_DAYS * 24 * 3600 * 1000);

    // NOTE : avec une base de plusieurs milliers d'étudiants actifs, cette requête
    // devra être optimisée (agrégation SQL). Pour la taille actuelle : parfait.
    const [attempts, monetiseAttempts, rushPerfects] = await Promise.all([
      prisma.attempt.findMany({
        where: { createdAt: { gte: since }, user: { role: 'ETUDIANT', statut: 'VALIDE' } },
        select: {
          userId: true, isCorrect: true, timeSpent: true, userAnswer: true,
          clinicalCase: { select: { durationMax: true } },
          user: { select: { prenom: true, nom: true, pseudo: true, email: true } },
        },
      }),
      prisma.monetiseAttempt.findMany({
        where: { createdAt: { gte: since }, user: { role: 'ETUDIANT', statut: 'VALIDE' } },
        select: {
          userId: true, isCorrect: true, timeSpent: true, userAnswer: true,
          clinicalCase: { select: { durationMax: true } },
          user: { select: { prenom: true, nom: true, pseudo: true, email: true } },
        },
      }),
      prisma.rushSession.findMany({
        where: { startedAt: { gte: since }, palier3: true },
        select: { userId: true, user: { select: { prenom: true, nom: true, pseudo: true, email: true } } },
      }),
    ]);

    // ===== Agrégation par étudiant =====
    type Stat = {
      userId: string; name: string; email: string;
      total: number; correct: number; ultraFastCorrect: number;
      violations: number; timeRatioSum: number; timeRatioCount: number; rushPerfects: number;
    };
    const map = new Map<string, Stat>();

    const ensure = (userId: string, u: { prenom: string; nom: string; pseudo: string | null; email: string }): Stat => {
      let s = map.get(userId);
      if (!s) {
        s = {
          userId, name: u.pseudo || `${u.prenom} ${u.nom}`, email: u.email,
          total: 0, correct: 0, ultraFastCorrect: 0,
          violations: 0, timeRatioSum: 0, timeRatioCount: 0, rushPerfects: 0,
        };
        map.set(userId, s);
      }
      return s;
    };

    const ingest = (a: {
      userId: string; isCorrect: boolean; timeSpent: number; userAnswer: string;
      clinicalCase: { durationMax: number } | null;
      user: { prenom: string; nom: string; pseudo: string | null; email: string };
    }) => {
      const s = ensure(a.userId, a.user);
      s.total++;
      if (a.isCorrect) {
        s.correct++;
        const dm = a.clinicalCase?.durationMax ?? 60;
        if (a.timeSpent < dm * ULTRA_FAST_RATIO) s.ultraFastCorrect++;
        s.timeRatioSum += Math.min(1, a.timeSpent / dm);
        s.timeRatioCount++;
      }
      if (a.userAnswer === VIOLATION_ANSWER) s.violations++;
    };

    attempts.forEach(ingest);
    monetiseAttempts.forEach(ingest);
    rushPerfects.forEach(r => { ensure(r.userId, r.user).rushPerfects++; });

    // ===== Scoring =====
    const students = Array.from(map.values()).map(s => {
      const accuracy = s.total > 0 ? s.correct / s.total : 0;
      const ultraFastRate = s.correct >= MIN_CORRECT_FOR_RATE ? s.ultraFastCorrect / s.correct : null;
      const avgTimeRatio = s.timeRatioCount > 0 ? s.timeRatioSum / s.timeRatioCount : null;
      const uf = ultraFastRate ?? 0;

      let level: 'HIGH' | 'MEDIUM' | 'LOW' | 'OK' = 'OK';
      const reasons: string[] = [];

      if (s.correct >= MIN_CORRECT_FOR_RATE && uf >= 0.5) {
        level = 'HIGH';
        reasons.push(`⚡ ${Math.round(uf * 100)} % de ses bonnes réponses ont pris moins de 30 % du temps imparti (${s.ultraFastCorrect}/${s.correct})`);
      } else if (s.correct >= MIN_CORRECT_FOR_RATE && uf >= 0.3) {
        level = 'MEDIUM';
        reasons.push(`⚡ ${Math.round(uf * 100)} % de bonnes réponses ultra-rapides (${s.ultraFastCorrect}/${s.correct})`);
      }

      if (s.total >= 20 && accuracy >= 0.95 && uf >= 0.2 && level !== 'HIGH') {
        level = 'MEDIUM';
        reasons.push(`🎯 ${Math.round(accuracy * 100)} % de précision sur ${s.total} cas, avec des réponses rapides`);
      }

      if (s.violations >= 3) {
        if (level === 'OK') level = 'MEDIUM';
        reasons.push(`🚫 ${s.violations} cas annulés (sortie d'application pendant un cas)`);
      } else if (s.violations >= 1 && level === 'OK') {
        level = 'LOW';
        reasons.push(`🚫 ${s.violations} cas annulé${s.violations > 1 ? 's' : ''} (sortie d'application)`);
      }

      if (s.rushPerfects >= 2 && level === 'OK') {
        level = 'LOW';
        reasons.push(`🏆 ${s.rushPerfects} Rush parfaits (palier 3) sur la période`);
      }

      return { ...s, accuracy, ultraFastRate, avgTimeRatio, level, reasons };
    });

    const order = { HIGH: 0, MEDIUM: 1, LOW: 2, OK: 3 } as const;
    students.sort((a, b) => order[a.level] - order[b.level] || (b.ultraFastRate ?? 0) - (a.ultraFastRate ?? 0));

    return NextResponse.json({
      periodDays: PERIOD_DAYS,
      summary: {
        analyzed: students.length,
        high: students.filter(s => s.level === 'HIGH').length,
        medium: students.filter(s => s.level === 'MEDIUM').length,
        low: students.filter(s => s.level === 'LOW').length,
      },
      students,
    });
  } catch (e: any) {
    console.error(e);
    const detail = [e?.code, e?.message].filter(Boolean).join(' — ') || String(e);
    return NextResponse.json({ error: `Erreur serveur [${detail}]` }, { status: 500 });
  }
}