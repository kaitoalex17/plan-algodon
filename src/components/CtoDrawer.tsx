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
  
  // Nuevos campos de auditoría de fibra
  const [puertosTotal, setPuertosTotal] = useState<number | string>(16);
  const [puertosOcupados, setPuertosOcupados] = useState<number | string>(0);
  const [potenciaDbm, setPotenciaDbm] = useState<number | string>("");
  const [cierreSeguridad, setCierreSeguridad] = useState(true);
  const [etiquetadoCorrecto, setEtiquetadoCorrecto] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // States for toggles, progress and gallery
  const [showFiberDetails, setShowFiberDetails] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState<number | null>(null);
  const [cacheKey, setCacheKey] = useState(Date.now());

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
        
        // Cargar nuevos campos de fibra
        setPuertosTotal(data.puertosTotal !== null ? data.puertosTotal : 16);
        setPuertosOcupados(data.puertosOcupados !== null ? data.puertosOcupados : 0);
        setPotenciaDbm(data.potenciaDbm !== null ? data.potenciaDbm : "");
        setCierreSeguridad(data.cierreSeguridad !== null ? data.cierreSeguridad : true);
        setEtiquetadoCorrecto(data.etiquetadoCorrecto !== null ? data.etiquetadoCorrecto : true);
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
      
      if (resSub.ok) setSubStatuses(await resSub.json());
      if (resUsers?.ok) setUsers(await resUsers.json());
    } catch (e) {
      console.error(e);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (cto) {
      fetchCtoDetails();
      fetchOptions();
      setShowFiberDetails(false); // Reset on cto change
      setShowGallery(false);
      setActiveImgIndex(null);
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
          puertosTotal: puertosTotal !== "" ? parseInt(String(puertosTotal)) : null,
          puertosOcupados: puertosOcupados !== "" ? parseInt(String(puertosOcupados)) : null,
          potenciaDbm: potenciaDbm !== "" ? parseFloat(String(potenciaDbm)) : null,
          cierreSeguridad: true,
          etiquetadoCorrecto: true,
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
          puertosTotal: puertosTotal !== "" ? parseInt(String(puertosTotal)) : null,
          puertosOcupados: puertosOcupados !== "" ? parseInt(String(puertosOcupados)) : null,
          potenciaDbm: potenciaDbm !== "" ? parseFloat(String(potenciaDbm)) : null,
          cierreSeguridad: true,
          etiquetadoCorrecto: true,
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

  // Upload pictures with real percentage progress
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("ctoId", cto.id);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      setUploadProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        alert(`Se han subido ${files.length} imágenes correctamente`);
        fetchCtoDetails(); // Refrescar para mostrar las nuevas imágenes
      } else {
        alert("Error al subir las imágenes");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploadProgress(null);
      alert("Error al conectar con el servidor de subida");
    };

    xhr.send(formData);
  };

  const handleRotateImage = async (imageId: string, direction: "left" | "right") => {
    try {
      const res = await fetch("/api/uploads/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, direction })
      });
      if (res.ok) {
        setCacheKey(Date.now());
        fetchCtoDetails();
      } else {
        alert("Error al rotar la imagen");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta imagen de forma permanente?")) return;
    try {
      const res = await fetch("/api/uploads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId })
      });
      if (res.ok) {
        alert("Imagen eliminada correctamente");
        if (activeImgIndex !== null) {
          const remaining = (details?.images || []).filter((i: any) => i.id !== imageId);
          if (remaining.length === 0) {
            setActiveImgIndex(null);
          } else {
            setActiveImgIndex(Math.max(0, activeImgIndex - 1));
          }
        }
        fetchCtoDetails();
      } else {
        alert("Error al eliminar la imagen");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openGoogleMaps = () => {
    window.open(`https://maps.google.com/?q=${cto.lat},${cto.lng}`, "_blank");
  };

  const openCtoTracker = () => {
    window.open(`https://cto-tracker.olin.es/cto/${cto.num}`, "_blank");
  };

  // Filter substatuses matching current CTO's category
  const filteredSubStatuses = subStatuses.filter(
    sub => (sub as any).category === cto.category
  );

  const isProgramada = cto.category === "PROGRAMADA";
  const displayStatus = status === "REVISADO" ? "REVISADO" : status;

  return (
    <>
      <div 
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} 
        onClick={onClose}
      />
      <div className="cto-drawer open">
        <div className="drawer-handle" />
        
        {/* Botón de cierre en esquina superior derecha */}
        <button 
          type="button"
          onClick={onClose} 
          title="Cerrar"
          style={{ 
            position: "absolute", top: "16px", right: "20px", background: "var(--border-color)", 
            border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", 
            alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, 
            color: "var(--text-color)", cursor: "pointer", zIndex: 10 
          }}
        >
          ✕
        </button>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>CTO: {cto.num}</h2>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
              {cto.numeroNuevo && <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Nº Nuevo: {cto.numeroNuevo}</span>}
              <span style={{ fontSize: "0.75rem", background: "var(--border-color)", color: "var(--text-color)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                {isProgramada ? "PROGRAMADA" : "AUDITORIA"}
              </span>
            </div>
          </div>
          <span style={{ 
            padding: "6px 14px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700,
            background: displayStatus === "CORRECTO" || displayStatus === "REVISADO" ? "#d1fae5" : displayStatus === "FALLO" ? "#fee2e2" : "#f3f4f6",
            color: displayStatus === "CORRECTO" || displayStatus === "REVISADO" ? "#065f46" : displayStatus === "FALLO" ? "#991b1b" : "#374151"
          }}>
            {displayStatus}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Cargando información...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Ubicación y Enlaces */}
            <div style={{ padding: "1rem", background: "var(--bg-color)", borderRadius: "10px", border: "1px solid var(--border-color)", color: "var(--text-color)" }}>
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
            <form onSubmit={handleSave} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-color)" }}>Auditar CTO</h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  {/* Botón Info (i de Iconoir) */}
                  <button
                    type="button"
                    onClick={() => setShowFiberDetails(!showFiberDetails)}
                    title="Ver detalles de fibra"
                    style={{
                      background: showFiberDetails ? "var(--primary-color)" : "var(--border-color)",
                      color: showFiberDetails ? "white" : "var(--text-color)",
                      border: "none",
                      borderRadius: "8px",
                      width: "38px",
                      height: "38px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </button>
                  
                  {/* Botón Comentarios (Burbuja de diálogo de Iconoir) */}
                  <button
                    type="button"
                    onClick={() => setShowCommentsModal(true)}
                    title="Seguimiento de Comentarios e Historial"
                    style={{
                      background: "var(--border-color)",
                      color: "var(--text-color)",
                      border: "none",
                      borderRadius: "8px",
                      width: "38px",
                      height: "38px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Estado General</label>
                  <select 
                    className="input-field" 
                    value={status} 
                    onChange={e => {
                      setStatus(e.target.value);
                      if (e.target.value === "PENDIENTE") setSubStatusId("");
                    }}
                    style={{ padding: "8px 12px", minHeight: "44px", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                  >
                    {isProgramada ? (
                      <>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="REVISADO">REVISADO</option>
                        <option value="FALLO">FALLO</option>
                      </>
                    ) : (
                      <>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="CORRECTO">CORRECTO</option>
                        <option value="FALLO">FALLO</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Subestado</label>
                  <select 
                    className="input-field" 
                    value={subStatusId} 
                    onChange={e => setSubStatusId(e.target.value)}
                    disabled={status === "PENDIENTE"}
                    style={{ padding: "8px 12px", minHeight: "44px", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                  >
                    <option value="">Ninguno</option>
                    {filteredSubStatuses.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nuevos Datos de Fibra (Bajo botón i) */}
              {showFiberDetails && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "1rem", background: "var(--bg-color)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>P. Totales</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={puertosTotal} 
                      onChange={e => setPuertosTotal(e.target.value)}
                      placeholder="16"
                      style={{ padding: "8px 12px", minHeight: "44px", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>P. Ocupados</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={puertosOcupados} 
                      onChange={e => setPuertosOcupados(e.target.value)}
                      placeholder="0"
                      style={{ padding: "8px 12px", minHeight: "44px", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Potencia (dBm)</label>
                    <input 
                      type="number" 
                      step="any"
                      className="input-field" 
                      value={potenciaDbm} 
                      onChange={e => setPotenciaDbm(e.target.value)}
                      placeholder="-19.5"
                      style={{ padding: "8px 12px", minHeight: "44px", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                    />
                  </div>
                </div>
              )}

              {isAdmin && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Asignar Técnico</label>
                  <select 
                    className="input-field" 
                    value={assignedToId} 
                    onChange={e => setAssignedToId(e.target.value)}
                    style={{ padding: "8px 12px", minHeight: "44px", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                  >
                    <option value="">Sin asignar</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Notas Generales (Persistente)</label>
                <textarea 
                  className="input-field" 
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Notas internas sobre esta CTO..." 
                  style={{ minHeight: "60px", padding: "8px 12px", resize: "vertical", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                />
              </div>

              {/* Subida de Fotos */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Evidencias Fotográficas</label>
                <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px", marginBottom: "8px" }}>
                  {details?.images && details.images.length > 0 ? (
                    details.images.map((img: any, idx: number) => (
                      <div 
                        key={img.id} 
                        onClick={() => {
                          setShowGallery(true);
                          setActiveImgIndex(idx);
                        }} 
                        style={{ flexShrink: 0, position: "relative", cursor: "pointer" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`${img.url}?t=${cacheKey}`} 
                          alt="Evidencia" 
                          style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border-color)" }} 
                        />
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "var(--text-color)", opacity: 0.7, fontSize: "0.85rem", fontStyle: "italic", margin: "10px 0" }}>No hay fotos registradas</p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <label className="btn" style={{ flex: 2, background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)", cursor: "pointer", display: "inline-flex", minHeight: "40px", padding: "6px 12px", fontSize: "0.85rem", justifyContent: "center", alignItems: "center" }}>
                    {uploading ? "Subiendo..." : "📸 Subir Fotos"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      disabled={uploading}
                      style={{ display: "none" }} 
                      onChange={handleImageUpload} 
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGallery(true)}
                    className="btn"
                    style={{
                      flex: 1, background: "var(--border-color)", color: "var(--text-color)",
                      border: "none", borderRadius: "8px", minHeight: "40px", padding: "6px 12px",
                      fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "4px", cursor: "pointer"
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    Galería
                  </button>
                </div>
              </div>

              {/* Escribir Comentario rápido */}
              <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "1rem", marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Añadir Comentario rápido al Historial</label>
                <textarea 
                  className="input-field" 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Escribe comentarios de la visita..." 
                  style={{ minHeight: "50px", padding: "8px 12px", resize: "vertical", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: "var(--border-color)", color: "var(--text-color)" }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                  {saving ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
              </div>
            </form>

          </div>
        )}
      </div>

      {/* MODAL DE COMENTARIOS A PANTALLA COMPLETA */}
      {showCommentsModal && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 3000, display: "flex", flexDirection: "column", padding: "16px", overflow: "hidden" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-color)" }}>
              💬 Comentarios e Historial - CTO {cto.num}
            </h2>
            <button
              type="button"
              onClick={() => setShowCommentsModal(false)}
              className="btn"
              style={{
                minHeight: "36px", padding: "6px 12px", background: "var(--border-color)", color: "var(--text-color)",
                borderRadius: "8px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="scrollable-content" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", paddingBottom: "24px" }}>
            {/* Sección Escribir nuevo comentario */}
            <div style={{ background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-color)" }}>
                Añadir nuevo comentario:
              </label>
              <textarea
                className="input-field"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Escribe comentarios sobre esta visita o estado de la CTO..."
                style={{ minHeight: "100px", padding: "12px", resize: "vertical", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)", marginBottom: "10px" }}
              />
              <button
                type="button"
                onClick={async () => {
                  if (!commentText.trim()) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/ctos/${cto.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ commentText }),
                    });
                    if (res.ok) {
                      setCommentText("");
                      fetchCtoDetails();
                    } else {
                      alert("Error al guardar el comentario");
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setSaving(false);
                  }
                }}
                className="btn btn-primary"
                style={{ width: "100%", minHeight: "44px" }}
                disabled={saving || !commentText.trim()}
              >
                {saving ? "Guardando..." : "Enviar Comentario"}
              </button>
            </div>

            {/* Muro de Comentarios */}
            <div style={{ background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--text-color)" }}>
                Muro de Comentarios ({details?.comments?.length || 0})
              </h3>
              {details?.comments && details.comments.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {details.comments.map((comm: any) => (
                    <div key={comm.id} style={{ background: "var(--bg-color)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-color)", opacity: 0.7, marginBottom: "6px" }}>
                        <strong style={{ color: comm.user?.color || "inherit" }}>{comm.user?.name || "Técnico"}</strong>
                        <span>{new Date(comm.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: "0.88rem", margin: 0, color: "var(--text-color)", whiteSpace: "pre-wrap" }}>{comm.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-color)", opacity: 0.7, fontSize: "0.85rem", fontStyle: "italic", margin: 0 }}>
                  No hay comentarios registrados
                </p>
              )}
            </div>

            {/* Historial de Cambios */}
            <div style={{ background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--text-color)" }}>
                Historial de Cambios ({details?.history?.length || 0})
              </h3>
              {details?.history && details.history.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {details.history.map((hist: any) => (
                    <div key={hist.id} style={{ fontSize: "0.8rem", color: "var(--text-color)", opacity: 0.8, display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-color)", paddingBottom: "6px" }}>
                      <span><strong>{hist.user?.name || "Sistema"}:</strong> {hist.action}</span>
                      <span style={{ fontSize: "0.75rem", flexShrink: 0, marginLeft: "10px" }}>
                        {new Date(hist.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-color)", opacity: 0.7, fontSize: "0.85rem", fontStyle: "italic", margin: 0 }}>
                  No hay historial registrado
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* POPUP DE PROGRESO DE SUBIDA */}
      {uploadProgress !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "90%", maxWidth: "320px", padding: "1.5rem", background: "var(--card-bg)", textAlign: "center" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "var(--text-color)" }}>Subiendo Evidencias...</h4>
            <div style={{ background: "var(--border-color)", height: "8px", borderRadius: "4px", width: "100%", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ background: "var(--primary-color)", height: "100%", width: `${uploadProgress}%`, transition: "width 0.1s" }} />
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-color)" }}>{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* MODAL DE LA GALERÍA COMPLETA */}
      {showGallery && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2999, display: "flex", flexDirection: "column", padding: "16px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-color)" }}>
              🖼️ Galería de Evidencias - CTO {cto.num}
            </h2>
            <button
              type="button"
              onClick={() => setShowGallery(false)}
              className="btn"
              style={{
                minHeight: "36px", padding: "6px 12px", background: "var(--border-color)", color: "var(--text-color)",
                borderRadius: "8px", cursor: "pointer", fontWeight: 700
              }}
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Grid de imágenes */}
          <div className="scrollable-content" style={{ flex: 1, overflowY: "auto" }}>
            {details?.images && details.images.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", paddingBottom: "20px" }}>
                {details.images.map((img: any, idx: number) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImgIndex(idx)}
                    style={{ position: "relative", cursor: "pointer", borderRadius: "8px", overflow: "hidden", border: "1.5px solid var(--border-color)", aspectRatio: "1/1" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${img.url}?t=${cacheKey}`}
                      alt={`Evidencia ${idx}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-color)", opacity: 0.7 }}>
                <p style={{ fontStyle: "italic" }}>No hay fotos registradas para esta CTO.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISOR LIGHTBOX DE IMAGEN A PANTALLA COMPLETA */}
      {activeImgIndex !== null && details?.images && details.images[activeImgIndex] && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 5000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", color: "white", zIndex: 10 }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Foto {activeImgIndex + 1} de {details.images.length}
            </span>
            <button
              type="button"
              onClick={() => setActiveImgIndex(null)}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>

          {/* Central Image Viewer with Navigation */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "0 10px" }}>
            {/* Arrow Left */}
            <button
              type="button"
              onClick={() => setActiveImgIndex(prev => (prev !== null && prev > 0 ? prev - 1 : (details.images.length - 1)))}
              style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: "44px", height: "44px", borderRadius: "50%", cursor: "pointer", zIndex: 10 }}
            >
              ◀
            </button>

            {/* Image Container */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${details.images[activeImgIndex].url}?t=${cacheKey}`}
                alt="Visor"
                style={{ maxHeight: "80vh", maxWidth: "100%", objectFit: "contain", borderRadius: "8px", transition: "transform 0.2s" }}
              />
            </div>

            {/* Arrow Right */}
            <button
              type="button"
              onClick={() => setActiveImgIndex(prev => (prev !== null && prev < details.images.length - 1 ? prev + 1 : 0))}
              style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: "44px", height: "44px", borderRadius: "50%", cursor: "pointer", zIndex: 10 }}
            >
              ▶
            </button>
          </div>

          {/* Action Footer (Rotate, Delete, Download) */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", padding: "24px 16px", background: "rgba(0,0,0,0.8)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            {/* Rotar Izquierda */}
            <button
              type="button"
              onClick={() => handleRotateImage(details.images[activeImgIndex].id, "left")}
              title="Girar a la izquierda"
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 15a3.99 3.99 0 0 0-4-4H4M4 11l3-3M4 11l3 3" />
                <path d="M12 2a10 10 0 0 1 10 10c0 2.21-.9 4.21-2.34 5.66" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Girar Izq</span>
            </button>

            {/* Rotar Derecha */}
            <button
              type="button"
              onClick={() => handleRotateImage(details.images[activeImgIndex].id, "right")}
              title="Girar a la derecha"
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15a3.99 3.99 0 0 1 4-4h6M20 11l-3-3M20 11l-3 3" />
                <path d="M12 2a10 10 0 0 0-10 10c0 2.21.9 4.21 2.34 5.66" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Girar Der</span>
            </button>

            {/* Descargar */}
            <a
              href={details.images[activeImgIndex].url}
              download={`CTO_${cto.num}_imagen_${activeImgIndex + 1}.jpg`}
              title="Descargar imagen"
              style={{ textDecoration: "none", color: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 21h12M12 3v14M12 17l-5-5M12 17l5-5" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Descargar</span>
            </a>

            {/* Borrar */}
            <button
              type="button"
              onClick={() => handleDeleteImage(details.images[activeImgIndex].id)}
              title="Eliminar imagen"
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Eliminar</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
