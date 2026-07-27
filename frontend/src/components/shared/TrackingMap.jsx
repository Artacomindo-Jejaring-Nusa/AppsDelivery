import React, { useRef, useEffect } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import zteBtsSites from '../../data/zte_bts_sites.json';

// ─── Google Maps API Key ───
const GOOGLE_MAPS_API_KEY = 'AIzaSyCP9cX0PB6oA2MkereZlEzuYJd98bTrMOM';

setOptions({
  apiKey: GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

// ─── Kalimantan Center ───
const KALIMANTAN_CENTER = { lat: -1.5, lng: 116.0 };
const DEFAULT_ZOOM = 6;

// ─── BTS Site Data (4,599 ZTE Kalimantan Sites) ───
const BTS_SITES = zteBtsSites;

// ─── Simulated Active Fleet ───
const FLEET_VEHICLES = [
  { id: 'v1', driver: 'Bambang Susilo', plate: 'KH 9920 JKT', lat: -1.28, lng: 116.85, status: 'on_route' },
  { id: 'v2', driver: 'Siti Aminah', plate: 'DA 8410 JKT', lat: -3.32, lng: 114.60, status: 'idle' },
  { id: 'v3', driver: 'Budi Kurir', plate: 'KB 9012 DEF', lat: -0.50, lng: 117.16, status: 'on_route' },
  { id: 'v4', driver: 'Joko Kurir', plate: 'KH 4455 GH', lat: -2.21, lng: 113.92, status: 'on_route' },
  { id: 'v5', driver: 'Hendra Saputra', plate: 'KB 3321 OP', lat: 0.91, lng: 109.00, status: 'idle' },
];

// ─── Couriers ───
const COURIERS = [
  { id: 'c1', name: 'Rian Dwi', lat: -3.35, lng: 114.62 },
  { id: 'c2', name: 'Aditya Baskoro', lat: -1.30, lng: 116.88 },
];

// ─── Status Colors ───
const STATUS_COLORS = {
  active: '#00236f',
  warning: '#f59e0b',
  error: '#ef4444',
  on_route: '#10b981',
  idle: '#6b7280',
};

// ─── SVG Marker Icon Builders ───
function btsSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
    </svg>
  `)}`;
}

function truckSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
      <rect x="2" y="2" width="20" height="20" rx="4"/>
      <path d="M20 8h4v6h-4z" fill="white"/>
      <circle cx="6" cy="19" r="3" fill="black" stroke="white" stroke-width="1"/>
      <circle cx="18" cy="19" r="3" fill="black" stroke="white" stroke-width="1"/>
    </svg>
  `)}`;
}

function courierSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
      <circle cx="12" cy="8" r="4"/>
      <path d="M12 14c-6.1 0-8 4-8 4h16s-1.9-4-8-4z"/>
    </svg>
  `)}`;
}

export default function TrackingMap() {
  const mapRef = useRef(null);

  useEffect(() => {
    let activeMap = null;

    importLibrary('maps').then(() => {
      if (!mapRef.current) return;

      const Size = window.google.maps.Size;
      const Point = window.google.maps.Point;
      const Marker = window.google.maps.Marker;
      const InfoWindow = window.google.maps.InfoWindow;

      // ─── Map Options ───
      const mapOptions = {
        center: KALIMANTAN_CENTER,
        zoom: DEFAULT_ZOOM,
        mapId: 'DEMO_MAP_ID', // Required for advanced styling features
        mapTypeId: 'terrain',
        disableDefaultUI: true, // Clean look matching custom controls
        zoomControl: false,
      };

      activeMap = new window.google.maps.Map(mapRef.current, mapOptions);

      const infoWindow = new InfoWindow();

      // ─── Plot BTS Sites ───
      BTS_SITES.forEach((site) => {
        const siteTitle = `${site.id} - ${site.site_name || site.name || site.id}`;
        const marker = new Marker({
          position: { lat: site.lat, lng: site.lng },
          map: activeMap,
          title: siteTitle,
          icon: {
            url: btsSvgIcon(STATUS_COLORS[site.status] || STATUS_COLORS.active),
            scaledSize: new Size(36, 36),
            origin: new Point(0, 0),
            anchor: new Point(18, 36),
          },
        });

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px;">
              <h4 style="margin: 0 0 4px 0; font-weight: 600; color: #00236f;">${site.site_name || site.name || site.id}</h4>
              <p style="margin: 0; font-size: 11px; color: #64748b;">ID: ${site.id} | Tech: ${site.tech || '4G/LTE'}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 500; text-transform: uppercase; color: ${STATUS_COLORS[site.status] || STATUS_COLORS.active};">
                Cluster: ${site.city || 'Kalimantan'}
              </p>
            </div>
          `);
          infoWindow.open(activeMap, marker);
        });
      });

      // ─── Plot Vehicles ───
      FLEET_VEHICLES.forEach((vehicle) => {
        const marker = new Marker({
          position: { lat: vehicle.lat, lng: vehicle.lng },
          map: activeMap,
          title: `${vehicle.driver} (${vehicle.plate})`,
          icon: {
            url: truckSvgIcon(STATUS_COLORS.on_route),
            scaledSize: new Size(32, 32),
            origin: new Point(0, 0),
            anchor: new Point(16, 16),
          },
        });

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px;">
              <h4 style="margin: 0 0 4px 0; font-weight: 600; color: #00236f;">${vehicle.driver}</h4>
              <p style="margin: 0; font-size: 11px; color: #64748b;">Plate: ${vehicle.plate}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #10b981; font-weight: bold;">
                Status: IN TRANSIT
              </p>
            </div>
          `);
          infoWindow.open(activeMap, marker);
        });
      });

      // ─── Plot Couriers ───
      COURIERS.forEach((courier) => {
        const marker = new Marker({
          position: { lat: courier.lat, lng: courier.lng },
          map: activeMap,
          title: courier.name,
          icon: {
            url: courierSvgIcon('#3b82f6'),
            scaledSize: new Size(26, 26),
            origin: new Point(0, 0),
            anchor: new Point(13, 13),
          },
        });

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px;">
              <h4 style="margin: 0 0 4px 0; font-weight: 600; color: #00236f;">Courier: ${courier.name}</h4>
              <p style="margin: 0; font-size: 11px; color: #64748b;">Role: Last Mile Delivery</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #3b82f6; font-weight: bold;">
                Status: ONLINE
              </p>
            </div>
          `);
          infoWindow.open(activeMap, marker);
        });
      });
    }).catch(err => {
      console.error("Google Maps failed to load: ", err);
    });

    return () => {
      // Cleanup map references if needed
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
}
