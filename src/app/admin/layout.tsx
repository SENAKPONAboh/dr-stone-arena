import '@/styles/admin.css';

// Panel admin : charte Arena Malachite (classes « adm-* » de styles/admin.css + habillage arena-skin).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="arena-skin min-h-screen bg-stone">{children}</div>;
}
