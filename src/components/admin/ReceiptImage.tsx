'use client';

import { useState } from 'react';

export default function ReceiptImage({ src }: { src: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt="Reçu de paiement"
        onClick={() => setOpen(true)}
        className="w-full h-auto rounded-2xl border-2 border-gray-100 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
      />
      <p className="text-xs text-gray-400 text-center mt-1">🔍 Clique pour agrandir</p>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt="Reçu de paiement - agrandi"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white text-4xl font-bold leading-none hover:text-gray-300"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}