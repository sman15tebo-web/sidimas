/* ============================================================
   INISIALISASI DATABASE HYBRID (SQLITE VIA IPC | DEXIE)
   ============================================================
   - Mode Desktop (Electron): database SQLite dikelola di Main
     Process. Renderer berkomunikasi via window.sidimas (IPC).
   - Mode Online (Browser): menggunakan Dexie.js (IndexedDB).
   ============================================================ */
let localDB;
var isElectron = typeof window.sidimas !== 'undefined';

if (isElectron) {
    // --------------------------------------------------------
    //  MODE OFFLINE (DESKTOP) — SQLite via IPC
    //  Setiap method memanggil window.sidimas.* yang sudah
    //  di-expose oleh preload.js melalui contextBridge.
    //  Tidak ada require(), tidak ada akses Node.js langsung.
    // --------------------------------------------------------

    class IPCTableWrapper {
        constructor(tableName) {
            this.tableName = tableName;
        }
        async toArray() {
            return window.sidimas.dbGetAll(this.tableName);
        }
        async clear() {
            return window.sidimas.dbClear(this.tableName);
        }
        async put(obj) {
            return window.sidimas.dbPut(this.tableName, obj);
        }
        async bulkAdd(arr) { return this.bulkPut(arr); }
        async bulkPut(arr) {
            return window.sidimas.dbBulkPut(this.tableName, arr);
        }
        async update(id, updates) {
            return window.sidimas.dbUpdate(this.tableName, id, updates);
        }
        async delete(id) {
            return window.sidimas.dbDelete(this.tableName, id);
        }
        where(field) {
            return {
                equals: (value) => ({
                    toArray: async () => window.sidimas.dbWhere(this.tableName, field, value)
                })
            };
        }
    }

    localDB = {
        suratMasuk: new IPCTableWrapper('suratMasuk'),
        suratKeluar: new IPCTableWrapper('suratKeluar'),
        antrianSync: new IPCTableWrapper('antrianSync'),
        kodeCustom: new IPCTableWrapper('kodeCustom'),
        suratEksternal: new IPCTableWrapper('suratEksternal'),
        appSettings: new IPCTableWrapper('appSettings'),
        pegawai: new IPCTableWrapper('pegawai'),
        siswa: new IPCTableWrapper('siswa')
    };

} else {
    // --------------------------------------------------------
    //  MODE ONLINE (WEB BROWSER) — Dexie.js (IndexedDB)
    // --------------------------------------------------------
    let dbName = "SiDiMAS_DB";
    const urlParams = new URLSearchParams(window.location.search);
    let urlTenantId = urlParams.get('id');
    if (urlTenantId) {
        dbName = "SiDiMAS_DB_" + urlTenantId.toLowerCase();
    }
    localDB = new Dexie(dbName);
    localDB.version(1).stores({
        suratMasuk: "id, tglTerima, pengirim, tglSurat, noSurat, perihal, ditujukan, uraian, keterangan, fileUrl, waktuInput, pembuat, sync_status, fileInfoRaw",
        suratKeluar: "id, tglSurat, klasifikasi, noSurat, perihal, tujuan, uraian, keterangan, fileUrl, waktuInput, pembuat, sync_status, fileInfoRaw",
        antrianSync: "++id, action, payload, status"
    });
    localDB.version(2).stores({
        kodeCustom: "id, kode, uraian"
    });
    localDB.version(3).stores({
        suratEksternal: "id, namaPengirim, emailPengirim, noHpPengirim, lembagaPengirim, noSurat, sifatSurat, halSurat, tujuanSurat, tglSurat, keterangan, fileInfoRaw, status, waktuInput, sync_status"
    });
    localDB.version(4).stores({ antrianSync: '++id, action, payload, status' });
    localDB.version(5).stores({ appSettings: 'id, data' });
    localDB.version(6).stores({
        pegawai: '++id, nama, nip, pangkatGol, jabatan, status',
        siswa: '++id, nama, nipd, nisn, tmptLahir, tglLahir, jk, namaAyah, namaIbu, kelas'
    });
}

/* ============================================================
   API URL & JEMBATAN KE GOOGLE APPS SCRIPT (SINKRONISASI)
   ============================================================ */
const DAFTAR_BACKEND = {
    "sman15tebo": "https://script.google.com/macros/s/AKfycbxdLjv0sQb-5vOx0mK9gu5U2zHnDnH8T4ZTqLjG5WV9LjTFDPkZ3NgQrYCKRbUtvbcB/exec",
    "smkn1kotaternate": "https://script.google.com/macros/s/AKfycbwBZsf0b4XTh5h6sRDjCiUp-9YwAFsjK-v6BQYoh7DBwZu1JB4CbhoXSQ7ZY-AEr8r0/exec",
    "sman9kotajambi": "https://script.google.com/macros/s/AKfycbysVuW9crRjHAaARjFWFwHnV4qXzrLpxoLt4dsZAhotPqn5_AMR3CM0CBsRq9N1oNA/exec",
    "sman6tanjungjabungbarat": "https://script.google.com/macros/s/AKfycbzTUtNRp-hSeST6e0zgiEyi4BO7c-3YHPILalIai9b2ncvd0hyg4ArY10F07FOVoDm0/exec",
    "demo": "https://"
};

let API_URL = localStorage.getItem('sidimas_api_url') || "";

function isAppOnline() {
    // Mode Desktop / File lokal = selalu offline dari spreadsheet
    const isBrowserDomain = !isElectron && window.location.protocol.startsWith('http');
    return Boolean(isBrowserDomain && navigator.onLine && API_URL && API_URL.trim() !== '');
}
window.isAppOnline = isAppOnline;
window.isOnlineMode = isAppOnline;

async function apiCall(actionName, payloadData = {}) {
    if (!API_URL) throw new Error('API_URL belum diisi');
    try {
        if (isElectron) {
            // Di Electron: lewat IPC proxy (main process) → menghindari CORS
            return await window.sidimas.proxyGas(API_URL, { action: actionName, payload: payloadData });
        } else {
            // Di Browser: langsung fetch ke GAS
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: actionName, payload: payloadData }),
                redirect: 'follow'
            });
            const rawText = await response.text();
            // Validasi: GAS yg belum di-deploy ulang akan merespons teks doGet, bukan JSON
            if (!rawText || rawText.trim().startsWith('API SiDiMAS') || rawText.trim().startsWith('<!DOCTYPE')) {
                throw new Error('GAS_NOT_DEPLOYED: Server merespons dengan teks bukan JSON. Pastikan kode.gs sudah dipaste ulang dan di-Deploy (New Version) dengan akses "Anyone".');
            }
            try {
                return JSON.parse(rawText);
            } catch (parseErr) {
                console.error('[SiDiMAS] Respons bukan JSON:', rawText.substring(0, 200));
                throw new Error('Respons server tidak valid. Cek kode.gs dan deployment GAS.');
            }
        }
    } catch (e) { console.error("Koneksi API Gagal:", e); throw e; }
}

function initTenantRouting() {
    if (isElectron) {
        if (!API_URL && window.APP_CONFIG && window.APP_CONFIG.gasUrl) {
            API_URL = window.APP_CONFIG.gasUrl;
            localStorage.setItem('sidimas_api_url', API_URL);
        }
        return true;
    }
    // Mode Online Browser (Multi-tenant)
    const urlParams = new URLSearchParams(window.location.search);
    let tenantId = urlParams.get('id');

    if (tenantId) {
        tenantId = tenantId.toLowerCase();
        if (DAFTAR_BACKEND[tenantId]) {
            API_URL = DAFTAR_BACKEND[tenantId];
            localStorage.setItem('sidimas_api_url', API_URL);
        } else {
            showInvalidTenantError();
            return false;
        }
    } else {
        API_URL = localStorage.getItem('sidimas_api_url');
        let isValid = Object.values(DAFTAR_BACKEND).includes(API_URL);
        if (!API_URL || !isValid) {
            API_URL = DAFTAR_BACKEND["demo"] || "";
            if (API_URL) localStorage.setItem('sidimas_api_url', API_URL);
        }
    }
    return true;
}

function showInvalidTenantError() {
    $('#view-login').html('<div class="text-center text-white" style="width:100%;"><h3 class="fw-bold">Akses Ditolak</h3><p>Link aplikasi tidak valid atau ID Instansi tidak ditemukan.</p></div>');
}

// Service Worker: Hanya registrasi di Web Browser via HTTP/HTTPS (GitHub Pages)
if (!isElectron && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW offline:', err));
    });
} else if (isElectron && 'serviceWorker' in navigator) {
    // Pastikan tidak ada Service Worker yang aktif di Electron
    navigator.serviceWorker.getRegistrations().then(regs => {
        for (let reg of regs) reg.unregister();
    }).catch(() => { });
}

let dbMasuk = [];
let dbKeluar = [];

