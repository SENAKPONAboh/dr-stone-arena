import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import MonetiseNav from '@/components/monetise/MonetiseNav';
import CagnotteClient from '@/components/monetise/CagnotteClient';

export default async function CagnottePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');
  if (!user.passActive) redirect('/etudiant/monetise/pass');

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { uaBalance: true, uaLocked: true },
  });

  const pendingRequest = await prisma.withdrawalRequest.findFirst({
    where: { userId: user.id, status: { in: ['EN_ATTENTE', 'EN_TRAITEMENT'] } },
    orderBy: { createdAt: 'desc' },
  });

  const history = await prisma.uaTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a05] via-[#1a1308] to-[#0f0a05] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <MonetiseNav passActive={true} />
        <CagnotteClient
          uaBalance={fresh?.uaBalance ?? 0}
          uaLocked={fresh?.uaLocked ?? 0}
          pendingRequest={pendingRequest ? {
            id: pendingRequest.id,
            amountUA: pendingRequest.amountUA,
            amountFCFA: pendingRequest.amountFCFA,
            operator: pendingRequest.operator,
            phoneNumber: pendingRequest.phoneNumber,
            accountName: pendingRequest.accountName,
            status: pendingRequest.status,
            createdAt: pendingRequest.createdAt.toISOString(),
          } : null}
          history={history.map(t => ({
            id: t.id, type: t.type, amount: t.amount,
            balanceAfter: t.balanceAfter, createdAt: t.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}