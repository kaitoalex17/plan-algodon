"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type SubStatus = { id: string; name: string; color: string };
type User = { id: string; name: string; email: string; color: string };

type CtoDrawerProps = {
  cto: any;
  onClose: () => void;
  onUpdate: (updatedCto: any) => void;
};

export default function CtoDrawer({ cto, onClose, onUpdate }: CtoDrawerProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [details, setDetails] = useState<any>(null);
  const [subStatuses, setSubStatuses] = useState<SubStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Form fields
  const [status, setStatus] = useState("PENDIENTE");
  const [subStatusId, setSubStatusId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [notas, setNotas] = useState("");
  const [commentText, setCommentText] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch complete details of this specific CTO
  const fetchCtoDetails = useCallback(async () => {
    if (!cto?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ctos/${cto.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
        setStatus(data.status || "PENDIENTE");
        setSubStatusId(data.subStatusId || "");
        setAssignedToId(data.assignedToId || "");
        setNotas(data.notas || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [cto?.id]);

  // Fetch dropdown options (substatuses and users)
  const fetchOptions = useCallback(async () => {
    try {
      const [resSub, resUsers] = await Promise.all([
        fetch("/api/status"),
        isAdmin ? fetch("/api/users") : Promise.resolve(null),
      ]);
      
      if (resSub.ok) setSubStatuses(await resSub.ok ? await resSub.json() : []);
      if (resUsers?.ok) setUsers(await resUsers.json());
    } catch (e) {
      console.error(e);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (cto) {
      fetchCtoDetails();
      fetchOptions();
    } else {
      setDetails(null);
    }
  }, [cto, fetchCtoDetails, fetchOptions]);

  if (!cto) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/ctos/${cto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          subStatusId: subStatusId || null,
          assignedToId: assignedToId || null,
          notas,
          commentText,
        }),
      });

      if (res.ok) {
        setCommentText(""); // Reset comment field
        const updated = await res.json();
        
        // Buscamos si hay substatus asociado en la lista local para enviarle el objeto completo al mapa
        const sub = subStatuses.find(s => s.id === subStatusId);
        const assigned = users.find(u => u.id === assignedToId);
        
        const fullUpdatedCto = {
          ...cto,
          status,
          subStatusId: subStatusId || null,
          subStatus: sub || null,
          assignedToId: assignedToId || null,
          assignedTo: assigned || null,
          notas,
        };

        onUpdate(fullUpdatedCto);
        fetchCtoDetails(); // Refrescar detalles de comentarios/historial
        alert("CTO guardada correctamente");
      } else {
        alert("Error al guardar los cambios");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("ctoId", cto.id);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert(`Se han subido ${files.length} imágenes correctamente`);
        fetchCtoDetails(); // Refrescar para mostrar las nuevas imágenes
      } else {
        alert("Error al subir las imágenes");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor de subida");
    } finally {
      setUploading(false);
    }
  };

  const openGoogleMaps = () => {
    window.open(`https://maps.google.com/?q=${cto.lat},${cto.lng}`, "_blank");
  };

  const openCtoTracker = () => {
    window.open(`https://cto-tracker.olin.es/cto/${cto.num}`, "_blank");
  };

  return (
    <>
      <div 
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} 
        onClick={onClose}
      />
      <div className="cto-drawer open">
        <div className="drawer-handle" />
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>CTO: {cto.num}</h2>
            {cto.numeroNuevo && <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>Nº Nuevo: {cto.numeroNuevo}</p>}
          </div>
          <span style={{ 
            padding: "6px 14px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700,
            background: status === "CORRECTO" ? "#d1fae5" : status === "FALLO" ? "#fee2e2" : "#f3f4f6",
            color: status === "CORRECTO" ? "#065f46" : status === "FALLO" ? "#991b1b" : "#374151"
          }}>
            {status}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Cargando información...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Ubicación y Enlaces */}
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: "4px 0", fontSize: "0.95rem" }}><strong>Municipio:</strong> {cto.municipio || "N/A"}</p>
              <p style={{ margin: "4px 0", fontSize: "0.95rem" }}><strong>Colocación:</strong> {cto.colocacion || "N/A"}</p>
              <p style={{ margin: "4px 0", fontSize: "0.95rem" }}><strong>Coordenadas:</strong> {cto.lat.toFixed(6)}, {cto.lng.toFixed(6)}</p>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                <button onClick={openGoogleMaps} className="btn btn-primary" style={{ flex: 1, minHeight: "44px", fontSize: "0.9rem", padding: "8px" }}>
                  Google Maps
                </button>
                <button onClick={openCtoTracker} className="btn" style={{ flex: 1, minHeight: "44px", background: "#1e293b", color: "white", fontSize: "0.9rem", padding: "8px" }}>
                  CTO Tracker
                </button>
              </div>
            </div>

            {/* Formulario de Auditoría */}
            <form onSubmit={handleSave} style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Auditar CTO</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Estado General</label>
                  <select 
                    className="input-field" 
                    value={status} 
                    onChange={e => {
                      setStatus(e.target.value);
                      if (e.target.value === "PENDIENTE") setSubStatusId("");
                    }}
                    style={{ padding: "8px 12px", minHeight: "44px" }}
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="CORRECTO">CORRECTO</option>
                    <option value="FALLO">FALLO</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Subestado</label>
                  <select 
                    className="input-field" 
                    value={subStatusId} 
                    onChange={e => setSubStatusId(e.target.value)}
                    disabled={status === "PENDIENTE"}
                    style={{ padding: "8px 12px", minHeight: "44px" }}
                  >
                    <option value="">Ninguno</option>
                    {subStatuses.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Asignar Técnico</label>
                  <select 
                    className="input-field" 
                    value={assignedToId} 
                    onChange={e => setAssignedToId(e.target.value)}
                    style={{ padding: "8px 12px", minHeight: "44px" }}
                  >
                    <option value="">Sin asignar</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Notas Generales (Persistente)</label>
                <textarea 
                  className="input-field" 
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Notas internas sobre esta CTO..." 
                  style={{ minHeight: "60px", padding: "8px 12px", resize: "vertical" }}
                />
              </div>

              {/* Subida de Fotos */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Evidencias Fotográficas</label>
                <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px", marginBottom: "8px" }}>
                  {details?.images && details.images.length > 0 ? (
                    details.images.map((img: any) => (
                      <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, position: "relative" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={img.url} 
                          alt="Evidencia" 
                          style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }} 
                        />
                      </a>
                    ))
                  ) : (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic", margin: "10px 0" }}>No hay fotos registradas</p>
                  )}
                </div>

                <label className="btn" style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", cursor: "pointer", display: "inline-flex", minHeight: "40px", padding: "6px 12px", fontSize: "0.85rem", width: "100%", justifyContent: "center" }}>
                  {uploading ? "Subiendo..." : "📸 Subir Nuevas Fotos"}
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    disabled={uploading}
                    style={{ display: "none" }} 
                    onChange={handleImageUpload} 
                  />
                </label>
              </div>

              {/* Escribir Comentario */}
              <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "1rem", marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Añadir Comentario rápido al Historial</label>
                <textarea 
                  className="input-field" 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Escribe comentarios de la visita..." 
                  style={{ minHeight: "50px", padding: "8px 12px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: "#cbd5e1", color: "#334155" }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                  {saving ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
              </div>
            </form>

            {/* Muro de Comentarios */}
            {details?.comments && details.comments.length > 0 && (
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem", marginTop: "1rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#334155" }}>Comentarios anteriores</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "200px", overflowY: "auto" }}>
                  {details.comments.map((comm: any) => (
                    <div key={comm.id} style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>
                        <strong style={{ color: comm.user?.color || "inherit" }}>{comm.user?.name || "Técnico"}</strong>
                        <span>{new Date(comm.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", margin: 0, color: "#334155", whiteSpace: "pre-wrap" }}>{comm.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial de Cambios */}
            {details?.history && details.history.length > 0 && (
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem", marginTop: "1rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#334155" }}>Historial de auditoría</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
                  {details.history.map((hist: any) => (
                    <div key={hist.id} style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #f1f5f9", paddingBottom: "4px" }}>
                      <span><strong>{hist.user?.name || "Sistema"}:</strong> {hist.action}</span>
                      <span style={{ fontSize: "0.7rem", flexShrink: 0, marginLeft: "10px" }}>{new Date(hist.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}
