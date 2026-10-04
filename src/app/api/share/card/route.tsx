import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { getXpGrade } from '@/lib/grades';
import { getNiveauLabel } from '@/lib/niveau';

// ===== CARTE À PARTAGER (image PNG 1080×1350) — Dr. Stone Arena =====
// ?type=profil  → carte de profil (grade, XP de la saison, Flamme, rang, précision)
// ?type=jour    → score de la garde du jour (x/10, XP gagnés aujourd'hui, Flamme)
// Réservée à l'étudiant connecté : chacun ne génère QUE sa propre carte.

const C = {
  stone: '#0d1311', slab: '#151d1a', slab2: '#1c2723', line: '#26332e',
  ink: '#e9f1ed', mute: '#8fa39a', mala: '#2fd28a', flame: '#ff8a3d', sky: '#5cc8ff', gold: '#f2c14e',
};

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 440, padding: '28px 32px', borderRadius: 32, background: C.slab, border: `2px solid ${C.line}` }}>
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: C.mute, letterSpacing: 2 }}>{label}</div>
      <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
    </div>
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return new Response('Non autorisé', { status: 401 });

  const { searchParams, host } = new URL(request.url);
  const type = searchParams.get('type') === 'jour' ? 'jour' : 'profil';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [rankAhead, totalAttempts, correctAttempts, todayAttempts] = await Promise.all([
    user.anneeEtude
      ? prisma.user.count({ where: { role: 'ETUDIANT', statut: 'VALIDE', anneeEtude: user.anneeEtude, xp: { gt: user.xp } } })
      : prisma.user.count({ where: { role: 'ETUDIANT', statut: 'VALIDE', xp: { gt: user.xp } } }),
    prisma.attempt.count({ where: { userId: user.id } }),
    prisma.attempt.count({ where: { userId: user.id, isCorrect: true } }),
    prisma.attempt.findMany({ where: { userId: user.id, createdAt: { gte: today } }, select: { isCorrect: true, xpEarned: true } }),
  ]);

  const name = user.pseudo || `${user.prenom} ${user.nom}`;
  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
  const grade = getXpGrade(user.xp).current;
  const niveau = getNiveauLabel(user.anneeEtude);
  const precision = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const dayCorrect = todayAttempts.filter(a => a.isCorrect).length;
  const dayXp = todayAttempts.reduce((s, a) => s + a.xpEarned, 0);
  const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ');

  const ecg = 'M0 60 H260 L282 18 L312 108 L338 34 L352 60 H520 L542 18 L572 108 L598 34 L612 60 H900';

  // Police embarquée (Poppins, licence libre OFL) : rendu identique sur tous les téléphones
  const [bold, regular] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Poppins-Bold.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Poppins-Regular.ttf')),
  ]);

  return new ImageResponse(
    (
      <div style={{
        width: 1080, height: 1350, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '70px 70px 60px', color: C.ink, fontFamily: 'Poppins',
        backgroundColor: C.stone,
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(47,210,138,0.28), rgba(13,19,17,0) 55%), radial-gradient(circle at 90% 95%, rgba(47,210,138,0.14), rgba(13,19,17,0) 40%)',
      }}>
        {/* En-tête : marque */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ display: 'flex', width: 84, height: 84, borderRadius: 26, background: C.slab, border: `2px solid ${C.line}`, alignItems: 'center', justifyContent: 'center' }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={C.mala} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M12 5a3 3 0 0 0-5.5 1.5A3.5 3.5 0 0 0 5 12.5 3.5 3.5 0 0 0 7.5 18 3 3 0 0 0 12 19M12 5a3 3 0 0 1 5.5 1.5A3.5 3.5 0 0 1 19 12.5a3.5 3.5 0 0 1-2.5 5.5A3 3 0 0 1 12 19" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>Dr. Stone Arena</div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: C.mala, letterSpacing: 8 }}>L'ARÈNE MÉDICALE</div>
          </div>
        </div>

        {/* Joueur */}
        <div style={{ display: 'flex', width: 190, height: 190, marginTop: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center', fontSize: 76, fontWeight: 800, color: C.stone, background: `linear-gradient(135deg, ${grade.from}, ${grade.to})`, boxShadow: `0 0 70px ${grade.glow}` }}>
          {initials}
        </div>
        <div style={{ display: 'flex', fontSize: 62, fontWeight: 800, marginTop: 28, textAlign: 'center' }}>{name}</div>
        <div style={{ display: 'flex', marginTop: 14, padding: '10px 28px', borderRadius: 999, fontSize: 32, fontWeight: 800, color: grade.to, border: `2px solid ${grade.from}`, background: 'rgba(255,255,255,0.04)' }}>
          {grade.name}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: C.mute, marginTop: 12 }}>{niveau}</div>

        {/* Chiffres */}
        {type === 'jour' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 46 }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: C.mute, letterSpacing: 3 }}>GARDE DU JOUR</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 4 }}>
              <div style={{ display: 'flex', fontSize: 170, fontWeight: 800, color: C.mala, lineHeight: 1 }}>{String(dayCorrect)}</div>
              <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: C.mute, marginBottom: 14 }}>{`/${todayAttempts.length || 10}`}</div>
            </div>
            <div style={{ display: 'flex', fontSize: 34, color: C.ink, marginTop: 6 }}>diagnostics posés</div>
            <div style={{ display: 'flex', gap: 22, marginTop: 30 }}>
              <div style={{ display: 'flex', padding: '14px 30px', borderRadius: 999, background: 'rgba(47,210,138,0.15)', color: C.mala, fontSize: 34, fontWeight: 800 }}>{`+${fmt(dayXp)} XP`}</div>
              <div style={{ display: 'flex', padding: '14px 30px', borderRadius: 999, background: 'rgba(255,138,61,0.15)', color: C.flame, fontSize: 34, fontWeight: 800 }}>{`Flamme ${user.streak} j`}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginTop: 46, width: 920 }}>
            <Stat label="XP DE LA SAISON" value={fmt(user.xp)} color={C.mala} />
            <Stat label="FLAMME" value={`${user.streak} j`} color={C.flame} />
            <Stat label={user.anneeEtude ? 'RANG DU NIVEAU' : 'RANG'} value={`#${rankAhead + 1}`} color={C.sky} />
            <Stat label="PRÉCISION" value={`${precision} %`} color={C.gold} />
          </div>
        )}

        {/* Pied : ECG + invitation */}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <svg width="900" height="120" viewBox="0 0 900 120">
          <path d={ecg} fill="none" stroke={C.mala} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, marginTop: 6 }}>Rejoins-moi dans l'Arène</div>
        <div style={{ display: 'flex', fontSize: 28, color: C.mala, marginTop: 6 }}>{host}</div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: 'Poppins', data: bold, weight: 800, style: 'normal' },
        { name: 'Poppins', data: bold, weight: 700, style: 'normal' },
        { name: 'Poppins', data: regular, weight: 400, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
}
