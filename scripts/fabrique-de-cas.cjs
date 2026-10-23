// FABRIQUE DE CAS : construit une page HTML autonome (sans Internet) pour créer de nouveaux cas
// avec une IA gratuite (claude.ai, ChatGPT, Gemini…) au même format et dans le même style que la banque du lancement.
//
//   node scripts/fabrique-de-cas.cjs
//
// Lit :  Claude outputs/Cas_lancement/*.txt  (les 27 lots, format « Import QCM structurés »)
//        sauvegardes/<la plus récente>/Subject + Chapter (ancien programme, facultatif)
// Écrit : Claude outputs/Fabrique_de_cas.html  (contient les cas : ne pas publier, ne pas mettre sur GitHub)
// Lecture seule : aucun accès à la base, aucun fichier du projet modifié.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const racine = path.join(__dirname, "..");
const dossierLots = path.join(racine, "Claude outputs", "Cas_lancement");
const sortie = path.join(racine, "Claude outputs", "Fabrique_de_cas.html");

// ===== 1. Les cas du lancement, regroupés par chapitre =====
const champ = (bloc, nom) => {
  const m = bloc.match(new RegExp(`^${nom} :\\s*\\n([\\s\\S]*?)(?=\\n[A-ZÉ][^\\n]{0,40} :\\s*\\n|$)`, "m"));
  return m ? m[1].trim() : "";
};

const chapitres = new Map();
for (const f of fs.readdirSync(dossierLots).filter((f) => f.endsWith(".txt")).sort()) {
  const texte = fs.readFileSync(path.join(dossierLots, f), "utf8").replace(/\r\n/g, "\n");
  for (const brut of texte.split(/\n-{3,}\s*\n/)) {
    const bloc = brut.trim();
    const titre = champ(bloc, "Titre");
    if (!titre) continue;
    const a = champ(bloc, "Année"), s = champ(bloc, "Semestre"), m = champ(bloc, "Matière"), c = champ(bloc, "Chapitre");
    const cle = [a, s, m, c].join("|");
    if (!chapitres.has(cle)) chapitres.set(cle, { a, s, m, c, titres: [], exemples: [] });
    const ch = chapitres.get(cle);
    ch.titres.push(titre);
    if (ch.exemples.length < 2) ch.exemples.push(bloc);
  }
}

// ===== 2. L'ancien programme (chapitres de la base avant le lancement), s'il y a une sauvegarde =====
const ancien = {};
const dossierSauv = path.join(racine, "sauvegardes");
if (fs.existsSync(dossierSauv)) {
  const derniere = fs.readdirSync(dossierSauv).sort().pop();
  const lire = (n) => {
    const p = path.join(dossierSauv, derniere, `${n}.jsonl.gz`);
    if (!fs.existsSync(p)) return [];
    return zlib.gunzipSync(fs.readFileSync(p)).toString().trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  };
  const matieres = new Map(lire("Subject").map((s) => [s.id, s]));
  for (const c of lire("Chapter")) {
    const s = matieres.get(c.subjectId);
    if (!s) continue;
    const annee = s.anneeEtude === 7 ? "Médecin" : `EM${s.anneeEtude}`;
    const cle = `${annee}|${s.name}`;
    (ancien[cle] ??= []).push(c.name);
  }
}

const donnees = { chapitres: [...chapitres.values()], ancien };
const json = JSON.stringify(donnees).replace(/</g, "\\u003c");

// ===== 3. La page =====
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fabrique de cas</title>
<style>
:root{--stone:#0d1311;--slab:#151d1a;--slab2:#1c2723;--line:#26332e;--ink:#e9f1ed;--mute:#8fa39a;--mala:#2fd28a;--deep:#0f7a4f;--heart:#ff5470;--gold:#f2c14e}
*{box-sizing:border-box}
body{margin:0;background:var(--stone);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:16px}
h1{font-size:24px;margin:8px 0 4px}
h2{font-size:18px;margin:0 0 12px;color:var(--mala)}
p.aide{color:var(--mute);margin:4px 0 16px;font-size:14px}
section{background:var(--slab);border:1px solid var(--line);border-radius:16px;padding:16px;margin:16px 0}
label{display:block;font-weight:700;font-size:14px;margin:12px 0 4px}
select,input,textarea{width:100%;background:var(--slab2);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit}
textarea{min-height:180px;font-size:14px}
.ligne{display:flex;gap:10px;flex-wrap:wrap}
.ligne>*{flex:1 1 140px}
button{background:var(--mala);color:#06251a;border:0;border-radius:12px;padding:12px 16px;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 4px 0 var(--deep);margin-top:12px}
button:active{transform:translateY(3px);box-shadow:0 1px 0 var(--deep)}
button.gris{background:var(--slab2);color:var(--ink);box-shadow:0 4px 0 #0a0f0d;border:1px solid var(--line)}
.info{background:var(--slab2);border-radius:10px;padding:10px;font-size:14px;color:var(--mute);margin-top:10px}
.ok{color:var(--mala)}.ko{color:var(--heart)}.att{color:var(--gold)}
ul.rapport{padding-left:18px;font-size:14px}
a{color:var(--mala)}
</style>
</head>
<body>
<main>
<h1>Fabrique de cas · Dr Stone Arena</h1>
<p class="aide">3 étapes : 1) choisis le chapitre et copie la demande ; 2) colle-la dans une IA gratuite (claude.ai, ChatGPT, Gemini) ; 3) colle sa réponse ici pour la nettoyer, puis importe-la dans le panel.</p>

<section>
<h2>1. Choisir le chapitre</h2>
<div class="ligne">
  <div><label for="annee">Année</label><select id="annee"></select></div>
  <div><label for="matiere">Matière</label><select id="matiere"></select></div>
</div>
<label for="chapitre">Chapitre (les moins fournis en premier)</label>
<select id="chapitre"></select>
<label for="nouveau">… ou un NOUVEAU chapitre de cette matière (laisse vide sinon)</label>
<input id="nouveau" placeholder="Ex. : 9. Physiologie rénale">
<div id="ancienBox" class="info" hidden></div>
<div class="ligne">
  <div><label for="semestre">Semestre</label><input id="semestre" placeholder="S1"></div>
  <div><label for="nombre">Nombre de cas</label><select id="nombre"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></div>
</div>
<div id="infoChap" class="info"></div>
<button id="copierDemande">Copier la demande pour l'IA</button>
<span id="copieOk" class="ok"></span>
</section>

<section>
<h2>2. Coller la réponse de l'IA</h2>
<p class="aide">Copie TOUT ce que l'IA a répondu (même s'il y a du gras ou des titres), puis colle-le ici.</p>
<textarea id="reponse" placeholder="Colle ici la réponse de l'IA…"></textarea>
<button id="verifier">Nettoyer et vérifier</button>
<div id="rapport"></div>
</section>

<section id="etape3" hidden>
<h2>3. Importer dans Arena</h2>
<p class="aide"><b>Avant d'importer, lis chaque cas et sa justification.</b> L'IA peut se tromper. Tu es étudiant en médecine : tu es le dernier contrôle.</p>
<textarea id="propre" readonly></textarea>
<button id="copierPropre">Copier les cas propres</button>
<span id="copieOk2" class="ok"></span>
<p class="aide">Puis ouvre <a href="https://dr-stone-arena.vercel.app/admin/cases-structured" target="_blank" rel="noopener">Import QCM structurés</a>, colle et valide. Les cas déjà présents (même titre) sont ignorés automatiquement.</p>
</section>
</main>

<script>
const D = ${json};
const ORDRE = ["EM1","EM2","EM3","EM4","EM5","EM6","Médecin"];
const $ = (id) => document.getElementById(id);

// Titres déjà fabriqués avec cette page (gardés dans ce navigateur) : pour éviter les doublons et faire tourner les chapitres.
let faits = {};
try { faits = JSON.parse(localStorage.getItem("fabrique-faits") || "{}"); } catch {}
const sauverFaits = () => { try { localStorage.setItem("fabrique-faits", JSON.stringify(faits)); } catch {} };
const cleChap = (a, m, c) => [a, m, c].join("|").toLowerCase();
const titresDe = (ch) => ch.titres.concat(faits[cleChap(ch.a, ch.m, ch.c)] || []);

function remplir(sel, valeurs, libelle) {
  sel.innerHTML = "";
  for (const v of valeurs) { const o = document.createElement("option"); o.value = v; o.textContent = libelle ? libelle(v) : v; sel.appendChild(o); }
}
function chapsDe(a, m) { return D.chapitres.filter((c) => c.a === a && c.m === m); }

remplir($("annee"), ORDRE.filter((a) => D.chapitres.some((c) => c.a === a)));
function majMatieres() {
  const a = $("annee").value;
  remplir($("matiere"), [...new Set(D.chapitres.filter((c) => c.a === a).map((c) => c.m))].sort());
  majChapitres();
}
function majChapitres() {
  const a = $("annee").value, m = $("matiere").value;
  const liste = chapsDe(a, m).sort((x, y) => titresDe(x).length - titresDe(y).length);
  remplir($("chapitre"), liste.map((c) => c.c), (c) => { const ch = liste.find((x) => x.c === c); return c + "  (" + titresDe(ch).length + " cas)"; });
  const anciens = Object.entries(D.ancien).filter(([k]) => k.toLowerCase() === (a + "|" + m).toLowerCase()).flatMap(([, v]) => v);
  const box = $("ancienBox");
  if (anciens.length) { box.hidden = false; box.innerHTML = "<b>Chapitres de l'ancien programme pour cette matière</b> (pour t'inspirer d'un nouveau chapitre) :<br>" + anciens.map(esc).join(" · "); }
  else box.hidden = true;
  majInfo();
}
function choix() {
  const a = $("annee").value, m = $("matiere").value, nouveau = $("nouveau").value.trim();
  const liste = chapsDe(a, m);
  const ch = liste.find((c) => c.c === $("chapitre").value);
  const exemples = ch ? ch.exemples : liste.flatMap((c) => c.exemples).slice(0, 2);
  const semestre = $("semestre").value.trim() || (ch ? ch.s : "S1");
  return { a, m, c: nouveau || (ch ? ch.c : ""), s: semestre, ch: nouveau ? null : ch, exemples, n: Number($("nombre").value) };
}
function majInfo() {
  const ch = chapsDe($("annee").value, $("matiere").value).find((c) => c.c === $("chapitre").value);
  if (ch && !$("nouveau").value.trim()) $("semestre").value = ch.s;
  $("infoChap").textContent = $("nouveau").value.trim()
    ? "Nouveau chapitre : écris son nom exactement comme tu veux le voir dans l'application, avec son numéro (ex. « 9. … »). Garde ensuite toujours le même nom."
    : ch ? "Ce chapitre a déjà " + titresDe(ch).length + " cas. L'IA recevra leurs titres pour ne pas les refaire, et 2 vrais cas comme modèle." : "";
}
$("annee").onchange = majMatieres; $("matiere").onchange = majChapitres;
$("chapitre").onchange = majInfo; $("nouveau").oninput = majInfo;
majMatieres();

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function demande() {
  const x = choix();
  const deja = x.ch ? titresDe(x.ch) : [];
  const n1 = Math.round(x.n * 0.4), n3 = Math.round(x.n * 0.2), n2 = x.n - n1 - n3;
  return [
"Tu es le générateur officiel de cas de Dr Stone Arena, une application de révision médicale gamifiée pour les étudiants en médecine du Niger et du Bénin (FSS de Niamey, Université Abdou Moumouni, etc.).",
"",
"MISSION : écris exactement " + x.n + " nouveaux cas pour :",
"- Année : " + x.a,
"- Semestre : " + x.s,
"- Matière : " + x.m,
"- Chapitre : " + x.c,
"",
"RÈGLES :",
"1. Niveau STRICT de l'année " + x.a + " : rien qui appartienne à une année supérieure. Le but n'est pas le cas le plus difficile, mais le meilleur cas pour ce niveau.",
"2. Difficulté : " + n1 + " cas ⭐, " + n2 + " cas ⭐⭐, " + n3 + " cas ⭐⭐⭐.",
"3. Énoncé court, clair, lisible sur téléphone, situation réaliste (TP, stage, garde, laboratoire, consultation…), prénoms et lieux d'Afrique de l'Ouest (Niamey, Zinder, Maradi, Cotonou, Parakou…).",
"4. Exactement 4 propositions A, B, C, D ; une seule correcte ; les fausses restent plausibles (jamais absurdes).",
"5. Varie la place de la bonne réponse (pas toujours la même lettre).",
"6. Justification : pourquoi la bonne réponse est juste, puis pourquoi chaque fausse proposition est fausse, simplement.",
"7. Objectif pédagogique : une phrase qui résume la notion à retenir.",
"8. Science exacte : aucune valeur, aucun mécanisme ni traitement inventé. En cas de doute, reste simple et prudent.",
"9. Chaque cas teste une notion ou un raisonnement différent : pas de simple reformulation.",
deja.length ? "10. Ces cas EXISTENT DÉJÀ sur ce chapitre, ne les refais pas : " + deja.join(" ; ") + "." : "",
"",
"FORMAT OBLIGATOIRE (sinon l'import échoue) : texte brut, SANS gras, SANS astérisques, SANS titres #, SANS numéro « Cas 1 ». Chaque libellé seul sur sa ligne, suivi de « : », le contenu sur la ligne suivante. Sépare les cas par une ligne « --- ». Recopie EXACTEMENT ces valeurs : Année « " + x.a + " », Semestre « " + x.s + " », Matière « " + x.m + " », Chapitre « " + x.c + " ».",
"",
"Voici " + x.exemples.length + " vrais cas de la banque, à imiter pour le style, la longueur et le format :",
"",
x.exemples.join("\\n\\n---\\n\\n"),
"",
"---",
"",
"Réponds uniquement avec les " + x.n + " cas, sans phrase d'introduction ni de conclusion.",
  ].filter((l, i, t) => !(l === "" && t[i - 1] === "")).join("\\n");
}

async function copier(texte, cible) {
  try { await navigator.clipboard.writeText(texte); }
  catch { const t = document.createElement("textarea"); t.value = texte; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
  cible.textContent = " Copié !"; setTimeout(() => (cible.textContent = ""), 2500);
}
$("copierDemande").onclick = () => {
  if (!choix().c) { alert("Choisis un chapitre ou écris un nouveau chapitre."); return; }
  copier(demande(), $("copieOk"));
};

// ===== Nettoyage + vérification (mêmes règles que l'importeur du panel) =====
const LIBELLES = ["Titre","Année","Semestre","Matière","Chapitre","Difficulté","Énoncé","Question","Propositions","Réponse correcte","Justification","Objectif pédagogique"];
const plat = (s) => s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[:：]/g, "").trim();
const PLAT = Object.fromEntries(LIBELLES.map((l) => [plat(l), l]));
PLAT["reponse"] = "Réponse correcte"; PLAT["objectif"] = "Objectif pédagogique"; PLAT["enonce"] = "Énoncé";

function nettoyer(brut) {
  const sortie = [];
  for (let l of brut.replace(/\\r\\n/g, "\\n").split("\\n")) {
    l = l.replace(/\\*\\*|__|\`\`\`[a-z]*|\`/g, "").replace(/^\\s*#{1,6}\\s*/, "").replace(/^\\s*[-*•]\\s+(?=[A-Fa-f]\\s*[.)])/, "").trim();
    if (/^-{3,}$/.test(l) || /^[*_]{3,}$/.test(l)) { sortie.push("---"); continue; }
    if (/^(cas|case)\\s*(n°|no|#)?\\s*\\d+\\s*[:.\\-—]?\\s*$/i.test(l)) continue; // « CAS 3 » seul sur sa ligne
    const m = l.match(/^([^:：]{1,45})\\s*[:：]\\s*(.*)$/);
    if (m && PLAT[plat(m[1])]) {
      const lib = PLAT[plat(m[1])];
      sortie.push(lib + " :");
      if (m[2].trim()) sortie.push(m[2].trim());
      continue;
    }
    if (PLAT[plat(l)]) { sortie.push(PLAT[plat(l)] + " :"); continue; }
    sortie.push(l);
  }
  return sortie.join("\\n").replace(/\\n{3,}/g, "\\n\\n").trim();
}

function decouper(texte) {
  const cas = []; let cur = null, cle = null;
  for (const l of texte.split("\\n")) {
    if (!l.trim() || l === "---") continue;
    const lib = l.endsWith(" :") ? l.slice(0, -2) : null;
    if (lib && LIBELLES.includes(lib)) {
      if (lib === "Titre") { cur = { champs: {}, props: [] }; cas.push(cur); }
      if (!cur) continue;
      cle = lib; cur.champs[cle] = cur.champs[cle] || []; continue;
    }
    if (!cur || !cle) continue;
    const p = l.match(/^([A-Fa-f])\\s*[.)\\-:：]\\s*(.+)$/);
    if (cle === "Propositions" && p) cur.props.push({ l: p[1].toUpperCase(), t: p[2] });
    else if (cle === "Propositions" && cur.props.length) cur.props[cur.props.length - 1].t += " " + l;
    else cur.champs[cle].push(l);
  }
  return cas;
}

function remettre(c) {
  const out = [];
  for (const lib of LIBELLES) {
    if (lib === "Propositions") { out.push("Propositions :"); c.props.forEach((p) => out.push(p.l + ". " + p.t)); continue; }
    const v = (c.champs[lib] || []).join("\\n").trim();
    if (v) { out.push(lib + " :"); out.push(v); }
  }
  return out.join("\\n");
}

$("verifier").onclick = () => {
  const x = choix();
  const cas = decouper(nettoyer($("reponse").value));
  const lignes = []; const bons = [];
  const existants = new Set((x.ch ? titresDe(x.ch) : []).map((t) => t.toLowerCase()));
  cas.forEach((c, i) => {
    const g = (k) => (c.champs[k] || []).join(" ").trim();
    const titre = g("Titre") || "(sans titre)";
    const err = []; const corr = [];
    // On impose les valeurs choisies : l'IA écrit parfois « Physiologie humaine » au lieu de « Physiologie ».
    const imposer = { "Année": x.a, "Semestre": x.s, "Matière": x.m, "Chapitre": x.c };
    for (const [k, v] of Object.entries(imposer)) { if (g(k) !== v) { if (g(k)) corr.push(k + " corrigé"); c.champs[k] = [v]; } }
    const d = (g("Difficulté").match(/⭐/g) || []).length;
    if (!d) { c.champs["Difficulté"] = ["⭐⭐"]; corr.push("difficulté mise à ⭐⭐"); }
    if (!g("Énoncé") && !g("Question")) err.push("énoncé et question manquants");
    if (c.props.length !== 4) err.push(c.props.length + " propositions au lieu de 4");
    const r = (g("Réponse correcte").match(/\\b([A-F])\\b/) || [])[1];
    if (!r) err.push("réponse correcte introuvable");
    else { c.champs["Réponse correcte"] = [r]; if (r.charCodeAt(0) - 65 >= c.props.length) err.push("la réponse " + r + " n'existe pas"); }
    if (!g("Justification")) err.push("justification manquante");
    if (existants.has(titre.toLowerCase())) err.push("titre déjà dans la banque");
    if (err.length) lignes.push('<li class="ko">Cas ' + (i + 1) + " « " + esc(titre) + " » : écarté (" + esc(err.join(", ")) + ")</li>");
    else { bons.push(c); lignes.push('<li class="ok">Cas ' + (i + 1) + " « " + esc(titre) + " » : OK" + (corr.length ? ' <span class="att">(' + esc(corr.join(", ")) + ")</span>" : "") + "</li>"); }
  });
  const lettres = bons.map((c) => c.champs["Réponse correcte"][0]);
  const max = Math.max(0, ...["A","B","C","D"].map((l) => lettres.filter((x) => x === l).length));
  const alerte = bons.length >= 5 && max > bons.length * 0.6 ? '<p class="att">Attention : la bonne réponse est presque toujours la même lettre. Demande à l\\'IA de varier.</p>' : "";
  $("rapport").innerHTML = cas.length
    ? "<p><b>" + bons.length + " cas prêts</b> sur " + cas.length + " trouvés.</p>" + alerte + '<ul class="rapport">' + lignes.join("") + "</ul>"
    : '<p class="ko">Aucun cas trouvé. Vérifie que tu as bien collé toute la réponse de l\\'IA.</p>';
  $("etape3").hidden = !bons.length;
  $("propre").value = bons.map(remettre).join("\\n\\n---\\n\\n");
  if (bons.length) {
    const k = cleChap(x.a, x.m, x.c);
    faits[k] = [...new Set((faits[k] || []).concat(bons.map((c) => (c.champs["Titre"] || []).join(" ").trim())))];
    sauverFaits(); majChapitres();
  }
};
$("copierPropre").onclick = () => copier($("propre").value, $("copieOk2"));
</script>
</body>
</html>
`;

fs.writeFileSync(sortie, html);
console.log(`${chapitres.size} chapitres, ${[...chapitres.values()].reduce((s, c) => s + c.titres.length, 0)} cas de référence, ${Object.keys(ancien).length} matières de l'ancien programme.`);
console.log(`Page créée : ${sortie}`);
