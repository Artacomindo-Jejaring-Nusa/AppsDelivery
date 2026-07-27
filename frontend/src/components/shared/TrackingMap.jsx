import React, { useRef, useEffect } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// ─── Google Maps API Key ───
const GOOGLE_MAPS_API_KEY = 'AIzaSyCP9cX0PB6oA2MkereZlEzuYJd98bTrMOM';

setOptions({
  apiKey: GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

// ─── Kalimantan Center ───
const KALIMANTAN_CENTER = { lat: -1.5, lng: 116.0 };
const DEFAULT_ZOOM = 6;

// ─── BTS Site Data (Kalimantan sites) ───
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
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2">
      <path d="M12 2c-.55 0-1 .45-1 1v1.17c-2.48.51-4.5 2.52-5 5L4.83 20H19.2l-1.2-10.83c-.5-2.48-2.52-4.49-5-5V3c0-.55-.45-1-1-1zm0 5c2.76 0 5 2.24 5 5 0 1.5-.67 2.85-1.72 3.78l-1.42-1.42c.7-.56 1.14-1.42 1.14-2.36 0-1.66-1.34-3-3-3s-3 1.34-3 3c0 .94.44 1.8 1.14 2.36l-1.42 1.42C7.67 14.85 7 13.5 7 12c0-2.76 2.24-5 5-5zm0 3c1.1 0 2 .9 2 2 0 .42-.13.8-.35 1.12l-1.12-1.12v-1.5c.26 0 .47.21.47.47v.53l.75.75c.16-.23.25-.5.25-.78 0-1.1-.9-2-2-2s-2 .9-2 2c0 .28.09.55.25.78l.75-.75v-.53c0-.26.21-.47.47-.47v1.5l-1.12 1.12c-.22-.32-.35-.7-.35-1.12 0-1.1.9-2 2-2z"/>
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
        const marker = new Marker({
          position: { lat: site.lat, lng: site.lng },
          map: activeMap,
          title: site.name,
          icon: {
            url: btsSvgIcon(STATUS_COLORS[site.status]),
            scaledSize: new Size(30, 30),
            origin: new Point(0, 0),
            anchor: new Point(15, 15),
          },
        });

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px;">
              <h4 style="margin: 0 0 4px 0; font-weight: 600; color: #00236f;">${site.name}</h4>
              <p style="margin: 0; font-size: 11px; color: #64748b;">ID: ${site.id}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 500; text-transform: uppercase; color: ${STATUS_COLORS[site.status]};">
                Status: ${site.status}
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
