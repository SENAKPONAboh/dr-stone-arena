import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminHeader from '@/components/admin/ui/AdminHeader';
import BulkCaseImporter from '@/components/admin/BulkCaseImporter';

export default async function BulkImportPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="min-h-screen pb-12">

      <AdminHeader title="Import en masse" subtitle="Banque de cas" icon="upload" tone="sky" />

      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="adm-card p-4 sm:p-6">

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-900 space-y-2 mb-6">
            <p className="font-bold">📖 Format accepté (ton format de rédaction) :</p>
            <p>• Chaque cas commence par une ligne <b><code>CAS &lt;numéro&gt;</code></b> (la ligne d'en-tête « Matière · Chapitre » au-dessus est ignorée automatiquement)</p>
            <p>• <b>Année</b> : <code>EM1</code> à <code>EM6</code>, ou <code>Médecin</code>, ou 1 à 7</p>
            <p>• <b>Difficulté</b> : ⭐ (facile) · ⭐⭐ (moyen) · ⭐⭐⭐ (difficile) — XP calculée automatiquement (10/20/35)</p>
            <p>• <b>Énoncé</b> et <b>Question</b> : sections séparées, combinées dans le cas · <b>Semestre</b> et <b>Objectif pédagogique</b> : ignorés</p>
            <p>• <b>Propositions</b> : lignes <code>A.</code> <code>B.</code> <code>C.</code> <code>D.</code> · <b>Réponse correcte</b> : la <b>lettre</b> (A, B, C, D) ou le texte exact</p>
            <p>• <b>Temps</b> : optionnel (défaut 60s) · Matière/chapitre inexistants → créés · Doublons → ignorés</p>
          </div>

          <BulkCaseImporter />
        </div>
      </main>
    </div>
  );
}