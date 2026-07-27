import React, { useRef, useEffect, useState } from 'react';
import { Map as MapLibreMap, Marker, Popup, NavigationControl, AttributionControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// ─── CARTO Voyager (Google Maps-like, free, no API key) ───
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// ─── Kalimantan Center Coordinates ───
const KALIMANTAN_CENTER = [116.0, -1.5];
const DEFAULT_ZOOM = 5.5;

// ─── BTS Site Marker Data (10 Kalimantan sites from DB seed) ───
const BTS_SITES = [
  { id: 'KAL-BTS-0001', name: 'BTS Banjarmasin Utara', lat: -3.3194, lng: 114.5907, status: 'active' },
  { id: 'KAL-BTS-0002', name: 'BTS Balikpapan Tengah', lat: -1.2654, lng: 116.8312, status: 'active' },
  { id: 'KAL-BTS-0003', name: 'BTS Samarinda Seberang', lat: -0.5022, lng: 117.1536, status: 'warning' },
  { id: 'KAL-BTS-0004', name: 'BTS Pontianak Kota', lat: -0.0263, lng: 109.3425, status: 'active' },
  { id: 'KAL-BTS-0005', name: 'BTS Palangkaraya Pahandut', lat: -2.2088, lng: 113.916, status: 'active' },
  { id: 'KAL-BTS-0006', name: 'BTS Banjarbaru Selatan', lat: -3.4402, lng: 114.8304, status: 'active' },
  { id: 'KAL-BTS-0007', name: 'BTS Tarakan Barat', lat: 3.3065, lng: 117.5925, status: 'error' },
  { id: 'KAL-BTS-0008', name: 'BTS Singkawang Barat', lat: 0.9071, lng: 108.986, status: 'active' },
  { id: 'KAL-BTS-0009', name: 'BTS Tenggarong Seberang', lat: -0.4189, lng: 117.0012, status: 'warning' },
  { id: 'KAL-BTS-0010', name: 'BTS Sampit Baamang', lat: -2.5367, lng: 112.952, status: 'active' },
];

// ─── Simulated Active Fleet (drivers on route) ───
const FLEET_VEHICLES = [
  { id: 'v1', driver: 'Anton D.', plate: 'B 1234 ABC', lat: -1.28, lng: 116.85, status: 'on_route' },
  { id: 'v2', driver: 'Rina S.', plate: 'D 5678 XYZ', lat: -3.32, lng: 114.60, status: 'idle' },
  { id: 'v3', driver: 'Budi M.', plate: 'L 9012 DEF', lat: -0.50, lng: 117.16, status: 'on_route' },
  { id: 'v4', driver: 'Kevin P.', plate: 'BK 4455 GH', lat: -2.21, lng: 113.92, status: 'on_route' },
  { id: 'v5', driver: 'Made A.', plate: 'DK 3321 OP', lat: 0.91, lng: 109.00, status: 'idle' },
];

// ─── Status Color Palette ───
const STATUS_COLORS = {
  active: '#1e3a8a',    // primary-container blue
  warning: '#d97706',   // amber
  error: '#ba1a1a',     // error red
  on_route: '#059669',  // emerald
  idle: '#6b7280',      // gray
};

export default function FleetMap({ height = '320px', className = '' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (mapRef.current) return; // prevent double init

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: KALIMANTAN_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 3,
    });

    // Add compact attribution
    map.addControl(
      new AttributionControl({ compact: true }),
      'bottom-right'
    );

    // Add navigation controls (zoom +/-)
    map.addControl(new NavigationControl(), 'top-right');

    // ─── On Map Load: Add markers ───
    map.on('load', () => {
      setMapLoaded(true);

      // Add BTS Site markers
      BTS_SITES.forEach((site) => {
        const color = STATUS_COLORS[site.status] || STATUS_COLORS.active;

        // Create custom BTS marker element
        const el = document.createElement('div');
        el.className = 'bts-marker';
        el.style.cssText = `
          width: 16px;
          height: 16px;
          background: ${color};
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 0 8px ${color}80, 0 2px 4px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.15s;
        `;
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.4)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        // Popup content
        const popup = new Popup({
          offset: 12,
          closeButton: false,
          maxWidth: '220px',
        }).setHTML(`
          <div style="font-family: Inter, sans-serif; padding: 4px 0;">
            <div style="font-size: 11px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
              ${site.id}
            </div>
            <div style="font-size: 13px; font-weight: 600; color: #191c1e;">
              ${site.name}
            </div>
            <div style="font-size: 11px; color: #757682; margin-top: 4px;">
              Status: <span style="color: ${color}; font-weight: 600;">${site.status.toUpperCase()}</span>
            </div>
          </div>
        `);

        new Marker({ element: el })
          .setLngLat([site.lng, site.lat])
          .setPopup(popup)
          .addTo(map);
      });

      // Add Fleet Vehicle markers (truck icons)
      FLEET_VEHICLES.forEach((vehicle) => {
        const color = STATUS_COLORS[vehicle.status] || STATUS_COLORS.idle;

        const el = document.createElement('div');
        el.className = 'fleet-marker';
        el.style.cssText = `
          width: 28px;
          height: 28px;
          background: ${color};
          border: 2px solid white;
          border-radius: 6px;
          box-shadow: 0 0 12px ${color}60, 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 15px;
          font-family: 'Material Symbols Outlined';
          transition: transform 0.15s;
        `;
        el.textContent = 'local_shipping';
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        const popup = new Popup({
          offset: 16,
          closeButton: false,
          maxWidth: '220px',
        }).setHTML(`
          <div style="font-family: Inter, sans-serif; padding: 4px 0;">
            <div style="font-size: 13px; font-weight: 700; color: #191c1e;">
              ${vehicle.driver}
            </div>
            <div style="font-size: 11px; color: #757682; margin-top: 2px;">
              ${vehicle.plate}
            </div>
            <div style="font-size: 11px; color: ${color}; font-weight: 600; margin-top: 4px;">
              ● ${vehicle.status === 'on_route' ? 'On Route' : 'Idle'}
            </div>
          </div>
        `);

        new Marker({ element: el })
          .setLngLat([vehicle.lng, vehicle.lat])
          .setPopup(popup)
          .addTo(map);
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Overlay Badge */}
      <div className="absolute top-md left-md z-10 flex flex-col gap-xs pointer-events-none">
        <div className="bg-surface-container-lowest/90 backdrop-blur shadow p-xs px-md rounded flex items-center gap-sm">
          <span className="w-3 h-3 rounded-full bg-primary animate-pulse"></span>
          <span className="font-label-sm text-label-sm text-on-surface">
            Live Fleet Location
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-md left-md z-10 bg-surface-container-lowest/90 backdrop-blur shadow rounded px-md py-sm pointer-events-none">
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS.active }}></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">BTS Active</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS.warning }}></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Warning</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS.error }}></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Error</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600" style={{ width: '10px', height: '10px', borderRadius: '3px' }}></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Fleet</span>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-surface-variant flex items-center justify-center z-20">
          <div className="text-center">
            <span className="material-symbols-outlined text-[40px] text-primary/40 animate-spin">
              progress_activity
            </span>
            <p className="font-label-md text-label-md text-on-surface-variant mt-sm">
              Loading Fleet Map...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
