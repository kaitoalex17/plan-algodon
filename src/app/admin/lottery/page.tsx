"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Technician {
  id: string;
  name: string | null;
  email: string;
}

export default function LotteryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [zones, setZones] = useState<string[]>([]);

  // Form selections
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  // techWeights: { [userId]: number } — multiplicador de carga para el reparto
  const [techWeights, setTechWeights] = useState<Record<string, number>>({});
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [drawUnassigned, setDrawUnassigned] = useState(true);
  const [redistributeTechId, setRedistributeTechId] = useState("");

  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/lottery");
        if (res.ok) {
          const data = await res.json();
          setTechs(data.technicians || []);
          setZones(data.zones || []);
          setSelectedZones(data.zones || []);
          const allIds = (data.technicians || []).map((t: Technician) => t.id);
          setSelectedTechs(allIds);
          // Inicializar todos con peso 1
          const weights: Record<string, number> = {};
          for (const t of data.technicians || []) weights[t.id] = 1;
          setTechWeights(weights);
        } else {
          alert("Error cargando opciones de sorteo.");
        }
      } catch (err) {
        console.error("Error loading lottery page:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleTech = (id: string) => {
    setSelectedTechs(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleWeightChange = (id: string, w: number) => {
    setTechWeights(prev => ({ ...prev, [id]: w }));
  };

  const handleToggleZone = (zone: string) => {
    setSelectedZones(prev =>
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

  const runDraw = async (isDryRun: boolean) => {
    if (selectedTechs.length === 0) {
      alert("Selecciona al menos un técnico participante.");
      return;
    }
    if (!drawUnassigned && !redistributeTechId) {
      alert("Selecciona al menos un origen de reparto (CTOs sin asignar o de un técnico).");
      return;
    }

    if (isDryRun) {
      setSimulating(true);
    } else {
      if (!confirm("⚠️ ¿Estás seguro de que deseas guardar y aplicar este sorteo? Se modificarán las asignaciones de las CTOs en la base de datos.")) {
        return;
      }
      setApplying(true);
    }

    // Pasar los pesos como array de { id, weight }
    const participantsWithWeights = selectedTechs.map(id => ({
      id,
      weight: techWeights[id] ?? 1
    }));

    try {
      const res = await fetch("/api/admin/lottery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantsWithWeights,
          // compatibilidad hacia atrás
          participantIds: selectedTechs,
          zones: selectedZones,
          drawUnassigned,
          drawAssignedToId: redistributeTechId || null,
          isDryRun
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (isDryRun) {
          if (Object.keys(data.preview || {}).length === 0) {
            alert("No se encontraron CTOs pendientes que coincidan con los criterios.");
            setPreviewData(null);
          } else {
            setPreviewData(data.preview);
          }
        } else {
          alert("Sorteo aplicado con éxito.");
          router.push("/admin");
        }
      } else {
        alert(data.error || "Error al procesar el sorteo.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor al ejecutar el sorteo.");
    } finally {
      setSimulating(false);
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>
        Cargando Configurador de Sorteo...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", color: "var(--text-color)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Sorteo y Reparto de CTOs</h1>
        <Link href="/admin" className="btn btn-primary">Volver al Panel</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* Ajustes de Sorteo */}
        <div className="glass-panel" style={{ padding: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "1.25rem", fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            Ajustes del Reparto
          </h2>

          {/* Técnicos Participantes con peso */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
              Técnicos participantes y multiplicador de carga:
            </label>
            <p style={{ fontSize: "0.76rem", color: "#64748b", marginBottom: "8px" }}>
              El multiplicador (×1, ×2, ×3…) hace que un técnico reciba el doble o triple de CTOs. Útil si un perfil gestiona varias personas.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto", padding: "6px", background: "var(--bg-color)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              {techs.map(t => {
                const isSelected = selectedTechs.includes(t.id);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", padding: "4px 2px", borderRadius: "4px", background: isSelected ? "rgba(249,115,22,0.06)" : "transparent" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleTech(t.id)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)", flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, fontWeight: isSelected ? 600 : 400, color: isSelected ? "var(--text-color)" : "#94a3b8" }}>
                      {t.name || t.email}
                    </span>
                    {/* Selector de multiplicador — solo visible si está seleccionado */}
                    {isSelected && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>×</span>
                        <select
                          value={techWeights[t.id] ?? 1}
                          onChange={e => handleWeightChange(t.id, parseInt(e.target.value))}
                          style={{
                            padding: "2px 6px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            background: techWeights[t.id] > 1 ? "#fff7ed" : "var(--bg-color)",
                            color: techWeights[t.id] > 1 ? "#ea580c" : "var(--text-color)",
                            border: `1px solid ${techWeights[t.id] > 1 ? "#f97316" : "var(--border-color)"}`,
                            borderRadius: "4px",
                            cursor: "pointer",
                            minWidth: "48px"
                          }}
                          title="Multiplicador: este técnico recibirá N veces más CTOs que uno con ×1"
                        >
                          {[1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        {techWeights[t.id] > 1 && (
                          <span style={{ fontSize: "0.7rem", color: "#ea580c", fontWeight: 700, whiteSpace: "nowrap" }}>
                            ×{techWeights[t.id]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zonas a Repartir */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 700 }}>
              Zonas a incluir en el sorteo:
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "6px", background: "var(--bg-color)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              {zones.length === 0 ? (
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>No hay zonas registradas</span>
              ) : (
                zones.map(z => (
                  <label key={z} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer", background: "var(--card-bg)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                    <input
                      type="checkbox"
                      checked={selectedZones.includes(z)}
                      onChange={() => handleToggleZone(z)}
                      style={{ width: "14px", height: "14px", accentColor: "var(--primary-color)" }}
                    />
                    Zona {z}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Origen de CTOs */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 700 }}>
              Origen de las CTOs a repartir (solo PENDIENTES):
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={drawUnassigned}
                  onChange={e => setDrawUnassigned(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)" }}
                />
                Repartir CTOs sin asignar
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Redistribuir CTOs de un técnico específico:
                </label>
                <select
                  value={redistributeTechId}
                  onChange={e => setRedistributeTechId(e.target.value)}
                  className="input-field"
                  style={{ padding: "6px 12px", minHeight: "36px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
                >
                  <option value="">-- No redistribuir de ningún técnico --</option>
                  {techs.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Útil si un técnico ha dejado el proyecto y quieres reasignar sus pendientes.</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => runDraw(true)}
            className="btn btn-primary"
            style={{ width: "100%", minHeight: "44px", justifyContent: "center", fontWeight: 700 }}
            disabled={simulating}
          >
            {simulating ? "Simulando..." : "🎲 Simular Sorteo"}
          </button>
        </div>

        {/* Visualización del Resultado del Sorteo */}
        <div className="glass-panel" style={{ padding: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", display: "flex", flexDirection: "column" }}>
          <h2 style={{ marginBottom: "1.25rem", fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            Resultado de la Simulación
          </h2>

          {!previewData ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", color: "#64748b", fontStyle: "italic", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "8px", padding: "1rem" }}>
              Haz clic en "Simular Sorteo" para ver una vista previa de la distribución equitativa de CTOs.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "8px" }}>Técnico</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>Multiplicador</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>CTOs Asignadas</th>
                      <th style={{ padding: "8px" }}>Desglose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(previewData).map((p: any) => (
                      <tr key={p.userId} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "8px", fontWeight: 700 }}>{p.name}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          {p.weight && p.weight > 1 ? (
                            <span style={{ background: "#fff7ed", color: "#ea580c", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, fontSize: "0.8rem" }}>×{p.weight}</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>×1</span>
                          )}
                        </td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: "var(--primary-color)" }}>{p.ctos.length}</td>
                        <td style={{ padding: "8px" }}>
                          {Object.keys(p.counts).length === 0 ? (
                            <span style={{ color: "#64748b", fontStyle: "italic" }}>Sin subestados</span>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {Object.entries(p.counts).map(([subName, count]: any) => (
                                <span key={subName} style={{ background: "var(--bg-color)", border: "1px solid var(--border-color)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>
                                  {subName}: <strong>{count}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => runDraw(false)}
                className="btn"
                style={{ width: "100%", background: "#10b981", color: "white", fontWeight: 700, minHeight: "44px", justifyContent: "center", marginTop: "auto" }}
                disabled={applying}
              >
                {applying ? "Guardando..." : "✅ Confirmar y Aplicar Reparto"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
