'use client';

import { useRouter } from 'next/navigation';

export default function PanelLockButton() {
  const router = useRouter();
  const lock = async () => {
    await fetch('/api/ambassadeur/acces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lock' }) });
    router.refresh();
  };
  return (
    <button onClick={lock} className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-bold hover:bg-gray-200 whitespace-nowrap">
      🔒 Verrouiller
    </button>
  );
}
