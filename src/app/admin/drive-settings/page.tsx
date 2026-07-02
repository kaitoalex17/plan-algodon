"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AdminDriveSettingsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [driveServiceAccount, setDriveServiceAccount] = useState("");
  const [driveRootFolderId, setDriveRootFolderId] = useState("");

  useEffect(() => {
    if (authStatus === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN") {
        router.push("/");
      } else {
        loadSettings();
      }
    } else if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, session, router]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/drive-settings");
      if (res.ok) {
        const settings = await res.json();
        setDriveEnabled(settings.driveEnabled || false);
        setDriveServiceAccount(settings.driveServiceAccount || "");
        setDriveRootFolderId(settings.driveRootFolderId || "");
      }
    } catch (err) {
      console.error("Error loading drive settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Basic JSON validation
      if (driveEnabled && driveServiceAccount) {
        try {
          JSON.parse(driveServiceAccount);
        } catch (e) {
          alert("El JSON de la Cuenta de Servicio no es válido. Revisa que esté bien copiado.");
          setSaving(false);
          return;
        }
      }

      const res = await fetch("/api/admin/drive-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveEnabled, driveServiceAccount, driveRootFolderId })
      });
      if (res.ok) {
        alert("Ajustes de Google Drive guardados correctamente.");
      } else {
        alert("Error al guardar la configuración de Drive.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || authStatus === "loading") {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white" }}>
        <p style={{ fontWeight: 700 }}>Cargando Ajustes de Drive...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "900px", margin: "0 auto", color: "var(--text-color)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>☁️ Integración con Google Drive</h1>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "4px 0 0 0" }}>Configura la sincronización automática de evidencias fotográficas.</p>
        </div>
        <Link href="/admin" className="btn btn-primary">Volver al Panel</Link>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "1rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <input 
              type="checkbox" 
              id="driveEnabled"
              checked={driveEnabled} 
              onChange={e => setDriveEnabled(e.target.checked)} 
              style={{ width: "20px", height: "20px", accentColor: "#10b981", cursor: "pointer" }}
            />
            <label htmlFor="driveEnabled" style={{ fontSize: "1rem", fontWeight: 700, cursor: "pointer", color: "var(--text-color)" }}>
              Habilitar sincronización con Google Drive
            </label>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
              ID de la Carpeta Raíz (Opcional pero recomendado)
            </label>
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px" }}>
              Para acelerar la búsqueda de carpetas y evitar duplicados, pega aquí el ID de la carpeta principal compartida (ej. la carpeta "ALGODON"). El ID es la cadena de caracteres al final de la URL de Drive.
            </p>
            <input 
              type="text" 
              value={driveRootFolderId} 
              onChange={e => setDriveRootFolderId(e.target.value)} 
              className="input-field" 
              placeholder="Ej: 1A2b3C4d5E6f7G8h9I0jK..."
              style={{ padding: "10px 12px", width: "100%", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "6px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", fontWeight: 700 }}>
              Credenciales de la Cuenta de Servicio (JSON)
            </label>
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px" }}>
              Pega aquí el contenido completo del archivo JSON descargado desde Google Cloud Console para la cuenta de servicio. 
              <strong> Importante:</strong> No olvides compartir tu carpeta raíz de Drive dándole permisos de "Editor" al correo electrónico de esta cuenta de servicio.
            </p>
            <textarea 
              value={driveServiceAccount} 
              onChange={e => setDriveServiceAccount(e.target.value)} 
              className="input-field" 
              placeholder='{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'
              rows={15}
              style={{ 
                padding: "10px 12px", 
                width: "100%", 
                fontFamily: "monospace", 
                fontSize: "0.8rem", 
                background: "var(--bg-color)", 
                color: "var(--text-color)", 
                border: "1px solid var(--border-color)", 
                borderRadius: "6px" 
              }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
            style={{ width: "100%", fontWeight: 700, minHeight: "48px", justifyContent: "center", fontSize: "1.1rem" }}
          >
            {saving ? "Guardando..." : "💾 Guardar Configuración de Drive"}
          </button>
        </form>
      </div>
    </div>
  );
}
