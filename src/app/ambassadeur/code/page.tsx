import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import CodeActions from '@/components/ambassador/CodeActions';

export default async function AmbassadorCodePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const ambassador = await prisma.ambassador.findUnique({
    where: { userId: user.id },
    select: { referralCode: true, status: true, commissionRate: true }
  });
  if (!ambassador || ambassador.status !== 'ACTIF') redirect('/etudiant');

  return (
    <div className="space-y-6">

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🔑 Votre code ambassadeur</p>
        <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-widest bg-emerald-50 border-2 border-emerald-100 rounded-2xl py-4 px-6 inline-block">
          {ambassador.referralCode}
        </p>
        <p className="text-sm text-gray-400 mt-4 max-w-md mx-auto">
          Partage ce code à tes camarades. Lors de leur inscription, ils le saisissent — et chaque paiement Premium qu'ils effectuent (y compris les renouvellements mensuels) te rapporte <b>{ambassador.commissionRate}%</b>.
        </p>
      </div>

      <CodeActions code={ambassador.referralCode} />

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="font-extrabold text-gray-800 mb-3">💬 Comment présenter le code</h2>
        <ol className="text-sm text-gray-500 space-y-2 list-decimal list-inside">
          <li>Envoie le code à tes camarades (WhatsApp, TikTok, Instagram, Telegram...)</li>
          <li>Ils s'inscrivent sur le site de Dr. Stone Arena</li>
          <li>À la question « Es-tu venu grâce à un ambassadeur ? », ils répondent <b>Oui</b> et saisissent ton code</li>
          <li>Chaque abonnement Premium qu'ils prennent (et renouvellent) te génère ta commission</li>
        </ol>
      </div>
    </div>
  );
}