'use client';

import { useState } from 'react';
import { NATIONALITES } from '@/lib/nationalites';

// Champ « Nationalité » de l'inscription : liste déroulante, ou saisie libre avec « Autre ».
// Envoie toujours un seul champ nommé `pays` (même nom qu'avant : la route d'inscription ne change pas).
export default function NationalitySelect({ inputClassName }: { inputClassName: string }) {
  const [choice, setChoice] = useState('');
  const other = choice === '__autre';
  return (
    <>
      <select
        id="nationalite"
        name={other ? undefined : 'pays'}
        required
        value={choice}
        onChange={e => setChoice(e.target.value)}
        className={inputClassName}
      >
        <option value="" disabled>Choisir…</option>
        {NATIONALITES.map(n => <option key={n.pays} value={n.pays}>{n.label}</option>)}
        <option value="__autre">Autre nationalité…</option>
      </select>
      {other && (
        <input id="pays" name="pays" type="text" required autoFocus className={`${inputClassName} mt-2`} placeholder="Ton pays (ex. Cap-Vert)" />
      )}
    </>
  );
}
