"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type TranslationOption = {
  es: string;
  uk: string;
};

export default function QuestionnaireAdminPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [threshold, setThreshold] = useState("22.99");
  const [noSignalValue, setNoSignalValue] = useState("70.0");
  
  const [ubicacionOptions, setUbicacionOptions] = useState<TranslationOption[]>([]);
  const [danosOptions, setDanosOptions] = useState<TranslationOption[]>([]);
  const [llavesOptions, setLlavesOptions] = useState<TranslationOption[]>([]);

  // Plantillas de comentarios
  const [tplUbiPrefix, setTplUbiPrefix] = useState("Ubicación de la caja CTO");
  const [tplDanosPrefix, setTplDanosPrefix] = useState("Estado de la CTO");
  const [tplLlavesPrefix, setTplLlavesPrefix] = useState("Se requieren llaves para acceder a la CTO");
  const [tplLlavesPresident, setTplLlavesPresident] = useState("Presidente/Conserje");
  const [tplLlavesPhone, setTplLlavesPhone] = useState("Teléfono");
  const [tplLlavesNodata, setTplLlavesNodata] = useState("Sin datos de contacto");
  const [tplInfluenciaTitle, setTplInfluenciaTitle] = useState("Área de influencia");
  const [tplAntalaYes, setTplAntalaYes] = useState("Se realiza sincronismo/levantamiento en Antala. Se realizan etiquetas de caja, cable y divisor.");
  const [tplAntalaFailed, setTplAntalaFailed] = useState("No se ha podido realizar el sincronismo/levantamiento en Antala debido a que:");

  useEffect(() => {
    if (authStatus === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "GESTOR") {
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
      const res = await fetch("/api/admin/questionnaire-settings");
      if (res.ok) {
        const data = await res.json();
        setThreshold(String(data.threshold || "22.99"));
        setNoSignalValue(String(data.noSignalValue || "70.0"));
        setUbicacionOptions(data.ubicacion?.options || []);
        setDanosOptions(data.danos?.options || []);
        setLlavesOptions(data.llaves?.options || []);

        const templates = data.templates || {};
        setTplUbiPrefix(templates.ubicacion_prefix || "Ubicación de la caja CTO");
        setTplDanosPrefix(templates.danos_prefix || "Estado de la CTO");
        setTplLlavesPrefix(templates.llaves_prefix || "Se requieren llaves para acceder a la CTO");
        setTplLlavesPresident(templates.llaves_president || "Presidente/Conserje");
        setTplLlavesPhone(templates.llaves_phone || "Teléfono");
        setTplLlavesNodata(templates.llaves_nodata || "Sin datos de contacto");
        setTplInfluenciaTitle(templates.influencia_title || "Área de influencia");
        
        setTplAntalaYes(data.antala?.text_yes || "Se realiza sincronismo/levantamiento en Antala. Se realizan etiquetas de caja, cable y divisor.");
        setTplAntalaFailed(data.antala?.text_failed || "No se ha podido realizar el sincronismo/levantamiento en Antala debido a que:");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        threshold: parseFloat(threshold) || 22.99,
        noSignalValue: parseFloat(noSignalValue) || 70.0,
        ubicacion: {
          label_es: "Dónde se encuentra la CTO",
          label_uk: "Де знаходиться CTO",
          options: ubicacionOptions
        },
        danos: {
          label_es: "¿La CTO está con daños, visibles suciedades?",
          label_uk: "Чи має CTO видимі пошкодження або бруд?",
          options: danosOptions
        },
        llaves: {
          label_es: "¿Se requieren llaves?",
          label_uk: "Чи потрібні ключі?",
          options: llavesOptions
        },
        antala: {
          label_es: "¿Se requiere Levantamiento en Antala?",
          label_uk: "Чи потрібне внесення в Antala?",
          text_yes: tplAntalaYes,
          text_failed: tplAntalaFailed
        },
        influencia: {
          label_es: "Área de influencia",
          label_uk: "Зона впливу",
          options: [
            { key: "porterillo", es: "Porterillo automático", uk: "Домофон", text: "Se adjunta foto del porterillo automático" },
            { key: "calle", es: "Calle", uk: "Вулиця" },
            { key: "otros", es: "Otros", uk: "Інше" }
          ]
        },
        templates: {
          ubicacion_prefix: tplUbiPrefix,
          danos_prefix: tplDanosPrefix,
          llaves_prefix: tplLlavesPrefix,
          llaves_president: tplLlavesPresident,
          llaves_phone: tplLlavesPhone,
          llaves_nodata: tplLlavesNodata,
          influencia_title: tplInfluenciaTitle
        }
      };

      const res = await fetch("/api/admin/questionnaire-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Configuración visual guardada correctamente.");
      } else {
        alert("Error al guardar la configuración.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  // Option list updates
  const updateOption = (
    list: TranslationOption[], 
    setList: React.Dispatch<React.SetStateAction<TranslationOption[]>>, 
    idx: number, 
    key: "es" | "uk", 
    val: string
  ) => {
    const updated = [...list];
    updated[idx] = { ...updated[idx], [key]: val };
    setList(updated);
  };

  const deleteOption = (
    list: TranslationOption[], 
    setList: React.Dispatch<React.SetStateAction<TranslationOption[]>>, 
    idx: number
  ) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const addOption = (
    list: TranslationOption[], 
    setList: React.Dispatch<React.SetStateAction<TranslationOption[]>>
  ) => {
    setList([...list, { es: "", uk: "" }]);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-color)", color: "var(--text-color)" }}>
        <p style={{ fontWeight: 700 }}>Cargando administrador...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-color)",
      color: "var(--text-color)",
      padding: "2rem 1rem",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Navigation / Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600 }}>ADMINISTRACIÓN</span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "4px 0 0 0" }}>Opciones del Cuestionario</h1>
          </div>
          <Link href="/admin/settings" className="btn" style={{ background: "rgba(0,0,0,0.05)", border: "1px solid var(--border-color)", padding: "8px 16px", minHeight: "36px", borderRadius: "8px", fontWeight: 700 }}>
            Volver a Ajustes
          </Link>
        </header>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* LÍMITES DE SEÑAL */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              Límites de Atenuación Óptica
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Umbral de atenuación máxima (dBm):</label>
                <input 
                  type="number" 
                  step="any"
                  value={threshold} 
                  onChange={e => setThreshold(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Valor sin señal (dBm):</label>
                <input 
                  type="number" 
                  step="any"
                  value={noSignalValue} 
                  onChange={e => setNoSignalValue(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
            </div>
          </div>

          {/* OPCIONES DE UBICACIÓN */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Opciones de Ubicación</h2>
              <button type="button" onClick={() => addOption(ubicacionOptions, setUbicacionOptions)} className="btn btn-primary" style={{ minHeight: "32px", padding: "4px 12px", fontSize: "0.8rem" }}>
                + Añadir Opción
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ubicacionOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input 
                    type="text" 
                    value={opt.es} 
                    onChange={e => updateOption(ubicacionOptions, setUbicacionOptions, idx, "es", e.target.value)} 
                    placeholder="Español (p. ej., Interior - En techo falso)" 
                    className="input-field" 
                    style={{ flex: 1, padding: "8px 12px", minHeight: "38px" }}
                  />
                  <input 
                    type="text" 
                    value={opt.uk} 
                    onChange={e => updateOption(ubicacionOptions, setUbicacionOptions, idx, "uk", e.target.value)} 
                    placeholder="Ucraniano" 
                    className="input-field" 
                    style={{ flex: 1, padding: "8px 12px", minHeight: "38px" }}
                  />
                  <button type="button" onClick={() => deleteOption(ubicacionOptions, setUbicacionOptions, idx)} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "6px", width: "34px", height: "34px", cursor: "pointer", fontWeight: 700 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* OPCIONES DE DAÑOS */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Opciones de Daños/Suciedad</h2>
              <button type="button" onClick={() => addOption(danosOptions, setDanosOptions)} className="btn btn-primary" style={{ minHeight: "32px", padding: "4px 12px", fontSize: "0.8rem" }}>
                + Añadir Opción
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {danosOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input 
                    type="text" 
                    value={opt.es} 
                    onChange={e => updateOption(danosOptions, setDanosOptions, idx, "es", e.target.value)} 
                    placeholder="Español (p. ej., Le falta la tapa)" 
                    className="input-field" 
                    style={{ flex: 1, padding: "8px 12px", minHeight: "38px" }}
                  />
                  <input 
                    type="text" 
                    value={opt.uk} 
                    onChange={e => updateOption(danosOptions, setDanosOptions, idx, "uk", e.target.value)} 
                    placeholder="Ucraniano" 
                    className="input-field" 
                    style={{ flex: 1, padding: "8px 12px", minHeight: "38px" }}
                  />
                  <button type="button" onClick={() => deleteOption(danosOptions, setDanosOptions, idx)} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "6px", width: "34px", height: "34px", cursor: "pointer", fontWeight: 700 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* OPCIONES DE LLAVES */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Opciones de Llaves</h2>
              <button type="button" onClick={() => addOption(llavesOptions, setLlavesOptions)} className="btn btn-primary" style={{ minHeight: "32px", padding: "4px 12px", fontSize: "0.8rem" }}>
                + Añadir Opción
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {llavesOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input 
                    type="text" 
                    value={opt.es} 
                    onChange={e => updateOption(llavesOptions, setLlavesOptions, idx, "es", e.target.value)} 
                    placeholder="Español (p. ej., Nombre del presidente/conserje)" 
                    className="input-field" 
                    style={{ flex: 1, padding: "8px 12px", minHeight: "38px" }}
                  />
                  <input 
                    type="text" 
                    value={opt.uk} 
                    onChange={e => updateOption(llavesOptions, setLlavesOptions, idx, "uk", e.target.value)} 
                    placeholder="Ucraniano" 
                    className="input-field" 
                    style={{ flex: 1, padding: "8px 12px", minHeight: "38px" }}
                  />
                  <button type="button" onClick={() => deleteOption(llavesOptions, setLlavesOptions, idx)} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "6px", width: "34px", height: "34px", cursor: "pointer", fontWeight: 700 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* PLANTILLAS DE COMENTARIOS */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              Plantillas del Comentario Generado
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Prefijo de Ubicación:</label>
                <input 
                  type="text" 
                  value={tplUbiPrefix} 
                  onChange={e => setTplUbiPrefix(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Prefijo de Daños/Estado:</label>
                <input 
                  type="text" 
                  value={tplDanosPrefix} 
                  onChange={e => setTplDanosPrefix(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Texto de Llaves requeridas:</label>
                <input 
                  type="text" 
                  value={tplLlavesPrefix} 
                  onChange={e => setTplLlavesPrefix(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Etiqueta de Presidente/Conserje:</label>
                <input 
                  type="text" 
                  value={tplLlavesPresident} 
                  onChange={e => setTplLlavesPresident(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Etiqueta de Teléfono:</label>
                <input 
                  type="text" 
                  value={tplLlavesPhone} 
                  onChange={e => setTplLlavesPhone(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Texto "Sin datos de contacto":</label>
                <input 
                  type="text" 
                  value={tplLlavesNodata} 
                  onChange={e => setTplLlavesNodata(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Título de Área de Influencia:</label>
                <input 
                  type="text" 
                  value={tplInfluenciaTitle} 
                  onChange={e => setTplInfluenciaTitle(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Texto de Sincronismo Antala Exitoso:</label>
                <input 
                  type="text" 
                  value={tplAntalaYes} 
                  onChange={e => setTplAntalaYes(e.target.value)} 
                  className="input-field" 
                  style={{ padding: "8px 12px", minHeight: "38px" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>Texto de Sincronismo Antala Fallido:</label>
                <textarea 
                  value={tplAntalaFailed} 
                  onChange={e => setTplAntalaFailed(e.target.value)} 
                  className="input-field" 
                  rows={2}
                  style={{ padding: "8px 12px", fontFamily: "inherit" }}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: "100%", fontWeight: 700, minHeight: "44px", justifyContent: "center" }}>
            {saving ? "Guardando..." : "Guardar Configuración Visual del Cuestionario"}
          </button>

        </form>

      </div>
    </div>
  );
}
