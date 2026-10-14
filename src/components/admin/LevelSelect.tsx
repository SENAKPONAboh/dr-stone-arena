'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NIVEAU_OPTIONS } from '@/lib/niveau';

// Panel admin : changer le niveau d'études d'un étudiant (lui ne peut plus le faire).
export default function LevelSelect({ userId, current }: { userId: string; current: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? '');
  const [busy, setBusy] = useState(false);

  const change = async (next: number) => {
    const label = NIVEAU_OPTIONS.find(o => o.value === next)?.label ?? next;
    if (!window.confirm(`Passer cet étudiant en ${label} ? Ses cas du jour et ses classements suivront ce niveau.`)) {
      setValue(current ?? '');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/set-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, anneeEtude: next }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Erreur'); setValue(current ?? ''); return; }
      setValue(next);
      router.refresh();
    } catch {
      alert('Impossible de joindre le serveur.');
      setValue(current ?? '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
      🎓 Niveau
      <select
        value={value}
        disabled={busy}
        onChange={e => change(Number(e.target.value))}
        className="rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-sm font-bold text-gray-700 disabled:opacity-50"
      >
        {current === null && <option value="">—</option>}
        {NIVEAU_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
