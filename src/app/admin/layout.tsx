// Panel admin : seulement les couleurs et polices de base de la charte Arena Malachite.
// Aucune modification de mise en page, de logique ni de composants admin.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="arena-skin min-h-screen bg-stone">{children}</div>;
}
