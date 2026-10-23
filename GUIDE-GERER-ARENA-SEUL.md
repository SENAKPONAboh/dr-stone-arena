# Gérer Dr Stone Arena seul (sans Claude)

Ce guide sert pendant les mois où tu n'as pas d'abonnement. **Tout le travail courant se fait dans le panel admin**, sans toucher au code : https://dr-stone-arena.vercel.app/admin

---

## 1. Chaque jour (10 minutes)

Commence par le bloc **« À traiter aujourd'hui »** en haut de l'accueil du panel : il montre avec une pastille orange tout ce qui attend (reçus Premium, Pass Élite, recharges, Primes à payer, commissions, comptes à valider). Clique sur une ligne pour aller directement à la bonne page.

| Où (panel admin) | Quoi faire |
|---|---|
| **Validation Premium** | Ouvre chaque reçu, compare avec ton relevé mobile money (montant + numéro), puis valide ou rejette. |
| **Pass Élite** | Pareil pour les Pass Élite (2 000 FCFA) : bouton **Activer le Pass Élite**. |
| **Trésorerie UA** | Recharges à valider ; **Primes Arena à payer** (retraits) : envoie l'argent par mobile money **d'abord**, au moyen de paiement et au numéro affichés sur la demande, puis clique **Marquer payé**. |
| **Journal des suspects** | Coup d'œil : réponses trop rapides ou précision anormale = triche probable. Bannis seulement si c'est répété. |
| **Gestion des étudiants** | Tape son nom ou son e-mail dans la barre de recherche. Mot de passe oublié : bouton de réinitialisation sur sa ligne. |

Règle d'or des paiements : **ne valide jamais un reçu sans avoir vu l'argent arriver** sur ton téléphone. Une capture d'écran peut être fausse.

## 2. Chaque semaine

1. **Sauvegarde de la base** (voir §5). Le dimanche par exemple.
2. **Vérifier les limites gratuites** (voir §4).
3. **Ajouter des cas** avec la Fabrique de cas (voir §10).
4. Envoyer une **Notification Push** (accueil du panel) pour motiver : défi du jour, Top 3 de la semaine…

## 3. Chaque fin de mois

1. **Tournoi mensuel** : clôturer celui du mois, créer et publier le suivant.
2. **Saison mensuelle** : clôturer le mois (enregistre les grades puis remet les XP à zéro). À faire **une seule fois**, le dernier jour ou le 1er au matin.
3. **Ambassadeurs** : envoie la commission en attente par mobile money, puis clique **💰 Verser** sur la ligne de l'ambassadeur.
4. **Centre financier** : onglet **Dépenses** pour noter les dépenses du mois (ex. abonnements quand tu les reprends). L'onglet **Résumé** montre l'argent encaissé (Premium + Pass Élite + recharges), l'argent sorti (dépenses, ambassadeurs, Primes) et **ce que tu dois encore payer**. L'onglet **Transactions** retrouve n'importe quel paiement.

## 4. Surveiller les offres gratuites

### Supabase (la base de données)
- Va sur https://supabase.com/dashboard, ouvre le projet d'Arena, puis **Settings → Usage** (ou **Organization → Usage**).
- Regarde surtout **Database size** (limite 500 Mo) et **Storage** (limite 1 Go, ce sont les photos de reçus).
- **Au-delà de 80 %** : il est temps de payer Supabase Pro (25 $/mois), ou de me redemander de l'aide.

### Vercel (le site)
- Va sur https://vercel.com, ouvre le projet **dr-stone-arena**, onglet **Usage**.
- Limite principale : 100 Go de trafic par mois. Au-delà de 80 %, prévois l'abonnement Pro (20 $/mois).

Aucune des deux ne t'envoie de facture surprise : au pire, le service se met en pause.

## 5. Faire une sauvegarde de la base

Il faut le PC avec Internet et le projet ouvert dans VS Code.

1. VS Code → menu **Terminal → Nouveau terminal**.
2. Tape exactement :
   ```
   npm.cmd run sauvegarde
   ```
3. Attends le message **« Sauvegarde terminée »**. Il affiche le dossier, par exemple `sauvegardes\2026-11-01_10h30`.
4. **Copie ce dossier** sur une clé USB ou ton Google Drive personnel.

Important :
- Le script **lit seulement** la base, il ne modifie rien. Tu peux le lancer quand tu veux.
- Le dossier contient les numéros et mots de passe chiffrés des étudiants : **ne l'envoie à personne**, ne le poste nulle part.
- Garde les 4 dernières sauvegardes, supprime les plus vieilles (le disque du PC est presque plein).
- Si tu vois « ÉCHEC » : vérifie Internet et relance.

## 6. Si quelque chose ne marche plus

| Problème | Que faire |
|---|---|
| **Le site ne s'ouvre plus du tout** | 1) Vérifie ta connexion. 2) Va sur supabase.com : si le projet dit **Paused**, clique **Restore project** (gratuit, quelques minutes). 3) Sinon, va sur vercel.com → projet → onglet **Deployments**. |
| **Ça marchait hier, plus aujourd'hui après une mise à jour** | Vercel → **Deployments** → choisis la dernière version qui marchait → menu **⋯** → **Instant Rollback** (ou **Promote to Production**). Le site revient à cette version en 1 minute. |
| **Le site affiche une erreur de base de données** | Supabase → **Usage** : si la base est pleine (500 Mo), il faut payer Pro ou demander de l'aide pour faire du ménage. |
| **La vérification WhatsApp ne répond plus** | Pas grave : après 2 minutes, l'étudiant a un bouton « continuer ». Les clés Meta sont peut-être expirées ; ce sera à refaire avec de l'aide. |
| **Un étudiant dit qu'il a payé mais rien n'est arrivé** | Cherche son nom dans Centre financier → **Transactions**, ou son reçu dans Validation Premium / Pass Élite / Trésorerie UA. Pas de reçu = il ne l'a pas envoyé : demande-lui de recommencer. |
| **Le Rush redémarre si on ferme l'application** | Problème connu, ce n'est pas une panne. À corriger plus tard. |

## 7. Ce qu'il ne faut JAMAIS faire seul

- **Zone dangereuse → Initialiser toutes les données** : efface XP, grades, paiements de tout le monde. Seulement pour un vrai nouveau départ.
- Supprimer ou modifier un **moyen de paiement** sans être sûr du nouveau numéro : les étudiants paieraient au mauvais numéro.
- Lancer des commandes comme `prisma db push`, `migrate reset` ou du SQL trouvé sur Internet.
- Toucher au fichier `.env`, ou donner son contenu à quelqu'un (ce sont les clés de la base).
- Changer les **variables d'environnement** dans Vercel (Settings → Environment Variables).

## 8. Où trouver de l'aide gratuite

- **claude.ai en gratuit** : on peut écrire quelques messages par jour. Pour un message d'erreur : fais une capture, colle-la, et dis « c'est mon application Dr Stone Arena (Next.js, Vercel, Supabase) ».
- **Un ami développeur** : le fichier `CLAUDE.md` du projet décrit toute l'application et les règles à respecter. Donne-lui ce fichier avant qu'il touche à quoi que ce soit.
- **Sans aide**, tu peux toujours : valider les paiements, ajouter des cas, gérer les étudiants, envoyer des notifications, revenir à une version précédente sur Vercel, réveiller Supabase, faire une sauvegarde. C'est tout ce qu'il faut pour faire tourner Arena.

## 9. Le jour du lancement : remplacer l'ancienne banque par les 1 890 cas

Les 1 890 cas sont dans `Claude outputs\Cas_lancement` (27 fichiers de 70 cas). Les anciens chapitres ont d'autres noms (« MP » au lieu de « 1. MP (membrane plasmique) ») : il faut donc effacer **aussi** les matières et chapitres, sinon tu aurais chaque chapitre en double.

1. **Sauvegarde** (§5).
2. Panel admin → **Zone dangereuse → Accéder**.
3. Coche **« Supprimer AUSSI toute la banque de cas cliniques »**, puis **« Supprimer aussi les matières et chapitres »**. Tape le mot de confirmation demandé et valide.
4. Panel admin → **Import QCM structurés**. Ouvre `Lot_01_cas_1-70.txt` dans le Bloc-notes, Ctrl+A, Ctrl+C, colle dans la page, importe. Le rapport doit dire **70 créés**.
5. Recommence pour les 27 lots, dans l'ordre. Note sur un papier le numéro du dernier lot importé (en cas de coupure de courant, tu sais où reprendre ; un lot importé deux fois ne crée pas de doublons).
6. Vérifie avec un compte étudiant que les 10 cas du jour s'affichent.

Attention : ce bouton remet aussi à zéro les XP, Flammes, duels, badges, demandes Premium et notifications de tout le monde. C'est voulu pour le lancement, pas après.

## 10. Créer de nouveaux cas sans Claude Code (Fabrique de cas)

La page `Claude outputs\Fabrique_de_cas.html` fonctionne **sans Internet** (double-clic pour l'ouvrir dans ton navigateur). Elle connaît tes 379 chapitres et tes 1 890 cas.

1. Choisis l'**année**, la **matière**, le **chapitre** (les chapitres qui ont le moins de cas sont en haut : prends le premier pour faire tourner le programme). Pour un chapitre qui n'existe pas encore (ex. au S2), écris son nom dans « nouveau chapitre », avec son numéro, et garde toujours ce même nom.
2. Clique **Copier la demande pour l'IA**. La demande contient les règles de Dr Stone Arena, 2 vrais cas de ce chapitre comme modèle et la liste des cas déjà faits.
3. Colle-la dans une IA gratuite : **claude.ai** (le meilleur en médecine), sinon **ChatGPT** ou **Gemini**. Un chapitre de 10 cas par message.
4. Copie toute la réponse de l'IA, colle-la dans l'étape 2 de la page, clique **Nettoyer et vérifier**. La page enlève le gras et les titres, remet les bons noms de matière et de chapitre, écarte les cas incomplets ou déjà existants.
5. **Lis chaque cas et sa justification.** L'IA peut se tromper : tu es le dernier contrôle médical.
6. **Copier les cas propres** → panel admin → **Import QCM structurés** → colle → importe.

Conseils :
- 10 cas par chapitre et par séance, c'est le bon rythme : par exemple 1 chapitre par jour et par année.
- La page retient les cas que tu as fabriqués **dans ce navigateur** : utilise toujours le même navigateur.
- Garde une copie de `Fabrique_de_cas.html` et du dossier `Cas_lancement` sur ta clé USB. Ne les publie pas : c'est ta banque de cas.
- Pour mettre la page à jour avec de nouveaux lots (avec de l'aide) : `node scripts/fabrique-de-cas.cjs`.

## 11. Quand l'argent rentre, dans cet ordre

1. **Supabase Pro** (25 $/mois) : sauvegardes automatiques chaque jour, plus de place.
2. **Vercel Pro** (20 $/mois) : usage commercial autorisé, plus de marge.
3. **Claude** : pour les nouvelles fonctionnalités et la refonte.
