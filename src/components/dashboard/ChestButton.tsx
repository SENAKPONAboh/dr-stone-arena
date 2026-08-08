'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChestButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'opening' | 'opened'>('idle');
  const [reward, setReward] = useState<{ icon: string; message: string } | null>(null);

  const handleOpen = async () => {
    setState('opening');
    try {
      const res = await fetch('/api/chest/open', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setReward(data.reward);
        setState('opened');
        setTimeout(() => {
          router.refresh();
        }, 3000);
      } else {
        setState('idle');
      }
    } catch (e) {
      setState('idle');
    }
  };

  if (state === 'opened' && reward) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 text-center animate-pulse">
        <div className="text-4xl mb-2">{reward.icon}</div>
        <p className="font-bold text-yellow-800">{reward.message}</p>
      </div>
    );
  }

  return (
    <button 
      onClick={handleOpen}
      disabled={state === 'opening'}
      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-extrabold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50"
    >
      {state === 'opening' ? (
        <span className="animate-spin">🔄</span>
      ) : (
        <span className="text-2xl animate-bounce">🎁</span>
      )}
      <span>{state === 'opening' ? 'Ouverture...' : 'Ouvrir mon coffre !'}</span>
    </button>
  );
}