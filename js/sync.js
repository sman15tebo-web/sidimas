/* --- FUNGSI SINKRONISASI KE CLOUD --- */
function openSyncModal() {
    let savedUrl = localStorage.getItem('sidimas_api_url') || "";
    if (!savedUrl) {
        try {
            const s = JSON.parse(localStorage.getItem('sidimas_settings') || "{}");
            if (s.link_exec) savedUrl = s.link_exec;
        } catch (e) { }
    }
    $('#syncLinkExec').val(savedUrl);
    new bootstrap.Modal('#modalSync').show();
}

function processSyncModal() {
    const url = $('#syncLinkExec').val().trim();
    if (!url) {
        Swal.fire('Info', 'Harap isi Link Web App URL (GAS) terlebih dahulu.', 'info');
        return;
    }

    localStorage.setItem('sidimas_api_url', url);
    API_URL = url;

    const modal = bootstrap.Modal.getInstance('#modalSync');
    if (modal) modal.hide();

    syncToCloud();
}

async function syncToCloud() {
    const btn = $('#btnSyncMain');
    const originalHTML = btn.html();
    btn.html('<span class="spinner-border spinner-border-sm me-2"></span> Menyinkronkan...').prop('disabled', true);
    
    let syncProgress = 0;
    Swal.fire({ 
        title: 'Sinkronisasi Cloud', 
        html: `Sedang menghubungi server...<br>
               <div class="progress mt-3" style="height: 20px;">
                   <div id="syncProgressBar" class="progress-bar progress-bar-striped progress-bar-animated bg-primary" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
               </div>`, 
        allowOutsideClick: false, 
        showConfirmButton: false 
    });

    const progressInterval = setInterval(() => {
        if (syncProgress < 90) {
            syncProgress += Math.floor(Math.random() * 10) + 2;
            if (syncProgress > 90) syncProgress = 90;
            const pb = document.getElementById('syncProgressBar');
            if(pb) {
                pb.style.width = syncProgress + '%';
                pb.innerText = syncProgress + '%';
                pb.setAttribute('aria-valuenow', syncProgress);
            }
        }
    }, 600);

    try {
        const pendingMasuk = await localDB.suratMasuk.where('sync_status').equals('pending').toArray();
        const pendingKeluar = await localDB.suratKeluar.where('sync_status').equals('pending').toArray();
        const hapusAntrian = await localDB.antrianSync.where('status').equals('pending').toArray();

        const payload = {
            suratMasuk: pendingMasuk,
            suratKeluar: pendingKeluar,
            deleteQueue: hapusAntrian
        };

        const res = await apiCall('syncBatch', payload);
        clearInterval(progressInterval);
        
        if (res.success) {
            const pb = document.getElementById('syncProgressBar');
            if(pb) {
                pb.style.width = '100%';
                pb.innerText = '100%';
                pb.setAttribute('aria-valuenow', 100);
            }
            
            for (let s of pendingMasuk) { await localDB.suratMasuk.update(s.id, { sync_status: 'synced', fileInfoRaw: null }); }
            for (let s of pendingKeluar) { await localDB.suratKeluar.update(s.id, { sync_status: 'synced', fileInfoRaw: null }); }
            for (let h of hapusAntrian) { await localDB.antrianSync.delete(h.id); }

            if (res.pulledMasuk) {
                await localDB.suratMasuk.clear();
                await localDB.suratMasuk.bulkAdd(res.pulledMasuk);
            }
            if (res.pulledKeluar) {
                await localDB.suratKeluar.clear();
                await localDB.suratKeluar.bulkAdd(res.pulledKeluar);
            }
            if (res.pulledSettings) {
                localStorage.setItem('sidimas_settings', JSON.stringify(res.pulledSettings));
                renderAppAttributes(res.pulledSettings);
            }
            if (res.pulledKodeCustom) {
                await localDB.kodeCustom.clear();
                await localDB.kodeCustom.bulkAdd(res.pulledKodeCustom);
                loadKodeCustomTable();
            }
            if (res.pulledPegawai) {
                await localDB.pegawai.clear();
                await localDB.pegawai.bulkAdd(res.pulledPegawai);
                if (typeof loadPegawai === 'function') loadPegawai();
            }
            if (res.pulledSiswa) {
                await localDB.siswa.clear();
                await localDB.siswa.bulkAdd(res.pulledSiswa);
                if (typeof loadSiswa === 'function') loadSiswa();
            }

            Swal.fire('Sinkronisasi Sukses', 'Data Anda telah aman di Cloud.', 'success');
            refreshAllTables();
            if ($('#page-masuk').is(':visible')) refreshTable('masuk');
            if ($('#page-keluar').is(':visible')) refreshTable('keluar');
        } else {
            Swal.fire('Gagal Sinkronisasi', res.message, 'error');
        }
    } catch (err) {
        clearInterval(progressInterval);
        console.error('[SiDiMAS Sync Error]', err);
        if (!API_URL) {
            Swal.fire('Info', 'Harap isi Link Web App URL (GAS) terlebih dahulu.', 'info');
        } else {
            Swal.fire('Error Sinkronisasi', `<b>Pesan Error:</b><br><code style="font-size:11px;word-break:break-all">${err.message || err}</code><br><br>Pastikan internet aktif dan Link URL benar.`, 'error');
        }
    } finally {
        clearInterval(progressInterval);
        btn.html(originalHTML).prop('disabled', false);
    }
}

async function silentSync() {
    try {
        const pendingMasuk = await localDB.suratMasuk.where('sync_status').equals('pending').toArray();
        const pendingKeluar = await localDB.suratKeluar.where('sync_status').equals('pending').toArray();
        const hapusAntrian = await localDB.antrianSync.where('status').equals('pending').toArray();

        const payload = {
            suratMasuk: pendingMasuk,
            suratKeluar: pendingKeluar,
            deleteQueue: hapusAntrian
        };

        const res = await apiCall('syncBatch', payload);
        
        if (res.success) {
            for (let s of pendingMasuk) { await localDB.suratMasuk.update(s.id, { sync_status: 'synced', fileInfoRaw: null }); }
            for (let s of pendingKeluar) { await localDB.suratKeluar.update(s.id, { sync_status: 'synced', fileInfoRaw: null }); }
            for (let h of hapusAntrian) { await localDB.antrianSync.delete(h.id); }

            if (res.pulledMasuk) { await localDB.suratMasuk.clear(); await localDB.suratMasuk.bulkAdd(res.pulledMasuk); }
            if (res.pulledKeluar) { await localDB.suratKeluar.clear(); await localDB.suratKeluar.bulkAdd(res.pulledKeluar); }
            if (res.pulledSettings) {
                localStorage.setItem('sidimas_settings', JSON.stringify(res.pulledSettings));
                renderAppAttributes(res.pulledSettings);
            }
            if (res.pulledKodeCustom) { await localDB.kodeCustom.clear(); await localDB.kodeCustom.bulkAdd(res.pulledKodeCustom); }
            if (res.pulledPegawai) { await localDB.pegawai.clear(); await localDB.pegawai.bulkAdd(res.pulledPegawai); }
            if (res.pulledSiswa) { await localDB.siswa.clear(); await localDB.siswa.bulkAdd(res.pulledSiswa); }
        }
    } catch (err) {
        console.error('[SiDiMAS Silent Sync Error]', err);
    }
}

/* =============================================================
   SISTEM CACHE 6 JAM — DATA SELALU FRESH DI SEMUA BROWSER
   =============================================================
   Setiap browser (HP / Laptop) menyimpan timestamp pull terakhir.
   Jika sudah > 6 jam, data otomatis ditarik ulang dari Spreadsheet.
   invalidateCache() dipanggil setelah data berubah agar browser
   lain dapat data terbaru di sesi berikutnya.
   ============================================================= */

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 jam dalam milidetik

function invalidateCache() {
    localStorage.removeItem('sidimas_cache_ts');
}

function isCacheExpired() {
    const ts = localStorage.getItem('sidimas_cache_ts');
    if (!ts) return true; // belum pernah pull = selalu expired
    return (Date.now() - parseInt(ts, 10)) > CACHE_DURATION_MS;
}

function setCacheFresh() {
    localStorage.setItem('sidimas_cache_ts', String(Date.now()));
}

/**
 * Dipanggil otomatis setelah login dan saat halaman dibuka (online mode).
 * Menarik SEMUA data terbaru dari Spreadsheet jika cache expired / baru login.
 * @param {boolean} force - Paksa refresh meskipun cache masih fresh
 */
async function autoRefreshOnlineCache(force = false) {
    if (!isAppOnline()) return;
    if (!force && !isCacheExpired()) {
        console.log('[SiDiMAS] Cache masih fresh (< 6 jam), skip pull.');
        return;
    }

    console.log('[SiDiMAS] Cache expired / login baru. Menarik semua data dari Spreadsheet...');
    try {
        const res = await apiCall('syncBatch', { suratMasuk: [], suratKeluar: [], deleteQueue: [] });

        if (res.success) {
            // Simpan semua data ke IndexedDB lokal sebagai cache
            if (res.pulledMasuk)   { await localDB.suratMasuk.clear();   await localDB.suratMasuk.bulkAdd(res.pulledMasuk); }
            if (res.pulledKeluar)  { await localDB.suratKeluar.clear();  await localDB.suratKeluar.bulkAdd(res.pulledKeluar); }
            if (res.pulledPegawai) { await localDB.pegawai.clear();      await localDB.pegawai.bulkAdd(res.pulledPegawai); }
            if (res.pulledSiswa)   { await localDB.siswa.clear();        await localDB.siswa.bulkAdd(res.pulledSiswa); }
            if (res.pulledKodeCustom) {
                await localDB.kodeCustom.clear();
                await localDB.kodeCustom.bulkAdd(res.pulledKodeCustom);
            }
            if (res.pulledSettings) {
                localStorage.setItem('sidimas_settings', JSON.stringify(res.pulledSettings));
                await localDB.appSettings.put({ id: 'config', data: res.pulledSettings });
                if (typeof renderAppAttributes === 'function') renderAppAttributes(res.pulledSettings);
            }

            setCacheFresh(); // catat waktu pull berhasil

            // Refresh semua tampilan yang sedang aktif
            if (typeof refreshAllTables === 'function') refreshAllTables();
            if ($('#page-masuk').is(':visible') && typeof refreshTable === 'function') refreshTable('masuk');
            if ($('#page-keluar').is(':visible') && typeof refreshTable === 'function') refreshTable('keluar');
            if (typeof loadPegawai === 'function') loadPegawai();
            if (typeof loadSiswa === 'function') loadSiswa();

            console.log('[SiDiMAS] Refresh cache selesai. Data terbaru dari Spreadsheet tersimpan.');
        }
    } catch (err) {
        console.warn('[SiDiMAS] Gagal refresh cache dari server:', err.message);
    }
}

/* --- FUNGSI ANIMASI KOTAK LOGIN DI HP --- */
function toggleMobileLogin(action) {
    if (action === 'show') {
        $('#boxLeft').hide();
        $('#boxRight').fadeIn(300);
    } else {
        $('#boxRight').hide();
        $('#boxLeft').fadeIn(300);
    }
}

/* --- MANAJEMEN USER (Online/Offline aware) --- */

/**
 * Buka modal tambah/edit user.
 * Mode online: username readonly (tidak boleh ubah), password bisa edit.
 * Mode offline/desktop: tidak bisa akses (tombol tidak ditampilkan).
 */
function modalUser(m, u, p, r, n) {
    const online = isAppOnline();
    $('#uMode').val(m);

    if (m === 'add') {
        $('#uName').val('').prop('readonly', false);
        $('#uPass').val('');
        $('#uFull').val('');
        $('#uRole').val('User');
        $('#uPass').prop('required', true);
    } else {
        // Edit: username selalu readonly
        $('#uOld').val(u);
        $('#uName').val(u).prop('readonly', true);
        $('#uPass').val(''); // kosongkan — isi baru jika ingin ganti password
        $('#uRole').val(r);
        $('#uFull').val(n);

        if (online) {
            // Mode Online: password bisa diedit (biarkan kosong = tidak ganti)
            $('#uPass').prop('required', false);
            $('#uPass').attr('placeholder', 'Kosongkan jika tidak ingin ganti password');
        } else {
            // Mode Offline: password tidak bisa diedit
            $('#uPass').val('******').prop('readonly', true);
        }
    }

    new bootstrap.Modal('#modalUser').show();
}

function submitUser(e) {
    e.preventDefault();
    showLoadingTimer('Menyimpan User...');
    apiCall('saveUser', Object.fromEntries(new FormData(e.target))).then(r => {
        if (r.success) {
            Swal.fire('Berhasil', 'Data pengguna berhasil disimpan.', 'success');
            bootstrap.Modal.getInstance('#modalUser').hide();
            loadUsers();
        } else {
            Swal.fire('Gagal', r.message, 'error');
        }
    });
}

/**
 * Tampilkan daftar user.
 * Online: tarik dari Spreadsheet (real-time), tampilkan tombol Edit/Hapus.
 * Offline/Desktop: tampilkan pesan bahwa manajemen user hanya tersedia online.
 */
function loadUsers() {
    const online = isAppOnline();
    const $tbody = $('#tbody-users');

    if (!online) {
        $tbody.html(`
            <tr><td colspan="6" class="text-center text-muted py-3">
                <i class="fas fa-lock me-2"></i>
                Manajemen akun hanya tersedia di versi <strong>Online</strong>.
                Login melalui browser untuk mengakses fitur ini.
            </td></tr>`);
        return;
    }

    $tbody.html('<tr><td colspan="6" class="text-center"><span class="spinner-border spinner-border-sm"></span> Memuat...</td></tr>');

    apiCall('getUsersList')
        .then(r => {
            if (!r || r.length === 0) {
                $tbody.html('<tr><td colspan="6" class="text-center text-muted">Belum ada data pengguna.</td></tr>');
                return;
            }
            let h = '';
            r.forEach((u, idx) => {
                h += `<tr>
                    <td>${idx + 1}</td>
                    <td>${u[0]}</td>
                    <td><span class="badge bg-secondary">••••••</span></td>
                    <td>${u[2] || '-'}</td>
                    <td>${u[3] || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" onclick="modalUser('edit','${u[0]}','','${u[2]}','${u[3]}')" title="Edit Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="delUser('${u[0]}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            });
            $tbody.html(h);
        })
        .catch(err => {
            $tbody.html('<tr><td colspan="6" class="text-center text-danger">Gagal memuat data pengguna dari server.</td></tr>');
            console.error('[SiDiMAS] loadUsers error:', err);
        });
}


function delUser(u) { if (confirm('Hapus User ini?')) apiCall('deleteUser', { u: u }).then(loadUsers); }
function modalPrivasi() { new bootstrap.Modal(document.getElementById('modalPrivasi')).show(); }

function modalHelpdesk() {
    let email = $('#txtEmail').text() || "info@sekolah.sch.id";
    let web = $('#txtWeb').text() || "www.sekolah.sch.id";
    let telp = $('#inTelp').val() || "-";
    let wa = $('#inWaAdmin').val() || "";

    let waText = wa ? `<a href="https://wa.me/${wa.replace(/[^0-9]/g, '')}" target="_blank">${wa}</a>` : "Silakan hubungi Admin Sekolah";

    Swal.fire({
        title: 'Helpdesk Sekolah',
        html: `
            <div class="text-start mt-3" style="font-size: 0.95rem;">
                <p><i class="fas fa-phone-alt text-secondary me-2"></i> <strong>No Telp:</strong><br> <a href="tel:${telp}">${telp}</a></p>
                <p><i class="fab fa-whatsapp text-success me-2"></i> <strong>WhatsApp Admin:</strong><br> ${waText}</p>
                <p><i class="fas fa-envelope text-primary me-2"></i> <strong>Email:</strong><br> <a href="mailto:${email}">${email}</a></p>
                <p><i class="fas fa-globe text-info me-2"></i> <strong>Website:</strong><br> <a href="http://${web}" target="_blank">${web}</a></p>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Tutup',
        confirmButtonColor: 'var(--main-color)'
    });
}
