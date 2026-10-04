@AGENTS.md

# Dr. Stone Arena — guide de reprise pour Claude Code

Réponds toujours en **français**. Le propriétaire (DR Stone) est étudiant en médecine, pas développeur : explique simplement, une étape à la fois, et dis-lui exactement quoi tester.

## 1. Le projet en bref

Application web/mobile (PWA) de révision médicale gamifiée pour étudiants en médecine d'Afrique de l'Ouest francophone (Niger, Bénin ; monnaie FCFA). Cas cliniques QCM A/B/C/D, XP, grades, niveaux EM1–EM6 + Médecin (`anneeEtude = 7`), Flamme (série de jours), vies, duels, classements, badges, coffres.

- **Mode Classique (gratuit)** : 10 cas/jour, XP, vies, Flamme, duels, classements.
- **Premium (tiers I/II/III)** : confort (régénération des vies, duels/jour). Reçus validés à la main par l'admin.
- **Espace Élite** (actuellement appelé « monétisé » dans le code, `/etudiant/monetise`) : Pass 2 000 FCFA/mois, UA, 10 cas/jour, Rush du week-end, boutique, coffres, personnalisation, retraits (Prime Arena), recharges.
- **Panel admin** `/admin` : cas, import, utilisateurs, Premium, Pass, UA, retraits/recharges, moyens de paiement, ambassadeurs, finance, suspects, reset.

Stack : Next.js 16.3 (App Router, Turbopack — lis `node_modules/next/dist/docs/` avant d'utiliser une API Next), React 19, TypeScript strict, Prisma 6 + PostgreSQL Supabase, Tailwind 3.4, framer-motion, canvas-confetti, next-themes, web-push, JWT (jose). Déploiement Vercel automatique sur `git push`. Aucun test automatisé : la vérification = `npm run build` vert.

Documents de référence dans le projet claude.ai « Dr Stone Arena » : `claude/rapport-reprise-technique.md` (audit complet) et `claude/direction-artistique.md`. Maquette validée : https://claude.ai/artifact/V2m2hWB5KafbA7cgSVZ8Ya

## 2. Règles impératives (à respecter à chaque étape)

1. **Ne jamais repartir de zéro.** Le projet fonctionne. On habille et on améliore, on ne réécrit pas.
2. **La refonte est VISUELLE.** Ne pas changer la logique métier, les routes API, les calculs (XP, vies, Flamme, UA, paliers Rush), ni le schéma Prisma, sauf étape explicitement prévue et validée.
3. **Intouchables fonctionnellement** (on peut changer leur apparence, jamais leur comportement) :
   - les **moyens de paiement** (`PaymentMethod`, `/admin/payment-methods`, affichage numéro/bénéficiaire/instructions dans `PassPurchaseForm`, `CagnotteClient`, `PremiumPlans`) ;
   - tout le **circuit de traitement des paiements** : envoi de reçu → statut `EN_ATTENTE` → validation/rejet admin (Premium, Pass, recharges, retraits), upload Supabase Storage, idempotence ;
   - la **banque de cas** (`ClinicalCase`, `Subject`, `Chapter`), les 3 importeurs (`CaseForm`, `cases-bulk`, `cases-structured`) et la sélection quotidienne (`lib/daily-cases.ts`, `lib/monetise-daily.ts`) ;
   - l'authentification, les rôles, la validation des comptes, l'onboarding obligatoire ;
   - le **panel admin** : aucune régression. Il peut recevoir les nouvelles couleurs à la fin (étape 7), rien d'autre.
4. **Méthode** : ANALYSER → EXPLIQUER → PROPOSER → (validation du propriétaire si c'est risqué) → MODIFIER → `npm run build` → corriger jusqu'au vert → résumer ce qu'il faut tester sur téléphone.
5. **Une zone à la fois.** Un commit par étape, message clair en français. Ne pas pousser (`git push`) sans l'accord du propriétaire.
6. **Base de données = production** (pas de base de dev). Jamais `prisma db push`, `migrate reset`, ni suppression/modification de données sans accord écrit explicite. Lecture seule sinon.
7. Ne pas lire ni modifier `.env`.
8. Mobile d'abord : tout se vérifie en 360–400 px de large. Pas de défilement horizontal.
9. Conserver les conventions qui corrigent des bugs connus : pages Élite/autonomes en couche `fixed inset-0 z-[80]`, couleurs des thèmes de personnalisation en CSS inline (bug « blanc sur blanc » sur mobile), verrous advisory dans les routes financières.

## 3. Charte « Arena Malachite » (validée)

Une seule identité, **sombre** (dark-first), pour tout le monde. Le Premium ne recolore plus la coquille : il se voit par un badge. L'Espace Élite garde les mêmes composants, seule la matière passe à l'or.

### Couleurs (à mettre en tokens Tailwind `theme.extend.colors` + variables CSS)
| Token | Hex | Usage |
|---|---|---|
| `stone` | `#0d1311` | fond de l'application |
| `slab` | `#151d1a` | surfaces/cartes |
| `slab-2` | `#1c2723` | surfaces secondaires, pistes de barres |
| `line` | `#26332e` | bordures |
| `ink` | `#e9f1ed` | texte principal |
| `mute` | `#8fa39a` | texte secondaire |
| `mala` | `#2fd28a` | **malachite** : action, réussite, progression (Classique) |
| `mala-deep` | `#0f7a4f` | ombre pleine des boutons malachite |
| `gold` | `#f2c14e` | **or** : réservé à l'Espace Élite |
| `gold-deep` | `#9a6a12` | ombre pleine des boutons or |
| `flame` | `#ff8a3d` | Flamme |
| `heart` | `#ff5470` | vies, erreurs |
| `sky` | `#5cc8ff` | sélection en cours |

Fond Élite : `#100d07` avec halo or. Le mode clair (`next-themes`) peut être retiré de l'interface étudiant si cela simplifie ; demander d'abord au propriétaire.

### Typographie (via `next/font/google`)
- **Unbounded** (500/700/800) : titres, chiffres du HUD, boutons, numéros des réponses.
- **Figtree** (400–800) : énoncés, corrections, texte courant.
- Chiffres : `tabular-nums`.

### Composants de base (à créer dans `src/components/ui/`)
- `ArenaButton` : bouton en relief (ombre pleine dessous `0 5px 0 var(--mala-deep)`), qui s'enfonce au toucher (translateY + ombre réduite). Variantes `mala`, `gold`, `ghost`, `danger`.
- `HudPill` : pastille Flamme / XP / Vies / Élite avec icône SVG.
- `AnswerOption` : réponse A/B/C/D en relief, états `idle / selected (sky) / correct (mala) / wrong (heart) / dimmed`.
- `Icon` : jeu d'icônes SVG maison (flamme, cœur, étoile, trophée, épées, profil, accueil, bouclier, coffre, stéthoscope, ECG, cerveau, cellule). Les emojis restent autorisés pour badges, récompenses et titres de personnalisation, pas pour la navigation ni le HUD.
- `ProgressPath` : parcours des 10 cas du jour façon Duolingo (nœuds en zigzag, faits / en cours / à venir / coffre).
- `TimerRing` : chrono circulaire SVG.
- `ResultSheet` : panneau de correction qui monte du bas.

## 4. Animation — le propriétaire veut BEAUCOUP d'animation, et très belle

C'est une demande forte : l'application doit être vivante. Mais chaque animation doit rester fluide sur un Android d'entrée de gamme. Règles techniques :
- n'animer que `transform` et `opacity` (pas `width`, `top`, `box-shadow` en boucle sur de grandes surfaces) ;
- framer-motion pour les entrées/sorties/gestes, CSS keyframes pour les boucles d'ambiance ;
- au plus ~30 particules simultanées, `will-change` seulement pendant l'animation ;
- respecter `prefers-reduced-motion` (tout garder, mais sans boucles ni confettis) ;
- jamais une animation qui retarde une action (un bouton répond immédiatement).

Catalogue à réaliser (chaque étape en reprend une partie) :

**Ambiance médicale (identité)**
- **Tracé ECG** malachite qui défile : sous le logo de l'intro, dans l'écran de chargement (`etudiant/loading.tsx`), et en fin trait sous les titres de section. Un pic quand on réussit un cas.
- **Cellules / globules** qui dérivent lentement en arrière-plan (cercles flous très discrets, 6–10 max), sur l'accueil et la connexion.
- **Cœur des vies qui bat** (double battement « lub-dub ») ; il bat plus vite quand il reste 1–2 vies ; il se brise en morceaux quand on perd une vie.
- **Logo** : cerveau + caducée/stéthoscope stylisé en SVG, avec une pulsation lumineuse lente.
- Petites touches médicales dans le texte d'interface (« Diagnostic posé ! », « Garde du jour terminée », « Prochaine consultation demain »), sans exagérer.

**Navigation et HUD**
- Entrée des pages en cascade (stagger 60 ms) ; transition douce entre onglets.
- Barre du bas : l'icône active rebondit et un indicateur malachite glisse d'un onglet à l'autre (`layoutId`).
- Compteurs XP/UA qui défilent jusqu'à la nouvelle valeur ; la pastille pulse quand la valeur change.
- Flamme : vacillement permanent, plus intense au-delà de 7 et de 15 jours.

**Parcours du jour**
- Le nœud en cours respire et flotte ; les nœuds terminés brillent ; le chemin se « remplit » de malachite quand un cas est fini ; le coffre du parcours tremble quand il est proche.

**Écran de cas**
- Arrivée de l'énoncé puis des 4 réponses en cascade.
- Réponses qui s'enfoncent au toucher ; la sélection glisse en bleu ciel.
- Chrono circulaire qui passe du vert à l'orange puis au rouge, et qui bat dans les 10 dernières secondes.
- **Bonne réponse** : la réponse s'illumine, petit éclat de particules, pic ECG, « +10 XP » qui s'envole vers la pastille XP, confettis malachite légers. Panneau de correction qui monte avec un rebond.
- **Mauvaise réponse** : léger tremblement de la réponse, cœur qui se brise dans le HUD, panneau bienveillant (« Pas grave, voici le raisonnement »).
- Fin des 10 cas : écran de récapitulatif avec score animé, Flamme qui grandit, confettis.

**Récompenses**
- Montée de grade : écran plein avec médaille qui tourne, rayons lumineux, confettis.
- Ouverture de coffre : coffre qui tremble, s'ouvre, lumière, objet qui apparaît en tournant.
- Badges débloqués : carte qui se retourne.

**Espace Élite**
- Transition d'entrée : un balayage doré traverse l'écran (le passage Classique → Élite doit être un moment).
- Reflets dorés qui glissent sur les cartes (shimmer), poussière d'or en arrière-plan.
- Rush : compte à rebours 3-2-1 plein écran, barre de paliers qui se remplit, flash à chaque palier.

Les animations existantes de `src/styles/monetise.css` (cadres de feu, galaxie, néon, thèmes plein écran) sont **conservées** et doivent continuer à fonctionner.

## 5. Vocabulaire de l'Espace Élite (étape 5)

Objectif : le Pass se lit comme un **accès**, pas comme une mise, sans rien cacher. Ne changer que les textes affichés, pas les noms de routes ni de champs (`/etudiant/monetise` reste l'URL).

| Aujourd'hui | Nouveau |
|---|---|
| Arène Monétisée / Pass Arène Monétisé | Espace Élite / Pass Élite |
| Ta cagnotte / Cagnotte (et la faute « Cagnotne ») | Points de mérite / Mon trésor Élite |
| +1 000 UA par cas | Chaque cas réussi compte pour ta Prime |
| Retraits réels | Prime Arena (bourse de mérite) |
| Montants FCFA partout | FCFA visible uniquement sur l'écran de retrait et de recharge |

- **Supprimer** le bloc « État de l'Arène Monétisée » (cartes U2…U6 « ✅ en ligne ») de `MonetiseDashboard.tsx`.
- Ajouter près du bouton d'achat du Pass : « Le Pass Élite donne accès à l'Espace Élite. La Prime Arena récompense la performance et n'est pas garantie. »
- Mettre en avant ce que le Pass apporte (cas Élite, Rush, boutique, personnalisation, classement Élite) avant la Prime.

## 6. Plan de travail (dans cet ordre, une étape = un commit)

Avant l'étape 1 : lancer `npm run build` sur le code actuel et noter s'il est vert. S'il ne l'est pas, corriger d'abord (le dernier build connu n'était pas confirmé : erreur TS2741 sur `unreadMessages` dans `etudiant/layout.tsx`, normalement corrigée).

1. **Socle** — tokens Tailwind + variables CSS, polices Unbounded/Figtree dans `app/layout.tsx` (et `themeColor` → `#0d1311`), jeu d'icônes, composants de base (§3), keyframes d'ambiance médicale (§4). Aucune page modifiée sauf une page de démonstration temporaire si utile (à supprimer ensuite).
2. **Coquille** — `components/layout/AppShell.tsx` : HUD animé, barre du bas animée, barre latérale desktop, logo. Premium = badge, plus de recoloriage. Garder les props existantes (`unreadMessages`, `isAmbassador`, notifications…).
3. **Accueil + cas + correction** — `app/etudiant/page.tsx` (parcours du jour, grade, Top 3, carte Espace Élite), `ChallengeClient.tsx`, `challenge/page.tsx` (écrans d'info). **Sécurité incluse dans cette étape** : ne plus envoyer `correctAnswer` ni `explanation` au client avant la réponse ; le serveur (`/api/challenge/submit`) renvoie le verdict, la bonne réponse et l'explication — reprendre le modèle de `MonetisePlayClient.tsx`. Ajouter côté serveur : le cas doit appartenir à la sélection du jour, pas de deuxième tentative du même cas le même jour, vies > 0. Vérifier que `CaseGuard` (anti-triche) fonctionne toujours. Appliquer `whitespace-pre-line` aux énoncés.
4. **Intro, connexion, inscription, onboarding, chargement** — `app/page.tsx`, `login`, `register`, `forgot-password`, `OnboardingCarousel`, `etudiant/loading.tsx`. Ne pas toucher à la logique des formulaires.
5. **Espace Élite** — layout, `MonetiseNav`, `MonetiseDashboard`, `PassPresentation`, `PassPurchaseForm`, `MonetisePlayClient`, `CagnotteClient`, `BoutiqueClient`, `RushStartPanel`, `RushClient` : charte or + vocabulaire (§5). Les formulaires de paiement/reçu/retrait gardent exactement le même fonctionnement.
6. **Autres pages étudiant** — arène, duels (`DuelHub`, `DuelPlayer`), classement (brancher cadre + titre équipés dans le Top 3 et le classement), profil, profil public, stats, historique, grades, Premium, messagerie, ambassadeur.
7. **Panel admin** (en dernier, léger) — uniquement les couleurs/polices de base pour la cohérence, sans animation lourde ni changement de mise en page des tableaux et formulaires. Tester chaque page admin après.

### Étape séparée, à valider avant de coder : économie de l'Espace Élite
Aujourd'hui on peut recharger des UA avec de l'argent, les dépenser (retry Rush, boutique) puis retirer de l'argent. Proposition validée dans son principe, **à re-confirmer avec le propriétaire avant toute modification** car elle touche le schéma Prisma et les routes financières : séparer les UA **rechargées** (utilisables en boutique et pour les tentatives, jamais retirables) des UA **méritées** (gagnées en réussissant des cas et des paliers, seules retirables). Préparer un plan détaillé (champs, routes concernées, migration des soldes existants) et le faire valider ; ne jamais lancer `db push` sans accord.

## 7. Après chaque étape, donner au propriétaire
- la liste des fichiers modifiés ;
- le résultat de `npm run build` ;
- une liste courte de ce qu'il doit vérifier sur son téléphone (pages, gestes, cas à jouer) ;
- la commande pour publier quand il est d'accord : `git add -A && git commit -m "…" && git push`.

## 8. Points connus à ne pas oublier
- Rush : fermer/réouvrir l'application relance le cas (pas d'horodatage serveur) — à traiter plus tard, pas pendant la refonte.
- `lib/auth.ts` et l'expiration du Pass (`passExpiresAt`, purgée dans `etudiant/monetise/layout.tsx`) n'ont jamais été audités en profondeur.
- Le dossier `prisma/migrations` ne contient que la migration initiale (tout a été fait par `db push`). Ne pas créer de migration sans accord.
