import ResetPasswordForm from './ResetPasswordForm';

// Lien reçu sur WhatsApp (ou donné par l'admin) : /reset-password?token=…
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ''} />;
}
