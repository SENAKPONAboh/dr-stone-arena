// ===== SEUILS DES ALERTES FINANCIÈRES — Dr. Stone Arena =====
// Modifie ces valeurs pour ajuster la sensibilité des alertes.
// Volontairement centralisés ici, SANS base de données (phase F6 validée).

export const ALERT_THRESHOLDS = {
  // 📉 Baisse de CA mensuel alarmante (en % par rapport au mois précédent)
  CA_DROP_WARNING: 30,

  // 💸 Dépenses mensuelles inquiétantes (en % du CA mensuel)
  EXPENSES_RATIO_WARNING: 50,
  // (rouge automatique si dépenses > CA du mois)

  // 🎯 Objectif en retard : progression < 50% de l'avancement du mois
  GOAL_PROGRESS_RATIO: 50,

  // 🔄 Taux de non-renouvellement maximum acceptable (en %)
  CHURN_WARNING: 60,

  // ⏳ Nombre maximum de demandes en attente avant alerte
  PENDING_REQUESTS_WARNING: 5,
};

export type FinanceAlert = {
  level: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
};