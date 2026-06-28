"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface PublicMapProps {
  ctos: CtoReport[];
}

function createPublicDotIcon(color: string) {
  const s = 18;
  return L.divIcon({
    className: "custom-public-dot",
    html: `<div style="width:${s}px; height:${s}px; border-radius:50%; background:${color}; border:2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -s / 2]
  });
}

// Control central para ajustar vista
function ChangeMapView({ coords }: { coords: [number, number] }) {
  const map = L.Map ? useRef<L.Map | null>(null) : null; // Safe wrapper
  return null;
}

export default function PublicMap({ ctos }: PublicMapProps) {
  // Coordenadas iniciales por defecto (o primer CTO)
  const defaultCoords: [number, number] = ctos.length > 0 ? [ctos[0].lat, ctos[0].lng] : [36.721268, -4.421266];

  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
      <MapContainer
        center={defaultCoords}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />
        {ctos.map((c) => (
          <Marker
            key={c.id}
            position={[c.lat, c.lng]}
            icon={createPublicDotIcon(c.subStatusColor)}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: "0.85rem", padding: "2px" }}>
                <strong style={{ fontSize: "0.95rem", color: "var(--primary-color)" }}>CTO {c.num}</strong>
                <div style={{ marginTop: "6px" }}>
                  <strong>Zona:</strong> {c.zona} <br />
                  <strong>Cluster:</strong> {c.cluster} <br />
                  <strong>Estado:</strong> <span style={{ color: c.status === "CORRECTO" ? "#166534" : "#991b1b", fontWeight: 700 }}>{c.status}</span> <br />
                  <strong>Subestado:</strong> {c.subStatusName} <br />
                  <strong>Auditado por:</strong> {c.auditor} <br />
                  <strong>Hora:</strong> {c.auditTime}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
