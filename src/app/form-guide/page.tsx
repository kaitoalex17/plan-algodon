"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Splitter = {
  signal: string; // string input to preserve user typing
};

type DamageKey = 
  | "tapa"
  | "rotos"
  | "doblados"
  | "cerrar"
  | "sucia"
  | "enfrentadores"
  | "splitterRoto";

export default function FormGuidePage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white" }}>
        <p style={{ fontWeight: 700 }}>Cargando Guía de Formulario...</p>
      </div>
    }>
      <FormGuideContent />
    </Suspense>
  );
}

function FormGuideContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctoId = searchParams.get("ctoId");
  const { data: session, status: authStatus } = useSession();

  // Questionnaire Config
  const [config, setConfig] = useState<any>(null);
  const [lang, setLang] = useState<"es" | "uk">("es");
  const [ctoNum, setCtoNum] = useState("");

  // Input states
  const [ubicacionOption, setUbicacionOption] = useState("");
  const [ubicacionOtros, setUbicacionOtros] = useState("");
  
  const [tieneDanos, setTieneDanos] = useState<boolean | null>(null);
  const [danosChecked, setDanosChecked] = useState<Record<DamageKey, boolean>>({
    tapa: false,
    rotos: false,
    doblados: false,
    cerrar: false,
    sucia: false,
    enfrentadores: false,
    splitterRoto: false
  });

  const [requiereLlaves, setRequiereLlaves] = useState<boolean | null>(null);
  const [llavesOption, setLlavesOption] = useState("");
  const [llavesContacto, setLlavesContacto] = useState("");

  const [splitters, setSplitters] = useState<Splitter[]>([
    { signal: "" },
    { signal: "" }
  ]);

  const [requiereAntala, setRequiereAntala] = useState<boolean | null>(null);

  const [influenciaPorterillo, setInfluenciaPorterillo] = useState(false);
  const [influenciaCalle, setInfluenciaCalle] = useState(false);
  const [calleTipo, setCalleTipo] = useState("Calle");
  const [calleNumeros, setCalleNumeros] = useState<string[]>([""]);
  const [influenciaOtros, setInfluenciaOtros] = useState(false);
  const [influenciaOtrosTexto, setInfluenciaOtrosTexto] = useState("");

  const [generatedComment, setGeneratedComment] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load configuration and CTO details
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    if (ctoId) {
      // Load questionnaire config
      fetch("/api/admin/questionnaire-settings")
        .then(res => res.json())
        .then(data => {
          setConfig(data);
        })
        .catch(err => console.error("Error loading questionnaire config:", err));

      // Load CTO details
      fetch(`/api/ctos/${ctoId}`)
        .then(res => res.json())
        .then(data => {
          setCtoNum(data.num || "");
          if (data.formDataJson) {
            try {
              const saved = JSON.parse(data.formDataJson);
              // Pre-fill fields if they were saved before
              setLang(saved.lang || "es");
              if (saved.ubicacion) {
                setUbicacionOption(saved.ubicacion);
              }
              if (saved.danos && saved.danos.length > 0) {
                setTieneDanos(true);
                // Check matching checkboxes
                const updatedDanos = { ...danosChecked };
                saved.danosKeys?.forEach((k: DamageKey) => {
                  updatedDanos[k] = true;
                });
                setDanosChecked(updatedDanos);
              } else if (saved.danos) {
                setTieneDanos(false);
              }
              setRequiereLlaves(saved.requiereLlaves);
              setLlavesOption(saved.llavesOption || "");
              setLlavesContacto(saved.datosLlaves || "");
              if (saved.splitters && saved.splitters.length > 0) {
                setSplitters(saved.splitters);
              }
              setRequiereAntala(saved.requiereAntala);
              setInfluenciaPorterillo(saved.influenciaPorterillo || false);
              setInfluenciaCalle(saved.influenciaCalle || false);
              setCalleTipo(saved.calleTipo || "Calle");
              setCalleNumeros(saved.calleNumeros || [""]);
              setInfluenciaOtros(saved.influenciaOtros || false);
              setInfluenciaOtrosTexto(saved.influenciaOtrosTexto || "");
            } catch (e) {
              console.error("Error parsing prefilled form data:", e);
            }
          }
        })
        .catch(err => console.error("Error loading CTO details:", err));
    }
  }, [ctoId, authStatus, router]);

  if (authStatus === "loading" || !config) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white" }}>
        <p style={{ fontWeight: 700 }}>Cargando Guía de Formulario...</p>
      </div>
    );
  }

  const addSplitter = () => {
    setSplitters([...splitters, { signal: "" }]);
  };

  const removeSplitter = (index: number) => {
    if (splitters.length <= 1) return;
    setSplitters(splitters.filter((_, i) => i !== index));
  };

  const updateSplitterSignal = (index: number, val: string) => {
    const updated = [...splitters];
    updated[index].signal = val;
    setSplitters(updated);
  };

  const addCalleNumero = () => {
    setCalleNumeros([...calleNumeros, ""]);
  };

  const removeCalleNumero = (index: number) => {
    if (calleNumeros.length <= 1) return;
    setCalleNumeros(calleNumeros.filter((_, i) => i !== index));
  };

  const updateCalleNumero = (index: number, val: string) => {
    const updated = [...calleNumeros];
    updated[index] = val;
    setCalleNumeros(updated);
  };

  const generateReportText = () => {
    const lines: string[] = [];

    // 1. Ubicación
    let finalUbi = ubicacionOption;
    if (ubicacionOption === "Otros (introducir manualmente)" || ubicacionOption === "Otros" || ubicacionOption.startsWith("Otros")) {
      finalUbi = ubicacionOtros || "Otros";
    }
    lines.push(`- Ubicación de la caja CTO: ${finalUbi || "No indicada"}`);

    // 2. Daños
    if (tieneDanos === true) {
      const selectedDanos: string[] = [];
      const keysMap: Record<DamageKey, string> = {
        tapa: "Le falta la tapa",
        rotos: "Tiene cables rotos o dañados",
        doblados: "Tiene cables doblados",
        cerrar: "No se puede cerrar",
        sucia: "Está sucia y/o llena de agua",
        enfrentadores: "Le faltan enfrentadores",
        splitterRoto: "Tiene los divisores/splitter rotos"
      };

      (Object.keys(danosChecked) as DamageKey[]).forEach(k => {
        if (danosChecked[k]) selectedDanos.push(keysMap[k]);
      });

      if (selectedDanos.length > 0) {
        lines.push(`- Estado de la CTO: ${selectedDanos.join(", ")}`);
      }
    }

    // 3. Llaves
    if (requiereLlaves === true) {
      let contactDetail = "";
      if (llavesOption === "Nombre del presidente/conserje" && llavesContacto) {
        contactDetail = `Contacto: ${llavesContacto}`;
      } else if (llavesOption === "Número de teléfono" && llavesContacto) {
        contactDetail = `Teléfono: ${llavesContacto}`;
      } else {
        contactDetail = "Sin datos de contacto";
      }
      lines.push(`- Se requieren llaves para acceder a la CTO. ${contactDetail}`);
    }

    // 4. Splitters Attenuation & Antala Failures
    const threshold = config.threshold || 22.99;
    const noSignalVal = config.noSignalValue || 70.0;

    const splitterComments: string[] = [];
    const antalaErrors: string[] = [];

    splitters.forEach((s, idx) => {
      if (!s.signal) return;
      
      // Clean and format signal: e.g. "22.15" -> "-22.15"
      let signalStr = s.signal.trim();
      if (!signalStr.startsWith("-")) {
        signalStr = "-" + signalStr;
      }
      
      const numVal = Math.abs(parseFloat(signalStr));
      
      if (!isNaN(numVal)) {
        if (numVal === noSignalVal) {
          splitterComments.push(`* Divisor ${idx + 1}: ${signalStr} dBm (No hay señal)`);
          antalaErrors.push(`- No hay señal en el divisor/splitter ${idx + 1}`);
        } else if (numVal > threshold) {
          splitterComments.push(`* Divisor ${idx + 1}: ${signalStr} dBm (Señal elevada, se requiere mejorar o reparar)`);
          antalaErrors.push(`- La señal es elevada en el divisor/splitter ${idx + 1}`);
        } else {
          splitterComments.push(`* Divisor ${idx + 1}: ${signalStr} dBm`);
        }
      }
    });

    if (splitterComments.length > 0) {
      lines.push("- Potencias ópticas registradas:");
      splitterComments.forEach(sc => lines.push(`  ${sc}`));
    }

    // 5. Antala Sincronismo
    if (requiereAntala === true) {
      if (antalaErrors.length > 0) {
        lines.push("- No se ha podido realizar el sincronismo/levantamiento en Antala debido a que:");
        antalaErrors.forEach(ae => lines.push(`  ${ae}`));
      } else {
        lines.push("- Se realiza sincronismo/levantamiento en Antala. Se realizan etiquetas de caja, cable y divisor.");
      }
    }

    // 6. Área de influencia
    const influenciaParts: string[] = [];
    if (influenciaPorterillo) {
      influenciaParts.push("Se adjunta foto del porterillo automático");
    }
    if (influenciaCalle) {
      const numbers = calleNumeros.filter(n => n.trim() !== "");
      influenciaParts.push(`Vía pública (${calleTipo} y Números: ${numbers.join(", ") || "N/A"})`);
    }
    if (influenciaOtros && influenciaOtrosTexto) {
      influenciaParts.push(`Otros: ${influenciaOtrosTexto}`);
    }

    if (influenciaParts.length > 0) {
      lines.push("- Área de influencia:");
      influenciaParts.forEach(ip => lines.push(`  * ${ip}`));
    }

    return lines.join("\n");
  };

  const handleSaveAndShow = async () => {
    const reportText = generateReportText();
    setGeneratedComment(reportText);
    setShowResultModal(true);
    setSaving(true);

    try {
      // Build raw answers payload to store in formDataJson
      const selectedDanosKeys = (Object.keys(danosChecked) as DamageKey[]).filter(k => danosChecked[k]);
      
      let finalUbi = ubicacionOption;
      if (ubicacionOption === "Otros (introducir manualmente)" || ubicacionOption === "Otros") {
        finalUbi = ubicacionOtros;
      }

      // Format splitters
      const formattedSplitters = splitters.map(s => {
        let signalStr = s.signal.trim();
        if (signalStr && !signalStr.startsWith("-")) {
          signalStr = "-" + signalStr;
        }
        return { signal: signalStr };
      });

      const payload = {
        lang,
        ubicacion: finalUbi,
        danos: tieneDanos ? selectedDanosKeys.map(k => {
          const names: Record<DamageKey, string> = {
            tapa: "Le falta la tapa",
            rotos: "Tiene cables rotos",
            doblados: "Tiene cables doblados",
            cerrar: "No se puede cerrar",
            sucia: "Sucia/Agua",
            enfrentadores: "Faltan enfrentadores",
            splitterRoto: "Splitters rotos"
          };
          return names[k];
        }) : [],
        danosKeys: selectedDanosKeys,
        requiereLlaves,
        llavesOption,
        datosLlaves: llavesContacto,
        splitters: formattedSplitters,
        requiereAntala,
        influenciaPorterillo,
        influenciaCalle,
        calleTipo,
        calleNumeros: calleNumeros.filter(n => n.trim() !== ""),
        influenciaOtros,
        influenciaOtrosTexto,
        generatedComment: reportText
      };

      // Save to server
      const res = await fetch(`/api/ctos/${ctoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentText: reportText, // Adds directly to CTO comments wall
          formDataJson: JSON.stringify(payload), // Saves form data
          hasFormulario: true // Mark checklist item as done
        })
      });

      if (!res.ok) {
        alert("Atención: El comentario se generó pero no se pudo guardar en el servidor. Cópialo manualmente.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor. Cópialo manualmente.");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedComment);
    alert("¡Comentario copiado al portapapeles con éxito!");
  };

  // Translations
  const t = {
    title: lang === "es" ? "Guía de Formulario de Auditoría" : "Посібник з аудиту форми",
    subtitle: lang === "es" ? `CTO número: ${ctoNum}` : `CTO номер: ${ctoNum}`,
    langSelect: lang === "es" ? "Idioma" : "Мова",
    
    // Q1
    q1Title: lang === "es" ? "1. ¿Dónde se encuentra la CTO?" : "1. Де знаходиться CTO?",
    q1Label: lang === "es" ? "Selecciona la ubicación:" : "Оберіть розташування:",
    q1WriteOther: lang === "es" ? "Especifica la ubicación (otros):" : "Вкажіть розташування (інше):",

    // Q2
    q2Title: lang === "es" ? "2. ¿La CTO está con daños o suciedad visible?" : "2. Чи має CTO видимі пошкодження або бруд?",
    yes: lang === "es" ? "Sí" : "Так",
    no: lang === "es" ? "No" : "Ні",
    danosLabel: lang === "es" ? "Marca los problemas detectados:" : "Позначте виявлені проблеми:",
    danosOptions: {
      tapa: lang === "es" ? "Le falta la tapa" : "Відсутня кришка",
      rotos: lang === "es" ? "Tiene cables rotos o dañados" : "Має обірвані або пошкоджені кабелі",
      doblados: lang === "es" ? "Tiene cables doblados" : "Має загнуті кабелі",
      cerrar: lang === "es" ? "No se puede cerrar" : "Не закривається",
      sucia: lang === "es" ? "Está sucia y/o llena de agua" : "Брудна та/або заповнена водою",
      enfrentadores: lang === "es" ? "Le faltan enfrentadores" : "Відсутні з'єднувачі/адаптери",
      splitterRoto: lang === "es" ? "Tiene los divisores/splitter rotos" : "Має зламані дільники/спліттери"
    },

    // Q3
    q3Title: lang === "es" ? "3. ¿Se requieren llaves?" : "3. Чи потрібні ключі?",
    llavesLabel: lang === "es" ? "Selecciona una opción de contacto:" : "Оберіть варіант контакту:",
    llavesOptions: {
      conserje: lang === "es" ? "Nombre del presidente/conserje" : "Ім'я голови/консьєржа",
      tel: lang === "es" ? "Número de teléfono" : "Номер телефону",
      nodata: lang === "es" ? "No tengo ningún dato (se requieren llaves)" : "Немає жодних даних (потрібні ключі)"
    },
    llavesInput: lang === "es" ? "Introduce los datos de contacto:" : "Введіть контактні дані:",

    // Q4
    q4Title: lang === "es" ? "4. Indicar señal de Divisores" : "4. Вказати сигнал дільників",
    q4Help: lang === "es" ? "Introduce la potencia sin el signo menos (se añadirá automáticamente). Ej: 22.15" : "Введіть потужність без мінуса (він додасться автоматично). Напр: 22.15",
    splitterNum: lang === "es" ? "Divisor" : "Дільник",
    addSplitterBtn: lang === "es" ? "Agregar divisor" : "Додати дільник",

    // Q5
    q5Title: lang === "es" ? "5. ¿Se requiere Levantamiento en Antala?" : "5. Чи потрібне внесення в Antala?",

    // Q6
    q6Title: lang === "es" ? "6. Área de influencia" : "6. Зона впливу",
    calleTipoLabel: lang === "es" ? "Tipo de vía:" : "Тип вулиці:",
    calleNumerosLabel: lang === "es" ? "Números de portales:" : "Номери будинків:",
    addCalleNumBtn: lang === "es" ? "Agregar número" : "Додати номер",
    influenciaOptions: {
      porterillo: lang === "es" ? "Porterillo automático" : "Домофон",
      calle: lang === "es" ? "Calle / Vía pública" : "Вулиця / Громадське місце",
      otros: lang === "es" ? "Otros (introducir manualmente)" : "Інше (ввести вручну)"
    },
    influenciaOtrosLabel: lang === "es" ? "Detalla otros elementos:" : "Вкажіть інші елементи:",

    submitBtn: lang === "es" ? "Guardar y ver comentario" : "Зберегти та переглянути коментар",
    backBtn: lang === "es" ? "Volver" : "Назад"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      color: "white",
      fontFamily: "system-ui, sans-serif",
      padding: "1.5rem 1rem"
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        {/* Header / Idioma */}
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "10px 16px"
        }}>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>{t.title}</h1>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{t.subtitle}</span>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={() => setLang("es")} 
              style={{
                background: lang === "es" ? "var(--primary-color)" : "#334155",
                color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem"
              }}
            >
              ESP
            </button>
            <button 
              onClick={() => setLang("uk")} 
              style={{
                background: lang === "uk" ? "var(--primary-color)" : "#334155",
                color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem"
              }}
            >
              UKR
            </button>
          </div>
        </header>

        <main style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* 1. UBICACIÓN */}
          <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px 0", color: "#f97316" }}>{t.q1Title}</h2>
            <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "8px" }}>{t.q1Label}</label>
            <select
              value={ubicacionOption}
              onChange={e => setUbicacionOption(e.target.value)}
              style={{
                width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "white", fontSize: "0.9rem"
              }}
            >
              <option value="">-- Selecciona --</option>
              {config.ubicacion?.options?.map((opt: any, i: number) => (
                <option key={i} value={opt.es}>
                  {lang === "es" ? opt.es : opt.uk}
                </option>
              ))}
            </select>

            {(ubicacionOption === "Otros (introducir manualmente)" || ubicacionOption === "Otros" || ubicacionOption.startsWith("Otros")) && (
              <div style={{ marginTop: "10px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "6px" }}>{t.q1WriteOther}</label>
                <input 
                  type="text"
                  value={ubicacionOtros}
                  onChange={e => setUbicacionOtros(e.target.value)}
                  placeholder="Ej: Fachada exterior..."
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "white", fontSize: "0.9rem" }}
                />
              </div>
            )}
          </section>

          {/* 2. DAÑOS */}
          <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px 0", color: "#f97316" }}>{t.q2Title}</h2>
            
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <button 
                type="button" 
                onClick={() => setTieneDanos(true)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334155",
                  background: tieneDanos === true ? "#ef4444" : "#0f172a", color: "white", fontWeight: 700, cursor: "pointer"
                }}
              >
                {t.yes}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setTieneDanos(false);
                  // Reset checkboxes
                  setDanosChecked({
                    tapa: false, rotos: false, doblados: false, cerrar: false, sucia: false, enfrentadores: false, splitterRoto: false
                  });
                }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334155",
                  background: tieneDanos === false ? "#10b981" : "#0f172a", color: "white", fontWeight: 700, cursor: "pointer"
                }}
              >
                {t.no}
              </button>
            </div>

            {tieneDanos === true && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#0f172a", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>{t.danosLabel}</span>
                
                {(Object.keys(danosChecked) as DamageKey[]).map((key) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.85rem" }}>
                    <input 
                      type="checkbox"
                      checked={danosChecked[key]}
                      onChange={e => setDanosChecked({ ...danosChecked, [key]: e.target.checked })}
                      style={{ width: "18px", height: "18px", accentColor: "#ef4444" }}
                    />
                    <span>{t.danosOptions[key]}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* 3. LLAVES */}
          <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px 0", color: "#f97316" }}>{t.q3Title}</h2>
            
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <button 
                type="button" 
                onClick={() => setRequiereLlaves(true)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334155",
                  background: requiereLlaves === true ? "#f59e0b" : "#0f172a", color: "white", fontWeight: 700, cursor: "pointer"
                }}
              >
                {t.yes}
              </button>
              <button 
                type="button" 
                onClick={() => { setRequiereLlaves(false); setLlavesOption(""); setLlavesContacto(""); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334155",
                  background: requiereLlaves === false ? "#10b981" : "#0f172a", color: "white", fontWeight: 700, cursor: "pointer"
                }}
              >
                {t.no}
              </button>
            </div>

            {requiereLlaves === true && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8" }}>{t.llavesLabel}</label>
                <select
                  value={llavesOption}
                  onChange={e => {
                    setLlavesOption(e.target.value);
                    if (e.target.value === "No tengo ningún dato") setLlavesContacto("");
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", color: "white" }}
                >
                  <option value="">-- Selecciona --</option>
                  <option value="Nombre del presidente/conserje">{t.llavesOptions.conserje}</option>
                  <option value="Número de teléfono">{t.llavesOptions.tel}</option>
                  <option value="No tengo ningún dato">{t.llavesOptions.nodata}</option>
                </select>

                {llavesOption && llavesOption !== "No tengo ningún dato" && (
                  <div style={{ marginTop: "6px" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>{t.llavesInput}</label>
                    <input 
                      type="text"
                      value={llavesContacto}
                      onChange={e => setLlavesContacto(e.target.value)}
                      placeholder={llavesOption === "Número de teléfono" ? "Ej: 666777888" : "Ej: Conserje Juan"}
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", color: "white", fontSize: "0.9rem" }}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 4. SEÑAL SPLITTERS */}
          <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 4px 0", color: "#f97316" }}>{t.q4Title}</h2>
            <span style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "12px" }}>{t.q4Help}</span>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
              {splitters.map((s, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", width: "80px", fontWeight: 700 }}>{t.splitterNum} {idx + 1}:</span>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontWeight: 700 }}>-</span>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      value={s.signal}
                      onChange={e => updateSplitterSignal(idx, e.target.value)}
                      placeholder="22.15"
                      style={{ width: "100%", padding: "10px 10px 10px 22px", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "white", fontSize: "0.9rem" }}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeSplitter(idx)}
                    disabled={splitters.length <= 1}
                    style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "8px", width: "36px", height: "36px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: splitters.length <= 1 ? 0.4 : 1 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button 
              type="button"
              onClick={addSplitter}
              style={{
                width: "100%", padding: "8px", borderRadius: "8px", border: "1px dashed #3b82f6", background: "rgba(59, 130, 246, 0.1)",
                color: "#60a5fa", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem"
              }}
            >
              {t.addSplitterBtn}
            </button>
          </section>

          {/* 5. ANTALA */}
          <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px 0", color: "#f97316" }}>{t.q5Title}</h2>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="button" 
                onClick={() => setRequiereAntala(true)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334155",
                  background: requiereAntala === true ? "var(--primary-color)" : "#0f172a", color: "white", fontWeight: 700, cursor: "pointer"
                }}
              >
                {t.yes}
              </button>
              <button 
                type="button" 
                onClick={() => setRequiereAntala(false)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334155",
                  background: requiereAntala === false ? "#10b981" : "#0f172a", color: "white", fontWeight: 700, cursor: "pointer"
                }}
              >
                {t.no}
              </button>
            </div>
          </section>

          {/* 6. ÁREA DE INFLUENCIA */}
          <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px 0", color: "#f97316" }}>{t.q6Title}</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              
              {/* Porterillo */}
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
                <input 
                  type="checkbox"
                  checked={influenciaPorterillo}
                  onChange={e => setInfluenciaPorterillo(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary-color)" }}
                />
                <span>{t.influenciaOptions.porterillo}</span>
              </label>

              {/* Calle */}
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
                <input 
                  type="checkbox"
                  checked={influenciaCalle}
                  onChange={e => setInfluenciaCalle(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary-color)" }}
                />
                <span>{t.influenciaOptions.calle}</span>
              </label>

              {influenciaCalle && (
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px", marginLeft: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>{t.calleTipoLabel}</label>
                    <select
                      value={calleTipo}
                      onChange={e => setCalleTipo(e.target.value)}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#1e293b", border: "1px solid #334155", color: "white" }}
                    >
                      <option value="Calle">Calle</option>
                      <option value="Avenida">Avenida</option>
                      <option value="Plaza">Plaza</option>
                      <option value="Pasaje">Pasaje</option>
                      <option value="Carretera">Carretera</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "6px" }}>{t.calleNumerosLabel}</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {calleNumeros.map((num, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "6px" }}>
                          <input 
                            type="text"
                            value={num}
                            onChange={e => updateCalleNumero(idx, e.target.value)}
                            placeholder="Ej: 14"
                            style={{ flex: 1, padding: "6px", borderRadius: "4px", background: "#1e293b", border: "1px solid #334155", color: "white" }}
                          />
                          <button 
                            type="button"
                            onClick={() => removeCalleNumero(idx)}
                            disabled={calleNumeros.length <= 1}
                            style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "4px", padding: "0 8px" }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      onClick={addCalleNumero}
                      style={{
                        marginTop: "8px", padding: "4px 8px", background: "none", border: "1px dashed #3b82f6", color: "#60a5fa",
                        borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      {t.addCalleNumBtn}
                    </button>
                  </div>
                </div>
              )}

              {/* Otros */}
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
                <input 
                  type="checkbox"
                  checked={influenciaOtros}
                  onChange={e => setInfluenciaOtros(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary-color)" }}
                />
                <span>{t.influenciaOptions.otros}</span>
              </label>

              {influenciaOtros && (
                <div style={{ marginLeft: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>{t.influenciaOtrosLabel}</label>
                  <textarea 
                    value={influenciaOtrosTexto}
                    onChange={e => setInfluenciaOtrosTexto(e.target.value)}
                    placeholder="Escribe otros detalles..."
                    rows={2}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "white", resize: "vertical" }}
                  />
                </div>
              )}

            </div>
          </section>

          {/* BOTÓN ENVIAR */}
          <button
            type="button"
            onClick={handleSaveAndShow}
            className="btn btn-primary"
            style={{
              width: "100%", minHeight: "50px", fontSize: "1.1rem", fontWeight: 800, justifyContent: "center",
              boxShadow: "0 4px 15px rgba(249, 115, 22, 0.4)", borderRadius: "12px", marginTop: "1rem"
            }}
          >
            {t.submitBtn}
          </button>

        </main>
      </div>

      {/* MODAL RESULTADOS */}
      {showResultModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "95%", maxWidth: "500px", padding: "1.5rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", color: "white" }}>
            
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2rem", fontWeight: 800, color: "#10b981" }}>
              {saving ? "Guardando formulario..." : "¡Comentario Generado y Guardado!"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "0 0 15px 0" }}>
              El cuestionario ha sido registrado en la CTO {ctoNum} y se ha guardado el comentario en el muro. Puedes copiar el texto generado para compartirlo:
            </p>

            <textarea 
              readOnly
              value={generatedComment}
              rows={10}
              style={{
                width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px",
                color: "white", fontFamily: "monospace", fontSize: "0.82rem", resize: "none", marginBottom: "15px"
              }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={copyToClipboard}
                className="btn btn-primary"
                style={{ flex: 1.5, justifyContent: "center", fontWeight: 700 }}
              >
                Copiar Comentario
              </button>
              <button
                onClick={() => {
                  setShowResultModal(false);
                  window.close(); // Close tab
                }}
                className="btn"
                style={{ flex: 1, background: "#334155", color: "white", border: "none", justifyContent: "center", fontWeight: 700 }}
              >
                Cerrar pestaña
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
