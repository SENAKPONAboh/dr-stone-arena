import AuthShell from '@/components/ui/AuthShell';

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Pas de panique !">
      <p className="mb-6 text-center text-sm leading-relaxed text-mute">
        Pour des raisons de sécurité, contactez l'administrateur de votre faculté.
        Il pourra réinitialiser votre mot de passe manuellement.
      </p>
      <div className="text-center">
        <a href="/login"
          className="inline-block rounded-2xl bg-mala px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
          Retour à la connexion
        </a>
      </div>
    </AuthShell>
  );
}
