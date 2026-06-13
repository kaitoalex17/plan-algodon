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
            <Link href="/admin/import" className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }}>
              📥 Importar CTOs (Excel)
            </Link>
            <Link href="/admin/ctos" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem' }}>
              ⚙️ Gestionar y Editar CTOs (Listado)
            </Link>
            <Link href="/admin/users" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem' }}>
              👥 Gestionar Usuarios
            </Link>
            <Link href="/admin/status" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', justifyContent: 'center', padding: '0.75rem' }}>
              🎨 Configurar Subestados y Colores
            </Link>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.75rem 0' }} />
            
            <a href="/api/admin/export" className="btn" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', justifyContent: 'center', padding: '0.75rem' }}>
              📊 Exportar Datos (CSV para Excel)
            </a>
            <a href="/api/admin/export-images" download className="btn" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', justifyContent: 'center', padding: '0.75rem' }}>
              📸 Descargar Evidencias de Fotos (ZIP)
            </a>
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
    </div>
  );
}
