"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type HistoryItem = {
  id: string;
  action: string;
  timestamp: string;
  cto: { num: string; id: string } | null;
  user: { name: string | null; email: string };
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        search: search,
        limit: "50"
      });
      const res = await fetch(`/api/admin/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error("Error al cargar el historial:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', color: 'var(--text-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Historial de Cambios y Control</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Seguimiento en tiempo real de quién ha modificado cada CTO</p>
        </div>
        <Link href="/admin" className="btn" style={{ background: '#e2e8f0', color: '#333', fontWeight: 700 }}>Volver al Admin</Link>
      </div>

      {/* Buscador */}
      <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por código CTO, nombre de técnico, email o acción..."
            value={search}
            onChange={handleSearchChange}
            style={{ padding: '10px 14px', flex: 1, minHeight: '44px' }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setCurrentPage(1); }}
              style={{ background: 'transparent', border: 'none', position: 'absolute', right: '16px', top: '12px', cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="glass-panel" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando logs de auditoría...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No se encontraron registros de cambios.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-color)', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Fecha y Hora</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Técnico / Usuario</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>CTO</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Acciones Realizadas</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', color: '#475569' }}>
                      {new Date(item.timestamp).toLocaleString("es-ES")}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{item.user?.name || "Sin Nombre"}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.user?.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {item.cto ? (
                        <span style={{ fontWeight: 700, color: 'var(--primary-color)', background: '#fff7ed', border: '1px solid #ffedd5', padding: '4px 8px', borderRadius: '6px' }}>
                          {item.cto.num}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Eliminada</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', lineHeight: 1.4 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {item.action.split(' | ').map((act, i) => (
                          <span key={i} style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Mostrando {history.length} de {totalCount} logs (Página {currentPage} de {totalPages})
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn"
              style={{ padding: '8px 16px', background: currentPage === 1 ? '#e2e8f0' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', border: '1px solid var(--border-color)', fontWeight: 700 }}
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn"
              style={{ padding: '8px 16px', background: currentPage === totalPages ? '#e2e8f0' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', border: '1px solid var(--border-color)', fontWeight: 700 }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
