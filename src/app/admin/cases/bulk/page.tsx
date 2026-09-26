import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BulkCaseImporter from '@/components/admin/BulkCaseImporter';

export default async function BulkImportPage() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">📥 Importer des cas en masse</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-900 space-y-2 mb-6">
            <p className="font-bold">📖 Format attendu (un bloc par cas, séparés par <code>=== CAS ===</code>) :</p>
            <p>• <b>TITRE, ANNEE</b> (1 à 7 — 7 = Médecin), <b>MATIERE, ENONCE, OPTIONS, REPONSE, EXPLICATION</b> : obligatoires</p>
            <p>• <b>CHAPITRE</b> : optionnel (défaut = nom de la matière) · <b>DIFFICULTE</b> : FACILE / MOYEN (défaut) / DIFFICILE · <b>TEMPS</b> : secondes (défaut 60)</p>
            <p>• <b>XP calculée automatiquement</b> selon la difficulté (10 / 20 / 35)</p>
            <p>• La <b>REPONSE doit correspondre exactement</b> à une des options (la casse peut différer)</p>
            <p>• Matière et chapitre inexistants → <b>créés automatiquement</b> · Doublons (même titre + même chapitre) → ignorés</p>
          </div>

          <BulkCaseImporter />
        </div>
      </main>
    </div>
  );
}