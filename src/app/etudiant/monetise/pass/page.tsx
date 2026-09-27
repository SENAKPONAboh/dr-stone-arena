import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import PassPresentation from '@/components/monetise/PassPresentation';

export default async function PassPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const pendingRequest = await prisma.passRequest.findFirst({
    where: { userId: user.id, status: 'EN_ATTENTE' },
    include: { paymentMethod: { select: { name: true, icon: true } } }
  });

  const activeMethods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, icon: true, beneficiaryName: true, paymentIdentifier: true, instructions: true }
  });

  return (
    <PassPresentation
      passActive={user.passActive}
      passExpiresAt={user.passExpiresAt ? user.passExpiresAt.toISOString() : null}
      pendingRequest={pendingRequest ? {
        methodName: pendingRequest.paymentMethod?.name ?? null,
        methodIcon: pendingRequest.paymentMethod?.icon ?? null,
        createdAt: pendingRequest.createdAt.toISOString(),
      } : null}
      activeMethods={activeMethods}
    />
  );
}