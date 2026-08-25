"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type SubStatus = {
  id: string;
  name: string;
  color: string;
  _count?: { ctos: number };
};

const PRESET_COLORS = [
  "#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#6b7280",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6",
];

export default function StatusConfigPage() {
  const [statuses, setStatuses] = useState<SubStatus[]>([]);
  const [activeCategory, setActiveCategory] = useState<"AUDITORIA" | "PROGRAMADA">("AUDITORIA");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#808080");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/status?category=${activeCategory}`);
    if (res.ok) {
      setStatuses(await res.json());
    }
    setLoading(false);
  }, [activeCategory]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const url = editingId ? `/api/status/${editingId}` : "/api/status";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, category: activeCategory })
    });

    if (res.ok) {
      setName("");
      setColor("#808080");
      setEditingId(null);
      fetchStatuses();
    } else {
      alert("Error al guardar el subestado");
    }
    setSaving(false);
  };

  const startEdit = (status: SubStatus) => {
    setEditingId(status.id);
    setName(status.name);
    setColor(status.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setColor("#808080");
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/status/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      fetchStatuses();
    } else {
      alert("Error al eliminar el subestado");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#111827" }}>Subestados y Colores</h1>
            <p style={{ color: "#6b7280", marginTop: "0.25rem" }}>Define las causas de fallo/complicaciones y sus colores en el mapa</p>
          </div>
          <Link href="/admin" className="btn" style={{ background: "#e5e7eb", color: "#374151", minHeight: "44px", padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}>
            Volver al Admin
          </Link>
        </div>

        {/* Tabs de Categorías */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem", background: "#e5e7eb", padding: "4px", borderRadius: "10px" }}>
          <button 
            type="button" 
            onClick={() => { setActiveCategory("AUDITORIA"); cancelEdit(); }}
            style={{ 
              flex: 1, padding: "12px", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer",
              background: activeCategory === "AUDITORIA" ? "#FF7900" : "transparent",
              color: activeCategory === "AUDITORIA" ? "white" : "#374151",
              fontSize: "0.9rem",
              transition: "all 0.2s"
            }}
          >
            Auditorías (Caja Normal)
          </button>
          <button 
            type="button" 
            onClick={() => { setActiveCategory("PROGRAMADA"); cancelEdit(); }}
            style={{ 
              flex: 1, padding: "12px", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer",
              background: activeCategory === "PROGRAMADA" ? "#FF7900" : "transparent",
              color: activeCategory === "PROGRAMADA" ? "white" : "#374151",
              fontSize: "0.9rem",
              transition: "all 0.2s"
            }}
          >
            Programadas (Reparos y averías)
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          
          {/* Formulario Crear/Editar */}
          <div className="glass-panel" style={{ padding: "1.5rem", background: "white", height: "fit-content" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem" }}>
              {editingId ? "Editar Subestado" : "Nuevo Subestado"} ({activeCategory === "AUDITORIA" ? "Auditoría" : "Reparos"})
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>
                  Nombre del Subestado *
                </label>
                <input 
                  type="text" 
                  required
                  className="input-field"
                  placeholder="Ej: Caja rota, Sin acceso..." 
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>
                  Color en el Mapa
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "0.75rem" }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: "32px", height: "32px", borderRadius: "50%", background: c, border: "none", cursor: "pointer",
                        boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "0 1px 3px rgba(0,0,0,0.15)",
                        transform: color === c ? "scale(1.15)" : "scale(1)",
                        transition: "all 0.15s",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <input 
                    type="color" 
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    style={{ width: "40px", height: "40px", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", padding: "2px" }}
                  />
                  <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>Color seleccionado: <strong style={{ color }}>{color}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    className="btn" 
                    style={{ flex: 1, background: "#e5e7eb", color: "#374151", minHeight: "44px" }}
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 2, minHeight: "44px" }}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : (editingId ? "Guardar Cambios" : "Crear Subestado")}
                </button>
              </div>
            </form>
          </div>

          {/* Listado de Subestados */}
          <div className="glass-panel" style={{ padding: "1.5rem", background: "white" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem" }}>Subestados Registrados</h3>
            
            {loading ? (
              <div style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>Cargando subestados...</div>
            ) : statuses.length === 0 ? (
              <div style={{ color: "#9ca3af", textAlign: "center", padding: "2rem", fontStyle: "italic" }}>No hay subestados configurados.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {statuses.map(status => (
                  <div 
                    key={status.id} 
                    style={{ 
                      display: "flex", justifyContent: "space-between", alignItems: "center", 
                      padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px",
                      background: editingId === status.id ? "#fef3c7" : "#fafafa"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: status.color, border: "2px solid white", boxShadow: "0 0 0 1px " + status.color }} />
                      <div>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{status.name}</span>
                        {status._count && (
                          <span style={{ display: "block", fontSize: "0.8rem", color: "#6b7280" }}>{status._count.ctos} CTOs asociadas</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button 
                        onClick={() => startEdit(status)}
                        style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                      >
                        Editar
                      </button>
                      
                      {deleteConfirm === status.id ? (
                        <>
                          <button 
                            onClick={() => handleDelete(status.id)}
                            style={{ padding: "4px 8px", border: "none", borderRadius: "4px", background: "#ef4444", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
                          >
                            Sí
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(null)}
                            style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirm(status.id)}
                          style={{ padding: "4px 8px", border: "1px solid #fecaca", borderRadius: "4px", background: "#fff5f5", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
