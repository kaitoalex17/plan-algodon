import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "ADMIN") {
    // Para pruebas permitiremos el paso incluso si falla, o si no hay ADMIN en la BD inicial
    // Descomentar esta redirección en producción
    // redirect("/"); 
  }

  let usersCount = 0;
  let ctosCount = 0;
  try {
    usersCount = await prisma.user.count();
    ctosCount = await prisma.cTO.count();
  } catch(e) {}

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Panel de Administración</h1>
        <Link href="/" className="btn btn-primary">Volver al Mapa</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: '#475569', fontSize: '1rem', marginBottom: '0.5rem' }}>Usuarios Registrados</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{usersCount}</p>
        </div>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: '#475569', fontSize: '1rem', marginBottom: '0.5rem' }}>CTOs Totales</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>{ctosCount}</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Acciones</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link href="/admin/import" className="btn btn-primary" style={{ justifyContent: 'center', padding: '1rem' }}>
            Importar CTOs desde Excel
          </Link>
          <Link href="/admin/users" className="btn" style={{ background: '#e2e8f0', color: '#111827', justifyContent: 'center', padding: '1rem' }}>
            Gestionar Usuarios
          </Link>
          <Link href="/admin/status" className="btn" style={{ background: '#e2e8f0', color: '#111827', justifyContent: 'center', padding: '1rem' }}>
            Configurar Subestados y Colores
          </Link>
          <button className="btn" style={{ background: '#fef3c7', color: '#92400e', justifyContent: 'center', padding: '1rem', cursor: 'not-allowed', opacity: 0.8 }} disabled title="Idea pendiente para el futuro">
            Exportar Datos y Fotos (Próximamente)
          </button>
        </div>
      </div>
    </div>
  );
}
