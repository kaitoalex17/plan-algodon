"use client";

import dynamic from "next/dynamic";

const PublicMap = dynamic(() => import("./PublicMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
      <p style={{ fontWeight: 600, color: "#64748b", fontSize: "0.88rem" }}>Cargando mapa en tiempo real...</p>
    </div>
  ),
});

export default PublicMap;
