import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige automatiquement vers /login
  // Le middleware s'occupera de renvoyer vers /etudiant si déjà connecté
  redirect('/login');
}