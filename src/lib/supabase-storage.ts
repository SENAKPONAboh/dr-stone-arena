// ===== SUPABASE STORAGE (reçus de paiement) — côté serveur uniquement =====
// Utilise l'API REST Storage (fetch) : aucune dépendance npm supplémentaire.
// ⚠️ SUPABASE_SERVICE_ROLE_KEY est SECRÈTE : ne jamais l'importer dans un composant client.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = 'receipts';
const SIGNED_URL_DURATION = 3600; // 1 heure

function getCredentials() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Configuration de stockage manquante (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  return { url: SUPABASE_URL, key: SERVICE_ROLE_KEY };
}

/**
 * Téléverse un reçu dans le bucket privé "receipts".
 * Renvoie le CHEMIN du fichier (ex: "user-abc123/1717171717-8a4f.png")
 * — ce chemin sera stocké dans PremiumRequest.receiptUrl (petit texte, plus de base64).
 */
export async function uploadReceipt(file: File, userId: string): Promise<string> {
  const { url, key } = getCredentials();

  // Chemin unique : dossier par utilisateur, nom horodaté + extension d'origine
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${userId}/${Date.now()}.${ext || 'png'}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: buffer,
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    console.error('Erreur upload Storage:', res.status, details);
    throw new Error("Échec de l'envoi du reçu. Réessaie.");
  }

  return path;
}

/**
 * Génère une URL signée (durée limitée) pour consulter un reçu du bucket privé.
 * À utiliser uniquement côté serveur (pages admin) — la clé n'y apparaît jamais côté client.
 */
export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  try {
    const { url, key } = getCredentials();

    const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: SIGNED_URL_DURATION }),
    });

    if (!res.ok) {
      console.error('Erreur signature URL:', res.status);
      return null;
    }

    const data = await res.json();
    // data = { signedURL: "/storage/v1/object/sign/receipts/..." }
    return `${url}${data.signedURL}`;
  } catch (e) {
    console.error('Erreur getReceiptSignedUrl:', e);
    return null;
  }
}