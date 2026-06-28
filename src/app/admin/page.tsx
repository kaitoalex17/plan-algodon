"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [stats, setStats] = useState({
    usersCount: 0,
    ctosCount: 0,
    programadasCount: 0,
    auditoriaCount: 0
  });
  const [imageQuality, setImageQuality] = useState(80);
  const [imageMaxWidth, setImageMaxWidth] = useState(1600);
  
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingImages, setDeletingImages] = useState(false);
  const [deletingCtos, setDeletingCtos] = useState(false);
  const [migratingAuditors, setMigratingAuditors] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [resSummary, resSettings] = await Promise.all([
          fetch("/api/admin/summary"),
          fetch("/api/admin/settings")
        ]);
        
        if (resSummary.ok) {
          setStats(await resSummary.json());
        }
        
        if (resSettings.ok) {
          const settings = await resSettings.json();
          setImageQuality(parseInt(settings.imageQuality) || 80);
          setImageMaxWidth(parseInt(settings.imageMaxWidth) || 1600);
        }
      } catch (err) {
        console.error("Error cargando panel admin:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageQuality, imageMaxWidth })
      });
      if (res.ok) {
        alert("Ajustes de compresión de imagen guardados correctamente.");
      } else {
        alert("Error al guardar los ajustes.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor al guardar.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteAllImages = async () => {
    if (!confirm("⚠️ ¡PELIGRO! ¿Estás completamente seguro de que deseas eliminar TODAS las evidencias fotográficas? Esta acción no se puede deshacer y borrará todas las fotos físicas del servidor y de la base de datos.")) {
      return;
    }
    const confirmText = prompt("Escribe 'ELIMINAR TODO' para confirmar esta acción:");
    if (confirmText !== "ELIMINAR TODO") {
      alert("Confirmación incorrecta. Acción cancelada.");
      return;
    }

    setDeletingImages(true);
    try {
      const res = await fetch("/api/admin/delete-all-images", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Se han eliminado con éxito ${data.count || 0} imágenes de la base de datos y del disco.`);
        window.location.reload();
      } else {
        alert("Error al intentar eliminar las evidencias.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor.");
    } finally {
      setDeletingImages(false);
    }
  };

  const handleDeleteAllCtos = async () => {
    if (!confirm("⚠️ ¡PELIGRO! ¿Estás completamente seguro de que deseas eliminar TODAS las CTOs? Esta acción no se puede deshacer y borrará todas las CTOs, fotos asociadas, comentarios e historial de la base de datos.")) {
      return;
    }
    const confirmText = prompt("Escribe 'ELIMINAR CTOS' para confirmar esta acción:");
    if (confirmText !== "ELIMINAR CTOS") {
      alert("Confirmación incorrecta. Acción cancelada.");
      return;
    }

    setDeletingCtos(true);
    try {
      const res = await fetch("/api/admin/delete-all-ctos", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Se han eliminado con éxito ${data.count || 0} registros de CTOs.`);
        window.location.reload();
      } else {
        alert("Error al intentar eliminar las CTOs.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor.");
    } finally {
      setDeletingCtos(false);
    }
  };

  const handleMigrateAuditors = async () => {
    if (!confirm("¿Deseas ejecutar la migración única de datos de auditores? Esto copiará el técnico asignado al campo 'Auditado por' para todas las CTOs marcadas como CORRECTO.")) {
      return;
    }
    setMigratingAuditors(true);
    try {
      const res = await fetch("/api/admin/migrate-auditors", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || `Migración completada. Registros afectados: ${data.count}`);
      } else {
        alert("Error al realizar la migración.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor al realizar la migración.");
    } finally {
      setMigratingAuditors(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>
        Cargando Panel de Administración...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', color: 'var(--text-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Panel de Administración</h1>
        <Link href="/" className="btn btn-primary">Volver al Mapa</Link>
      </div>

      {/* Grid de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Usuarios</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{stats.usersCount}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>CTOs Totales</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{stats.ctosCount}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>CTOs Auditoría</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{stats.auditoriaCount}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>CTOs Programadas</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>{stats.programadasCount}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Acciones principales */}
        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem', fontWeight: 700 }}>Acciones de Gestión</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/admin/import" className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v14M8 13l4 4 4-4" />
              </svg>
              Importar CTOs (Excel)
            </Link>
            <Link href="/admin/ctos" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Gestionar y Editar CTOs (Listado)
            </Link>
            <Link href="/admin/users" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Gestionar Usuarios
            </Link>
            <Link href="/admin/status" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35857 19.5 5.5 20 5 21C4.5 22 5.5 22 6.5 21.5C7.5 21 8 21.1414 8.5 21.6414C9.5 22.6414 10.7255 23 12 22Z" />
                <circle cx="7.5" cy="10.5" r="1.5" />
                <circle cx="11.5" cy="7.5" r="1.5" />
                <circle cx="16.5" cy="9.5" r="1.5" />
              </svg>
              Configurar Subestados y Colores
            </Link>
            <Link href="/admin/history" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Historial de Cambios / Control
            </Link>
            <Link href="/admin/evidencia" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Evidencias Fotográficas (Organizador)
            </Link>
            <Link href="/admin/lottery" className="btn" style={{ background: 'var(--primary-color)', color: 'white', justifyContent: 'center', padding: '0.75rem', gap: '8px', fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Sorteo y Reparto de CTOs
            </Link>
            <Link href="/admin/daily-summary" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22 6 12 13 2 6" />
              </svg>
              Resumen Diario y Ajustes de Correo
            </Link>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.75rem 0' }} />
            
            <a href="/api/admin/export" className="btn" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Exportar Datos (Excel)
            </a>
            <a href="/api/admin/backup" className="btn" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Copia de Seguridad Completa (Excel)
            </a>
            <button 
              onClick={handleMigrateAuditors}
              className="btn" 
              disabled={migratingAuditors}
              style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', justifyContent: 'center', padding: '0.75rem', gap: '8px', fontWeight: 600 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M17 11l2 2 4-4" />
              </svg>
              {migratingAuditors ? "Migrando..." : "Migrar Datos (Asignar Auditores)"}
            </button>
            <a href="/api/admin/export-images" download className="btn" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', justifyContent: 'center', padding: '0.75rem', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Descargar Evidencias de Fotos (ZIP)
            </a>
            <button 
              onClick={handleDeleteAllImages}
              className="btn" 
              disabled={deletingImages}
              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', justifyContent: 'center', padding: '0.75rem', gap: '8px', fontWeight: 700 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
              {deletingImages ? "Borrando..." : "Borrar Todas las Evidencias Fotográficas"}
            </button>
            <button 
              onClick={handleDeleteAllCtos}
              className="btn" 
              disabled={deletingCtos}
              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', justifyContent: 'center', padding: '0.75rem', gap: '8px', fontWeight: 700 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
              {deletingCtos ? "Borrando CTOs..." : "Borrar Todas las CTOs de la Base de Datos"}
            </button>
          </div>
        </div>

        {/* Ajustes de compresión de imágenes */}
        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem', fontWeight: 700 }}>Ajustes de Compresión (WhatsApp HD)</h2>
          
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                Calidad de Compresión: <strong>{imageQuality}%</strong>
              </label>
              <input 
                type="range" 
                min="50" 
                max="100" 
                value={imageQuality} 
                onChange={(e) => setImageQuality(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary-color)' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recomendado: 80% para un balance óptimo de peso y claridad.</span>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                Dimensión Máxima (Ancho/Alto px):
              </label>
              <input 
                type="number" 
                className="input-field" 
                min="600" 
                max="3000" 
                value={imageMaxWidth} 
                onChange={(e) => setImageMaxWidth(parseInt(e.target.value))}
                style={{ padding: '8px 12px', minHeight: '40px', background: 'var(--card-bg)', color: 'var(--text-color)', border: '1.5px solid var(--border-color)' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recomendado: 1600px (WhatsApp HD). Las imágenes se escalarán proporcionalmente si superan este tamaño.</span>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', minHeight: '44px' }}
              disabled={savingSettings}
            >
              {savingSettings ? "Guardando..." : "💾 Guardar Ajustes"}
            </button>
          </form>
        </div>

      </div>

      <div style={{ 
        textAlign: "center", 
        fontSize: "0.75rem", 
        fontWeight: 700, 
        color: "var(--text-color)", 
        opacity: 0.6, 
        marginTop: "2rem",
        borderTop: "1px solid var(--border-color)",
        paddingTop: "1rem"
      }}>
        Plan Algodón - Versión 1.7.5
      </div>
    </div>
  );
}
