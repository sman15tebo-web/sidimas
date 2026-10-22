/**
 * ============================================================
 * SiDiMAS HYBRID — MODUL SOP PERSURATAN & DASAR HUKUM
 * Versi: 3.26.10
 * Fitur:
 * 1. Manajemen SOP Persuratan Resmi (Upload PDF Maks 500 KB)
 * 2. Unduh Draft SOP Word (.docx) untuk disesuaikan sekolah
 * 3. Pratinjau & Unduh Dokumen SOP Resmi (Dapat diakses dari Login & Pengaturan)
 * 4. CRUD Tabel Regulasi & Dasar Hukum Resmi SiDiMAS
 * 5. Bekerja 100% Offline (SQLite/Electron) & Online (Spreadsheet Cloud)
 * ============================================================
 */

const DEFAULT_SOP_WORD_PATH = './Draft_SOP_Persuratan_Sekolah.docx';
const DEFAULT_SOP_WORD_FILENAME = 'Draft_SOP_Persuratan_Sekolah.docx';
const DEFAULT_SOP_DEFAULT_PDF = './SOP Persuratan SMAN 15 Tebo.pdf';

const DEFAULT_DASAR_HUKUM_SIDIMAS = [
    {
        id: 1,
        jenis: "Undang-Undang",
        nomor: "UU No. 20 Tahun 2003",
        tentang: "Sistem Pendidikan Nasional",
        keterkaitan: "Pasal 45: Kewajiban satuan pendidikan menyediakan dan mengelola sarana administrasi persuratan dan ketatausahaan yang tertib, akuntabel, dan transparan."
    },
    {
        id: 2,
        jenis: "Undang-Undang",
        nomor: "UU No. 43 Tahun 2009",
        tentang: "Kearsipan",
        keterkaitan: "Penyelenggaraan kearsipan instansi/sekolah, penciptaan arsip surat masuk dan surat keluar yang autentik, utuh, terpercaya, dan mudah diakses kembali."
    },
    {
        id: 3,
        jenis: "Undang-Undang",
        nomor: "UU No. 14 Tahun 2008",
        tentang: "Keterbukaan Informasi Publik (KIP)",
        keterkaitan: "Hak masyarakat dan warga sekolah memperoleh transparansi informasi publik serta ketertiban dokumentasi persuratan resmi kedinasan."
    },
    {
        id: 4,
        jenis: "Undang-Undang",
        nomor: "UU No. 25 Tahun 2009",
        tentang: "Pelayanan Publik",
        keterkaitan: "Standar kecepatan dan kepastian pelayanan persuratan sekolah (surat keterangan siswa, surat tugas, rekomendasi), transparansi disposisi pimpinan."
    },
    {
        id: 5,
        jenis: "Undang-Undang",
        nomor: "UU No. 11/2008 jo. UU No. 1/2024",
        tentang: "Informasi dan Transaksi Elektronik (ITE)",
        keterkaitan: "Keabsahan pencatatan dokumen naskah dinas elektronik, barcode verifikasi, dan legalitas dokumen arsip surat digital."
    },
    {
        id: 6,
        jenis: "Undang-Undang",
        nomor: "UU No. 30 Tahun 2014",
        tentang: "Administrasi Pemerintahan",
        keterkaitan: "Pedoman tata kelola surat-menyurat kedinasan, batas kewenangan penandatanganan surat, dan instruksi lembar disposisi pimpinan."
    },
    {
        id: 7,
        jenis: "Peraturan Pemerintah",
        nomor: "PP No. 28 Tahun 2012",
        tentang: "Pelaksanaan UU No. 43 Tahun 2009 tentang Kearsipan",
        keterkaitan: "Pengelolaan arsip dinamis, tata naskah dinas, penomoran kode klasifikasi arsip, dan jadwal retensi arsip di lembaga pendidikan."
    },
    {
        id: 8,
        jenis: "Peraturan ANRI",
        nomor: "Peraturan ANRI No. 6 Tahun 2021",
        tentang: "Pedoman Pengelolaan Arsip Dinamis",
        keterkaitan: "Format standar buku agenda surat masuk, lembar kendali surat keluar, digitalisasi berkas fisik, dan pencatatan riwayat penanganan surat."
    },
    {
        id: 9,
        jenis: "PermenPAN-RB",
        nomor: "PermenPAN-RB No. 35 Tahun 2012",
        tentang: "Pedoman Penyusunan Standar Operasional Prosedur (SOP)",
        keterkaitan: "Pedoman baku matriks identitas dokumen SOP administrasi pemerintahan, alur prosedur persuratan, dan pembagian tugas pelaksana tata usaha."
    },
    {
        id: 10,
        jenis: "Permendikbud",
        nomor: "Permendikbud No. 80 Tahun 2015",
        tentang: "Tata Naskah Dinas di Lingkungan Kemendikbud",
        keterkaitan: "Bentuk baku naskah dinas sekolah (surat dinas umum, nota dinas, surat tugas, SK, surat pengantar), kop surat dinas resmi, dan format stempel sekolah."
    },
    {
        id: 11,
        jenis: "Permendagri",
        nomor: "Permendagri No. 1 Tahun 2023",
        tentang: "Tata Naskah Dinas di Lingkungan Pemerintah Daerah",
        keterkaitan: "Pedoman tata naskah dinas, bentuk dan format naskah dinas, kop surat, stempel jabatan/instansi, dan penandatanganan naskah dinas di lingkungan pemerintah daerah serta satuan pendidikan negeri."
    },
    {
        id: 12,
        jenis: "Permendagri",
        nomor: "Permendagri No. 83 Tahun 2022",
        tentang: "Kode Klasifikasi Arsip di Lingkungan Pemerintah Daerah",
        keterkaitan: "Pedoman penomoran kode klasifikasi arsip urusan pendidikan (seperti 400.3.8, 421.1, dll.) pada penomoran agenda surat keluar dinas."
    },
    {
        id: 13,
        jenis: "Permendikbudristek",
        nomor: "Permendikbudristek No. 47 Tahun 2023",
        tentang: "Standar Pengelolaan pada PAUD, Dikdas, dan Dikmen",
        keterkaitan: "Pengelolaan administrasi persuratan dan ketatausahaan sekolah berbasis teknologi informasi dan komunikasi melalui sistem digitalisasi SiDiMAS."
    },
    {
        id: 14,
        jenis: "Keputusan Kepala Sekolah",
        nomor: "SK No. [NOMOR SK KEPALA SEKOLAH]",
        tentang: "Tata Kelola Persuratan & Penerapan Aplikasi Digital SiDiMAS",
        keterkaitan: "Pemberlakuan resmi aplikasi hybrid SiDiMAS, pembagian tugas staf pencatat surat, alur kendali naskah surat, dan verifikasi disposisi kepala sekolah."
    }
];

let pendingSopPdfData = null;
let pendingSopPdfMeta = null;
let activeSopBlobUrl = null;

function base64ToBlob(base64, type = 'application/pdf') {
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: type });
}

window.hasCustomSopPdf = function () {
    return Boolean(localStorage.getItem('sidimas_sop_pdf_data') || localStorage.getItem('sidimas_sop_pdf_url'));
};

window.loadSOPHukumTab = async function () {
    try {
        if (typeof window.sidimas !== 'undefined') {
            // Coba via IPC method getOfflineSopPdf jika main process sudah ter-update
            let gotFromIpc = false;
            if (typeof window.sidimas.getOfflineSopPdf === 'function') {
                try {
                    const offRes = await window.sidimas.getOfflineSopPdf();
                    if (offRes && offRes.hasCustom) {
                        gotFromIpc = true;
                        if (offRes.base64) localStorage.setItem('sidimas_sop_pdf_data', offRes.base64);
                        if (offRes.meta) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(offRes.meta));
                        if (offRes.localPath) localStorage.setItem('sidimas_sop_pdf_local_path', offRes.localPath);
                    }
                } catch (e) {
                    console.warn('[SiDiMAS] getOfflineSopPdf IPC belum aktif di proses saat ini, beralih ke SQLite database:', e);
                }
            }

            // Fallback SQLite: baca langsung dari tabel appSettings
            if (!gotFromIpc && !localStorage.getItem('sidimas_sop_pdf_data')) {
                try {
                    const rowData = await window.sidimas.dbGet('appSettings', 'sop_pdf_data');
                    const rowMeta = await window.sidimas.dbGet('appSettings', 'sop_pdf_meta');
                    if (rowData) {
                        const b64 = typeof rowData === 'object' && rowData.data ? rowData.data : rowData;
                        if (b64 && typeof b64 === 'string') localStorage.setItem('sidimas_sop_pdf_data', b64);
                    }
                    if (rowMeta) {
                        const m = typeof rowMeta === 'object' && rowMeta.data ? rowMeta.data : rowMeta;
                        if (m) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(m));
                    }
                } catch (dbErr) {
                    console.warn('[SiDiMAS] Gagal membaca appSettings SQLite:', dbErr);
                }
            }
        }

        // Jalankan sinkronisasi cerdas dua arah jika ada koneksi online
        if ((typeof isAppOnline === 'function' ? isAppOnline() : navigator.onLine) && typeof syncSopTwoWay === 'function') {
            await syncSopTwoWay();
        }

        updateSopTabUI();
        renderDasarHukumTable();
    } catch (err) {
        console.error('Gagal memuat tab SOP & Dasar Hukum:', err);
    }
};

/**
 * Sinkronisasi Cerdas Dua Arah Dokumen SOP:
 * 1. Jika di offline ada berkas SOP tapi di Google Drive belum ada -> otomatis UPLOAD ke folder induk Google Drive.
 * 2. Jika di offline belum ada tapi di Google Drive sudah ada -> otomatis UNDUH berkas fisik PDF (base64) dan SIMPAN ke database SQLite laptop!
 */
window.syncSopTwoWay = async function () {
    const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : navigator.onLine;
    const hasGas = Boolean(typeof API_URL !== 'undefined' && API_URL && isOnline);
    if (!hasGas) return null;

    try {
        console.log('[SiDiMAS Sync SOP] Memeriksa sinkronisasi dua arah dokumen SOP...');

        // 1. Ambil data lokal offline
        let offlineData = localStorage.getItem('sidimas_sop_pdf_data') || '';
        let offlineMeta = null;
        try {
            offlineMeta = JSON.parse(localStorage.getItem('sidimas_sop_pdf_meta') || 'null');
        } catch (_) { }

        // Jika di Electron dan belum ada di cache, baca dari SQLite
        if (!offlineData && typeof window.sidimas !== 'undefined') {
            try {
                const rowData = await window.sidimas.dbGet('appSettings', 'sop_pdf_data');
                const rowMeta = await window.sidimas.dbGet('appSettings', 'sop_pdf_meta');
                if (rowData) {
                    offlineData = typeof rowData === 'object' && rowData.data ? rowData.data : rowData;
                    if (offlineData) localStorage.setItem('sidimas_sop_pdf_data', offlineData);
                }
                if (rowMeta) {
                    offlineMeta = typeof rowMeta === 'object' && rowMeta.data ? rowMeta.data : rowMeta;
                    if (offlineMeta) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(offlineMeta));
                }
            } catch (_) { }
        }

        const hasOffline = Boolean(offlineData && offlineData.length > 50);

        // 2. Ambil data online dari Google Drive induk (termasuk berkas fisik PDF dalam base64)
        let onlineRes = null;
        try {
            onlineRes = await apiCall('getSopPdf', { includeBase64: true });
        } catch (e) {
            console.warn('[SiDiMAS Sync SOP] Gagal memanggil getSopPdf ke server:', e);
            return null;
        }

        const hasOnline = Boolean(onlineRes && onlineRes.hasCustom && onlineRes.base64);

        // ==============================================================
        // KASUS 1: Di OFFLINE ADA, di ONLINE GOOGLE DRIVE BELUM ADA
        // -> Otomatis UPLOAD dari offline laptop ke Google Drive induk!
        // ==============================================================
        if (hasOffline && !hasOnline) {
            console.log('[SiDiMAS Sync SOP] SOP ada di offline namun belum ada di Drive induk. Mengunggah ke Google Drive...');
            const uploadRes = await apiCall('uploadSopPdf', {
                fileDataUrl: offlineData,
                filename: (offlineMeta && offlineMeta.name) || 'SOP_Persuratan_Resmi.pdf'
            });
            if (uploadRes && uploadRes.success && uploadRes.url) {
                localStorage.setItem('sidimas_sop_pdf_url', uploadRes.url);
                if (uploadRes.meta) {
                    localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(uploadRes.meta));
                }
                console.log('✅ [SiDiMAS Sync SOP] Berhasil mengunggah dokumen SOP ke Google Drive induk:', uploadRes.url);
                return { action: 'uploaded_to_drive', url: uploadRes.url };
            }
        }

        // ==============================================================
        // KASUS 2: Di OFFLINE BELUM ADA, di ONLINE GOOGLE DRIVE SUDAH ADA
        // -> Otomatis TARIK & UNDUH berkas fisik PDF-nya dari Google Drive,
        //    lalu simpan langsung ke database SQLite laptop & harddisk!
        // ==============================================================
        else if (!hasOffline && hasOnline) {
            console.log('[SiDiMAS Sync SOP] SOP ditemukan di Google Drive induk. Mengunduh berkas fisik PDF ke database laptop...');
            const base64Data = onlineRes.base64;
            const metaData = onlineRes.meta || {
                name: 'SOP_Persuratan_Resmi.pdf',
                updatedAt: new Date().toLocaleDateString('id-ID'),
                origin: 'cloud_drive'
            };

            // Simpan ke Electron SQLite & berkas harddisk lokal
            if (typeof window.sidimas !== 'undefined') {
                try {
                    if (typeof window.sidimas.saveOfflineSopPdf === 'function') {
                        const offSave = await window.sidimas.saveOfflineSopPdf({
                            fileDataUrl: base64Data,
                            filename: metaData.name
                        });
                        if (offSave && offSave.filePath) {
                            localStorage.setItem('sidimas_sop_pdf_local_path', offSave.filePath);
                        }
                    }
                } catch (_) { }
                try {
                    await window.sidimas.dbPut('appSettings', { id: 'sop_pdf_data', data: base64Data });
                    await window.sidimas.dbPut('appSettings', { id: 'sop_pdf_meta', data: metaData });
                } catch (_) { }
            }

            // Simpan ke localStorage & Dexie
            localStorage.setItem('sidimas_sop_pdf_data', base64Data);
            localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(metaData));
            if (onlineRes.url) localStorage.setItem('sidimas_sop_pdf_url', onlineRes.url);

            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                try {
                    await localDB.appSettings.put({ id: 'sop_pdf_data', data: base64Data });
                    await localDB.appSettings.put({ id: 'sop_pdf_meta', data: metaData });
                } catch (_) { }
            }

            if (typeof updateSopTabUI === 'function') updateSopTabUI();
            console.log('✅ [SiDiMAS Sync SOP] Berkas SOP berhasil diunduh dan tersimpan di database laptop!');
            return { action: 'downloaded_to_local', meta: metaData };
        }

        // ==============================================================
        // KASUS 3: Keduanya sudah ada
        // ==============================================================
        else if (hasOffline && hasOnline) {
            if (onlineRes.url && !localStorage.getItem('sidimas_sop_pdf_url')) {
                localStorage.setItem('sidimas_sop_pdf_url', onlineRes.url);
            }
        }
    } catch (syncErr) {
        console.warn('[SiDiMAS Sync SOP] Peringatan sinkronisasi dokumen SOP:', syncErr);
    }
    return null;
};

function updateSopTabUI() {
    const customSopData = localStorage.getItem('sidimas_sop_pdf_data') || '';
    const customSopUrl = localStorage.getItem('sidimas_sop_pdf_url') || '';
    const customLocalPath = localStorage.getItem('sidimas_sop_pdf_local_path') || '';
    let customSopMeta = null;
    try {
        customSopMeta = JSON.parse(localStorage.getItem('sidimas_sop_pdf_meta') || 'null');
    } catch (e) { }

    const activeMetaEl = document.getElementById('sopActiveMetaInfo');
    const activeBadgeEl = document.getElementById('sopActiveBadge');
    const btnLihatEl = document.getElementById('btnLihatSop');
    const btnHapusEl = document.getElementById('btnHapusSop');
    const btnUnduhTemplateWord = document.getElementById('btnUnduhTemplateWord');

    const hasUploadedDoc = Boolean((customSopData || customSopUrl || customLocalPath) && customSopMeta);

    if (hasUploadedDoc) {
        // Mode: Berkas PDF Kustom Resmi Aktif
        const fileName = customSopMeta.name || 'SOP_Persuratan_Resmi.pdf';
        const locText = customSopMeta.origin === 'offline_local' ? 'Tersimpan Offline Lokal' : 'Tersimpan di Cloud';
        if (activeMetaEl) {
            activeMetaEl.classList.remove('d-none');
            activeMetaEl.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 me-1"><i class="fas fa-check-circle me-1"></i>SOP Aktif</span> <b>${fileName}</b> <span class="text-muted">(${customSopMeta.sizeText || 'PDF'} • ${customSopMeta.updatedAt || 'Tersimpan'} • ${locText})</span>`;
        }
        if (activeBadgeEl) {
            activeBadgeEl.textContent = 'Dokumen Resmi Aktif (PDF)';
            activeBadgeEl.className = 'badge rounded-pill bg-success text-white py-1 px-2.5';
        }

        // Tampilkan tombol Lihat dan tombol X Hapus
        if (btnLihatEl) btnLihatEl.classList.remove('d-none');
        if (btnHapusEl) btnHapusEl.classList.remove('d-none');
    } else {
        // Mode: Belum ada file kustom yang diunggah
        if (activeMetaEl) {
            activeMetaEl.classList.add('d-none');
            activeMetaEl.innerHTML = '';
        }
        if (activeBadgeEl) {
            activeBadgeEl.textContent = 'Belum Ada SOP PDF';
            activeBadgeEl.className = 'badge rounded-pill bg-secondary bg-opacity-10 text-secondary border py-1 px-2.5';
        }

        // Sembunyikan tombol Lihat & Hapus X
        if (btnLihatEl) btnLihatEl.classList.add('d-none');
        if (btnHapusEl) btnHapusEl.classList.add('d-none');
    }

    if (btnUnduhTemplateWord) {
        btnUnduhTemplateWord.classList.remove('d-none');
    }
}

window.handleSopFileSelected = function (e) {
    const file = e.target.files && e.target.files[0];
    const btnSave = document.getElementById('btnSaveSopPdf');
    const hintEl = document.getElementById('sopUploadHint');
    if (!file) {
        pendingSopPdfData = null;
        pendingSopPdfMeta = null;
        if (btnSave) btnSave.disabled = true;
        return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        Swal.fire({
            icon: 'warning',
            title: 'Format File Tidak Sesuai',
            text: 'Harap pilih berkas dokumen dengan format PDF (.pdf).'
        });
        e.target.value = '';
        if (btnSave) btnSave.disabled = true;
        return;
    }

    const sizeKB = (file.size / 1024).toFixed(1);
    if (file.size > 500 * 1024) {
        Swal.fire({
            icon: 'error',
            title: 'Ukuran File Terlalu Besar',
            text: `Ukuran file (${sizeKB} KB) melebihi batas maksimal 500 KB. Harap gunakan berkas PDF berukuran maksimal 500 KB.`
        });
        e.target.value = '';
        if (btnSave) btnSave.disabled = true;
        return;
    }

    const reader = new FileReader();
    reader.onload = function (evt) {
        pendingSopPdfData = evt.target.result;
        pendingSopPdfMeta = {
            name: file.name,
            sizeBytes: file.size,
            sizeText: sizeKB + ' KB',
            updatedAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            origin: (typeof window.sidimas !== 'undefined') ? 'offline_local' : 'cloud_drive'
        };
        if (btnSave) btnSave.disabled = false;
        if (hintEl) {
            hintEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>File siap: ${file.name} (${sizeKB} KB). Klik tombol "Simpan File SOP" di bawah.</span>`;
        }
    };
    reader.readAsDataURL(file);
};

window.saveSopPdfFile = async function () {
    if (!pendingSopPdfData || !pendingSopPdfMeta) {
        Swal.fire({ icon: 'info', title: 'Pilih File', text: 'Silakan pilih berkas PDF SOP terlebih dahulu (maksimal 500 KB).' });
        return;
    }

    Swal.fire({
        title: 'Menyimpan Dokumen SOP...',
        text: 'Sedang memproses dan menyimpan berkas SOP ke sistem...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        let savedOffline = false;

        // 1. Jika di Electron, coba IPC saveOfflineSopPdf
        if (typeof window.sidimas !== 'undefined' && typeof window.sidimas.saveOfflineSopPdf === 'function') {
            try {
                const offRes = await window.sidimas.saveOfflineSopPdf({
                    fileDataUrl: pendingSopPdfData,
                    filename: pendingSopPdfMeta.name
                });
                if (offRes && offRes.success) {
                    savedOffline = true;
                    if (offRes.filePath) localStorage.setItem('sidimas_sop_pdf_local_path', offRes.filePath);
                    if (offRes.meta) pendingSopPdfMeta = offRes.meta;
                }
            } catch (ipcErr) {
                console.warn('[SiDiMAS] saveOfflineSopPdf IPC belum aktif di proses saat ini, beralih ke dbPut SQLite:', ipcErr);
            }
        }

        // 2. Fallback SQLite: gunakan window.sidimas.dbPut ('appSettings') yang SUDAH PASTI aktif di IPC
        if (typeof window.sidimas !== 'undefined' && !savedOffline) {
            try {
                await window.sidimas.dbPut('appSettings', { id: 'sop_pdf_data', data: pendingSopPdfData });
                await window.sidimas.dbPut('appSettings', { id: 'sop_pdf_meta', data: pendingSopPdfMeta });
                savedOffline = true;
            } catch (dbErr) {
                console.warn('[SiDiMAS] dbPut appSettings error:', dbErr);
            }
        }

        // 3. Simpan juga ke localStorage
        localStorage.setItem('sidimas_sop_pdf_data', pendingSopPdfData);
        localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(pendingSopPdfMeta));

        // 4. Jika sedang online dan di web browser, upload ke Google Drive
        if (typeof isAppOnline === 'function' && isAppOnline() && typeof window.sidimas === 'undefined') {
            try {
                const onlRes = await apiCall('uploadSopPdf', {
                    fileDataUrl: pendingSopPdfData,
                    filename: pendingSopPdfMeta.name
                });
                if (onlRes && onlRes.url) {
                    localStorage.setItem('sidimas_sop_pdf_url', onlRes.url);
                }
            } catch (cloudErr) {
                console.warn('[SiDiMAS] Simpan online Drive error:', cloudErr);
            }
        }

        // 5. Simpan ke Dexie jika tersedia
        if (typeof localDB !== 'undefined' && localDB.appSettings) {
            try {
                await localDB.appSettings.put({ id: 'sop_pdf_data', data: pendingSopPdfData });
                await localDB.appSettings.put({ id: 'sop_pdf_meta', data: pendingSopPdfMeta });
            } catch (_) { }
        }

        Swal.fire({
            icon: 'success',
            title: 'Berhasil Disimpan',
            text: 'Dokumen SOP persuratan berhasil disimpan ke sistem!',
            timer: 2000,
            showConfirmButton: false
        });
        finishSaveSop();
    } catch (saveError) {
        console.error('[SiDiMAS] Error saat menyimpan SOP:', saveError);
        // Fallback darurat: pastikan tetap tersimpan di localStorage
        try {
            localStorage.setItem('sidimas_sop_pdf_data', pendingSopPdfData);
            localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(pendingSopPdfMeta));
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Disimpan',
                text: 'Dokumen SOP persuratan berhasil disimpan lokal ke peramban!',
                timer: 2000,
                showConfirmButton: false
            });
            finishSaveSop();
        } catch (e) {
            Swal.fire('Gagal Menyimpan', saveError.message || String(saveError), 'error');
        }
    }
};

function finishSaveSop() {
    const inputEl = document.getElementById('inputSopPdf');
    if (inputEl) inputEl.value = '';
    const btnSave = document.getElementById('btnSaveSopPdf');
    if (btnSave) btnSave.disabled = true;
    const hintEl = document.getElementById('sopUploadHint');
    if (hintEl) hintEl.innerHTML = '<i class="fas fa-info-circle me-1"></i>Format wajib: <b>.pdf</b> | Ukuran maksimal: <b>500 KB</b>.';
    pendingSopPdfData = null;
    pendingSopPdfMeta = null;
    updateSopTabUI();
}

window.hapusSopPdf = function () {
    Swal.fire({
        title: 'Hapus Dokumen SOP?',
        text: 'Dokumen SOP kustom yang diunggah akan dihapus dan sistem akan kembali menggunakan template standar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Dokumen',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Menghapus Berkas...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            if (typeof window.sidimas !== 'undefined') {
                try {
                    if (typeof window.sidimas.deleteOfflineSopPdf === 'function') {
                        await window.sidimas.deleteOfflineSopPdf();
                    }
                } catch (_) { }
                try {
                    await window.sidimas.dbDelete('appSettings', 'sop_pdf_data');
                    await window.sidimas.dbDelete('appSettings', 'sop_pdf_meta');
                    await window.sidimas.dbDelete('appSettings', 'sop_pdf_local_path');
                } catch (_) { }
            } else if (typeof isAppOnline === 'function' && isAppOnline()) {
                try {
                    await apiCall('deleteSopPdf');
                } catch (_) { }
            }

            localStorage.removeItem('sidimas_sop_pdf_data');
            localStorage.removeItem('sidimas_sop_pdf_meta');
            localStorage.removeItem('sidimas_sop_pdf_url');
            localStorage.removeItem('sidimas_sop_pdf_local_path');

            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                try {
                    await localDB.appSettings.delete('sop_pdf_data');
                    await localDB.appSettings.delete('sop_pdf_meta');
                } catch (_) { }
            }

            if (activeSopBlobUrl) {
                URL.revokeObjectURL(activeSopBlobUrl);
                activeSopBlobUrl = null;
            }

            Swal.fire({
                icon: 'success',
                title: 'Dokumen Dihapus',
                text: 'Dokumen SOP kustom telah dihapus dari sistem.',
                timer: 1500,
                showConfirmButton: false
            });
            updateSopTabUI();
        }
    });
};

window.getActiveSopUrl = function () {
    // 1. Cek data base64 lokal
    const customData = localStorage.getItem('sidimas_sop_pdf_data');
    if (customData) {
        try {
            if (activeSopBlobUrl) URL.revokeObjectURL(activeSopBlobUrl);
            const blob = base64ToBlob(customData);
            activeSopBlobUrl = URL.createObjectURL(blob);
            return activeSopBlobUrl;
        } catch (e) {
            console.warn('Gagal membuat Blob URL dari custom SOP:', e);
            return customData;
        }
    }

    // 2. Cek Path File Lokal di Harddisk (Electron Desktop)
    const localPath = localStorage.getItem('sidimas_sop_pdf_local_path');
    if (localPath && typeof window.sidimas !== 'undefined') {
        const normalized = localPath.replace(/\\/g, '/');
        return normalized.startsWith('file://') ? normalized : `file:///${normalized}`;
    }

    // 3. Cek URL Google Drive jika berada di web online
    const customUrl = localStorage.getItem('sidimas_sop_pdf_url');
    if (customUrl && typeof window.sidimas === 'undefined') {
        return customUrl;
    }

    // 4. Fallback ke dokumen SOP PDF bawaan resmi persuratan
    return DEFAULT_SOP_DEFAULT_PDF;
};

window.downloadTemplateWord = function () {
    const a = document.createElement('a');
    a.href = DEFAULT_SOP_WORD_PATH;
    a.download = DEFAULT_SOP_WORD_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
};

window.previewSopPdf = async function () {
    // Pastikan data terbaru terbaca jika belum ada di cache
    if (!localStorage.getItem('sidimas_sop_pdf_data') && typeof window.sidimas !== 'undefined') {
        try {
            const rowData = await window.sidimas.dbGet('appSettings', 'sop_pdf_data');
            const rowMeta = await window.sidimas.dbGet('appSettings', 'sop_pdf_meta');
            if (rowData) {
                const b64 = typeof rowData === 'object' && rowData.data ? rowData.data : rowData;
                if (b64 && typeof b64 === 'string') localStorage.setItem('sidimas_sop_pdf_data', b64);
            }
            if (rowMeta) {
                const m = typeof rowMeta === 'object' && rowMeta.data ? rowMeta.data : rowMeta;
                if (m) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(m));
            }
        } catch (_) { }
    }

    const pdfUrl = getActiveSopUrl();
    if (!pdfUrl) {
        downloadTemplateWord();
        return;
    }

    const modalEl = document.getElementById('modalPreviewSOP');
    const iframe = document.getElementById('iframeSOPViewer');
    if (modalEl && iframe) {
        iframe.src = pdfUrl;
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } else if (typeof openFilePreviewModal === 'function') {
        openFilePreviewModal({
            title: 'Standar Operasional Prosedur (SOP) Persuratan Sekolah',
            typeBadge: 'PDF',
            dataUrl: pdfUrl,
            filename: 'SOP_Persuratan_SiDiMAS'
        });
    } else {
        window.open(pdfUrl, '_blank');
    }
};

window.downloadSopPdf = function () {
    const pdfUrl = getActiveSopUrl();
    if (!pdfUrl) {
        downloadTemplateWord();
        return;
    }

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'SOP_Persuratan_SiDiMAS.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
};


// ============================================================
// CRUD TABEL DASAR HUKUM SIDIMAS
// ============================================================

window.getDasarHukumList = function () {
    try {
        const stored = localStorage.getItem('dasar_hukum_sidimas');
        if (stored) {
            let parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Pastikan jika ada regulasi standar baru yang belum ada di list (seperti Permendagri No. 1 Tahun 2023), kita auto-merge
                const existingNumbers = new Set(parsed.map(x => (x.nomor || '').toLowerCase().trim()));
                let updated = false;
                DEFAULT_DASAR_HUKUM_SIDIMAS.forEach(def => {
                    if (!existingNumbers.has((def.nomor || '').toLowerCase().trim())) {
                        parsed.push(def);
                        updated = true;
                    }
                });
                if (updated) {
                    localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(parsed));
                }
                return parsed;
            }
        }
    } catch (e) { }
    return DEFAULT_DASAR_HUKUM_SIDIMAS;
};

window.renderDasarHukumTable = function () {
    const tbody = document.getElementById('tbodyDasarHukum');
    if (!tbody) return;

    const list = getDasarHukumList();
    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Belum ada data dasar hukum. Klik tombol <b>Reset Standar</b> untuk memuat 14 regulasi resmi persuratan.</td></tr>`;
        return;
    }

    const badgeColorMap = {
        'Undang-Undang': 'bg-primary text-primary border-primary',
        'Peraturan Pemerintah': 'bg-success text-success border-success',
        'Peraturan ANRI': 'bg-warning text-dark border-warning',
        'PermenPAN-RB': 'bg-purple text-dark border-secondary',
        'Permendikbud': 'bg-info text-info border-info',
        'Permendikbudristek': 'bg-info text-info border-info',
        'Permendagri': 'bg-secondary text-secondary border-secondary',
        'Keputusan Kepala Sekolah': 'bg-danger text-danger border-danger'
    };

    let html = '';
    list.forEach((item, idx) => {
        const badgeStyle = badgeColorMap[item.jenis] || 'bg-secondary text-secondary border-secondary';
        html += `
            <tr>
                <td class="text-center fw-bold text-muted py-2.5 px-3" style="width: 45px;">${idx + 1}</td>
                <td class="py-2.5 px-3" style="width: 170px;">
                    <span class="badge rounded-pill bg-opacity-10 border py-1 px-2.5 ${badgeStyle}" style="font-size: 0.72rem;">${item.jenis}</span>
                </td>
                <td class="py-2.5 px-3 fw-bold text-dark font-monospace" style="font-size: 0.8rem; width: 200px;">${item.nomor}</td>
                <td class="py-2.5 px-3 fw-semibold text-secondary" style="width: 250px;">${item.tentang}</td>
                <td class="py-2.5 px-3 text-muted" style="font-size: 0.8rem;">${item.keterkaitan}</td>
                <td class="text-center py-2.5 px-3" style="width: 90px;">
                    <div class="d-flex align-items-center justify-content-center gap-1">
                        <button type="button" onclick="openModalTambahDasarHukum(${idx})" class="btn btn-sm btn-outline-primary border-0 p-1" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="hapusDasarHukum(${idx})" class="btn btn-sm btn-outline-danger border-0 p-1" title="Hapus">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

window.openModalTambahDasarHukum = function (editIndex = -1) {
    const modalEl = document.getElementById('modalFormDasarHukum');
    if (!modalEl) return;
    const title = document.getElementById('modalDasarHukumTitle');
    const inputIdx = document.getElementById('editDasarHukumIndex');
    const inputJenis = document.getElementById('inputJenisRegulasi');
    const inputNomor = document.getElementById('inputNomorTahun');
    const inputTentang = document.getElementById('inputTentang');
    const inputKeterkaitan = document.getElementById('inputKeterkaitan');

    if (editIndex >= 0) {
        const list = getDasarHukumList();
        const item = list[editIndex];
        if (item) {
            title.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Regulasi Dasar Hukum';
            inputIdx.value = editIndex;
            inputJenis.value = item.jenis || 'Undang-Undang';
            inputNomor.value = item.nomor || '';
            inputTentang.value = item.tentang || '';
            inputKeterkaitan.value = item.keterkaitan || '';
        }
    } else {
        title.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Tambah Regulasi Dasar Hukum';
        inputIdx.value = -1;
        inputJenis.value = 'Undang-Undang';
        inputNomor.value = '';
        inputTentang.value = '';
        inputKeterkaitan.value = '';
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

window.simpanDasarHukum = async function (e) {
    e.preventDefault();
    const inputIdx = parseInt(document.getElementById('editDasarHukumIndex').value, 10);
    const inputJenis = document.getElementById('inputJenisRegulasi').value.trim();
    const inputNomor = document.getElementById('inputNomorTahun').value.trim();
    const inputTentang = document.getElementById('inputTentang').value.trim();
    const inputKeterkaitan = document.getElementById('inputKeterkaitan').value.trim();

    if (!inputNomor || !inputTentang) {
        Swal.fire('Perhatian', 'Nomor & Tahun serta Judul Regulasi wajib diisi.', 'warning');
        return;
    }

    const list = getDasarHukumList();
    const newItem = {
        id: inputIdx >= 0 && list[inputIdx] ? list[inputIdx].id : Date.now(),
        jenis: inputJenis,
        nomor: inputNomor,
        tentang: inputTentang,
        keterkaitan: inputKeterkaitan || '-'
    };

    if (inputIdx >= 0 && inputIdx < list.length) {
        list[inputIdx] = newItem;
    } else {
        list.push(newItem);
    }

    localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(list));
    if (typeof window.sidimas !== 'undefined') {
        try {
            await window.sidimas.dbPut('appSettings', { id: 'dasar_hukum_sidimas', data: list });
        } catch (_) { }
    }
    if (typeof localDB !== 'undefined' && localDB.appSettings) {
        try {
            await localDB.appSettings.put({ id: 'dasar_hukum_sidimas', data: list });
        } catch (_) { }
    }

    const modalEl = document.getElementById('modalFormDasarHukum');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();

    renderDasarHukumTable();
    Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Regulasi dasar hukum persuratan berhasil disimpan.',
        timer: 1500,
        showConfirmButton: false
    });
};

window.hapusDasarHukum = function (index) {
    const list = getDasarHukumList();
    const item = list[index];
    if (!item) return;

    Swal.fire({
        title: 'Hapus Regulasi Ini?',
        text: `Hapus dasar hukum: ${item.nomor} tentang ${item.tentang}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            list.splice(index, 1);
            localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(list));
            if (typeof window.sidimas !== 'undefined') {
                try {
                    await window.sidimas.dbPut('appSettings', { id: 'dasar_hukum_sidimas', data: list });
                } catch (_) { }
            }
            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                try {
                    await localDB.appSettings.put({ id: 'dasar_hukum_sidimas', data: list });
                } catch (_) { }
            }
            renderDasarHukumTable();
            Swal.fire({
                icon: 'success',
                title: 'Terhapus',
                text: 'Regulasi dasar hukum telah dihapus.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
};

window.resetDasarHukumDefault = function () {
    Swal.fire({
        title: 'Reset ke Standar Regulasi?',
        text: 'Daftar dasar hukum akan dikembalikan ke 14 regulasi resmi tata kelola persuratan & kearsipan sekolah.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Reset Standar',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(DEFAULT_DASAR_HUKUM_SIDIMAS));
            if (typeof window.sidimas !== 'undefined') {
                try {
                    await window.sidimas.dbPut('appSettings', { id: 'dasar_hukum_sidimas', data: DEFAULT_DASAR_HUKUM_SIDIMAS });
                } catch (_) { }
            }
            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                try {
                    await localDB.appSettings.put({ id: 'dasar_hukum_sidimas', data: DEFAULT_DASAR_HUKUM_SIDIMAS });
                } catch (_) { }
            }
            renderDasarHukumTable();
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Direset',
                text: '14 regulasi dasar hukum persuratan standar berhasil dimuat kembali.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
};

// Inisialisasi otomatis jika tab dibuka
document.addEventListener('DOMContentLoaded', function () {
    const sopTabBtn = document.getElementById('sop-hukum-tab');
    if (sopTabBtn) {
        sopTabBtn.addEventListener('shown.bs.tab', function () {
            loadSOPHukumTab();
        });
    }
});
