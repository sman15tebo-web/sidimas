/* --- KODE KLASIFIKASI CUSTOM --- */
async function loadKodeKlasifikasi() {
    const sumber = $('input[name="sumberKode"]:checked').val() || 'permendagri';
    let o = '<option value="">-- Pilih Kode (Ketik untuk mencari...) --</option>';

    if (sumber === 'permendagri') {
        const list = (typeof KODE_KLASIFIKASI_LOKAL !== 'undefined' ? KODE_KLASIFIKASI_LOKAL : (typeof window !== 'undefined' ? window.KODE_KLASIFIKASI_LOKAL : null)) || [];
        if (list && list.length > 0) {
            list.forEach(k => o += `<option value="${k.c}">${k.l}</option>`);
        } else {
            o = '<option value="">-- Gagal Memuat Kode Permendagri --</option>';
        }
    } else {
        try {
            const customCodes = (typeof localDB !== 'undefined' && localDB.kodeCustom) ? await localDB.kodeCustom.toArray() : [];
            if (customCodes && customCodes.length > 0) {
                customCodes.forEach(k => o += `<option value="${k.kode}">${k.kode} - ${k.uraian}</option>`);
            } else {
                o = '<option value="">-- Belum Ada Kode Klasifikasi Daerah --</option>';
            }
        } catch (e) {
            console.error('Gagal meload kode custom:', e);
            o = '<option value="">-- Gagal Memuat Kode Daerah --</option>';
        }
    }

    const $sel = $('#selKodeArsip');
    const $inJenisK = $('#inJenisK'); // Tambahkan inJenisK (Form Surat Keluar)
    const valLama = $sel.val();
    const valLamaJenisK = $inJenisK.val();

    // Hancurkan instance Select2 lama jika sudah ada agar data adapter baru ter-generate dengan benar
    if ($sel.data('select2') || $sel.hasClass('select2-hidden-accessible')) {
        try {
            $sel.select2('destroy');
        } catch (e) {
            console.warn('Select2 destroy error:', e);
        }
    }
    
    if ($inJenisK.data('select2') || $inJenisK.hasClass('select2-hidden-accessible')) {
        try { $inJenisK.select2('destroy'); } catch (e) {}
    }
    
    // Perbarui isi select
    $sel.empty().append(o);
    $inJenisK.empty().append(o);

    // Inisialisasi ulang Select2 dengan opsi terbaru
    try {
        $sel.select2({
            theme: 'bootstrap-5',
            width: 'resolve',
            placeholder: '-- Pilih Kode (Ketik untuk mencari...) --',
            allowClear: true
        });

        // Pastikan perubahan nilai langsung memperbarui nomor surat
        $sel.off('select2:select.update change.update').on('select2:select.update change.update', function () {
            if (typeof updatePreview === 'function') updatePreview();
            if (typeof updateLiveSuratPreview === 'function') updateLiveSuratPreview();
        });

        if (valLama && $sel.find(`option[value="${valLama}"]`).length > 0) {
            $sel.val(valLama).trigger('change');
        } else {
            $sel.trigger('change');
        }

        // Untuk inJenisK, kita hancurkan jika ada, lalu akan di-reinit saat modal terbuka
        if ($inJenisK.hasClass('select2-hidden-accessible')) {
            $inJenisK.select2('destroy');
        }
        
        if (valLamaJenisK && $inJenisK.find(`option[value="${valLamaJenisK}"]`).length > 0) {
            $inJenisK.val(valLamaJenisK);
        }
    } catch (e) {
        console.warn('Select2 init error:', e);
    }
}

// Inisialisasi Select2 inJenisK HANYA ketika modal benar-benar terbuka (menghindari bug 0px & focus trap Bootstrap)
$(document).on('shown.bs.modal', '#modalSurat', function () {
    try {
        $('#inJenisK').select2({
            theme: 'bootstrap-5',
            dropdownParent: $('#modalSurat'),
            placeholder: '-- Pilih Klasifikasi --',
            allowClear: true
        }).off('select2:select').on('select2:select', function(e) {
            // Jika user memilih klasifikasi, dan Nomor Surat masih kosong, otomatis isikan kode-nya
            let val = $(this).val();
            let currentNo = $('#inNoSuratK').val();
            if (val && !currentNo) {
                $('#inNoSuratK').val(val + "/.../...");
            }
        });
    } catch(e) {}
});


async function loadKodeCustomTable() {
    let tbody = '';
    try {
        const customCodes = await localDB.kodeCustom.toArray();
        if (customCodes && customCodes.length > 0) {
            customCodes.forEach((k, index) => {
                tbody += `<tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="fw-bold">${k.kode}</td>
                    <td>${k.uraian}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editKodeCustom('${k.id}', '${k.kode}', '${k.uraian}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="hapusKodeCustom('${k.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        } else {
            tbody = '<tr><td colspan="4" class="text-center text-muted">Belum ada data kode klasifikasi daerah.</td></tr>';
        }
    } catch (e) {
        tbody = '<tr><td colspan="4" class="text-center text-danger">Gagal memuat data kode klasifikasi daerah.</td></tr>';
    }
    $('#tbody-kodecustom').html(tbody);
}

function editKodeCustom(id, kode, uraian) {
    $('#kc_id').val(id);
    $('#kc_kode').val(kode);
    $('#kc_uraian').val(uraian);
    $('#kc_kode').focus();
}

async function simpanKodeLembaga() {
    const kode = ($('#inKodeLembaga').val() || '').trim();
    if (!kode) {
        Swal.fire('Perhatian', 'Ketik Kode Lembaga terlebih dahulu.', 'warning');
        return;
    }

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let s = {};
    try {
        if (localDB && localDB.appSettings) {
            const rows = await localDB.appSettings.toArray();
            if (rows && rows.length > 0) {
                const found = rows.find(r => r.id === 'config');
                if (found && found.data) {
                    s = typeof found.data === 'string' ? JSON.parse(found.data) : found.data;
                }
            }
        }
    } catch (e) { }

    if (!s || Object.keys(s).length === 0) {
        const cached = localStorage.getItem('sidimas_settings');
        s = cached ? JSON.parse(cached) : {};
    }

    s.kode_lembaga = kode;

    try {
        if (isAppOnline()) {
            const res = await apiCall('saveSettings', { kodeLembaga: kode });
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menyimpan pengaturan ke Spreadsheet.', 'error');
                return;
            }
        } else {
            await localDB.antrianSync.put({ action: 'saveSettings', payload: { kodeLembaga: kode }, status: 'pending' });
        }
    } catch (e) { 
        Swal.fire('Error Koneksi', 'Gagal menyimpan ke Spreadsheet. Pastikan internet lancar.', 'error');
        return;
    }

    try {
        if (localDB && localDB.appSettings) {
            await localDB.appSettings.put({ id: 'config', data: JSON.stringify(s) });
        }
    } catch (e) { console.warn('appSettings put:', e); }

    try {
        localStorage.setItem('sidimas_settings', JSON.stringify(s));
    } catch (e) { }

    renderAppAttributes(s);

    Swal.close();
    Swal.fire({
        icon: 'success',
        title: 'Kode Lembaga Disimpan',
        text: isAppOnline() ? 'Kode berhasil disimpan ke Spreadsheet.' : `Kode "${kode}" disimpan lokal (akan sync saat online).`,
        timer: 1800,
        showConfirmButton: false
    });
}

async function simpanPimpinan() {
    const nama = ($('#inKepsekNama').val() || '').trim();
    const nip = ($('#inKepsekNip').val() || '').trim();
    const pangkat = ($('#inKepsekPangkat').val() || '').trim();

    if (!nama) {
        Swal.fire('Perhatian', 'Nama Kepala Sekolah wajib diisi.', 'warning');
        return;
    }

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let s = {};
    try {
        if (localDB && localDB.appSettings) {
            const rows = await localDB.appSettings.toArray();
            if (rows && rows.length > 0) {
                const found = rows.find(r => r.id === 'config');
                if (found && found.data) {
                    s = typeof found.data === 'string' ? JSON.parse(found.data) : found.data;
                }
            }
        }
    } catch (e) { }

    if (!s || Object.keys(s).length === 0) {
        const cached = localStorage.getItem('sidimas_settings');
        s = cached ? JSON.parse(cached) : {};
    }

    s.kepsek_nama = nama;
    s.kepsek_nip = nip;
    s.kepsek_pangkat = pangkat;

    try {
        if (isAppOnline()) {
            const res = await apiCall('saveSettings', { kepsekNama: nama, kepsekNip: nip, kepsekPangkat: pangkat });
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menyimpan pengaturan ke Spreadsheet.', 'error');
                return;
            }
        } else {
            await localDB.antrianSync.put({ action: 'saveSettings', payload: { kepsekNama: nama, kepsekNip: nip, kepsekPangkat: pangkat }, status: 'pending' });
        }
    } catch (e) {
        Swal.fire('Error Koneksi', 'Gagal menyimpan ke Spreadsheet. Pastikan internet lancar.', 'error');
        return;
    }

    try {
        if (localDB && localDB.appSettings) {
            await localDB.appSettings.put({ id: 'config', data: JSON.stringify(s) });
        }
    } catch (e) { console.warn('appSettings put:', e); }

    try {
        localStorage.setItem('sidimas_settings', JSON.stringify(s));
    } catch (e) { }

    Swal.close();
    Swal.fire({
        icon: 'success',
        title: 'Disimpan',
        text: isAppOnline() ? 'Data Pimpinan berhasil disimpan ke Spreadsheet.' : 'Data Pimpinan disimpan lokal (akan sync saat online).',
        timer: 1800,
        showConfirmButton: false
    });
}

async function simpanKodeCustom(e) {
    e.preventDefault();
    let id = $('#kc_id').val();
    if (!id) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            id = crypto.randomUUID();
        } else {
            id = 'kc_' + new Date().getTime() + Math.random().toString(36).substring(2);
        }
    }
    const kode = ($('#kc_kode').val() || '').trim();
    const uraian = ($('#kc_uraian').val() || '').trim();

    if (!kode || !uraian) {
        Swal.fire('Perhatian', 'Kode dan uraian klasifikasi tidak boleh kosong.', 'warning');
        return;
    }

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const payloadData = { id: id, kode: kode, uraian: uraian };

        if (isAppOnline()) {
            const res = await apiCall('saveKodeCustom', payloadData);
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menyimpan ke Spreadsheet.', 'error');
                return;
            }
            await localDB.kodeCustom.put(payloadData);
        } else {
            await localDB.kodeCustom.put(payloadData);
            await localDB.antrianSync.put({
                action: 'saveKodeCustom',
                payload: payloadData,
                status: 'pending'
            });
        }
        
        $('#kc_id').val('');
        $('#kc_kode').val('');
        $('#kc_uraian').val('');
        await loadKodeCustomTable();
        Swal.fire({ icon: 'success', title: 'Tersimpan', text: isAppOnline() ? 'Kode klasifikasi disimpan ke Spreadsheet.' : 'Kode klasifikasi disimpan lokal.', timer: 1500, showConfirmButton: false });

        if ($('#page-buat').hasClass('hide') === false) {
            loadKodeKlasifikasi();
        }
    } catch (err) {
        Swal.fire('Error', 'Gagal menyimpan kode: ' + err.message, 'error');
    }
}

async function hapusKodeCustom(id) {
    Swal.fire({
        title: 'Hapus Kode?',
        text: "Kode ini akan dihapus dari sistem.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.showLoading();
            try {
                if (isAppOnline()) {
                    const res = await apiCall('deleteKodeCustom', { id: id });
                    if (!res || !res.success) {
                        Swal.fire('Gagal Hapus', res.message || 'Gagal menghubungi server.', 'error');
                        return;
                    }
                    await localDB.kodeCustom.delete(id);
                } else {
                    await localDB.kodeCustom.delete(id);
                    await localDB.antrianSync.put({
                        action: 'deleteKodeCustom',
                        payload: { id: id },
                        status: 'pending'
                    });
                }
                
                loadKodeCustomTable();
                Swal.fire({ icon: 'success', title: 'Terhapus', text: isAppOnline() ? 'Kode klasifikasi dihapus dari Spreadsheet.' : 'Kode klasifikasi dihapus lokal.', timer: 1500, showConfirmButton: false });

                if ($('#page-buat').hasClass('hide') === false) {
                    loadKodeKlasifikasi();
                }
            } catch (err) {
                Swal.fire('Error', 'Gagal menghapus kode: ' + err.message, 'error');
            }
        }
    });
}


/* --- KODE KLASIFIKASI CUSTOM EXCEL IMPORT & FILTER --- */

function filterKodeCustom() {
    const term = $('#cariKodeCustom').val().toLowerCase();
    $('#tbody-kodecustom tr').each(function () {
        const text = $(this).text().toLowerCase();
        if (text.indexOf(term) > -1) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

function modalImportExcel() {
    $('#fImportExcel')[0].reset();
    const m = document.getElementById('modalImportExcel');
    if (m) {
        let modal = bootstrap.Modal.getInstance(m);
        if (!modal) modal = new bootstrap.Modal(m);
        modal.show();
    }
}

function downloadTemplateExcel() {
    if (typeof XLSX === 'undefined') {
        Swal.fire('Error', 'Library Excel (XLSX) tidak ditemukan.', 'error');
        return;
    }
    const data = [
        ["kode", "uraian"],
        ["000", "UMUM"],
        ["001", "LAMBANG"],
        ["002", "TANDA KEHORMATAN/PENGHARGAAN"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Kode");
    XLSX.writeFile(wb, "Template_Kode_Klasifikasi.xlsx");
}

async function prosesImportExcel() {
    const file = $('#fileExcelImport').prop('files')[0];
    if (!file) {
        Swal.fire('Error', 'Silakan pilih file Excel terlebih dahulu!', 'warning');
        return;
    }

    if (typeof XLSX === 'undefined') {
        Swal.fire('Error', 'Library Excel (XLSX) tidak ditemukan.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (json.length === 0) {
                Swal.fire('Error', 'File Excel kosong atau format tidak sesuai.', 'error');
                return;
            }

            const firstRow = json[0];
            if (!firstRow.hasOwnProperty('kode') || !firstRow.hasOwnProperty('uraian')) {
                Swal.fire('Error', 'Format header salah! Pastikan ada kolom "kode" dan "uraian" pada baris pertama (header).', 'error');
                return;
            }

            let importCount = 0;
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                if (row.kode !== "" && row.uraian !== "") {
                    let id;
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                        id = crypto.randomUUID();
                    } else {
                        id = 'kc_' + new Date().getTime() + Math.random().toString(36).substring(2);
                    }
                    const payloadData = {
                        id: id,
                        kode: row.kode.toString(),
                        uraian: row.uraian.toString()
                    };
                    await localDB.kodeCustom.put(payloadData);
                    await localDB.antrianSync.put({
                        action: 'saveKodeCustom',
                        payload: payloadData,
                        status: 'pending'
                    });
                    importCount++;
                }
            }

            loadKodeCustomTable();
            if ($('#page-buat').hasClass('hide') === false) {
                loadKodeKlasifikasi();
            }

            const m = document.getElementById('modalImportExcel');
            if (m) {
                let modal = bootstrap.Modal.getInstance(m);
                if (modal) modal.hide();
            }

            Swal.fire('Berhasil', importCount + ' data kode klasifikasi berhasil diimport.', 'success');
        } catch (err) {
            Swal.fire('Error', 'Gagal memproses file Excel: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

/* ==========================================
   FITUR SURAT MASUK EKSTERNAL (INBOX) - OFFLINE
========================================== */

function showModalKirimSurat() {
    $('#fKirimSurat')[0].reset();
    new bootstrap.Modal(document.getElementById('modalKirimSurat')).show();
}

async function submitSuratEksternal(e) {
    e.preventDefault();
    $('#btnSubmitEksternal').prop('disabled', true);
    $('#spinSubmitEksternal').removeClass('hide');

    const file = $('#extFile').prop('files')[0];
    let fileInfoRaw = null;

    if (file) {
        if (file.size > 2000000) {
            Swal.fire('Error', 'Ukuran file maksimal 2MB!', 'warning');
            $('#btnSubmitEksternal').prop('disabled', false);
            $('#spinSubmitEksternal').addClass('hide');
            return;
        }

        try {
            if (file.type.startsWith('image/')) {
                const base64Str = await compressImageForUpload(file);
                fileInfoRaw = {
                    name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                    mimeType: "image/jpeg",
                    data: base64Str.split(',')[1]
                };
            } else {
                fileInfoRaw = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve({
                        name: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
                        mimeType: "application/pdf",
                        data: ev.target.result.split(',')[1]
                    });
                    reader.readAsDataURL(file);
                });
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal memproses file.', 'error');
            $('#btnSubmitEksternal').prop('disabled', false);
            $('#spinSubmitEksternal').addClass('hide');
            return;
        }
    }

    let id;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID();
    } else {
        id = 'ext_' + new Date().getTime() + Math.random().toString(36).substring(2);
    }

    const data = {
        id: id,
        namaPengirim: $('#extNama').val(),
        emailPengirim: $('#extEmail').val(),
        noHpPengirim: $('#extNoHp').val(),
        lembagaPengirim: $('#extLembaga').val(),
        noSurat: $('#extNoSurat').val(),
        tglSurat: $('#extTglSurat').val(),
        halSurat: $('#extHalSurat').val(),
        tujuanSurat: $('#extTujuanSurat').val(),
        sifatSurat: $('#extSifatSurat').val(),
        keterangan: $('#extKeterangan').val(),
        fileInfoRaw: fileInfoRaw ? JSON.stringify(fileInfoRaw) : null,
        status: 'PENDING',
        waktuInput: new Date().toISOString()
    };

    try {
        await localDB.suratEksternal.put(data);
        await localDB.antrianSync.put({
            action: 'insertSuratEksternal',
            payload: data,
            status: 'pending'
        });

        // Sembunyikan modal form pengiriman
        const modalEl = document.getElementById('modalKirimSurat');
        if (modalEl) {
            const modalInst = bootstrap.Modal.getInstance(modalEl);
            if (modalInst) modalInst.hide();
        }

        // Tampilkan Popup Bukti Pengiriman (SweetAlert2)
        generateBuktiKirim(data);

    } catch (err) {
        Swal.fire('Error', 'Terjadi kesalahan sistem: ' + err.message, 'error');
    } finally {
        $('#btnSubmitEksternal').prop('disabled', false);
        $('#spinSubmitEksternal').addClass('hide');
    }
}

function generateBuktiKirim(data) {
    const tglKirim = new Date(data.waktuInput).toLocaleString('id-ID');
    const namaInstansi = $('#txtSekolah').text() || $('#txtInstansi').text() || 'Instansi Kami';

    const htmlBukti = `
        <div style="text-align:left; font-size: 14px; line-height: 1.5; color: #333; font-family: 'Arial', sans-serif;">
            <div style="text-align:center; border-bottom:3px solid #333; padding-bottom:10px; margin-bottom:15px;">
                <h4 style="margin:0; text-transform:uppercase; font-weight:bold; color: #2c3e50;">BUKTI PENGIRIMAN SURAT DIGITAL</h4>
                <h6 style="margin:5px 0 0 0; color:#7f8c8d;">Tujuan: ${namaInstansi}</h6>
            </div>
            
            <div style="margin-bottom:15px;">
                <p style="margin:0 0 5px 0;"><strong>ID Sistem:</strong> <span style="font-family: monospace; background: #eee; padding: 2px 5px; border-radius: 4px;">${data.id.substring(0, 8)}...</span></p>
                <p style="margin:0 0 5px 0;"><strong>Waktu Pengiriman:</strong> ${tglKirim}</p>
                <p style="margin:0 0 5px 0;"><strong>Status:</strong> <span style="color:#e67e22; font-weight:bold; background: #fff3cd; padding: 2px 6px; border-radius: 4px;">PENDING (Menunggu Verifikasi)</span></p>
            </div>
            
            <table class="table table-sm table-bordered" style="font-size:13px; margin-bottom:15px; border: 1px solid #ddd;">
                <tbody>
                    <tr><td style="width:35%; background:#f8f9fa; font-weight:bold; border-color: #ddd;">Nama Pengirim</td><td style="border-color: #ddd;">${data.namaPengirim}</td></tr>
                    <tr><td style="background:#f8f9fa; font-weight:bold; border-color: #ddd;">Lembaga Pengirim</td><td style="border-color: #ddd;">${data.lembagaPengirim}</td></tr>
                    <tr><td style="background:#f8f9fa; font-weight:bold; border-color: #ddd;">Nomor Surat</td><td style="border-color: #ddd;">${data.noSurat}</td></tr>
                    <tr><td style="background:#f8f9fa; font-weight:bold; border-color: #ddd;">Tanggal Surat</td><td style="border-color: #ddd;">${data.tglSurat}</td></tr>
                    <tr><td style="background:#f8f9fa; font-weight:bold; border-color: #ddd;">Perihal</td><td style="border-color: #ddd;">${data.halSurat}</td></tr>
                </tbody>
            </table>
            
            <div style="background:#d4edda; color:#155724; border: 1px solid #c3e6cb; padding:12px; border-radius: 5px; text-align: center;">
                <i class="fas fa-camera" style="font-size: 20px; margin-bottom: 5px;"></i><br>
                <strong>HARAP SCREENSHOT / FOTO HALAMAN INI</strong><br>
                <span style="font-size: 12px;">sebagai bukti pengiriman yang sah.</span>
            </div>
        </div>
    `;

    Swal.fire({
        html: htmlBukti,
        showConfirmButton: true,
        confirmButtonText: '<i class="fas fa-check"></i> Selesai & Tutup',
        confirmButtonColor: '#28a745',
        width: '600px',
        allowOutsideClick: false,
        allowEscapeKey: false
    });
}

async function loadInboxTable() {
    updateSuratMasukBadge(); updateSuratMasukBadge();
    try {
        const inbox = await localDB.suratEksternal.toArray();
        const tbody = $('#tbody-inbox-eksternal');

        if ($.fn.DataTable.isDataTable('#tInboxEksternal')) {
            $('#tInboxEksternal').DataTable().destroy();
        }
        tbody.empty();

        inbox.sort((a, b) => new Date(b.waktuInput) - new Date(a.waktuInput));

        let no = 1;
        inbox.forEach(item => {
            let statusBadge = '<span class="badge bg-warning text-dark">PENDING</span>';
            if (item.status === 'DITERIMA') statusBadge = '<span class="badge bg-success">DITERIMA</span>';
            if (item.status === 'DITOLAK') statusBadge = '<span class="badge bg-danger">DITOLAK</span>';

            let btnAksi = `<button class="btn btn-sm btn-info text-white me-1" title="Lihat Detail" onclick="lihatEksternal('${item.id}')"><i class="fas fa-eye"></i></button>`;

            tbody.append(`
                <tr>
                    <td class="text-center">${no++}</td>
                    <td>${new Date(item.waktuInput).toLocaleString('id-ID')}</td>
                    <td><b>${item.namaPengirim}</b><br><small class="text-muted">${item.lembagaPengirim}</small></td>
                    <td>${item.noSurat}<br><small class="text-muted">${item.tglSurat}</small></td>
                    <td>${item.halSurat}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center">${btnAksi}</td>
                </tr>
            `);
        });

        $('#tInboxEksternal').DataTable({
            "language": (typeof DT_LANG_ID !== 'undefined') ? DT_LANG_ID : {
                sEmptyTable: "Tidak ada data yang tersedia pada tabel ini",
                sProcessing: "Sedang memproses...",
                sLengthMenu: "Tampilkan _MENU_ entri",
                sZeroRecords: "Tidak ditemukan data yang sesuai",
                sInfo: "Menampilkan _START_ sampai _END_ dari _TOTAL_ entri",
                sInfoEmpty: "Menampilkan 0 sampai 0 dari 0 entri",
                sSearch: "Cari:",
                oPaginate: { sFirst: "Pertama", sPrevious: "Sebelumnya", sNext: "Selanjutnya", sLast: "Terakhir" }
            },
            "pageLength": 10
        });
    } catch (err) {
        console.error(err);
    }
}

async function lihatEksternal(id) {
    const inbox = await localDB.suratEksternal.toArray();
    const item = inbox.find(x => x.id === id);
    if (!item) return;

    $('#vExtNama').text(item.namaPengirim);
    $('#vExtEmail').text(item.emailPengirim);
    $('#vExtNoHp').text(item.noHpPengirim);
    $('#vExtLembaga').text(item.lembagaPengirim);
    $('#vExtNoSurat').text(item.noSurat);
    $('#vExtTglSurat').text(item.tglSurat);
    $('#vExtHalSurat').text(item.halSurat);
    $('#vExtTujuan').text(item.tujuanSurat);
    $('#vExtSifat').text(item.sifatSurat);
    $('#vExtKeterangan').text(item.keterangan || '-');

    const fileContainer = $('#vExtFileContainer');
    fileContainer.empty();

    if (item.fileInfoRaw) {
        let fObj = item.fileInfoRaw;
        if (typeof fObj === 'string') {
            try { fObj = JSON.parse(fObj); } catch (e) { }
        }

        if (typeof fObj === 'string' && fObj.startsWith('data:image/')) {
            fObj = {
                mimeType: fObj.split(';')[0].split(':')[1],
                data: fObj.split(',')[1]
            };
        }

        if (fObj && fObj.data) {
            const dataUrl = `data:${fObj.mimeType};base64,${fObj.data}`;
            if (fObj.mimeType.startsWith('image/')) {
                fileContainer.html(`<img src="${dataUrl}" style="max-width:100%; max-height:70vh; object-fit:contain;">`);
            } else {
                fileContainer.html(`<iframe src="${dataUrl}" width="100%" height="600px" style="border:none;"></iframe>`);
            }
        }
    } else if (item.fileUrl && item.fileUrl !== '-' && item.fileUrl.trim() !== '') {
        const pUrl = item.fileUrl.replace('/view', '/preview');
        fileContainer.html(`<iframe src="${pUrl}" width="100%" height="600px" style="border:none;"></iframe>`);
    } else {
        fileContainer.html('<div class="text-muted">Tidak ada lampiran file.</div>');
    }

    if (item.status === 'PENDING') {
        $('#btnTerimaEksternal').show().attr('onclick', `terimaEksternal('${id}')`);
        $('#btnTolakEksternal').show().attr('onclick', `tolakEksternal('${id}')`);
    } else {
        $('#btnTerimaEksternal').hide();
        $('#btnTolakEksternal').hide();
    }

    new bootstrap.Modal(document.getElementById('modalDetailEksternal')).show();
}

async function terimaEksternal(id) {
    const inbox = await localDB.suratEksternal.toArray();
    const item = inbox.find(x => x.id === id);
    if (!item) return;

    item.status = 'DITERIMA';
    await localDB.suratEksternal.put(item);
    bootstrap.Modal.getInstance(document.getElementById('modalDetailEksternal')).hide();
    loadInboxTable();

    const idBaru = 'LOCAL_' + new Date().getTime();
    const ts = new Date().toISOString();
    const currentUser = localStorage.getItem('sidimas_user') || 'Admin';
    const currentRole = localStorage.getItem('sidimas_role') || 'Admin';

    let fDataSimpan = null;
    let fUrl = "-";
    if (item.fileInfoRaw) {
        let parsed = item.fileInfoRaw;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch (e) { }
        }
        if (parsed && parsed.data) {
            fDataSimpan = parsed;
            fUrl = "data:" + parsed.mimeType + ";base64," + parsed.data;
        }
    }

    const dataObj = {
        jenisForm: 'masuk',
        idSurat: idBaru,
        tglTerima: ts.split('T')[0],
        pengirim: item.lembagaPengirim || item.namaPengirim,
        tglSuratMasuk: item.tglSurat,
        noSuratMasuk: item.noSurat,
        perihalMasuk: item.halSurat,
        ditujukan: item.tujuanSurat,
        uraianMasuk: item.keterangan || '-',
        keteranganMasuk: 'Otomatis dari Surat Eksternal',
        fileLama: fUrl,
        currentUser: currentUser,
        currentRole: currentRole
    };

    const record = {
        id: idBaru,
        waktuInput: ts,
        pembuat: currentUser,
        sync_status: 'pending',
        fileUrl: fUrl,
        fileInfoRaw: fDataSimpan ? JSON.stringify(fDataSimpan) : null,
        tglTerima: dataObj.tglTerima,
        pengirim: dataObj.pengirim,
        tglSurat: dataObj.tglSuratMasuk,
        noSurat: dataObj.noSuratMasuk,
        perihal: dataObj.perihalMasuk,
        ditujukan: dataObj.ditujukan,
        uraian: dataObj.uraianMasuk,
        keterangan: dataObj.keteranganMasuk
    };

    await localDB.suratMasuk.put(record);
    await localDB.antrianSync.put({
        action: 'simpanData',
        payload: JSON.stringify({ data: dataObj, fileInfo: fDataSimpan }),
        status: 'pending'
    });

    Swal.fire({
        title: 'Surat Diterima',
        text: 'Surat masuk telah diarsipkan ke dalam sistem secara otomatis.',
        icon: 'success'
    });
}

async function tolakEksternal(id) {
    Swal.fire({
        title: 'Tolak Surat?',
        text: "Anda akan menolak surat ini. Status akan diubah menjadi DITOLAK.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Tolak!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const inbox = await localDB.suratEksternal.toArray();
            const item = inbox.find(x => x.id === id);
            if (item) {
                item.status = 'DITOLAK';
                await localDB.suratEksternal.put(item);
                bootstrap.Modal.getInstance(document.getElementById('modalDetailEksternal')).hide();
                loadInboxTable();
                Swal.fire('Ditolak!', 'Surat masuk telah ditolak.', 'success');
            }
        }
    });
}


window.promptSaveArsipKeluar = function (dataObj, outBlob, fileName, isOnlineParam) {
    const isOnline = (typeof isOnlineParam === 'boolean') ? isOnlineParam : (typeof isAppOnline === 'function' ? isAppOnline() : false);
    Swal.fire({
        title: 'Dokumen Berhasil Dibuat!',
        text: 'Apakah Anda ingin memasukkan data surat ini ke dalam Arsip Surat Keluar secara otomatis?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Ya, Masukkan',
        cancelButtonText: 'Tidak',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

            let fData = null;
            if (outBlob) {
                fData = await new Promise(res => {
                    const r = new FileReader();
                    r.onload = e => res({
                        name: fileName + '.docx',
                        // Paksa mimeType ke format pendek agar ekstensi file tetap .docx
                        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        data: e.target.result.split(',')[1]
                    });
                    r.readAsDataURL(outBlob);
                });
            }

            const currentUser = localStorage.getItem('sidimas_user') || 'Admin';
            const idBaru = (isOnline ? 'ONLINE_' : 'LOCAL_') + new Date().getTime();

            // Fungsi pembersih teks agar terbebas dari format array JSON ['...']
            const sanitizeText = (val, def = '-') => {
                if (!val) return def;
                if (Array.isArray(val)) {
                    const valid = val.find(v => typeof v === 'string' && v.trim() !== '');
                    return valid !== undefined ? valid.trim() : def;
                }
                if (typeof val === 'string') {
                    let s = val.trim();
                    if (s.startsWith('["') && s.endsWith('"]')) {
                        try {
                            const arr = JSON.parse(s);
                            if (Array.isArray(arr)) {
                                const valid = arr.find(v => typeof v === 'string' && v.trim() !== '');
                                return valid !== undefined ? valid.trim() : def;
                            }
                        } catch (e) { }
                    }
                    return s || def;
                }
                return String(val) || def;
            };

            let perihalRaw = dataObj.perihal || dataObj.isiUmum || dataObj.acaraDetail || dataObj.namaBarang || dataObj.namaPejabatLama || dataObj.suketHal || dataObj.isiSk;
            let perihalAuto = sanitizeText(perihalRaw, '-');

            let uraianAuto = 'Otomatis digenerate dari form Buat Surat';
            if (dataObj.pilihJenisSurat) {
                let temp = dataObj.pilihJenisSurat.toLowerCase();
                if (temp.includes('sppd') || temp.includes('perjalanan')) uraianAuto = 'Untuk mengikuti: ' + perihalAuto;
                else if (temp.includes('tugas') || temp.includes('spt')) uraianAuto = 'Pelaksanaan tugas: ' + sanitizeText(dataObj.isiUmum, '-');
                else if (temp.includes('undangan')) uraianAuto = 'Undangan: ' + perihalAuto;
                else if (temp.includes('keterangan')) uraianAuto = 'Surat Keterangan: ' + sanitizeText(dataObj.suketIsi || dataObj.suketHal || perihalAuto, '-');
                else if (temp.includes('keputusan') || temp.includes('sk')) uraianAuto = 'Keputusan tentang: ' + sanitizeText(dataObj.isiSk, '-');
                else if (temp.includes('umum') || temp.includes('biasa')) uraianAuto = perihalAuto !== '-' ? perihalAuto : 'Surat Dinas Umum';
            }

            let tujuanRaw = dataObj.tujuanNama || dataObj.tujuanJabatan || dataObj.tujuanTempat || dataObj.namaPihakKedua;
            let tujuanAuto = sanitizeText(tujuanRaw, 'Kepada Yth.');

            const kodeDipilih = dataObj.kodeKlasifikasi || $('#selKodeArsip').val() || '-';

            let dataSimpan = {
                jenisForm: 'keluar',
                idSurat: idBaru,
                tglSuratKeluar: dataObj.inpTglSaja || dataObj.tanggalSuratFull || dataObj.tglSuratSaja || dataObj.tglSelesai || new Date().toISOString().split('T')[0],
                kodeKlasifikasi: kodeDipilih,
                noSuratKeluar: dataObj.nomorFull || '-',
                perihalKeluar: perihalAuto,
                tujuan: tujuanAuto,
                uraianKeluar: uraianAuto,
                keteranganKeluar: dataObj.pilihJenisSurat || '-',
                fileLama: '-',
                currentUser: currentUser,
                currentRole: localStorage.getItem('sidimas_role') || 'Admin'
            };

            const saveLocalPending = async (isFallback = false) => {
                try {
                    let fUrl = "-";
                    if (fData) fUrl = "data:" + fData.mimeType + ";base64," + fData.data;
                    const record = {
                        id: idBaru,
                        waktuInput: new Date().toISOString(),
                        pembuat: currentUser,
                        sync_status: 'pending',
                        fileUrl: fUrl,
                        fileInfoRaw: fData ? JSON.stringify(fData) : null,
                        tglSurat: dataSimpan.tglSuratKeluar,
                        klasifikasi: dataSimpan.kodeKlasifikasi,
                        noSurat: dataSimpan.noSuratKeluar,
                        perihal: dataSimpan.perihalKeluar,
                        tujuan: dataSimpan.tujuan,
                        uraian: dataSimpan.uraianKeluar,
                        keterangan: dataSimpan.keteranganKeluar
                    };
                    await localDB.suratKeluar.put(record);
                    await localDB.antrianSync.put({
                        action: 'simpanData',
                        payload: JSON.stringify({ data: dataSimpan, fileInfo: fData }),
                        status: 'pending'
                    });
                    if (isFallback) {
                        Swal.fire('Tersimpan Offline', 'Gagal tersambung ke Spreadsheet, surat berhasil disimpan di Database SQL lokal dan akan otomatis diunggah saat online.', 'warning');
                    } else {
                        Swal.fire('Berhasil', 'Disimpan ke Arsip Surat Keluar Lokal (Database SQL)', 'success');
                    }
                    if (typeof refreshAllTables === 'function') refreshAllTables();
                    if (typeof refreshTable === 'function' && $('#page-keluar').is(':visible')) refreshTable('keluar');
                } catch (e) {
                    Swal.fire('Error', e.toString(), 'error');
                }
            };

            if (isOnline) {
                apiCall('simpanData', { data: dataSimpan, fileInfo: fData })
                    .then(async res => {
                        if (res.success) {
                            try {
                                let fUrl = "-";
                                if (fData) fUrl = "data:" + fData.mimeType + ";base64," + fData.data;
                                await localDB.suratKeluar.put({
                                    id: idBaru,
                                    waktuInput: new Date().toISOString(),
                                    pembuat: currentUser,
                                    sync_status: 'synced',
                                    fileUrl: fUrl,
                                    fileInfoRaw: null,
                                    tglSurat: dataSimpan.tglSuratKeluar,
                                    klasifikasi: dataSimpan.kodeKlasifikasi,
                                    noSurat: dataSimpan.noSuratKeluar,
                                    perihal: dataSimpan.perihalKeluar,
                                    tujuan: dataSimpan.tujuan,
                                    uraian: dataSimpan.uraianKeluar,
                                    keterangan: dataSimpan.keteranganKeluar
                                });
                            } catch (e) { }
                            Swal.fire('Berhasil', 'Disimpan ke Arsip Surat Keluar (Spreadsheet)', 'success');
                            if (typeof refreshAllTables === 'function') refreshAllTables();
                            if (typeof refreshTable === 'function' && $('#page-keluar').is(':visible')) refreshTable('keluar');
                        } else {
                            saveLocalPending(true);
                        }
                    }).catch(e => {
                        console.warn('Gagal simpan online, beralih ke simpan lokal pending:', e);
                        saveLocalPending(true);
                    });
            } else {
                saveLocalPending(false);
            }
        }
    });
}


window.scanImageAndAutofill = async function (fileInputId, formType) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        Swal.fire('Info', 'Pilih file gambar surat terlebih dahulu pada form upload!', 'info');
        return;
    }
    const file = fileInput.files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        Swal.fire('Info', 'Saat ini Auto-Isi (OCR) hanya mendukung file gambar (JPG/JPEG/PNG).', 'warning');
        return;
    }

    if (typeof Tesseract === 'undefined') {
        Swal.fire('Error', 'Library OCR belum termuat. Pastikan koneksi internet aktif.', 'error');
        return;
    }

    Swal.fire({
        title: 'Membaca Dokumen...',
        html: 'AI sedang memproses teks pada gambar. Proses ini memakan waktu beberapa detik...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const result = await Tesseract.recognize(file, 'ind', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    // Update progress if possible
                }
            }
        });

        const text = result.data.text;
        console.log("=== HASIL OCR ===");
        console.log(text);

        let nomor = "";
        let tanggal = "";
        let perihal = "";
        let pengirimAtauTujuan = "";

        // 1. Cari Nomor
        const noMatch = text.match(/(?:nomor|no)\s*[:\.;]?\s*([^\n]+)/i);
        if (noMatch) nomor = noMatch[1].trim();

        // 2. Cari Perihal/Hal
        const halMatch = text.match(/(?:perihal|hal)\s*[:\.;]?\s*([^\n]+)/i);
        if (halMatch) perihal = halMatch[1].trim();

        // 3. Cari Tanggal (Pola: dd Bulan yyyy)
        const tglMatch = text.match(/\b(\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)\s+\d{4})\b/i);
        if (tglMatch) {
            const months = {
                'januari': '01', 'jan': '01',
                'februari': '02', 'feb': '02',
                'maret': '03', 'mar': '03',
                'april': '04', 'apr': '04',
                'mei': '05',
                'juni': '06', 'jun': '06',
                'juli': '07', 'jul': '07',
                'agustus': '08', 'agu': '08',
                'september': '09', 'sep': '09',
                'oktober': '10', 'okt': '10',
                'november': '11', 'nov': '11',
                'desember': '12', 'des': '12'
            };
            let parts = tglMatch[1].toLowerCase().replace(/\s+/g, ' ').split(' ');
            if (parts.length === 3) {
                let d = parts[0].padStart(2, '0');
                let m = months[parts[1]] || '01';
                let y = parts[2];
                tanggal = `${y}-${m}-${d}`;
            }
        }

        // 4. Cari Instansi Pengirim (Baris paling atas sebelum kata-kata spesifik)
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        if (lines.length > 0) {
            // Biasanya baris pertama/kedua adalah nama instansi/pemerintah daerah
            pengirimAtauTujuan = lines[0];
            if (lines.length > 1 && lines[0].toLowerCase().includes("pemerintah")) {
                pengirimAtauTujuan = lines[0] + " " + lines[1];
            }
        }

        // Isi form
        if (formType === 'masuk') {
            if (nomor) document.getElementById('inNoSuratM').value = nomor;
            if (perihal) document.getElementById('inPerihalM').value = perihal;
            if (tanggal) document.getElementById('inTglSuratM').value = tanggal;
            if (pengirimAtauTujuan && document.getElementById('inPengirim')) {
                document.getElementById('inPengirim').value = pengirimAtauTujuan;
            }
        } else {
            if (nomor) document.getElementById('inNoSuratK').value = nomor;
            if (perihal) document.getElementById('inPerihalK').value = perihal;
            if (tanggal) document.getElementById('inTglSuratK').value = tanggal;
            if (pengirimAtauTujuan && document.getElementById('inTujuanK')) {
                document.getElementById('inTujuanK').value = pengirimAtauTujuan;
            }
        }

        Swal.fire({
            title: 'Selesai!',
            text: 'Beberapa kolom telah terisi otomatis. Harap PERIKSA KEMBALI apakah teks hasil deteksi sudah benar dan tidak ada salah ejaan (typo).',
            icon: 'success'
        });

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Gagal memproses gambar. Detail: ' + error.message, 'error');
    }
};


if (document.getElementById('appVersionText')) { document.getElementById('appVersionText').innerText = APP_CONFIG.APP_VERSION || ''; }

// --- KODE UNTUK MODE KOLEKTIF/LAMPIRAN (Suket, Sis, Spt) ---
function toggleModeSpt() {
    let mode = $('input[name="modeSpt"]:checked').val();
    $('#sptAreaSendirian, #sptAreaKolektif, #sptAreaLampiran').addClass('hide');
    if (mode === 'sendirian') $('#sptAreaSendirian').removeClass('hide');
    else if (mode === 'kolektif') $('#sptAreaKolektif').removeClass('hide');
    else if (mode === 'lampiran') $('#sptAreaLampiran').removeClass('hide');
}

function toggleModeSuket() {
    let mode = $('input[name="modeSuket"]:checked').val();
    $('#suketAreaSendirian, #suketAreaKolektif, #suketAreaLampiran').addClass('hide');
    if (mode === 'sendirian') $('#suketAreaSendirian').removeClass('hide');
    else if (mode === 'kolektif') $('#suketAreaKolektif').removeClass('hide');
    else if (mode === 'lampiran') $('#suketAreaLampiran').removeClass('hide');
}

function toggleModeSis() {
    let mode = $('input[name="modeSis"]:checked').val();
    $('#sisAreaSendirian, #sisAreaKolektif, #sisAreaLampiran').addClass('hide');
    if (mode === 'sendirian') $('#sisAreaSendirian').removeClass('hide');
    else if (mode === 'kolektif') $('#sisAreaKolektif').removeClass('hide');
    else if (mode === 'lampiran') $('#sisAreaLampiran').removeClass('hide');
}

function addRowKolektif(tableId) {
    let tID = tableId.replace('tbl', '').replace('Kolektif', '');
    let tr = `<tr>
        <td><input type="text" class="form-control form-control-sm" name="kol${tID}Nama[]"></td>
        <td><input type="text" class="form-control form-control-sm" name="kol${tID}Nip[]"></td>
        <td><input type="text" class="form-control form-control-sm" name="kol${tID}Pangkat[]"></td>
        <td><input type="text" class="form-control form-control-sm" name="kol${tID}Jabatan[]"></td><td><input type="text" class="form-control form-control-sm" name="kol${tID}Ket[]"></td><td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
    </tr>`;
    $(`#${tableId} tbody`).append(tr);
}

function addRowKolektifSis(tableId) {
    let tr = `<tr>
        <td><input type="text" class="form-control form-control-sm" name="kolSisNama[]"></td>
        <td><input type="text" class="form-control form-control-sm" name="kolSisNis[]"></td>
        <td><input type="text" class="form-control form-control-sm" name="kolSisTtl[]"></td>
        <td><select class="form-select form-select-sm" name="kolSisJk[]"><option>Laki-laki</option><option>Perempuan</option></select></td>
        <td><input type="text" class="form-control form-control-sm" name="kolSisKelas[]"></td>
        <td><input type="text" class="form-control form-control-sm" name="kolSisOrtu[]"></td><td><input type="text" class="form-control form-control-sm" name="kolSisKet[]"></td><td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
    </tr>`;
    $(`#${tableId} tbody`).append(tr);
}

function toggleAtasNama() {
    if ($('#switchAtasNama').is(':checked')) {
        $('#boxAtasNama').removeClass('hide');
    } else {
        $('#boxAtasNama').addClass('hide');
    }
}

// --- UPDATE STATUS KONEKSI (ONLINE/OFFLINE BADGE) ---
function updateConnectionBadge() {
    const badge = $('#badgeKoneksi');
    if (!badge.length) return;

    if (navigator.onLine) {
        badge.removeClass('bg-secondary bg-danger').addClass('bg-success');
        badge.text('Online');
    } else {
        badge.removeClass('bg-secondary bg-success').addClass('bg-danger');
        badge.text('Offline');
    }
}
window.addEventListener('online', updateConnectionBadge);
window.addEventListener('offline', updateConnectionBadge);
$(document).ready(function () { updateConnectionBadge(); });

// --- UPDATE BADGE NOTIFIKASI SURAT MASUK EKSTERNAL ---
async function updateSuratMasukBadge() {
    try {
        const inbox = await localDB.suratEksternal.toArray();
        const pendingCount = inbox.filter(item => item.status !== 'DITERIMA' && item.status !== 'DITOLAK').length;

        const badgeSidebar = $('#badgeInboxSidebar');
        const badgeMobile = $('#badgeInboxMobile');

        if (pendingCount > 0) {
            badgeSidebar.text(pendingCount).show();
            badgeMobile.text(pendingCount).show();
        } else {
            badgeSidebar.hide();
            badgeMobile.hide();
        }
    } catch (e) {
        console.error("Gagal update badge surat masuk", e);
    }
} $(document).ready(function () { setTimeout(updateSuratMasukBadge, 1500); });

$(document).ready(function () {
    // Perbaikan DataTables yang menciut/tidak rapi saat berada di dalam Bootstrap Tabs
    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
    });

    // Otomatis muat data tabel Kode Klasifikasi Daerah saat tab Kode Custom diklik
    $(document).on('shown.bs.tab', '#kode-tab', function () {
        loadKodeCustomTable();
    });
});