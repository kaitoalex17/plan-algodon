"use client";

import { useState, useEffect } from "react";
import PublicMapWrapper from "@/components/PublicMapWrapper";

interface CtoReport {
  id: string;
  num: string;
  cluster: string;
  zona: string;
  status: string;
  subStatusName: string;
  subStatusColor: string;
  lat: number;
  lng: number;
  auditTime: string;
  auditor: string;
}

export default function PublicReportPage() {
  const [password, setPassword] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [data, setData] = useState<{ date: string; count: number; ctos: CtoReport[] }>({
    date: "",
    count: 0,
    ctos: []
  });

  // Intentar cargar token de la URL o la contraseña guardada en la sesión del navegador
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      verifyToken(token);
    } else {
      const savedPass = localStorage.getItem("public_report_password");
      if (savedPass) {
        verifyPassword(savedPass);
      }
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public-report?token=${encodeURIComponent(tokenToVerify)}`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
        setIsAuth(true);
      } else {
        setError("Enlace de acceso público caducado o inválido.");
        setIsAuth(false);
      }
    } catch (err) {
      console.error(err);
      setError("Error en la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = async (passToVerify: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public-report?password=${encodeURIComponent(passToVerify)}`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
        setIsAuth(true);
        localStorage.setItem("public_report_password", passToVerify);
      } else {
        setError("Acceso denegado o contraseña incorrecta.");
        localStorage.removeItem("public_report_password");
        setIsAuth(false);
      }
    } catch (err) {
      console.error(err);
      setError("Error en la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    verifyPassword(password.trim());
  };

  // Render Gate de Autenticación
  if (!isAuth) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        fontFamily: "system-ui, sans-serif",
        color: "white",
        padding: "16px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "380px",
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          textAlign: "center"
        }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f97316", marginBottom: "8px" }}>
            ● Plan Algodón
          </h1>
          <h2 style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: 500, marginBottom: "24px" }}>
            Reporte Público de Auditoría
          </h2>

          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", textAlign: "left", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                Contraseña de acceso:
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Escribe la contraseña..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "white",
                  fontSize: "0.95rem",
                  outline: "none"
                }}
                disabled={loading}
              />
            </div>

            {error && (
              <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0, fontWeight: 600, textAlign: "left" }}>
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#f97316",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "opacity 0.2s"
              }}
            >
              {loading ? "Verificando..." : "Entrar al Reporte"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Reporte Público
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#0f172a",
      color: "white",
      fontFamily: "system-ui, sans-serif",
      overflow: "hidden"
    }}>
      
      {/* Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        background: "#1e293b",
        borderBottom: "1px solid #334155"
      }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f97316", margin: 0 }}>
            ● Plan Algodón
          </h1>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Reporte de Actividad del {data.date}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ background: "rgba(249, 115, 22, 0.2)", color: "#f97316", fontSize: "0.85rem", padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>
            {data.count} CTOs Auditadas
          </span>
          <button 
            onClick={() => {
              localStorage.removeItem("public_report_password");
              setIsAuth(false);
            }}
            style={{ display: "block", fontSize: "0.7rem", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", textDecoration: "underline", marginTop: "4px", width: "100%", textAlign: "right" }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", flexWrap: "wrap" }}>
        
        {/* Left Side: Leaflet Map */}
        <div style={{ flex: 1.5, minWidth: "300px", height: "100%", position: "relative" }}>
          <PublicMapWrapper ctos={data.ctos} />
        </div>

        {/* Right Side: Chronological list */}
        <div style={{
          flex: 1,
          minWidth: "300px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#1e293b",
          borderLeft: "1px solid #334155",
          padding: "16px",
          overflowY: "auto"
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#94a3b8", marginBottom: "16px", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
            <span>Orden Cronológico</span>
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>Hora Madrid</span>
          </h2>

          {data.ctos.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontStyle: "italic", color: "#64748b", textAlign: "center", padding: "2rem" }}>
              Aún no se han auditado CTOs en el día de hoy.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.ctos.map((c) => (
                <div 
                  key={c.id}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f97316" }}>
                      CTO {c.num}
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8" }}>
                      {c.auditTime}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94a3b8" }}>
                    <span>Cluster: <strong>{c.cluster}</strong></span>
                    <span>Zona: <strong>{c.zona}</strong></span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", paddingTop: "6px", borderTop: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.subStatusColor }} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                        {c.subStatusName}
                      </span>
                    </div>

                    <span style={{ fontSize: "0.75rem", background: "rgba(148, 163, 184, 0.1)", color: "#94a3b8", padding: "2px 6px", borderRadius: "4px" }}>
                      👤 {c.auditor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
