import type { Metadata } from 'next';
import Link from 'next/link';

// Page publique (sans connexion) : exigée par Meta pour la vérification WhatsApp, utile aussi pour les stores.
export const metadata: Metadata = { title: 'Politique de confidentialité — Dr Stone Arena' };

const MAJ = '23 octobre 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base font-bold text-mala">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-stone px-4 py-10 font-body text-ink">
      <div className="mx-auto max-w-2xl space-y-7 rounded-3xl border border-line bg-slab p-6 md:p-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold">Politique de confidentialité</h1>
          <p className="mt-1 text-xs text-mute">Dr Stone Arena · mise à jour le {MAJ}</p>
        </header>

        <Section title="1. Qui sommes-nous ?">
          <p>Dr Stone Arena est une application de révision médicale sous forme de jeu (cas cliniques, classements, duels) destinée aux étudiants en médecine et aux médecins, principalement en Afrique de l&apos;Ouest.</p>
        </Section>

        <Section title="2. Les données que nous recueillons">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Compte :</b> nom, prénom, adresse e-mail, mot de passe (chiffré, jamais lisible), nationalité, université, faculté, niveau d&apos;études, pseudo et photo de profil si tu en ajoutes.</li>
            <li><b>Numéro WhatsApp :</b> pour vérifier qu&apos;il s&apos;agit d&apos;un vrai compte (un seul compte par numéro) et te contacter si nécessaire (Prime Arena, assistance).</li>
            <li><b>Activité de jeu :</b> réponses aux cas, temps de réponse, XP, vies, Flamme, duels, badges, classements.</li>
            <li><b>Paiements :</b> reçus que tu envoies pour le Premium, le Pass Élite ou les recharges, et informations de retrait que tu fournis.</li>
            <li><b>Notifications :</b> si tu les actives, l&apos;identifiant technique de ton appareil pour t&apos;envoyer des notifications.</li>
            <li><b>Sécurité :</b> signaux anti-triche (sortie de l&apos;application pendant un cas, comptes multiples) et adresse IP pour limiter les abus.</li>
          </ul>
        </Section>

        <Section title="3. WhatsApp">
          <p>Pour vérifier ton numéro, tu envoies toi-même un message contenant un code au numéro WhatsApp officiel de Dr Stone Arena. Nous recevons ce message et ton numéro par l&apos;intermédiaire de la plateforme WhatsApp Business de Meta, uniquement pour valider ton compte et te répondre. Nous n&apos;envoyons pas de publicité par WhatsApp sans ton accord.</p>
        </Section>

        <Section title="4. Pourquoi nous les utilisons">
          <ul className="list-disc space-y-1 pl-5">
            <li>Faire fonctionner ton compte, ta progression et les classements.</li>
            <li>Garantir un jeu équitable (lutte contre la triche et les faux comptes).</li>
            <li>Traiter les abonnements, le Pass Élite, les recharges et la Prime Arena.</li>
            <li>T&apos;envoyer des notifications utiles (duels, validations, annonces).</li>
          </ul>
          <p>Nous ne vendons jamais tes données.</p>
        </Section>

        <Section title="5. Où sont-elles stockées et qui y a accès ?">
          <p>Les données sont hébergées chez nos prestataires techniques (Vercel pour l&apos;application, Supabase pour la base de données et les fichiers, Meta pour les messages WhatsApp). Seule l&apos;administration de Dr Stone Arena y a accès. Ton nom ou ton pseudo, ta photo, ton grade et tes résultats de jeu sont visibles par les autres joueurs dans les classements et les profils publics ; ton e-mail et ton numéro ne le sont jamais.</p>
        </Section>

        <Section title="6. Durée de conservation">
          <p>Tes données sont conservées tant que ton compte existe. Les reçus et informations de paiement peuvent être gardés plus longtemps pour la comptabilité et en cas de litige.</p>
        </Section>

        <Section title="7. Tes droits">
          <p>Tu peux demander à consulter, corriger ou supprimer tes données, ou supprimer ton compte, en contactant l&apos;administration depuis la messagerie de l&apos;application ou par la communauté WhatsApp de Dr Stone Arena. Nous répondons dans un délai raisonnable.</p>
        </Section>

        <Section title="8. Modifications">
          <p>Cette politique peut évoluer. La date de mise à jour en haut de la page indique la dernière version.</p>
        </Section>

        <p className="pt-2 text-center text-sm">
          <Link href="/" className="font-bold text-mala hover:underline">Retour à Dr Stone Arena</Link>
        </p>
      </div>
    </main>
  );
}
