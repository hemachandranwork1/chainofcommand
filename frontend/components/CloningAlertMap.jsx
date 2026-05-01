"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

function CloningAlertMapInner({ location1, location2, componentId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const distance = location1 && location2
    ? haversine(location1.lat, location1.lng, location2.lat, location2.lng).toFixed(1)
    : null;

  const timeDiff = location1 && location2
    ? Math.abs(new Date(location1.timestamp) - new Date(location2.timestamp)) / 1000 / 60
    : null;

  useEffect(() => {
    if (!location1 || !location2 || !mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import("leaflet").then((L) => {
      const map = L.map(mapRef.current, {
        center: [
          (location1.lat + location2.lat) / 2,
          (location1.lng + location2.lng) / 2,
        ],
        zoom: 3,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CartoDB",
      }).addTo(map);

      const redIcon = L.divIcon({
        html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #ef4444;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: "",
      });

      L.marker([location1.lat, location1.lng], { icon: redIcon })
        .addTo(map)
        .bindPopup(`<b style="color:#ef4444;font-family:monospace">SCAN 1</b><br/><span style="font-family:monospace;font-size:10px">${new Date(location1.timestamp).toISOString()}</span>`);

      L.marker([location2.lat, location2.lng], { icon: redIcon })
        .addTo(map)
        .bindPopup(`<b style="color:#ef4444;font-family:monospace">SCAN 2</b><br/><span style="font-family:monospace;font-size:10px">${new Date(location2.timestamp).toISOString()}</span>`);

      L.polyline(
        [[location1.lat, location1.lng], [location2.lat, location2.lng]],
        { color: "#ef4444", weight: 2, dashArray: "6,4" }
      ).addTo(map);

      map.fitBounds([[location1.lat, location1.lng], [location2.lat, location2.lng]], {
        padding: [40, 40],
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location1, location2]);

  return (
    <div className="cloning-alert-map font-mono">
      <div className="mb-2 border border-red-500 bg-red-900/20 rounded p-2">
        <div className="text-red-400 font-bold text-xs tracking-widest mb-1">
          ⚠ CLONING DETECTION ALERT
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-red-700">COMPONENT: </span>
            <span className="text-red-400">{componentId?.slice(0, 12)}...</span>
          </div>
          <div>
            <span className="text-red-700">DISTANCE: </span>
            <span className="text-red-400">{distance} KM</span>
          </div>
          <div>
            <span className="text-red-700">TIME DIFF: </span>
            <span className="text-red-400">{timeDiff?.toFixed(1)} MIN</span>
          </div>
        </div>
        <div className="text-red-600 text-xs mt-1">
          SAME COMPONENT ID DETECTED AT TWO LOCATIONS SIMULTANEOUSLY.
          PHYSICAL DUPLICATION ATTACK SUSPECTED.
        </div>
      </div>

      <div
        ref={mapRef}
        style={{ height: 280, borderRadius: 6, border: "1px solid #7f1d1d" }}
      />

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-red-600">
        <div>
          SCAN 1: {location1?.lat?.toFixed(4)}, {location1?.lng?.toFixed(4)}
        </div>
        <div>
          SCAN 2: {location2?.lat?.toFixed(4)}, {location2?.lng?.toFixed(4)}
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(CloningAlertMapInner), { ssr: false });
