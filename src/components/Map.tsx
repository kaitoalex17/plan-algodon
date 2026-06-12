import { MapContainer, TileLayer, CircleMarker, Circle, useMapEvents, useMap } from "react-leaflet";
import { useState, useEffect, useRef } from "react";

// Componente para manejar eventos del mapa, guardar estado de vista en BD y geolocalización
function MapStateAndTracking({ 
  initialMapState, 
  isTracking, 
  onLocationUpdate,
  userLocation
}: { 
  initialMapState: any, 
  isTracking: boolean, 
  onLocationUpdate: (loc: any) => void,
  userLocation: any
}) {
  const map = useMap();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstLocationRef = useRef<boolean>(true);

  // Cargar posición inicial guardada en la BD
  useEffect(() => {
    if (initialMapState?.lat && initialMapState?.lng && initialMapState?.zoom) {
      map.setView([initialMapState.lat, initialMapState.lng], initialMapState.zoom);
    }
  }, [map, initialMapState]);

  // Guardar la vista (lat, lng, zoom) con Debounce en la BD
  const saveMapView = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const center = map.getCenter();
      const zoom = map.getZoom();

      try {
        await fetch("/api/users/map-state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: center.lat, lng: center.lng, zoom })
        });
      } catch (err) {
        console.error("Error guardando estado del mapa:", err);
      }
    }, 2000); // Esperar 2 segundos de inactividad antes de guardar
  };

  useMapEvents({
    moveend: saveMapView,
    zoomend: saveMapView,
  });

  // Manejar Geolocalización (GPS Continuo)
  useEffect(() => {
    if (!isTracking) {
      map.stopLocate();
      onLocationUpdate(null);
      firstLocationRef.current = true;
      return;
    }

    // Activar geolocalización continua
    map.locate({ watch: true, enableHighAccuracy: true });

    const onLocationFound = (e: any) => {
      onLocationUpdate({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        accuracy: e.accuracy
      });

      // Si es la primera vez que se localiza, centrar mapa en el usuario
      if (firstLocationRef.current) {
        map.flyTo(e.latlng, 17);
        firstLocationRef.current = false;
      }
    };

    const onLocationError = (e: any) => {
      console.warn("Error de GPS:", e.message);
    };

    map.on("locationfound", onLocationFound);
    map.on("locationerror", onLocationError);

    return () => {
      map.off("locationfound", onLocationFound);
      map.off("locationerror", onLocationError);
      map.stopLocate();
    };
  }, [map, isTracking, onLocationUpdate]);

  return null;
}

// Marcadores de las CTOs en el mapa
function CtoMarkers({ ctos, onCtoClick, zoomThreshold }: { ctos: any[], onCtoClick: (cto: any) => void, zoomThreshold: number }) {
  const map = useMap();
  const [bounds, setBounds] = useState<any>(null);
  const [zoom, setZoom] = useState<number>(map.getZoom());
  
  useEffect(() => {
    setBounds(map.getBounds());
  }, [map]);

  useMapEvents({
    moveend: () => setBounds(map.getBounds()),
    zoomend: () => setZoom(map.getZoom())
  });
  
  if (zoom < zoomThreshold) {
    return (
      <div style={{ position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "rgba(255,255,255,0.95)", padding: "8px 20px", borderRadius: "20px", fontSize: "14px", fontWeight: 600, boxShadow: "0 2px 10px rgba(0,0,0,0.1)", border: "1px solid #FF790040" }}>
        Acércate para ver las CTOs (Zoom {zoom} / {zoomThreshold})
      </div>
    );
  }

  const visibleCtos = ctos.filter(cto => {
    if (!bounds) return true; 
    return bounds.contains([cto.lat, cto.lng]);
  });

  return (
    <>
      {visibleCtos.map(cto => (
        <CircleMarker 
          key={cto.id}
          center={[cto.lat, cto.lng]}
          radius={6}
          pathOptions={{ 
            color: cto.subStatus?.color || (cto.status === "PENDIENTE" ? "#808080" : cto.status === "CORRECTO" ? "#10b981" : "#ef4444"), 
            fillColor: cto.assignedTo?.color || "#ffffff", 
            fillOpacity: 1,
            weight: 2
          }}
          eventHandlers={{
            click: () => onCtoClick(cto)
          }}
        />
      ))}
    </>
  );
}

// Botones flotantes de localización (GPS)
function GpsControls({ 
  isTracking, 
  setIsTracking,
  userLocation
}: { 
  isTracking: boolean, 
  setIsTracking: (t: boolean) => void,
  userLocation: any
}) {
  const map = useMap();

  const centerOnUser = () => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 17);
    }
  };

  return (
    <div style={{ position: "absolute", bottom: "75px", right: "20px", zIndex: 1000, display: "flex", flexDirection: "column", gap: "10px" }}>
      
      {/* Botón centrar en mi posición */}
      {isTracking && userLocation && (
        <button 
          onClick={centerOnUser}
          title="Centrar en mi ubicación"
          style={{
            background: "white", border: "1px solid #cbd5e1", padding: "10px", borderRadius: "50%",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "pointer", width: "50px", height: "50px",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px"
          }}
        >
          🎯
        </button>
      )}

      {/* Botón Activar/Desactivar GPS Continuo */}
      <button 
        onClick={() => setIsTracking(!isTracking)}
        title={isTracking ? "Desactivar GPS" : "Activar GPS"}
        style={{
          background: isTracking ? "#FF7900" : "white", 
          border: isTracking ? "none" : "1px solid #cbd5e1", 
          padding: "10px", borderRadius: "50%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)", cursor: "pointer", width: "50px", height: "50px",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
          transition: "all 0.2s",
          position: "relative"
        }}
      >
        🛰️
        {isTracking && (
          <span style={{
            position: "absolute", top: "2px", right: "2px", width: "12px", height: "12px", 
            borderRadius: "50%", background: "#10b981", border: "2px solid white",
            animation: "pulse 1.5s infinite"
          }} />
        )}
      </button>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

// Leyenda del Mapa (Colores de estados y técnicos)
function MapLegend({ users }: { users: any[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      position: "absolute", bottom: "75px", left: "20px", zIndex: 1000,
      background: "white", padding: open ? "12px" : "8px 12px", borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0",
      maxWidth: "250px", transition: "all 0.2s"
    }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", color: "#1e293b", gap: "8px" }}
      >
        <span>📖 Leyenda de Colores</span>
        <span>{open ? "▼" : "▲"}</span>
      </div>

      {open && (
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
          {/* Estados (Bordes) */}
          <div>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Borde (Estado)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid #808080", background: "white" }} />
                <span>Pendiente</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid #10b981", background: "white" }} />
                <span>Correcto</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid #ef4444", background: "white" }} />
                <span>Fallo</span>
              </div>
            </div>
          </div>

          {/* Técnicos (Relleno) */}
          <div>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Relleno (Asignación)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.8rem", maxHeight: "120px", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "1px solid #cbd5e1", background: "#ffffff" }} />
                <span>Sin asignar</span>
              </div>
              {users.map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "1px solid #cbd5e1", background: u.color }} />
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "180px" }}>{u.name || u.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Map({ 
  ctos, 
  onCtoClick,
  initialMapState,
  zoomThreshold = 12,
  users = []
}: { 
  ctos: any[], 
  onCtoClick: (cto: any) => void,
  initialMapState?: any,
  zoomThreshold?: number,
  users?: any[]
}) {
  // Google Maps Normal por defecto: vt/lyrs=m
  const [tileUrl, setTileUrl] = useState("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}");
  const [showMapTypes, setShowMapTypes] = useState(false);
  
  // Estados de Geolocalización
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number, accuracy: number } | null>(null);

  return (
    <MapContainer 
      center={[initialMapState?.lat || 36.425, initialMapState?.lng || -5.144]} 
      zoom={initialMapState?.zoom || 14} 
      className="map-container" 
      zoomControl={false}
    >
      <TileLayer url={tileUrl} />
      
      {/* Selector de tipo de mapa simplificado (Icono + Popover) */}
      <div style={{ position: "absolute", top: "80px", right: "10px", zIndex: 1000 }}>
        <button 
          onClick={() => setShowMapTypes(!showMapTypes)}
          style={{
            width: "44px", height: "44px", borderRadius: "50%", background: "white",
            border: "1.5px solid #cbd5e1", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", cursor: "pointer",
            transition: "transform 0.2s"
          }}
          title="Cambiar capa de mapa"
        >
          🗺️
        </button>

        {showMapTypes && (
          <div style={{
            position: "absolute", right: "50px", top: "0", background: "white",
            border: "1.5px solid #cbd5e1", borderRadius: "12px", padding: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "6px",
            minWidth: "160px", zIndex: 1001
          }}>
            {[
              { value: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", label: "Google Normal" },
              { value: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", label: "Google Satélite" },
              { value: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", label: "Google Híbrido" },
              { value: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", label: "OpenStreetMap" }
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setTileUrl(opt.value);
                  setShowMapTypes(false);
                }}
                style={{
                  background: tileUrl === opt.value ? "#FF7900" : "transparent",
                  color: tileUrl === opt.value ? "white" : "#111827",
                  border: "none", borderRadius: "6px", padding: "8px 12px", textAlign: "left",
                  fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Marcador del Usuario (GPS) */}
      {isTracking && userLocation && (
        <>
          {/* Círculo de precisión azul claro */}
          <Circle 
            center={[userLocation.lat, userLocation.lng]} 
            radius={userLocation.accuracy} 
            pathOptions={{ fillColor: "#3b82f6", fillOpacity: 0.15, color: "#3b82f6", weight: 1 }} 
          />
          {/* Punto azul del usuario */}
          <CircleMarker 
            center={[userLocation.lat, userLocation.lng]} 
            radius={10} 
            pathOptions={{ fillColor: "#3b82f6", fillOpacity: 1, color: "white", weight: 3 }} 
          />
        </>
      )}

      {/* Marcadores de CTOs */}
      <CtoMarkers ctos={ctos} onCtoClick={onCtoClick} zoomThreshold={zoomThreshold} />

      {/* Lógica de estado y rastreador en el mapa */}
      <MapStateAndTracking 
        initialMapState={initialMapState} 
        isTracking={isTracking} 
        onLocationUpdate={setUserLocation} 
        userLocation={userLocation}
      />

      {/* Controles de GPS */}
      <GpsControls 
        isTracking={isTracking} 
        setIsTracking={setIsTracking} 
        userLocation={userLocation}
      />

      {/* Leyenda del mapa */}
      <MapLegend users={users} />
    </MapContainer>
  );
}
