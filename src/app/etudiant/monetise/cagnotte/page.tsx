import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import MonetiseNav from '@/components/monetise/MonetiseNav';
import CagnotteClient from '@/components/monetise/CagnotteClient';

export default async function CagnottePage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (!user.passActive) redirect('/etudiant/monetise/pass');

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { uaBalance: true, uaRecharged: true, uaLocked: true },
  });

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  const pendingRequest = await prisma.withdrawalRequest.findFirst({
    where: { userId: user.id, status: { in: ['EN_ATTENTE', 'EN_TRAITEMENT'] } },
    orderBy: { createdAt: 'desc' },
  });

  const pendingRecharge = await prisma.rechargeRequest.findFirst({
    where: { userId: user.id, status: 'EN_ATTENTE' },
    orderBy: { createdAt: 'desc' },
    include: { paymentMethod: { select: { name: true, icon: true } } },
  });

  const history = await prisma.uaTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    // 🖥️📱 Plein écran : recouvre la coquille classique
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain elite-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <MonetiseNav passActive={true} />
        <CagnotteClient
          uaBalance={fresh?.uaBalance ?? 0}
          uaRecharged={fresh?.uaRecharged ?? 0}
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
          pendingRecharge={pendingRecharge ? {
            id: pendingRecharge.id,
            amountUA: pendingRecharge.amountUA,
            amountFCFA: pendingRecharge.amountFCFA,
            methodName: pendingRecharge.paymentMethod?.name ?? null,
            methodIcon: pendingRecharge.paymentMethod?.icon ?? null,
            createdAt: pendingRecharge.createdAt.toISOString(),
          } : null}
          history={history.map(t => ({
            id: t.id, type: t.type, amount: t.amount,
            balanceAfter: t.balanceAfter, createdAt: t.createdAt.toISOString(),
          }))}
          paymentMethods={paymentMethods.map(m => ({
            id: m.id, name: m.name, icon: m.icon,
            beneficiaryName: m.beneficiaryName, paymentIdentifier: m.paymentIdentifier, instructions: m.instructions,
          }))}
        />
      </div>
    </div>
  );
}