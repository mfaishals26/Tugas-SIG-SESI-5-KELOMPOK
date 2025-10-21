/* MAIN.JS - SIG Oleh-Oleh Sukabumi
   Versi perbaikan oleh Kurumi:
   - pastikan layer siap sebelum pasang click handler
   - perbaiki isPointInsidePolygon handling
   - unlock audio on first user interaction
   - rapiin loading -> transition -> map-visible flow
   - safer DOM checks
*/

// --- Inisialisasi peta ---
const map = L.map('map', { zoomControl: true }).setView([-6.9205, 106.9289], 13);

// --- 🌸 FITUR TAMBAH TITIK OLEH-OLEH (validasi + upload gambar) ---
let tempMarker = null;

/** Fungsi cek apakah titik berada dalam batas kota */
function isPointInsideKota(latlng) {
  const sukabumiLayer = layerStore["Kota Sukabumi"];
  if (!sukabumiLayer) return false;

  const pt = turf.point([latlng.lng, latlng.lat]);
  let inside = false;

  const layers = typeof sukabumiLayer.getLayers === "function"
    ? sukabumiLayer.getLayers()
    : [sukabumiLayer];

  layers.forEach(l => {
    const geo = l.toGeoJSON ? l.toGeoJSON() : null;
    if (!geo) return;

    if (geo.type === "FeatureCollection") {
      geo.features.forEach(f => {
        if (f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")) {
          if (turf.booleanPointInPolygon(pt, f)) inside = true;
        }
      });
    } else if (geo.type === "Feature") {
      const g = geo.geometry;
      if (g && (g.type === "Polygon" || g.type === "MultiPolygon")) {
        if (turf.booleanPointInPolygon(pt, geo)) inside = true;
      }
    }
  });

  return inside;
}

/** Form tambah lokasi */
function showAddLocationForm(lat, lng) {
  const overlay = document.createElement("div");
  overlay.className = "form-overlay";

  overlay.innerHTML = `
    <div class="form-popup">
      <h3>Tambah Titik Oleh-Oleh</h3>
      <label>Nama Tempat:</label>
      <input type="text" id="place-name" placeholder="Contoh: Toko Mochi Kaswari" />

      <label>Deskripsi Singkat:</label>
      <textarea id="place-desc" rows="3" placeholder="Ceritakan sedikit tentang tempat ini..."></textarea>

      <label>Unggah Gambar:</label>
      <input type="file" id="place-image" accept="image/*" />
      <img id="image-preview" class="preview-img" style="display:none" />

      <div class="form-buttons">
        <button id="save-point" class="btn-primary">Simpan</button>
        <button id="cancel-point" class="btn-secondary">Batal</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Preview gambar
  const imgInput = overlay.querySelector("#place-image");
  const preview = overlay.querySelector("#image-preview");
  imgInput.addEventListener("change", () => {
    const file = imgInput.files[0];
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = "block";
    }
  });

  // Tombol simpan
  overlay.querySelector("#save-point").addEventListener("click", () => {
    const name = overlay.querySelector("#place-name").value.trim();
    const desc = overlay.querySelector("#place-desc").value.trim();
    const file = imgInput.files[0];

    if (!name) {
      alert("Nama tempat tidak boleh kosong!");
      return;
    }

    // Buat marker baru
    const newMarker = L.marker([lat, lng]).addTo(map);

    let popupContent = `<b>${name}</b><br>${desc}`;
    if (file) {
      const imgURL = URL.createObjectURL(file);
      popupContent += `<br><img src="${imgURL}" class="popup-img"/>`;
    }

    newMarker.bindPopup(popupContent);

    map.closePopup();
    document.body.removeChild(overlay);

    if (tempMarker) {
      map.removeLayer(tempMarker);
      tempMarker = null;
    }
  });

  // Tombol batal
  overlay.querySelector("#cancel-point").addEventListener("click", () => {
    document.body.removeChild(overlay);
    if (tempMarker) {
      map.removeLayer(tempMarker);
      tempMarker = null;
    }
  });
}

// Event klik di peta
map.on("click", function(e) {
  unlockAudioSilently();

  const inside = isPointInsidePolygon(e.latlng, layerStore["Kota Sukabumi"]);
  if (!inside) {
    showCustomAlert();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    return; // hentikan proses di sini
  }

  if (tempMarker) map.removeLayer(tempMarker);
  tempMarker = L.marker([e.latlng.lat, e.latlng.lng], { opacity: 0.7 }).addTo(map);
  showAddLocationForm(e.latlng.lat, e.latlng.lng);
});

// --- Base maps ---
const baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
});
const baseSatelit = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19, attribution: 'Tiles © Esri — Source: Esri, USGS, NOAA, NGA, and others' }
);

// tambahkan OSM sebagai default
baseOSM.addTo(map);

// Base layer control
const baseLayers = {
  "🗺️ Peta Jalan (OSM)": baseOSM,
  "🌍 Peta Satelit (ESRI)": baseSatelit
};

// Layer storage
const layerStore = {};
const rawData = {};

// Files mapping (GeoJSON)
const fileMap = {
  "Kota Sukabumi": "../Data/Kota Sukabumi.geojson",
  "Batas Lokasi": "../Data/batas_lokasi.geojson",
  "Makanan Khas": "../Data/makanan_khas.geojson",
  "Kuliner Siap Saji": "../Data/kuliner_siap_saji.geojson",
  "Dessert & Ringan": "../Data/dessert_ringan.geojson",
  "Minuman": "../Data/minuman.geojson",
  "Fasilitas Pendukung": "../Data/fasilitas_pendukung.geojson",
  "Rute": "../Data/rute.geojson"
};

// --- Icon Set ---
const icons = {
  makanan_khas: L.icon({
    iconUrl: '../assets/icons/pastel.png',
    iconSize: [40, 40],
    className: 'pulse-icon'
  }),
  kuliner: L.icon({
    iconUrl: '../assets/icons/kulinerr.png',
    iconSize: [38, 38],
    className: 'pulse-icon'
  }),
  dessert: L.icon({
    iconUrl: '../assets/icons/dessert.png',
    iconSize: [38, 38],
    className: 'pulse-icon'
  }),
  minuman: L.icon({
    iconUrl: '../assets/icons/minuman.png',
    iconSize: [36, 36],
    className: 'pulse-icon'
  }),
  fasilitas: L.icon({
    iconUrl: '../assets/icons/fasilitas.png',
    iconSize: [34, 34],
    className: 'pulse-icon'
  }),
  sekolah: L.icon({
    iconUrl: '../assets/icons/sekolah.png',
    iconSize: [34, 34],
    className: 'pulse-icon'
  }),
  default: L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize:[25,41]
  })
};


// --- Popup builder ---
function onEachFeature(feature, layer) {
  if (feature.properties) {
    const props = feature.properties;
    layer.bindPopup(buildPopup(props), { maxWidth: 300, className: 'custom-popup' });
  }
}

function buildPopup(props) {
  // Placeholder gambar (kalau belum ada di data)
  const imgSrc = props.foto_url || "./assets/image/Logo.png";
  
  // Generate rating random sementara
  const rating = (Math.random() * (5 - 4) + 4).toFixed(1);
  const stars = "⭐".repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? "✨" : "");

  return `
    <div class="popup-card">
      <div class="popup-img-wrapper">
        <img src="${imgSrc}" alt="${props.nama}" class="popup-img"/>
      </div>
      <div class="popup-content">
        <h3 class="popup-title">${props.nama}</h3>
        <div class="popup-meta">
          <span class="popup-tag">${props.jenis || "Kategori Tidak Diketahui"}</span>
          <span class="popup-rating">${stars} (${rating})</span>
        </div>
        <p class="popup-desc">
          Produk utama: <strong>${props.produk_utama || "-"}</strong><br/>
          Temukan cita rasa khas Sukabumi di lokasi ini.
        </p>
      </div>
      <div class="popup-footer">
        <button class="btn-detail" onclick="showDetail('${props.nama}', '${props.jenis}', '${props.produk_utama}', '${imgSrc}', '${rating}')">
          Lihat Detail
        </button>
        <button class="btn-review" onclick="showReviewForm('${props.nama}')">
          Beri Ulasan
        </button>
      </div>
    </div>
  `;
}

// Detail popup (pakai SweetAlert2)
function showDetail(nama, jenis, produk, gambar, rating) {
  Swal.fire({
    title: nama,
    html: `
      <div class="detail-popup">
        <img src="${gambar}" alt="${nama}" />
        <p><strong>Jenis:</strong> ${jenis}</p>
        <p><strong>Produk Utama:</strong> ${produk}</p>
        <p><strong>Rating:</strong> ${"⭐".repeat(Math.floor(rating))} (${rating})</p>
        <p><em>Rasakan kelezatan khas Sukabumi hanya di sini!</em></p>
      </div>
    `,
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#4a3728',
    confirmButtonColor: '#8b5e34',
  });
}

// === ✨ Rating & Ulasan Dinamis ===
function showReviewForm(namaTempat) {
  Swal.fire({
    title: `Tulis Ulasan untuk ${namaTempat}`,
    html: `
      <div class="review-form">
        <label>Rating:</label>
        <select id="user-rating" class="swal2-select">
          <option value="5">⭐⭐⭐⭐⭐</option>
          <option value="4">⭐⭐⭐⭐</option>
          <option value="3">⭐⭐⭐</option>
          <option value="2">⭐⭐</option>
          <option value="1">⭐</option>
        </select>
        <textarea id="user-comment" class="review-text" placeholder="Tulis ulasan kamu di sini..."></textarea>
      </div>
    `,
    confirmButtonText: "Kirim",
    showCancelButton: true,
    cancelButtonText: "Batal",
    focusConfirm: false,
    background: "rgba(25,25,35,0.95)",
    color: "#fff",
    preConfirm: () => {
      const rating = document.getElementById('user-rating').value;
      const comment = document.getElementById('user-comment').value.trim();

      if (!comment) {
        Swal.showValidationMessage('Ulasan tidak boleh kosong!');
        return false;
      }

      // return data ke .then agar result.value bisa dipakai
      return { rating, comment };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const { rating, comment } = result.value;

      // simpan ke objek lokal
      if (!reviewData[namaTempat]) reviewData[namaTempat] = [];
      reviewData[namaTempat].push({ rating, comment });

      Swal.fire({
        icon: "success",
        title: "Terima kasih!",
        text: "Ulasan kamu sudah dikirim 💬",
        timer: 2000,
        showConfirmButton: false,
        background: "rgba(25,25,35,0.95)",
        color: "#fff",
      });
    }
  });
}

// === ✨ Rating & Ulasan Dinamis (versi fix) ===
const reviewData = {}; // Simpan ulasan lokal sementara

function showReviewForm(namaTempat) {
  Swal.fire({
    title: `Tulis Ulasan untuk ${namaTempat}`,
    html: `
      <div class="review-form">
        <label>Rating:</label>
        <select id="user-rating" class="swal2-select">
          <option value="5">⭐⭐⭐⭐⭐</option>
          <option value="4">⭐⭐⭐⭐</option>
          <option value="3">⭐⭐⭐</option>
          <option value="2">⭐⭐</option>
          <option value="1">⭐</option>
        </select>
        <textarea id="user-comment" class="review-text" placeholder="Tulis ulasan kamu di sini..."></textarea>
      </div>
    `,
    confirmButtonText: "Kirim",
    showCancelButton: true,
    cancelButtonText: "Batal",
    focusConfirm: false,
    preConfirm: () => {
      const rating = document.getElementById('user-rating').value;
      const comment = document.getElementById('user-comment').value.trim();

      // 🚫 Validasi: pastikan ulasan gak kosong
      if (!comment) {
        Swal.showValidationMessage('Ulasan tidak boleh kosong!');
        return false;
      }

      // 💾 Simpan data ulasan
      if (!reviewData[namaTempat]) reviewData[namaTempat] = [];
      reviewData[namaTempat].push({ rating, comment });

      // ✅ return object supaya SweetAlert tahu proses berhasil
      return { rating, comment };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      Swal.fire({
        icon: "success",
        title: "Terima kasih!",
        text: "Ulasan kamu sudah dikirim",
        timer: 1800,
        showConfirmButton: false
      });

      console.log(`📦 Ulasan tersimpan untuk ${namaTempat}:`, reviewData[namaTempat]);
    }
  });
}

// --- Icon chooser ---
function chooseIcon(feature){
  const props = feature && feature.properties ? feature.properties : {};
  const role = (props.role || '').toString().toLowerCase();
  const jenis = (props.jenis || '').toString().toLowerCase();
  const nama = (props.nama || '').toString().toLowerCase();

  if(role.includes('makanan khas') || /mochi|bolu|bika|sale|roti/i.test(nama)) return icons.makanan_khas;
  if(role.includes('minuman') || jenis.includes('minuman')) return icons.minuman;
  if(jenis.includes('dessert') || /puding|dessert|dimsum|roti/i.test(nama)) return icons.dessert;
  if(jenis.includes('makanan') || role.includes('makanan')) return icons.kuliner;
  if(jenis.includes('sekolah') || /sd |smp |sma |sekolah/i.test(nama)) return icons.sekolah;
  return icons.default;
}

// --- Create Layer ---
function createLayerFromGeoJson(label, geojson){
  const layerGroup = L.geoJSON(geojson, {
    pointToLayer: function(feature, latlng){
      const ic = chooseIcon(feature);
      return L.marker(latlng, { icon: ic });
    },
    style: function(feature){
      if(!feature || !feature.geometry) return {};
      if(feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'){
        return { color: '#f0ad4e', fillOpacity: 0.25, weight: 1.6 };
      }
      if(feature.geometry.type === 'LineString'){
        return { color: '#c44', weight: 3, dashArray: '6,4' };
      }
      return {};
    },
    onEachFeature: function(feature, layer) {
      const props = feature.properties || {};

      if (props && props.nama) {
        layer.bindTooltip(props.nama, { permanent: false, direction: 'top', offset: [0, -10], className: 'custom-tooltip' });
      }

      layer.bindPopup(buildPopup(props), { maxWidth: 320 });

      layer.on({
        mouseover: () => layer.openTooltip(),
        click: () => {
          if (layer.getLatLng) {
            map.setView(layer.getLatLng(), 17, { animate: true });
          }
          layer.openPopup();
          highlightMarker(layer);
        }
      });

      if (props && props.nama) {
        rawData[props.nama.toLowerCase()] = {
          props: props,
          latlng: (feature.geometry && feature.geometry.type === 'Point') 
            ? [feature.geometry.coordinates[1], feature.geometry.coordinates[0]] 
            : null
        };
      }
    }
  });
  return layerGroup;
}

// --- Load All Layers ---
async function loadAllLayers(){
  const sidebarList = document.getElementById('layer-checkboxes');
  const overlayLayers = {}; 

  for(const [label, path] of Object.entries(fileMap)){
    try{
      const res = await fetch(path);
      if(!res.ok){
        console.warn(`Tidak bisa memuat ${label} dari path: ${path}`);
        continue;
      }
      const geojson = await res.json();
      const layer = createLayerFromGeoJson(label, geojson);

      // simpan di store
      layerStore[label] = layer;

      // jika layer poligon "Kota Sukabumi", tambahkan & fitBounds
      if(label === "Kota Sukabumi"){
        try {
          layer.addTo(map);
          if (layer.getBounds && !layer.getBounds().isValid?.()) {
            // no-op; just safety
          } else {
            map.fitBounds(layer.getBounds(), { padding: [20,20] });
          }
        } catch(e) {
          // ignore fitBounds errors
        }
      } else {
        // untuk layer lain: tambahkan ke peta juga (default)
        layer.addTo(map);
      }

      // === Checkbox Sidebar (hanya jika elemen ada) ===
      if (sidebarList) {
        const id = 'chk-' + label.replace(/\s+/g,'_');
        const wrapper = document.createElement('div');
        wrapper.className = 'layer-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = true;
        const lab = document.createElement('label');
        lab.htmlFor = id;
        lab.innerText = label;
        wrapper.appendChild(checkbox);
        wrapper.appendChild(lab);
        sidebarList.appendChild(wrapper);

        checkbox.addEventListener('change', function(){
          if(this.checked){
            layer.addTo(map);
          } else {
            map.removeLayer(layer);
          }
        });
      }

      overlayLayers[label] = layer;

    }catch(err){ 
      console.error('Error loading', label, err); 
    }
  }

  // Tambahkan control layer base + overlay
  L.control.layers(baseLayers, overlayLayers, { collapsed: true }).addTo(map);
}

// --- LOADING SCREEN & TRANSITION HANDLER ---
async function loadAllLayersWithLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  const petalContainer = document.querySelector('.petal-container');
  const transitionLight = document.getElementById('transition-light');
  const mapEl = document.getElementById('map');
  const mainEl = document.getElementById('main-content');

  // safety: ensure map/main hidden initially (CSS should handle opacity, but double-check)
  if (mapEl) { mapEl.classList.remove('map-visible'); }
  if (mainEl) { mainEl.classList.remove('main-visible'); }

  // create petals if container exists
  if (petalContainer) {
    for (let i = 0; i < 20; i++) {
      const petal = document.createElement('div');
      petal.className = 'petal';
      petal.style.left = Math.random() * 100 + '%';
      petal.style.animationDuration = (5 + Math.random() * 6) + 's';
      petal.style.animationDelay = Math.random() * 4 + 's';
      petalContainer.appendChild(petal);
    }
  }

  try {
    await loadAllLayers();
  } catch (e) {
    console.error('Error saat loadAllLayers()', e);
  }

  // small delay so user sees loading effect
  setTimeout(() => {
    if (loadingScreen) loadingScreen.classList.add('fade-out');

    // after fade-out, play transition light then reveal map
    setTimeout(() => {
      if (transitionLight) {
        transitionLight.classList.add('transition-active');
      }

      // transition duration (matching CSS animation)
      setTimeout(() => {
        // remove transition and loading elements
        if (transitionLight && transitionLight.parentNode) transitionLight.parentNode.removeChild(transitionLight);
        if (loadingScreen && loadingScreen.parentNode) loadingScreen.parentNode.removeChild(loadingScreen);

        // reveal map & main content
        if (mapEl) mapEl.classList.add('map-visible');
        if (mainEl) mainEl.classList.add('main-visible');

        // ensure map invalidation so tiles render properly after CSS transforms
        setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 500);

        // attach outside-click alert after layers are loaded and DOM cleaned
        attachOutsideAlert();
      }, 2500);
    }, 800);
  }, 1200);
}

// === 🧭 Lokasi Nyata Pengguna ===
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (!window._userMarker) {
        window._userMarker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: "../assets/icons/user_location.png",
            iconSize: [30, 30],
          }),
        }).addTo(map).bindTooltip("Lokasi Anda", { permanent: false });
      } else {
        window._userMarker.setLatLng([lat, lng]);
      }
    },
    (err) => {
      console.warn("Tidak bisa mengambil lokasi pengguna:", err.message);
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
} else {
  console.warn("Geolocation tidak didukung di browser ini.");
}

// jalankan loader saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  loadAllLayersWithLoading();
});

// --- Sidebar Toggle ---
const sidebarEl = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const closeSidebar = document.getElementById('close-sidebar');
const mainContent = document.getElementById('main-content');

function openSidebar(){
  if(!sidebarEl) return;
  sidebarEl.classList.remove('closed');
  document.body.classList.add('sidebar-open');
  if (mainContent) mainContent.style.marginLeft = window.innerWidth > 900 ? '360px' : '0';
}

function closeSidebarFn(){
  if(!sidebarEl) return;
  sidebarEl.classList.add('closed');
  document.body.classList.remove('sidebar-open');
  if (mainContent) mainContent.style.marginLeft = '0';
}

if(sidebarToggle) sidebarToggle.addEventListener('click', ()=> {
  if(sidebarEl && sidebarEl.classList.contains('closed')) openSidebar();
  else closeSidebarFn();
});
if(closeSidebar) closeSidebar.addEventListener('click', closeSidebarFn);

// --- Search ---
const inputSearch = document.getElementById('search-input');
const resultsBox = document.getElementById('search-results');

if(inputSearch){
  inputSearch.addEventListener('input', function(){
    const q = this.value.trim().toLowerCase();
    if(resultsBox) resultsBox.innerHTML = '';
    if(!q) return;
    const names = Object.keys(rawData);
    const hits = names.filter(n => n.includes(q)).slice(0,8);
    hits.forEach(name => {
      const res = document.createElement('div');
      res.className = 'search-result';
      res.textContent = rawData[name].props.nama || name;
      res.addEventListener('click', () => {
        const item = rawData[name];
        if(item && item.latlng){
          map.setView(item.latlng, 17);
          for(const LName in layerStore){
            try{
              layerStore[LName].eachLayer(l => {
                if(l.getLatLng && l.getLatLng().lat === item.latlng[0] && l.getLatLng().lng === item.latlng[1]){
                  l.openPopup();
                }
              });
            }catch(e){}
          }
        }
        if(resultsBox) resultsBox.innerHTML = '';
        inputSearch.value = '';
      });
      if(resultsBox) resultsBox.appendChild(res);
    });
  });
}

// Responsif
window.addEventListener('resize', () => {
  if(window.innerWidth <= 900){
    if(mainContent) mainContent.style.marginLeft = '0';
  } else {
    if(!sidebarEl || sidebarEl.classList.contains('closed')) {
      if(mainContent) mainContent.style.marginLeft = '0';
    } else {
      if(mainContent) mainContent.style.marginLeft = '360px';
    }
  }
});

// === EVENT: Toggle Sidebar dengan Tombol Spasi ===
document.addEventListener('keydown', function(event) {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

  if (event.code === 'Space' && !isTyping) {
    event.preventDefault();
    if (sidebarEl && sidebarEl.classList.contains('closed')) openSidebar();
    else closeSidebarFn();
  }
});

function highlightMarker(layer) {
  if (window._activeMarker) {
    try { window._activeMarker.setZIndexOffset(0); window._activeMarker.setOpacity(1); } catch(e){}
  }
  window._activeMarker = layer;
  try { layer.setZIndexOffset(1000); layer.setOpacity(0.8); } catch(e){}
}

// =============== 🔊 Efek Klik di Luar Kota Sukabumi ===============

const alertAudio = new Audio('../assets/sound/jarjit.mpeg');
let audioUnlocked = false;
const alertOverlay = document.getElementById('alert-overlay');
const customAlert = document.getElementById('custom-alert');

function unlockAudioSilently() {
  if (audioUnlocked) return;
  try {
    alertAudio.play().then(() => {
      alertAudio.pause();
      alertAudio.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => { /* ignore */ });
  } catch(e) {}
}

// fungsi animasi alert
function showCustomAlert(message = "⚠️ Anda mengklik di luar wilayah Kota Sukabumi!") {
  // overlay merah
  if (alertOverlay) {
    alertOverlay.style.display = 'block';
    setTimeout(() => { if (alertOverlay) alertOverlay.style.display = 'none'; }, 500);
  }

  // set message if customAlert exists
  if (customAlert) {
    customAlert.textContent = message;
    customAlert.classList.add('show');
    setTimeout(() => { if (customAlert) customAlert.classList.remove('show'); }, 3000);
  }

  // mainkan suara (jika sudah di-unlock)
  unlockAudioSilently();
  alertAudio.currentTime = 0;
  alertAudio.play().catch(() => { /* browser may block autoplay */ });
}

// fungsi cek titik di dalam polygon/multipolygon
function isPointInsidePolygon(latlng, polygonLayer) {
  if (!polygonLayer) return false;

  const point = turf.point([latlng.lng, latlng.lat]);
  let inside = false;

  // polygonLayer bisa berupa LayerGroup / GeoJSON layer
  try {
    const layers = polygonLayer.getLayers ? polygonLayer.getLayers() : [polygonLayer];
    layers.forEach(layer => {
      try {
        const polyGeo = layer.toGeoJSON ? layer.toGeoJSON() : null;
        if (!polyGeo) return;
        // jika featureCollection, cek setiap feature
        if (polyGeo.type === 'FeatureCollection') {
          polyGeo.features.forEach(f => {
            if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
              if (turf.booleanPointInPolygon(point, f)) inside = true;
            }
          });
        } else if (polyGeo.type === 'Feature') {
          const g = polyGeo.geometry;
          if (g && (g.type === 'Polygon' || g.type === 'MultiPolygon')) {
            if (turf.booleanPointInPolygon(point, polyGeo)) inside = true;
          }
        } else if (polyGeo.type === 'Polygon' || polyGeo.type === 'MultiPolygon') {
          if (turf.booleanPointInPolygon(point, polyGeo)) inside = true;
        }
      } catch(e){}
    });
  } catch(e){
    // fallback false
  }

  return inside;
}

// attach click handler once layer is ready (safe & idempotent)
let outsideHandlerAttached = false;
function attachOutsideAlert() {
  if (outsideHandlerAttached) return;
  const sukabumiLayer = layerStore["Kota Sukabumi"];
  if (!sukabumiLayer) {
    // retry a few times until available
    const tries = 10;
    let attempt = 0;
    const iv = setInterval(() => {
      attempt++;
      if (layerStore["Kota Sukabumi"]) {
        clearInterval(iv);
        attachOutsideAlert(); // re-run, will attach
      } else if (attempt >= tries) {
        clearInterval(iv);
        console.warn('attachOutsideAlert: layer "Kota Sukabumi" not found after retries.');
      }
    }, 700);
    return;
  }
  outsideHandlerAttached = true;
}

  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // Cek tema tersimpan sebelumnya
  if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-theme');
    themeToggle.textContent = '☀️';
  }

  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });