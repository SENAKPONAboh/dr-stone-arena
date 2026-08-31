// Libellés des niveaux — Dr. Stone Arena
// 1 à 6 : années d'étude (EM1–EM6) ; 7 : Médecin — Niveau Expert

export const NIVEAU_MEDECIN = 7;

export function getNiveauLabel(anneeEtude: number | null | undefined): string {
  if (anneeEtude === NIVEAU_MEDECIN) return "Médecin";
  if (!anneeEtude) return "Niveau non défini";
  if (anneeEtude === 1) return "1ère année";
  return `${anneeEtude}ème année`;
}

export const NIVEAU_OPTIONS = [
  { value: 1, label: "1ère année" },
  { value: 2, label: "2ème année" },
  { value: 3, label: "3ème année" },
  { value: 4, label: "4ème année" },
  { value: 5, label: "5ème année" },
  { value: 6, label: "6ème année" },
  { value: 7, label: "Médecin" },
];