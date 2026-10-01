# Plan : séparer UA rechargées et UA méritées (Espace Élite)

Statut : **PROPOSITION, rien n'est modifié.** À valider par le propriétaire avant tout code.

## 1. Le problème

Aujourd'hui, un étudiant peut : recharger des UA avec de l'argent, les dépenser (retry Rush, boutique), puis retirer de l'argent.
Il n'existe qu'un seul solde (`User.uaBalance`) : on ne sait pas d'où viennent les UA.

## 2. Principe

- **UA méritées** : gagnées en réussissant des cas et des paliers Rush. Seules **retirables** (Prime Arena).
- **UA rechargées** : achetées par recharge. Utilisables en boutique et pour les tentatives Rush, **jamais retirables**.

## 3. Modèle de données (le plus simple possible)

On garde `uaBalance` = **total** (rien ne casse dans l'affichage ni dans les routes qui ne font que gagner des UA).
On ajoute une seule colonne :

```
User.uaRecharged  Int  @default(0)   // part du solde qui vient de recharges (non retirable)
```

- Invariant : `0 ≤ uaRecharged ≤ uaBalance`.
- UA retirables = `uaBalance − uaRecharged`.
- Audit : `UaTransaction.rechargedDelta Int @default(0)` (variation de `uaRecharged` pour chaque ligne du journal), pour pouvoir tout rejouer et vérifier.

## 4. Règles

| Événement | Effet |
|---|---|
| Recharge validée par l'admin | `uaBalance += x` et `uaRecharged += x` |
| Gain de cas / palier Rush / coffre | `uaBalance += x` (part méritée) |
| Dépense (boutique, retry Rush 15 000) | `uaBalance -= p` ; on consomme **d'abord les rechargées** : `uaRecharged -= min(uaRecharged, p)` (protège les UA méritées de l'étudiant) |
| Demande de retrait | refusée si `montant > uaBalance − uaRecharged` ; le blocage retire du solde (méritées) comme aujourd'hui, `uaLocked` inchangé |
| Retrait rejeté / annulé | les UA reviennent comme **méritées** (elles l'étaient) |
| Correction admin positive | ajoutée comme **méritée** |
| Correction admin négative | retire d'abord les méritées, puis les rechargées |

Ordre de dépense « rechargées d'abord » : choix proposé (le plus favorable à l'étudiant honnête). À confirmer.

## 5. Fichiers concernés (toutes les routes financières gardent leurs verrous advisory)

Schéma : `prisma/schema.prisma` (+1 colonne sur `User`, +1 sur `UaTransaction`).

Routes à modifier :
- `src/app/api/admin/recharges/route.ts` : validation d'une recharge incrémente aussi `uaRecharged`.
- `src/app/api/monetise/shop/purchase/route.ts` : dépense « rechargées d'abord ».
- `src/app/api/monetise/rush/start/route.ts` : idem pour le retry payant.
- `src/app/api/monetise/withdraw/route.ts` : contrôle sur UA retirables ; annulation = retour en méritées.
- `src/app/api/admin/withdrawals/route.ts` : rejet = retour en méritées.
- `src/app/api/admin/ua-correction/route.ts` : règle des corrections.

Inchangées (elles ne font que gagner des UA méritées) : `monetise/submit`, `monetise/rush/submit`, `monetise/rush/item` (consomme des objets, pas d'UA).

Lecture / affichage : `src/lib/auth.ts` (ajouter `uaRecharged` au `select`), `etudiant/monetise/cagnotte/page.tsx` + `CagnotteClient.tsx` (deux lignes : « Points de mérite (retirables) » et « Crédits de recharge »), `MonetiseDashboard.tsx`, `BoutiqueClient.tsx` (solde total, mention de ce qui est dépensé en premier), pages admin finance/UA (afficher les deux parts).

Aucun nouvel écran de paiement ; le circuit reçu → EN_ATTENTE → validation admin ne change pas.

## 6. Migration des soldes existants

On ne peut pas deviner l'origine des UA actuelles : on **rejoue le journal `UaTransaction`** de chaque joueur dans l'ordre chronologique avec les règles du §4.

- `RECHARGE` → compte en rechargées ; dépenses → consomment les rechargées d'abord ; tout le reste → méritées.
- Résultat plafonné à `uaBalance` (sécurité).
- Variante prudente (alternative) : `uaRecharged = min(uaBalance, total des RECHARGE validées)` — plus protectrice pour l'organisation, mais pénalise celui qui a déjà dépensé.
- **Étape 1 : simulation (lecture seule)** → tableau « joueur / solde / rechargé calculé / retirable » que tu relis avant toute écriture.
- **Étape 2 : écriture** dans une seule transaction, après sauvegarde.

## 7. Ordre de déploiement (sans interruption)

1. Sauvegarde / export de la base (Supabase).
2. Ajout des colonnes par SQL explicite (`ALTER TABLE … ADD COLUMN … DEFAULT 0`), **jamais `db push`**. Additif : le code actuel continue de fonctionner.
3. Simulation du rattrapage, validation par le propriétaire.
4. Déploiement du nouveau code sur la branche `economie`, test sur l'aperçu.
5. Écriture du rattrapage, puis fusion dans `main`.
6. Contrôle : `SUM(uaRecharged) ≤ SUM(uaBalance)` et aucun solde négatif.

## 8. Risques

- Une recharge validée **entre** le rattrapage et le déploiement ne serait pas comptée : on relance le rattrapage juste avant la fusion (il est rejouable).
- Joueurs ayant des UA déjà bloquées en retrait : non touchés (`uaLocked`).
- Joueurs qui verront leur retirable baisser : prévoir un message clair dans l'application.

## 9. Décisions à prendre

1. Dépense « rechargées d'abord » : oui / non ?
2. Migration : rejeu du journal (recommandé) ou variante prudente ?
3. Les UA rechargées peuvent-elles payer le renouvellement du Pass (constante `PASS_RENEWAL_UA`, aucune route trouvée aujourd'hui) ?
4. Message aux joueurs concernés : oui / non, et quel texte ?
5. Quelle base Supabase est la production ? Trois projets sont visibles (« Dr stonemed qcm », « Dr stonemed challenge » inactifs, « MIWA » actif) et je n'ai pas lu `.env` : je n'ai donc **rien interrogé**.

---

## 10. Décisions validées par le propriétaire

1. UA rechargées dépensées **en premier** : oui.
2. Migration par **rejeu du journal** : oui.
3. Les UA rechargées **peuvent payer le renouvellement du Pass** : oui (aucune route de renouvellement par UA n'existe encore ; la règle « rechargées d'abord » s'appliquera quand elle sera créée).
4. **Message aux joueurs** dont le retirable baisse : oui (notification `--notify` + encadré « Comment ça marche » dans le trésor Élite).
5. Base de production : à confirmer. **Pas nécessaire** pour les commandes ci-dessous, qui utilisent le `DATABASE_URL` de l'application elle-même.

Principe de communication (important) : le Pass est **un accès** à l'Espace Élite, pas une mise. Les points de mérite sont le fruit du travail ; la Prime récompense la performance, n'est pas garantie et ne dépend pas de ce que l'étudiant paie. Les textes de l'application ont été réécrits dans ce sens.

## 11. Procédure de mise en ligne (dans cet ordre)

Les commandes utilisent le `.env` de ton ordinateur (qui pointe sur la production).

1. **Sauvegarde** : Supabase → Database → Backups (ou export).
2. **Ajouter les colonnes** (additif, sans risque, à faire AVANT de déployer ou tester l'aperçu, sinon l'aperçu affichera des erreurs) :
   `npx prisma db execute --file prisma/sql/2026-economie-ua-1-colonnes.sql`
3. **Simulation** (lecture seule) puis relecture du tableau :
   `node scripts/ua-rattrapage.mjs`
4. Tester l'aperçu Vercel de la branche `economie`.
5. **Écriture du rattrapage + notifications** (juste avant la fusion) :
   `node scripts/ua-rattrapage.mjs --apply --notify`
6. Fusion de `economie` dans `main`.
7. Contrôle : relancer la simulation ; `déjà_en_base` doit égaler `rechargé_calculé`.
