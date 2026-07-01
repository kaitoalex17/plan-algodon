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
  const [zona, setZona] = useState("");
  const [cluster, setCluster] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // States for checklist, programada and checklist modal
  const [hasFormulario, setHasFormulario] = useState(false);
  const [hasDrive, setHasDrive] = useState(false);
  const [hasAntala, setHasAntala] = useState(false);
  const [isProgramada, setIsProgramada] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checkFormulario, setCheckFormulario] = useState(false);
  const [checkDrive, setCheckDrive] = useState(false);
  const [checkAntala, setCheckAntala] = useState(false);

  // States for toggles, progress and gallery
  const [showFiberDetails, setShowFiberDetails] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; loaded: number; total: number } | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState<number | null>(null);
  const [cacheKey, setCacheKey] = useState(Date.now());
  const [zoomScale, setZoomScale] = useState(1);
  const [showFormSheetModal, setShowFormSheetModal] = useState(false);
  const [deletingForm, setDeletingForm] = useState(false);

  const handleDeleteForm = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar permanentemente el cuestionario de esta CTO? Esto también borrará los datos del formulario guardados.")) return;
    setDeletingForm(true);
    try {
      const res = await fetch(`/api/ctos/${cto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formDataJson: null,
          hasFormulario: false
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setDetails(updated);
        setHasFormulario(false);
        onUpdate(updated);
        alert("Cuestionario eliminado correctamente.");
        setShowFormSheetModal(false);
      } else {
        alert("Error al eliminar el cuestionario.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el servidor.");
    } finally {
      setDeletingForm(false);
    }
  };

  const [fetchingFormSheet, setFetchingFormSheet] = useState(false);

  const handleOpenFormSheet = async () => {
    if (!cto?.id) return;
    setFetchingFormSheet(true);
    try {
      const res = await fetch(`/api/ctos/${cto.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
        setHasFormulario(data.hasFormulario);
      }
    } catch (err) {
      console.error("Error al refrescar ficha formulario:", err);
    } finally {
      setFetchingFormSheet(false);
      setShowFormSheetModal(true);
    }
  };

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
        setZona(data.zona || "");
        setCluster(data.cluster || "");
        
        // Cargar nuevos campos de fibra
        setPuertosTotal(data.puertosTotal !== null ? data.puertosTotal : 16);
        setPuertosOcupados(data.puertosOcupados !== null ? data.puertosOcupados : 0);
        setPotenciaDbm(data.potenciaDbm !== null ? data.potenciaDbm : "");
        setCierreSeguridad(data.cierreSeguridad !== null ? data.cierreSeguridad : true);
        setEtiquetadoCorrecto(data.etiquetadoCorrecto !== null ? data.etiquetadoCorrecto : true);
        setHasFormulario(data.hasFormulario || false);
        setHasDrive(data.hasDrive || false);
        setHasAntala(data.hasAntala || false);
        setIsProgramada(data.category === "PROGRAMADA");
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

  const saveCto = async (targetStatus: string, targetAssignedToId: string | null, extraData: any = {}) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ctos/${cto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          subStatusId: subStatusId || null,
          assignedToId: targetAssignedToId || null,
          notas,
          commentText,
          puertosTotal: puertosTotal !== "" ? parseInt(String(puertosTotal)) : null,
          puertosOcupados: puertosOcupados !== "" ? parseInt(String(puertosOcupados)) : null,
          potenciaDbm: potenciaDbm !== "" ? parseFloat(String(potenciaDbm)) : null,
          cierreSeguridad: true,
          etiquetadoCorrecto: true,
          zona: zona || null,
          cluster: cluster || null,
          category: isProgramada ? "PROGRAMADA" : "AUDITORIA",
          hasFormulario,
          hasDrive,
          hasAntala,
          ...extraData
        }),
      });

      if (res.ok) {
        setCommentText(""); // Reset comment field
        const updated = await res.json();
        
        // Buscamos si hay substatus asociado en la lista local para enviarle el objeto completo al mapa
        const sub = subStatuses.find(s => s.id === subStatusId);
        const assigned = users.find(u => u.id === targetAssignedToId);
        
        const fullUpdatedCto = {
          ...cto,
          status: targetStatus,
          subStatusId: subStatusId || null,
          subStatus: sub || null,
          assignedToId: targetAssignedToId || null,
          assignedTo: assigned || null,
          notas,
          puertosTotal: puertosTotal !== "" ? parseInt(String(puertosTotal)) : null,
          puertosOcupados: puertosOcupados !== "" ? parseInt(String(puertosOcupados)) : null,
          potenciaDbm: potenciaDbm !== "" ? parseFloat(String(potenciaDbm)) : null,
          cierreSeguridad: true,
          etiquetadoCorrecto: true,
          zona: zona || null,
          cluster: cluster || null,
          category: isProgramada ? "PROGRAMADA" : "AUDITORIA",
          hasFormulario: extraData.hasFormulario !== undefined ? extraData.hasFormulario : hasFormulario,
          hasDrive: extraData.hasDrive !== undefined ? extraData.hasDrive : hasDrive,
          hasAntala: extraData.hasAntala !== undefined ? extraData.hasAntala : hasAntala,
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCto(status, assignedToId);
  };

  const handleCerrarYGuardar = () => {
    setCheckFormulario(hasFormulario);
    setCheckDrive(hasDrive);
    setCheckAntala(hasAntala);
    setShowChecklistModal(true);
  };

  const handleConfirmChecklist = async () => {
    const currentUserId = (session?.user as any)?.id;
    const activeSubStatus = subStatuses.find(s => s.id === subStatusId);
    const isEnConstruccion = activeSubStatus?.name?.trim().toUpperCase() === "EN CONSTRUCCIÓN" || activeSubStatus?.name?.trim().toUpperCase() === "EN CONSTRUCCION";

    const updatePayload = {
      status: "CORRECTO",
      assignedToId: currentUserId || assignedToId || null,
      auditedById: currentUserId || null,
      hasFormulario: checkFormulario,
      hasDrive: checkDrive,
      hasAntala: isEnConstruccion ? checkAntala : false
    };

    setHasFormulario(checkFormulario);
    setHasDrive(checkDrive);
    setHasAntala(isEnConstruccion ? checkAntala : false);
    setStatus("CORRECTO");
    if (currentUserId) {
      setAssignedToId(currentUserId);
    }

    setShowChecklistModal(false);
    await saveCto("CORRECTO", currentUserId || assignedToId, updatePayload);
  };

  // Upload pictures sequentially (file by file) with overall progress tracking
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    // Calcular tamaño total
    let totalSize = 0;
    for (let i = 0; i < files.length; i++) {
      totalSize += files[i].size;
    }

    setUploadProgress({ percent: 0, loaded: 0, total: totalSize });

    let loadedSoFar = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("files", file); // El backend espera "files" (Multipart Form File)
      formData.append("ctoId", cto.id);

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const currentLoaded = event.loaded;
              const overallLoaded = loadedSoFar + currentLoaded;
              const percent = Math.min(99, Math.round((overallLoaded / totalSize) * 100));
              setUploadProgress({ percent, loaded: overallLoaded, total: totalSize });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              loadedSoFar += file.size;
              // Al terminar este archivo actualizamos al total subido real hasta el momento
              setUploadProgress({
                percent: Math.round((loadedSoFar / totalSize) * 100),
                loaded: loadedSoFar,
                total: totalSize
              });
              resolve();
            } else {
              reject(new Error("Error en servidor"));
            }
          };

          xhr.onerror = () => reject(new Error("Error de red"));
          xhr.send(formData);
        });
      } catch (err) {
        console.error("Fallo al subir archivo:", file.name, err);
        failedCount++;
        loadedSoFar += file.size;
      }
    }

    setUploading(false);
    setUploadProgress(null);

    if (failedCount > 0) {
      alert(`Subida completada: ${files.length - failedCount} archivos subidos con éxito, ${failedCount} fallidos.`);
    } else {
      alert(`Se han subido las ${files.length} imágenes correctamente (archivo por archivo).`);
    }
    fetchCtoDetails();
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
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              CTO: {cto.num}
              <span style={{ fontSize: "0.85rem", fontWeight: 600, opacity: 0.8, color: "var(--text-color)", display: "block", marginTop: "4px" }}>
                👤 {details?.assignedTo ? `Asignada a: ${details.assignedTo.name || details.assignedTo.email}` : (cto.assignedTo ? `Asignada a: ${cto.assignedTo.name || cto.assignedTo.email}` : "Sin asignar")}
              </span>
            </h2>
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
            
            <div style={{ padding: "1rem", background: "var(--bg-color)", borderRadius: "10px", border: "1px solid var(--border-color)", color: "var(--text-color)" }}>
              <p style={{ margin: "4px 0", fontSize: "0.9rem" }}><strong>Municipio:</strong> {cto.municipio || "N/A"}</p>
              <p style={{ margin: "4px 0", fontSize: "0.9rem" }}><strong>Colocación:</strong> {cto.colocacion || "N/A"}</p>
              <p style={{ margin: "4px 0", fontSize: "0.9rem" }}><strong>Zona:</strong> {cto.zona || "N/A"}</p>
              <p style={{ margin: "4px 0", fontSize: "0.9rem" }}><strong>Cluster:</strong> {cto.cluster || "N/A"}</p>
              <p style={{ margin: "4px 0", fontSize: "0.9rem" }}><strong>Coordenadas:</strong> {cto.lat.toFixed(6)}, {cto.lng.toFixed(6)}</p>
              
              <div style={{ display: "flex", gap: "8px", marginTop: "0.75rem" }}>
                <button onClick={openGoogleMaps} className="btn btn-primary" style={{ flex: 1, minHeight: "34px", fontSize: "0.8rem", padding: "4px 8px" }}>
                  Google Maps
                </button>
                <button onClick={openCtoTracker} className="btn" style={{ flex: 1, minHeight: "34px", background: "#1e293b", color: "white", fontSize: "0.8rem", padding: "4px 8px" }}>
                  CTO Tracker
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "0.5rem" }}>
                <button 
                  type="button"
                  onClick={() => window.open(`/form-guide?ctoId=${cto.id}`, "_blank")}
                  className="btn" 
                  style={{ flex: 1, minHeight: "34px", background: "#8b5cf6", color: "white", fontSize: "0.8rem", padding: "4px 8px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                >
                  Guía formulario
                </button>
                <button 
                  type="button"
                  onClick={handleOpenFormSheet}
                  disabled={fetchingFormSheet}
                  className="btn" 
                  style={{ flex: 1, minHeight: "34px", background: "#a855f7", color: "white", fontSize: "0.8rem", padding: "4px 8px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", opacity: fetchingFormSheet ? 0.7 : 1 }}
                >
                  {fetchingFormSheet ? "Refrescando..." : "Ficha formulario"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "0.5rem" }}>
                <button 
                  type="button"
                  onClick={() => {
                    if (cto.urlFicha) {
                      window.open(cto.urlFicha, "_blank");
                    } else {
                      alert("Esta CTO no tiene enlazada ninguna ficha de UserSide.");
                    }
                  }}
                  className="btn" 
                  style={{ 
                    flex: 1, 
                    minHeight: "34px", 
                    background: cto.urlFicha ? "#22c55e" : "#94a3b8", 
                    color: "white", 
                    fontSize: "0.8rem", 
                    padding: "4px 8px", 
                    fontWeight: 700, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "4px",
                    cursor: cto.urlFicha ? "pointer" : "not-allowed",
                    opacity: cto.urlFicha ? 1 : 0.6
                  }}
                >
                  UserSide
                </button>
                <button 
                  type="button"
                  onClick={() => window.open("https://teras.antalanae.com/cto", "_blank")}
                  className="btn" 
                  style={{ flex: 1, minHeight: "34px", background: "#3b82f6", color: "white", fontSize: "0.8rem", padding: "4px 8px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                >
                  Antala
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
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem", background: "var(--bg-color)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>P. Totales</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={puertosTotal} 
                        onChange={e => setPuertosTotal(e.target.value)}
                        placeholder="16"
                        style={{ padding: "6px 10px", minHeight: "38px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
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
                        style={{ padding: "6px 10px", minHeight: "38px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
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
                        style={{ padding: "6px 10px", minHeight: "38px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Zona</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={zona} 
                        onChange={e => setZona(e.target.value)}
                        placeholder="Ej: Zona A"
                        style={{ padding: "6px 10px", minHeight: "38px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>Cluster</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={cluster} 
                        onChange={e => setCluster(e.target.value)}
                        placeholder="Ej: Cluster 1"
                        style={{ padding: "6px 10px", minHeight: "38px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                      />
                    </div>
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
                          setZoomScale(1);
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
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      {uploading ? "Subiendo..." : "Subir Fotos"}
                    </span>
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

              {/* Checkbox Programada */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <input 
                  type="checkbox" 
                  id="isProgramadaCheckbox"
                  checked={isProgramada} 
                  onChange={e => setIsProgramada(e.target.checked)} 
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary-color)", cursor: "pointer" }}
                />
                <label htmlFor="isProgramadaCheckbox" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-color)", cursor: "pointer" }}>
                  Programada (Trabajo planeado / pre-trabajo)
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: "var(--border-color)", color: "var(--text-color)" }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      {saving ? "Guardando..." : "Guardar Cambios"}
                    </span>
                  </button>
                </div>
                <button 
                  type="button" 
                  onClick={handleCerrarYGuardar} 
                  className="btn" 
                  disabled={saving}
                  style={{ 
                    width: "100%", 
                    background: "#10b981", 
                    color: "white", 
                    fontWeight: 700, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "6px",
                    minHeight: "44px"
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {saving ? "Guardando..." : "Cerrar y Guardar (Marcar Correcto)"}
                </button>
              </div>

              {/* COMENTARIO RÁPIDO Y MURO AL FINAL */}
              <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "1rem", marginTop: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>
                  Añadir Comentario rápido al Historial:
                </label>
                <textarea 
                  className="input-field" 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Escribe comentarios de la visita..." 
                  style={{ minHeight: "50px", padding: "8px 12px", resize: "vertical", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
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
                    style={{ minHeight: "32px", padding: "4px 12px", fontSize: "0.8rem", width: "auto" }}
                    disabled={saving || !commentText.trim()}
                  >
                    {saving ? "Guardando..." : "Comentar"}
                  </button>
                </div>
              </div>

              {/* Muro de Comentarios integrado */}
              <div style={{ background: "var(--card-bg)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", marginTop: "1rem" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px", color: "var(--text-color)" }}>
                  Muro de Comentarios ({details?.comments?.length || 0})
                </h3>
                {details?.comments && details.comments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                    {details.comments.map((comm: any) => (
                      <div key={comm.id} style={{ background: "var(--bg-color)", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-color)", opacity: 0.7, marginBottom: "4px" }}>
                          <strong style={{ color: comm.user?.color || "inherit" }}>{comm.user?.name || "Técnico"}</strong>
                          <span>{new Date(comm.createdAt).toLocaleString()}</span>
                        </div>
                        <p style={{ fontSize: "0.8rem", margin: 0, color: "var(--text-color)", whiteSpace: "pre-wrap" }}>{comm.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-color)", opacity: 0.7, fontSize: "0.8rem", fontStyle: "italic", margin: 0 }}>
                    No hay comentarios registrados
                  </p>
                )}
              </div>

              {/* Historial de Cambios integrado */}
              <div style={{ background: "var(--card-bg)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", marginTop: "1rem", marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px", color: "var(--text-color)" }}>
                  Historial de Cambios ({details?.history?.length || 0})
                </h3>
                {details?.history && details.history.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                    {details.history.map((hist: any) => (
                      <div key={hist.id} style={{ fontSize: "0.75rem", color: "var(--text-color)", opacity: 0.8, display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-color)", paddingBottom: "4px" }}>
                        <span><strong>{hist.user?.name || "Sistema"}:</strong> {hist.action}</span>
                        <span style={{ fontSize: "0.7rem", flexShrink: 0, marginLeft: "10px" }}>
                          {new Date(hist.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-color)", opacity: 0.7, fontSize: "0.8rem", fontStyle: "italic", margin: 0 }}>
                    No hay historial registrado
                  </p>
                )}
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
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-color)", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary-color)" }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Comentarios e Historial - CTO {cto.num}
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
              <div style={{ background: "var(--primary-color)", height: "100%", width: `${uploadProgress.percent}%`, transition: "width 0.1s" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-color)" }}>{uploadProgress.percent}%</span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-color)", opacity: 0.8 }}>
                {(uploadProgress.loaded / (1024 * 1024)).toFixed(2)} MB de {(uploadProgress.total / (1024 * 1024)).toFixed(2)} MB
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-color)", opacity: 0.6 }}>
                Faltan: {Math.max(0, (uploadProgress.total - uploadProgress.loaded) / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LA GALERÍA COMPLETA */}
      {showGallery && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2999, display: "flex", flexDirection: "column", padding: "16px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-color)", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary-color)" }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              Galería de Evidencias - CTO {cto.num}
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {details?.images && details.images.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(`/api/admin/evidencia/download-cto?ctoId=${cto.id}`, "_blank");
                    }}
                    className="btn btn-primary"
                    style={{
                      minHeight: "36px", padding: "6px 12px", background: "var(--primary-color, #FF7900)", color: "white",
                      borderRadius: "8px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Descargar todo (.zip)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      for (const img of details.images) {
                        try {
                          const res = await fetch(img.url);
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          const filename = img.url.split("/").pop() || "evidencia.jpg";
                          link.download = filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                          await new Promise(resolve => setTimeout(resolve, 150));
                        } catch (err) {
                          console.error("Error al descargar individual:", err);
                        }
                      }
                    }}
                    className="btn"
                    style={{
                      minHeight: "36px", padding: "6px 12px", background: "#0ea5e9", color: "white",
                      borderRadius: "8px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px",
                      border: "none"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Descargar sueltas
                  </button>
                </>
              )}
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
          </div>

          {/* Grid de imágenes */}
          <div className="scrollable-content" style={{ flex: 1, overflowY: "auto" }}>
            {details?.images && details.images.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", paddingBottom: "20px" }}>
                {details.images.map((img: any, idx: number) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setZoomScale(1);
                      setActiveImgIndex(idx);
                    }}
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
              onClick={() => {
                setZoomScale(1);
                setActiveImgIndex(prev => (prev !== null && prev > 0 ? prev - 1 : (details.images.length - 1)));
              }}
              style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: "44px", height: "44px", borderRadius: "50%", cursor: "pointer", zIndex: 10 }}
            >
              ◀
            </button>

            {/* Image Container */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%", position: "relative", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${details.images[activeImgIndex].url}?t=${cacheKey}`}
                alt="Visor"
                style={{ 
                  maxHeight: "80vh", 
                  maxWidth: "100%", 
                  objectFit: "contain", 
                  borderRadius: "8px", 
                  transition: "transform 0.2s",
                  transform: `scale(${zoomScale})`
                }}
              />
            </div>

            {/* Arrow Right */}
            <button
              type="button"
              onClick={() => {
                setZoomScale(1);
                setActiveImgIndex(prev => (prev !== null && prev < details.images.length - 1 ? prev + 1 : 0));
              }}
              style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: "44px", height: "44px", borderRadius: "50%", cursor: "pointer", zIndex: 10 }}
            >
              ▶
            </button>
          </div>

          {/* Action Footer (Rotate, Delete, Download) */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", padding: "24px 16px", background: "rgba(0,0,0,0.8)", borderTop: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => setZoomScale(prev => Math.max(prev - 0.5, 1))}
              title="Alejar Zoom"
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Zoom -</span>
            </button>

            {/* Reset Zoom */}
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              title="Restablecer Zoom"
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Ajustar</span>
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={() => setZoomScale(prev => Math.min(prev + 0.5, 4))}
              title="Acercar Zoom"
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Zoom +</span>
            </button>

            <span style={{ width: "1px", background: "rgba(255,255,255,0.2)", margin: "0 10px" }} />

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

      {/* MODAL DE CHECKLIST DE AUDITORÍA (CERRAR Y GUARDAR) */}
      {showChecklistModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 4000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "380px",
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-color)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Requisitos de Auditoría
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Marca los siguientes requisitos obligatorios para poder certificar la CTO como <strong>CORRECTO</strong>:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", background: "var(--bg-color)", border: "1px solid var(--border-color)", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={checkFormulario} 
                  onChange={e => setCheckFormulario(e.target.checked)} 
                  style={{ width: "18px", height: "18px", accentColor: "#10b981", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>1. Formulario completo</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", background: "var(--bg-color)", border: "1px solid var(--border-color)", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={checkDrive} 
                  onChange={e => setCheckDrive(e.target.checked)} 
                  style={{ width: "18px", height: "18px", accentColor: "#10b981", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-color)" }}>2. Fotos subidas a Drive</span>
              </label>

              {(subStatuses.find(s => s.id === subStatusId)?.name?.trim().toUpperCase() === "EN CONSTRUCCIÓN" || 
                subStatuses.find(s => s.id === subStatusId)?.name?.trim().toUpperCase() === "EN CONSTRUCCION") && (
                <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={checkAntala} 
                    onChange={e => setCheckAntala(e.target.checked)} 
                    style={{ width: "18px", height: "18px", accentColor: "#f59e0b", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#d97706" }}>3. Registro en Antala</span>
                </label>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="button" 
                onClick={() => setShowChecklistModal(false)} 
                className="btn" 
                style={{ flex: 1, background: "var(--border-color)", color: "var(--text-color)" }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleConfirmChecklist} 
                className="btn" 
                disabled={!(checkFormulario && checkDrive && (
                  !(subStatuses.find(s => s.id === subStatusId)?.name?.trim().toUpperCase() === "EN CONSTRUCCIÓN" || 
                    subStatuses.find(s => s.id === subStatusId)?.name?.trim().toUpperCase() === "EN CONSTRUCCION") || 
                  checkAntala
                ))}
                style={{ 
                  flex: 1.5, 
                  background: (checkFormulario && checkDrive && (
                    !(subStatuses.find(s => s.id === subStatusId)?.name?.trim().toUpperCase() === "EN CONSTRUCCIÓN" || 
                      subStatuses.find(s => s.id === subStatusId)?.name?.trim().toUpperCase() === "EN CONSTRUCCION") || 
                    checkAntala
                  )) ? "#10b981" : "var(--border-color)", 
                  color: "white", 
                  fontWeight: 700 
                }}
              >
                Confirmar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE FICHA FORMULARIO */}
      {showFormSheetModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 3500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "95%", maxWidth: "550px", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "16px", overflow: "hidden", color: "var(--text-color)" }}>
            
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>📋 Ficha Formulario: CTO {cto.num}</h3>
              <button 
                type="button" 
                onClick={() => setShowFormSheetModal(false)} 
                style={{ background: "none", border: "none", color: "var(--text-color)", fontSize: "1.2rem", cursor: "pointer", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {(() => {
                if (!details?.formDataJson) {
                  return (
                    <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#64748b" }}>
                      <p style={{ fontSize: "1.5rem", margin: "0 0 10px 0" }}>⚠️</p>
                      <p style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>No hay ninguna ficha de formulario guardada para esta CTO.</p>
                      <p style={{ fontSize: "0.8rem", margin: "6px 0 0 0" }}>Haz clic en <strong>"Guía formulario"</strong> para rellenar el cuestionario.</p>
                    </div>
                  );
                }

                try {
                  const data = JSON.parse(details.formDataJson);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.88rem" }}>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-color)", paddingBottom: "6px" }}>
                        <span style={{ fontWeight: 700, color: "#64748b" }}>Idioma de llenado:</span>
                        <span style={{ fontWeight: 700, color: "var(--primary-color)" }}>{data.lang === "uk" ? "Ucraniano (Українська)" : "Español"}</span>
                      </div>

                      {/* 1. Ubicación */}
                      <div>
                        <strong style={{ display: "block", color: "var(--primary-color)", marginBottom: "4px" }}>📍 Ubicación de la CTO:</strong>
                        <p style={{ margin: 0, paddingLeft: "10px", borderLeft: "2px solid var(--border-color)" }}>{data.ubicacion || "No especificado"}</p>
                      </div>

                      {/* 2. Daños */}
                      <div>
                        <strong style={{ display: "block", color: "var(--primary-color)", marginBottom: "4px" }}>🛠️ Daños y Suciedades:</strong>
                        {data.danos && data.danos.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: "20px" }}>
                            {data.danos.map((d: string, i: number) => <li key={i}>{d}</li>)}
                          </ul>
                        ) : (
                          <p style={{ margin: 0, paddingLeft: "10px", borderLeft: "2px solid var(--border-color)", fontStyle: "italic", color: "#64748b" }}>Sin daños visibles</p>
                        )}
                      </div>

                      {/* 3. Llaves */}
                      <div>
                        <strong style={{ display: "block", color: "var(--primary-color)", marginBottom: "4px" }}>🔑 Requerimiento de Llaves:</strong>
                        <p style={{ margin: 0, paddingLeft: "10px", borderLeft: "2px solid var(--border-color)" }}>
                          {data.requiereLlaves ? (
                            <span>Sí ({data.datosLlaves || "Sin datos de contacto"})</span>
                          ) : (
                            <span>No se requieren llaves</span>
                          )}
                        </p>
                      </div>

                      {/* 4. Splitters */}
                      <div>
                        <strong style={{ display: "block", color: "var(--primary-color)", marginBottom: "4px" }}>📡 Señal de Divisores (Splitters):</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px", marginTop: "4px" }}>
                          {data.splitters && data.splitters.map((s: any, i: number) => (
                            <div key={i} style={{ background: "var(--bg-color)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "6px 10px" }}>
                              <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>Divisor {i + 1}</span>
                              <span style={{ fontSize: "1rem", fontWeight: 800, color: Math.abs(parseFloat(s.signal)) === 70 ? "#ef4444" : Math.abs(parseFloat(s.signal)) > 22.99 ? "#f59e0b" : "#10b981" }}>
                                {s.signal} dBm
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 5. Antala */}
                      <div>
                        <strong style={{ display: "block", color: "var(--primary-color)", marginBottom: "4px" }}>🤖 Sincronismo en Antala:</strong>
                        <p style={{ margin: 0, paddingLeft: "10px", borderLeft: "2px solid var(--border-color)" }}>
                          {data.requiereAntala ? "Sí requerido" : "No requerido"}
                        </p>
                      </div>

                      {/* 6. Influencia */}
                      <div>
                        <strong style={{ display: "block", color: "var(--primary-color)", marginBottom: "4px" }}>🏘️ Área de Influencia:</strong>
                        <ul style={{ margin: 0, paddingLeft: "20px" }}>
                          {data.influenciaPorterillo && <li>Porterillo automático</li>}
                          {data.influenciaCalle && <li>Vía pública (Números: {data.calleNumeros?.join(", ") || "Ninguno"})</li>}
                          {data.influenciaOtros && <li>Otros: {data.influenciaOtrosTexto}</li>}
                        </ul>
                      </div>

                      {/* Comentario generado */}
                      <div style={{ marginTop: "10px", background: "var(--bg-color)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 12px" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>📝 COMENTARIO GENERADO (ESPAÑOL):</span>
                        <p style={{ margin: 0, fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "pre-wrap", color: "var(--text-color)" }}>{data.generatedComment}</p>
                      </div>

                    </div>
                  );
                } catch (e) {
                  return <p style={{ color: "#ef4444" }}>Error al analizar los datos del formulario.</p>;
                }
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border-color)", display: "flex", gap: "10px" }}>
              {details?.formDataJson && (
                <button 
                  type="button" 
                  onClick={handleDeleteForm} 
                  disabled={deletingForm}
                  className="btn" 
                  style={{ flex: 1, background: "#ef4444", color: "white", justifyContent: "center", fontWeight: 700 }}
                >
                  {deletingForm ? "Borrando..." : "Borrar Formulario"}
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setShowFormSheetModal(false)} 
                className="btn btn-primary" 
                style={{ flex: 2, justifyContent: "center" }}
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
