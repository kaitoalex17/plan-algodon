"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type ImageRecord = { id: string; url: string };
type CtoWithImages = {
  id: string;
  num: string;
  municipio: string | null;
  colocacion: string | null;
  images: ImageRecord[];
};

export default function AdminEvidenciaPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  
  const [ctos, setCtos] = useState<CtoWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCtoId, setSelectedCtoId] = useState<string | null>(null);
  
  // Lightbox
  const [activeImgIndex, setActiveImgIndex] = useState<number | null>(null);
  const [cacheKey, setCacheKey] = useState(Date.now());

  const fetchEvidencias = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/evidencia");
      if (res.ok) {
        setCtos(await res.json());
      } else {
        alert("Error al cargar las evidencias fotográficas");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN") {
        router.push("/");
      } else {
        fetchEvidencias();
      }
    } else if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, session, router]);

  if (loading || authStatus === "loading") {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-color)", color: "var(--text-color)" }}>
        <p style={{ fontWeight: 700 }}>Cargando evidencias fotográficas...</p>
      </div>
    );
  }

  const selectedCto = ctos.find(c => c.id === selectedCtoId);

  const handleRotate = async (imageId: string, direction: "left" | "right") => {
    try {
      const res = await fetch("/api/uploads/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, direction })
      });
      if (res.ok) {
        setCacheKey(Date.now());
        fetchEvidencias();
      } else {
        alert("Error al rotar la imagen");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta imagen permanentemente?")) return;
    try {
      const res = await fetch("/api/uploads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId })
      });
      if (res.ok) {
        alert("Imagen eliminada");
        // Cerrar lightbox si está activo
        if (activeImgIndex !== null) {
          const ctoImages = selectedCto?.images || [];
          const remaining = ctoImages.filter(i => i.id !== imageId);
          if (remaining.length === 0) {
            setActiveImgIndex(null);
          } else {
            setActiveImgIndex(Math.max(0, activeImgIndex - 1));
          }
        }
        fetchEvidencias();
      } else {
        alert("Error al eliminar la imagen");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRename = async (imageId: string, currentUrl: string) => {
    const currentName = currentUrl.split("-").pop()?.split(".")[0] || "imagen";
    const newName = prompt("Introduce el nuevo nombre para la imagen (sin espacios ni caracteres especiales):", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;

    try {
      const res = await fetch("/api/uploads/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, newName: newName.trim() })
      });
      if (res.ok) {
        alert("Imagen renombrada");
        fetchEvidencias();
      } else {
        const errData = await res.json();
        alert(`Error al renombrar: ${errData.error || "Servidor falló"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-color)", color: "var(--text-color)", display: "flex", flexDirection: "column" }}>
      
      {/* Cabecera */}
      <header style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            onClick={() => router.push("/admin")} 
            className="btn" 
            style={{ minHeight: "36px", padding: "6px 12px", background: "var(--border-color)", color: "var(--text-color)", borderRadius: "8px", fontWeight: 700 }}
          >
            ← Volver
          </button>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>📸 Evidencias Fotográficas</h1>
        </div>
      </header>

      {/* Contenido Principal */}
      <main style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        
        {!selectedCtoId ? (
          // VISTA 1: Carpetas por CTO
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "0.95rem", opacity: 0.7, marginBottom: "16px", textTransform: "uppercase", fontWeight: 700 }}>
              Carpetas por CTO ({ctos.length})
            </h2>

            {ctos.length === 0 ? (
              <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", background: "var(--card-bg)", borderColor: "var(--border-color)" }}>
                <p style={{ fontStyle: "italic", margin: 0 }}>No hay evidencias fotográficas registradas en la base de datos.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                {ctos.map((ctoItem) => (
                  <div
                    key={ctoItem.id}
                    onClick={() => setSelectedCtoId(ctoItem.id)}
                    className="glass-panel"
                    style={{ 
                      padding: "16px", cursor: "pointer", background: "var(--card-bg)", 
                      borderColor: "var(--border-color)", display: "flex", flexDirection: "column", 
                      alignItems: "center", justifyContent: "center", gap: "10px", textAlign: "center",
                      transition: "transform 0.15s, box-shadow 0.15s"
                    }}
                  >
                    {/* Icono de Carpeta */}
                    <div style={{ color: "var(--primary-color)" }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "0.95rem" }}>CTO {ctoItem.num}</strong>
                      <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                        {ctoItem.municipio || "Sin municipio"}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", background: "var(--bg-color)", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                      {ctoItem.images.length} {ctoItem.images.length === 1 ? "foto" : "fotos"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // VISTA 2: Fotos dentro de la CTO seleccionada
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => setSelectedCtoId(null)}
                  style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}
                >
                  📁 Carpetas
                </button>
                <span style={{ opacity: 0.5 }}>/</span>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>CTO {selectedCto?.num}</h2>
              </div>
              <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                {selectedCto?.municipio} • {selectedCto?.colocacion}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {selectedCto?.images.map((img, idx) => {
                const displayFilename = img.url.split("-").pop() || "imagen.jpg";
                return (
                  <div key={img.id} className="glass-panel" style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    
                    {/* Imagen */}
                    <div 
                      onClick={() => setActiveImgIndex(idx)}
                      style={{ aspectRatio: "4/3", cursor: "pointer", position: "relative", background: "black", overflow: "hidden" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`${img.url}?t=${cacheKey}`} 
                        alt={displayFilename}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>

                    {/* Metadata y Nombre de archivo */}
                    <div style={{ padding: "10px", borderBottom: "1px solid var(--border-color)" }}>
                      <span 
                        title={displayFilename}
                        style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {displayFilename}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div style={{ padding: "8px", display: "flex", justifyContent: "space-between", gap: "4px", background: "var(--bg-color)" }}>
                      {/* Renombrar */}
                      <button
                        type="button"
                        onClick={() => handleRename(img.id, img.url)}
                        title="Renombrar archivo"
                        className="btn"
                        style={{ flex: 1, minHeight: "34px", padding: "4px", background: "var(--card-bg)", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>

                      {/* Rotar Izquierda */}
                      <button
                        type="button"
                        onClick={() => handleRotate(img.id, "left")}
                        title="Rotar a la izquierda"
                        className="btn"
                        style={{ flex: 1, minHeight: "34px", padding: "4px", background: "var(--card-bg)", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 15a3.99 3.99 0 0 0-4-4H4M4 11l3-3M4 11l3 3" />
                          <path d="M12 2a10 10 0 0 1 10 10c0 2.21-.9 4.21-2.34 5.66" />
                        </svg>
                      </button>

                      {/* Rotar Derecha */}
                      <button
                        type="button"
                        onClick={() => handleRotate(img.id, "right")}
                        title="Rotar a la derecha"
                        className="btn"
                        style={{ flex: 1, minHeight: "34px", padding: "4px", background: "var(--card-bg)", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 15a3.99 3.99 0 0 1 4-4h6M20 11l-3-3M20 11l-3 3" />
                          <path d="M12 2a10 10 0 0 0-10 10c0 2.21.9 4.21 2.34 5.66" />
                        </svg>
                      </button>

                      {/* Descargar */}
                      <a
                        href={img.url}
                        download={displayFilename}
                        title="Descargar archivo"
                        className="btn"
                        style={{ flex: 1, minHeight: "34px", padding: "4px", background: "var(--card-bg)", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 21h12M12 3v14M12 17l-5-5M12 17l5-5" />
                        </svg>
                      </a>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDelete(img.id)}
                        title="Eliminar archivo"
                        className="btn"
                        style={{ flex: 1, minHeight: "34px", padding: "4px", background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* VISOR LIGHTBOX PARA EL ADMINISTRADOR */}
      {activeImgIndex !== null && selectedCto?.images && selectedCto.images[activeImgIndex] && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 5000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", color: "white", zIndex: 10 }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Foto {activeImgIndex + 1} de {selectedCto.images.length} (CTO {selectedCto.num})
            </span>
            <button
              type="button"
              onClick={() => setActiveImgIndex(null)}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>

          {/* Central Image Viewer */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "0 10px" }}>
            <button
              type="button"
              onClick={() => setActiveImgIndex(prev => (prev !== null && prev > 0 ? prev - 1 : (selectedCto.images.length - 1)))}
              style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: "44px", height: "44px", borderRadius: "50%", cursor: "pointer", zIndex: 10 }}
            >
              ◀
            </button>

            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${selectedCto.images[activeImgIndex].url}?t=${cacheKey}`}
                alt="Visor Admin"
                style={{ maxHeight: "80vh", maxWidth: "100%", objectFit: "contain", borderRadius: "8px" }}
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveImgIndex(prev => (prev !== null && prev < selectedCto.images.length - 1 ? prev + 1 : 0))}
              style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: "44px", height: "44px", borderRadius: "50%", cursor: "pointer", zIndex: 10 }}
            >
              ▶
            </button>
          </div>

          {/* Acciones en el visor */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", padding: "24px 16px", background: "rgba(0,0,0,0.8)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              type="button"
              onClick={() => handleRotate(selectedCto.images[activeImgIndex].id, "left")}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 15a3.99 3.99 0 0 0-4-4H4M4 11l3-3M4 11l3 3" />
                <path d="M12 2a10 10 0 0 1 10 10c0 2.21-.9 4.21-2.34 5.66" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Girar Izq</span>
            </button>

            <button
              type="button"
              onClick={() => handleRotate(selectedCto.images[activeImgIndex].id, "right")}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15a3.99 3.99 0 0 1 4-4h6M20 11l-3-3M20 11l-3 3" />
                <path d="M12 2a10 10 0 0 0-10 10c0 2.21.9 4.21 2.34 5.66" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Girar Der</span>
            </button>

            <a
              href={selectedCto.images[activeImgIndex].url}
              download={selectedCto.images[activeImgIndex].url.split("-").pop() || "imagen.jpg"}
              style={{ textDecoration: "none", color: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 21h12M12 3v14M12 17l-5-5M12 17l5-5" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Descargar</span>
            </a>

            <button
              type="button"
              onClick={() => handleDelete(selectedCto.images[activeImgIndex].id)}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span style={{ fontSize: "0.75rem" }}>Eliminar</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
