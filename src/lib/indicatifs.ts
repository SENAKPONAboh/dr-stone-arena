// ===== Indicatifs téléphoniques (numéro WhatsApp à l'inscription) =====
// Application internationale : l'étudiant choisit son pays. Niger présélectionné.
// « Autre » permet de saisir n'importe quel indicatif absent de la liste.

export const INDICATIFS: { pays: string; code: string }[] = [
  // Afrique de l'Ouest et du Centre (en tête : public principal)
  { pays: 'Niger', code: '227' }, { pays: 'Bénin', code: '229' }, { pays: 'Togo', code: '228' },
  { pays: 'Burkina Faso', code: '226' }, { pays: 'Mali', code: '223' }, { pays: "Côte d'Ivoire", code: '225' },
  { pays: 'Sénégal', code: '221' }, { pays: 'Nigeria', code: '234' }, { pays: 'Tchad', code: '235' },
  { pays: 'Cameroun', code: '237' }, { pays: 'Guinée', code: '224' }, { pays: 'Gabon', code: '241' },
  { pays: 'Congo', code: '242' }, { pays: 'RD Congo', code: '243' }, { pays: 'Centrafrique', code: '236' },
  { pays: 'Mauritanie', code: '222' }, { pays: 'Ghana', code: '233' }, { pays: 'Gambie', code: '220' },
  { pays: 'Guinée-Bissau', code: '245' }, { pays: 'Sierra Leone', code: '232' }, { pays: 'Liberia', code: '231' },
  { pays: 'Cap-Vert', code: '238' }, { pays: 'Guinée équatoriale', code: '240' },
  // Afrique du Nord, de l'Est et australe
  { pays: 'Maroc', code: '212' }, { pays: 'Algérie', code: '213' }, { pays: 'Tunisie', code: '216' },
  { pays: 'Libye', code: '218' }, { pays: 'Égypte', code: '20' }, { pays: 'Soudan', code: '249' },
  { pays: 'Éthiopie', code: '251' }, { pays: 'Kenya', code: '254' }, { pays: 'Tanzanie', code: '255' },
  { pays: 'Ouganda', code: '256' }, { pays: 'Rwanda', code: '250' }, { pays: 'Burundi', code: '257' },
  { pays: 'Djibouti', code: '253' }, { pays: 'Comores', code: '269' }, { pays: 'Madagascar', code: '261' },
  { pays: 'Maurice', code: '230' }, { pays: 'Angola', code: '244' }, { pays: 'Mozambique', code: '258' },
  { pays: 'Zambie', code: '260' }, { pays: 'Zimbabwe', code: '263' }, { pays: 'Afrique du Sud', code: '27' },
  // Europe, Amériques, Asie
  { pays: 'France', code: '33' }, { pays: 'Belgique', code: '32' }, { pays: 'Suisse', code: '41' },
  { pays: 'Luxembourg', code: '352' }, { pays: 'Allemagne', code: '49' }, { pays: 'Italie', code: '39' },
  { pays: 'Espagne', code: '34' }, { pays: 'Portugal', code: '351' }, { pays: 'Royaume-Uni', code: '44' },
  { pays: 'Russie', code: '7' }, { pays: 'Turquie', code: '90' }, { pays: 'Canada / États-Unis', code: '1' },
  { pays: 'Brésil', code: '55' }, { pays: 'Haïti', code: '509' }, { pays: 'Chine', code: '86' },
  { pays: 'Inde', code: '91' }, { pays: 'Arabie saoudite', code: '966' }, { pays: 'Émirats arabes unis', code: '971' },
  { pays: 'Qatar', code: '974' }, { pays: 'Liban', code: '961' },
];

const KEEP_LEADING_ZERO = new Set(['229', '225', '242', '39']);

/** Numéro au format international « +22790123456 », ou null s'il est invalide.
 *  `code` = indicatif sans « + » ; `local` = numéro tapé (espaces, tirets et 0 initial tolérés). */
export function formatWhatsapp(code: string, local: string): string | null {
  const c = String(code ?? '').replace(/\D/g, '');
  let n = String(local ?? '').replace(/\D/g, '');
  if (!c || c.length > 4) return null;
  if (n.startsWith('00' + c)) n = n.slice(2 + c.length);   // a retapé l'indicatif en « 00227… »
  else if (n.startsWith(c) && n.length - c.length >= 7) n = n.slice(c.length); // ou « 227… »
  // 0 national initial retiré (France 06… → +336…), SAUF dans les pays où il fait partie du numéro
  // international : Bénin (+229 01…, depuis 2024), Côte d'Ivoire (+225 07…), Congo (+242 06…), Italie.
  if (!KEEP_LEADING_ZERO.has(c)) n = n.replace(/^0+/, '');
  const total = c.length + n.length;
  if (n.length < 6 || total < 8 || total > 15) return null; // norme E.164 : 15 chiffres maximum
  return `+${c}${n}`;
}
