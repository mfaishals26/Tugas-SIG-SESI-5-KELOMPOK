// Inisialisasi peta
const map = L.map('map', {
  center: [-6.92, 106.932],
  zoom: 13
});

// 🗺️ Basemap 1 — OpenStreetMap
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 🛰️ Basemap 2 — Esri Satellite
const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: '&copy; Esri, Maxar, Earthstar Geographics'
});

// Layer grup
const tokoLayer = L.layerGroup().addTo(map);
const wisataLayer = L.layerGroup().addTo(map);
const ruteLayer = L.layerGroup().addTo(map);
const areaLayer = L.layerGroup().addTo(map);

// 🖼️ Daftar otomatis gambar real berdasarkan nama tempat
const gambarTempat = {
  "Mochi Kaswari Lampion": "../JS/images/mocikas.jpg",
  "Oleh-Oleh Priangan": "../JS/images/olehpariang.jpg",
  "Kartika Sari Sukabumi": "../JS/images/sari.jpg",
  "Dapur Mochi": "../JS/images/dapur.jpg",
  "Oleh-Oleh Sukabumi Khas Dwi": "../JS/images/dwi.jpg",
  "Sunda Rasa": "../JS/images/sundarasa.jpg",
  "Toko Sindang Sari Oleh Oleh Sukabumi": "../JS/images/tokosindang.jpg",
  "Toko Mochi Yenny": "../JS/images/yumei.jpg",
  "Pusat Oleh-Oleh Selabintana": "../JS/images/pusatsala.jpg",
  "Museum Prabu Siliwangi": "../JS/images/museumprabu.jpg",
  "Taman Rekreasi Selabintana": "../JS/images/tempatrekre.jpg",
  "Taman Cikole": "../JS/images/tamancikole.jpg",
  "Lapang Merdeka Sukabumi": "../JS/images/lapangmerdeka.jpg",
  "Taman Kota Baros": "../JS/images/tamanbaros.jpg"
};
// 🎁 Custom ikon (oleh-oleh)
const tokoIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/869/869636.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28]
});

// 🌄 Custom ikon (wisata)
const wisataIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854929.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28]
});

// Gaya polygon area
function stylePolygon() {
  return {
    color: "#228B22",
    weight: 2,
    opacity: 0.8,
    fillColor: "#b0f2b4",
    fillOpacity: 0.4
  };
}

// Gaya garis (rute)
function styleFeature(feature) {
  const nama = feature.properties.nama?.toLowerCase() || "";
  const isAlternatif = nama.includes("alternatif");
  return {
    color: isAlternatif ? "#999999" : "#1e90ff",
    weight: 4,
    opacity: 0.8,
    dashArray: isAlternatif ? "8,6" : null
  };
}

// Popup HTML interaktif
function popupContent(p) {
  const nama = p.nama || "Lokasi Tidak Diketahui";
  const jenis = p.jenis || "-";
  const deskripsi = p.deskripsi || "Tidak ada deskripsi tersedia.";

  // Gunakan gambar dari GeoJSON jika ada, jika tidak ambil dari daftar otomatis
  const gambar = p.gambar || gambarTempat[nama] || "https://cdn-icons-png.flaticon.com/512/684/684908.png";
  const link = p.link || null;

  return `
    <div style="
      font-family:'Segoe UI', sans-serif;
      min-width:230px;
      border-radius:12px;
      overflow:hidden;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
      background:white;
    ">
      <img src="${gambar}" alt="${nama}" style="width:100%; height:140px; object-fit:cover;">
      <div style="padding:10px 14px;">
        <h3 style="margin:4px 0; color:#0078d7; font-size:1.1rem;">${nama}</h3>
        <p style="margin:0; font-size:0.9rem;"><strong>Jenis:</strong> ${jenis}</p>
        <p style="font-size:0.9rem; margin-top:6px;">${deskripsi}</p>

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
          ${link
            ? `<a href="${link}" target="_blank"
                style="background:#0078d7; color:white; padding:6px 10px; border-radius:6px; text-decoration:none; font-size:0.85rem;">
                🔗 Kunjungi Situs</a>` 
            : ""}
          <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nama)}', '_blank')" 
            style="background:#34a853; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:0.85rem;">
            📍 Petunjuk Arah
          </button>
        </div>
      </div>
    </div>
  `;
}

// Load GeoJSON
fetch("../Data/mapoleholeh.geojson")
  .then(res => res.json())
  .then(data => {
    data.features.forEach(f => {
      const geom = f.geometry;
      const p = f.properties;

      if (geom.type === "Point") {
        const [lon, lat] = geom.coordinates;
        const icon = p.jenis?.toLowerCase().includes("toko") || p.jenis?.toLowerCase().includes("oleh")
          ? tokoIcon
          : wisataIcon;

        const marker = L.marker([lat, lon], { icon })
          .bindPopup(popupContent(p))
          .bindTooltip(p.nama, { direction: "top", offset: [0, -30] });

        // Efek hover
        marker.on("mouseover", e => e.target.setIcon(L.icon({ ...icon.options, iconSize: [36, 36] })));
        marker.on("mouseout", e => e.target.setIcon(icon));
        marker.on("click", () => map.flyTo([lat, lon], 16, { duration: 1.2 }));

        if (p.jenis?.toLowerCase().includes("toko") || p.jenis?.toLowerCase().includes("oleh")) {
          marker.addTo(tokoLayer);
        } else {
          marker.addTo(wisataLayer);
        }
      } 
      else if (geom.type === "LineString") {
        const coords = geom.coordinates.map(c => [c[1], c[0]]);
        L.polyline(coords, styleFeature(f))
          .bindPopup(popupContent(p))
          .bindTooltip(p.nama || "Rute", { sticky: true })
          .addTo(ruteLayer);
      } 
      else if (geom.type === "Polygon") {
        const coords = geom.coordinates[0].map(c => [c[1], c[0]]);
        const poly = L.polygon(coords, stylePolygon())
          .bindPopup(popupContent(p))
          .bindTooltip(p.nama || "Area", { sticky: true })
          .addTo(areaLayer);

        poly.on("mouseover", function () { this.setStyle({ fillOpacity: 0.7, color: "#006400" }); });
        poly.on("mouseout", function () { this.setStyle({ fillOpacity: 0.4, color: "#228B22" }); });
      }
    });

    // 🧭 Kontrol layer
    const baseMaps = { "🗺️ OpenStreetMap": osm, "🛰️ Satellite": satellite };
    const overlayMaps = {
      "🎁 Toko Oleh-Oleh": tokoLayer,
      "🌄 Tempat Wisata": wisataLayer,
      "🚗 Rute": ruteLayer,
      "🏘️ Area Layanan": areaLayer
    };
    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

    // Fit ke seluruh area
    map.fitBounds(L.featureGroup([tokoLayer, wisataLayer, ruteLayer, areaLayer]).getBounds());
  })
  .catch(err => console.error("Gagal memuat GeoJSON:", err));
