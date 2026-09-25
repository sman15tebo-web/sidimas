// ============================================================
// DATA REFERENSI (Pegawai & Siswa) - SiDiMAS
// ============================================================

let dtPegawai, dtSiswa;

function loadDataReferensi() {
    loadPegawai();
    loadSiswa();
}

// -----------------------------------------
// PEGAWAI CRUD
// -----------------------------------------
async function loadPegawai() {
    try {
        const data = await localDB.pegawai.toArray();
        if ($.fn.DataTable.isDataTable('#tPegawai')) {
            $('#tPegawai').DataTable().clear().rows.add(data).draw();
        } else {
            $('#tPegawai').DataTable({
                data: data,
                columns: [
                    { data: null, render: (d, t, r, meta) => meta.row + 1 },
                    { data: 'nama' },
                    { data: 'nip' },
                    { data: 'pangkatGol' },
                    { data: 'jabatan' },
                    { data: 'status' },
                    {
                        data: 'id', render: function (data) {
                            return '<button class="btn btn-sm btn-info text-white" onclick="editPegawai(' + data + ')" title="Edit"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger text-white" onclick="hapusPegawai(' + data + ')" title="Hapus"><i class="fas fa-trash"></i></button>';
                        }
                    }
                ],
                language: (typeof DT_LANG_ID !== 'undefined') ? DT_LANG_ID : {}
            });
        }
    } catch (e) {
        console.error("Gagal load pegawai", e);
    }
}

function updatePangkatDropdown(selectedGol = '') {
    const status = document.getElementById('pgw_status').value;
    const pangkatSelect = document.getElementById('pgw_pangkat');
    pangkatSelect.innerHTML = '<option value="">- Pilih Pangkat/Golongan -</option>';
    
    if (status === 'PNS') {
        const pnsGol = [
            "Juru Muda, I/a", "Juru Muda Tingkat I, I/b", "Juru, I/c", "Juru Tingkat I, I/d",
            "Pengatur Muda, II/a", "Pengatur Muda Tingkat I, II/b", "Pengatur, II/c", "Pengatur Tingkat I, II/d",
            "Penata Muda, III/a", "Penata Muda Tingkat I, III/b", "Penata, III/c", "Penata Tingkat I, III/d",
            "Pembina, IV/a", "Pembina Tingkat I, IV/b", "Pembina Utama Muda, IV/c", "Pembina Utama Madya, IV/d", "Pembina Utama, IV/e"
        ];
        pnsGol.forEach(g => {
            pangkatSelect.innerHTML += `<option value="${g}">${g}</option>`;
        });
    } else if (status === 'PPPK' || status === 'PPPK Paruh Waktu') {
        const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII"];
        roman.forEach(g => {
            pangkatSelect.innerHTML += `<option value="Golongan ${g}">Golongan ${g}</option>`;
        });
    } else if (status === 'Tenaga Honor') {
        pangkatSelect.innerHTML += `<option value="-">-</option>`;
    }
    
    if (selectedGol) {
        let optionExists = Array.from(pangkatSelect.options).some(opt => opt.value === selectedGol);
        if(!optionExists && selectedGol !== '') {
            pangkatSelect.innerHTML += `<option value="${selectedGol}">${selectedGol}</option>`;
        }
        pangkatSelect.value = selectedGol;
    }
}

function tambahPegawai() {
    document.getElementById('formPegawai').reset();
    document.getElementById('pgw_id').value = '';
    updatePangkatDropdown();
    $('#mdlPegawai').modal('show');
}

async function editPegawai(id) {
    try {
        const arr = await localDB.pegawai.toArray();
        const p = arr.find(x => x.id === id);
        if (p) {
            document.getElementById('pgw_id').value = p.id;
            document.getElementById('pgw_nama').value = p.nama || '';
            document.getElementById('pgw_nip').value = p.nip || '';
            document.getElementById('pgw_jabatan').value = p.jabatan || '';
            
            // Set status lalu trigger dropdown pangkat
            const statusSelect = document.getElementById('pgw_status');
            let statusExists = Array.from(statusSelect.options).some(opt => opt.value === (p.status || ''));
            if(!statusExists && p.status) {
                statusSelect.innerHTML += `<option value="${p.status}">${p.status}</option>`;
            }
            statusSelect.value = p.status || '';
            
            $('#mdlPegawai').modal('show');
        }
    } catch (e) { console.error(e); }
}

async function simpanPegawai(e) {
    e.preventDefault();
    const id = document.getElementById('pgw_id').value;
    const obj = {
        id: id ? parseInt(id) : Date.now(), // gunakan timestamp sebagai ID unik jika baru
        nama: document.getElementById('pgw_nama').value,
        nip: document.getElementById('pgw_nip').value,
        pangkatGol: document.getElementById('pgw_pangkat').value,
        jabatan: document.getElementById('pgw_jabatan').value,
        status: document.getElementById('pgw_status').value
    };

    try {
        // Cek duplikat NIP di cache lokal
        if (obj.nip && obj.nip.trim() !== '' && obj.nip !== '-') {
            const exists = await localDB.pegawai.where('nip').equals(obj.nip).toArray();
            const isDuplicate = exists.some(p => p.id !== (id ? parseInt(id) : null));
            if (isDuplicate) {
                Swal.fire('Gagal', 'NIP sudah terdaftar pada pegawai lain!', 'error');
                return;
            }
        }

        if (isAppOnline()) {
            // MODE ONLINE: Simpan langsung ke Spreadsheet
            const res = await apiCall('savePegawai', obj);
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menyimpan ke Spreadsheet.', 'error');
                return;
            }
            // Update cache lokal IndexedDB
            await localDB.pegawai.put(obj);
            Swal.fire('Berhasil', 'Data pegawai disimpan ke Spreadsheet.', 'success');
        } else {
            // MODE OFFLINE: Simpan ke IndexedDB lokal, antri sync
            if (id) {
                obj.id = parseInt(id);
                await localDB.pegawai.update(obj.id, obj);
            } else {
                obj.id = await localDB.pegawai.put(obj);
            }
            await localDB.antrianSync.put({ action: 'savePegawai', payload: obj, status: 'pending' });
            Swal.fire('Tersimpan', 'Data pegawai disimpan lokal (akan sync ke Spreadsheet saat online).', 'success');
        }

        $('#mdlPegawai').modal('hide');
        loadPegawai();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function hapusPegawai(id) {
    if (!confirm('Yakin ingin menghapus pegawai ini?')) return;
    try {
        if (isAppOnline()) {
            // MODE ONLINE: Hapus langsung dari Spreadsheet
            const res = await apiCall('deletePegawai', { id: id });
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menghapus dari Spreadsheet.', 'error');
                return;
            }
            // Hapus dari cache lokal juga
            await localDB.pegawai.delete(id);
        } else {
            // MODE OFFLINE: tandai untuk dihapus saat sync
            await localDB.pegawai.delete(id);
            await localDB.antrianSync.put({ action: 'deletePegawai', payload: { id: id }, status: 'pending' });
        }
        loadPegawai();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}


// -----------------------------------------
// SISWA CRUD
// -----------------------------------------
async function loadSiswa() {
    try {
        const data = await localDB.siswa.toArray();
        if ($.fn.DataTable.isDataTable('#tSiswa')) {
            $('#tSiswa').DataTable().clear().rows.add(data).draw();
        } else {
            $('#tSiswa').DataTable({
                data: data,
                columns: [
                    { data: null, render: (d, t, r, meta) => meta.row + 1 },
                    { data: 'nama' },
                    { data: 'jk' },
                    {
                        data: null, render: function (data, type, row) {
                            let val = [];
                            if (row.nipd) val.push(row.nipd);
                            if (row.nisn) val.push(row.nisn);
                            return val.join(' / ');
                        }
                    },
                    { data: 'tmptLahir' },
                    { data: 'tglLahir' },
                    {
                        data: null, render: function (data, type, row) {
                            let ayah = row.namaAyah ? 'Ayah: ' + row.namaAyah : '';
                            let ibu = row.namaIbu ? 'Ibu: ' + row.namaIbu : '';
                            return ayah + (ayah && ibu ? '<br>' : '') + ibu;
                        }
                    },
                    { data: 'kelas' },
                    {
                        data: 'id', render: function (data) {
                            return '<button class="btn btn-sm btn-info text-white" onclick="editSiswa(' + data + ')" title="Edit"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger text-white" onclick="hapusSiswa(' + data + ')" title="Hapus"><i class="fas fa-trash"></i></button>';
                        }
                    }
                ],
                language: (typeof DT_LANG_ID !== 'undefined') ? DT_LANG_ID : {}
            });
        }
    } catch (e) {
        console.error("Gagal load siswa", e);
    }
}

function tambahSiswa() {
    document.getElementById('formSiswa').reset();
    document.getElementById('sis_id').value = '';
    $('#mdlSiswa').modal('show');
}

async function editSiswa(id) {
    try {
        const arr = await localDB.siswa.toArray();
        const p = arr.find(x => x.id === id);
        if (p) {
            document.getElementById('sis_id').value = p.id;
            document.getElementById('sis_nama').value = p.nama || '';
            document.getElementById('sis_nipd').value = p.nipd || '';
            document.getElementById('sis_nisn').value = p.nisn || '';
            document.getElementById('sis_tmptLahir').value = p.tmptLahir || '';
            document.getElementById('sis_tglLahir').value = p.tglLahir || '';
            document.getElementById('sis_jk').value = p.jk || 'L';
            document.getElementById('sis_kelas').value = p.kelas || '';
            document.getElementById('sis_ayah').value = p.namaAyah || '';
            document.getElementById('sis_ibu').value = p.namaIbu || '';
            $('#mdlSiswa').modal('show');
        }
    } catch (e) { console.error(e); }
}

async function simpanSiswa(e) {
    e.preventDefault();
    const id = document.getElementById('sis_id').value;
    const obj = {
        id: id ? parseInt(id) : Date.now(),
        nama: document.getElementById('sis_nama').value,
        nipd: document.getElementById('sis_nipd').value,
        nisn: document.getElementById('sis_nisn').value,
        tmptLahir: document.getElementById('sis_tmptLahir').value,
        tglLahir: document.getElementById('sis_tglLahir').value,
        jk: document.getElementById('sis_jk').value,
        kelas: document.getElementById('sis_kelas').value,
        namaAyah: document.getElementById('sis_ayah').value,
        namaIbu: document.getElementById('sis_ibu').value
    };

    try {
        // Cek duplikat NISN di cache lokal
        if (obj.nisn && obj.nisn.trim() !== '' && obj.nisn !== '-') {
            const exists = await localDB.siswa.where('nisn').equals(obj.nisn).toArray();
            const isDuplicate = exists.some(p => p.id !== (id ? parseInt(id) : null));
            if (isDuplicate) {
                Swal.fire('Gagal', 'NISN sudah terdaftar pada siswa lain!', 'error');
                return;
            }
        }

        if (isAppOnline()) {
            // MODE ONLINE: Simpan langsung ke Spreadsheet
            const res = await apiCall('saveSiswa', obj);
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menyimpan ke Spreadsheet.', 'error');
                return;
            }
            // Update cache lokal
            await localDB.siswa.put(obj);
            Swal.fire('Berhasil', 'Data siswa disimpan ke Spreadsheet.', 'success');
        } else {
            // MODE OFFLINE: Simpan ke IndexedDB lokal, antri sync
            if (id) {
                obj.id = parseInt(id);
                await localDB.siswa.update(obj.id, obj);
            } else {
                obj.id = await localDB.siswa.put(obj);
            }
            await localDB.antrianSync.put({ action: 'saveSiswa', payload: obj, status: 'pending' });
            Swal.fire('Tersimpan', 'Data siswa disimpan lokal (akan sync ke Spreadsheet saat online).', 'success');
        }

        $('#mdlSiswa').modal('hide');
        loadSiswa();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function hapusSiswa(id) {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return;
    try {
        if (isAppOnline()) {
            // MODE ONLINE: Hapus langsung dari Spreadsheet
            const res = await apiCall('deleteSiswa', { id: id });
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menghapus dari Spreadsheet.', 'error');
                return;
            }
            await localDB.siswa.delete(id);
        } else {
            // MODE OFFLINE: tandai untuk dihapus saat sync
            await localDB.siswa.delete(id);
            await localDB.antrianSync.put({ action: 'deleteSiswa', payload: { id: id }, status: 'pending' });
        }
        loadSiswa();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}


// -----------------------------------------
// IMPORT EXCEL DAPODIK
// -----------------------------------------
function modalImportPegawai() {
    document.getElementById('fileDapodik').value = '';
    document.getElementById('importType').value = 'pegawai';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('mdlImportDapodik')).show();
}

function modalImportSiswa() {
    document.getElementById('fileDapodik').value = '';
    document.getElementById('importType').value = 'siswa';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('mdlImportDapodik')).show();
}

function prosesImportDapodik() {
    const fileInput = document.getElementById('fileDapodik');
    const type = document.getElementById('importType').value;
    
    if (!fileInput.files.length) {
        return Swal.fire('Peringatan', 'Silakan pilih file Excel terlebih dahulu', 'warning');
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    Swal.fire({ title: 'Memproses...', text: 'Membaca file Excel...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonArray = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            if (type === 'pegawai') {
                importDataPegawai(jsonArray);
            } else {
                importDataSiswa(jsonArray);
            }
        } catch(err) {
            Swal.fire('Error', 'Gagal membaca file Excel. Pastikan format valid.', 'error');
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function findHeaderRowIndex(rows) {
    for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i];
        if (!row) continue;
        const stringRow = row.map(v => String(v).trim().toLowerCase());
        if (stringRow.includes('nama')) {
            return i;
        }
    }
    return -1;
}

function cleanString(str) {
    if (str === null || str === undefined) return '';
    return String(str).trim();
}

function parsePangkat(val) {
    if (!val) return '';
    let str = val.toString().trim().toUpperCase();
    
    // Pemetaan PNS
    const pnsMap = {
        'I/A': 'Juru Muda (I/a)',
        'I/B': 'Juru Muda Tingkat I (I/b)',
        'I/C': 'Juru (I/c)',
        'I/D': 'Juru Tingkat I (I/d)',
        'II/A': 'Pengatur Muda (II/a)',
        'II/B': 'Pengatur Muda Tingkat I (II/b)',
        'II/C': 'Pengatur (II/c)',
        'II/D': 'Pengatur Tingkat I (II/d)',
        'III/A': 'Penata Muda (III/a)',
        'III/B': 'Penata Muda Tingkat I (III/b)',
        'III/C': 'Penata (III/c)',
        'III/D': 'Penata Tingkat I (III/d)',
        'IV/A': 'Pembina (IV/a)',
        'IV/B': 'Pembina Tingkat I (IV/b)',
        'IV/C': 'Pembina Utama Muda (IV/c)',
        'IV/D': 'Pembina Utama Madya (IV/d)',
        'IV/E': 'Pembina Utama (IV/e)'
    };
    
    if (pnsMap[str]) return pnsMap[str];
    
    // Pemetaan PPPK (format romawi)
    const pppkMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];
    if (pppkMap.includes(str)) {
        return 'Golongan ' + str;
    }
    
    // Kembalikan aslinya jika tidak cocok dengan peta
    return val.toString().trim();
}

async function importDataPegawai(rows) {
    const headerIdx = findHeaderRowIndex(rows);
    if (headerIdx === -1) {
        return Swal.fire('Gagal', 'Tidak menemukan header "Nama" di file Excel ini.', 'error');
    }
    
    const headers = rows[headerIdx].map(v => cleanString(v).toLowerCase());
    
    const idxNama = headers.indexOf('nama');
    const idxNip = headers.findIndex(h => h === 'nip' || h === 'nip / nii');
    const idxPangkat = headers.findIndex(h => h.includes('pangkat') || h.includes('golongan'));
    const idxJabatan = headers.findIndex(h => h.includes('jabatan') || h === 'jenis ptk');
    const idxStatus = headers.findIndex(h => h.includes('status pegawai') || h.includes('status kepegawaian'));
    
    if (idxNama === -1) return Swal.fire('Gagal', 'Kolom Nama tidak ditemukan.', 'error');
    
    const existingPgw = await localDB.pegawai.toArray();

    let countBaru = 0;
    let countTimpa = 0;
    let countGagal = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idxNama]) {
            countGagal++;
            continue;
        }
        if (cleanString(row[idxNama]).toLowerCase() === 'nama') {
            countGagal++;
            continue;
        }
        
        let nip = idxNip !== -1 ? cleanString(row[idxNip]) : '';
        if (nip.startsWith("'")) nip = nip.substring(1);
        
        if (!nip || nip === '' || nip === '-') {
            countGagal++;
            continue; // Lewati jika tidak ada NIP sesuai permintaan user
        }
        
        let rawPangkat = idxPangkat !== -1 ? cleanString(row[idxPangkat]) : '';
        
        let obj = {
            nama: cleanString(row[idxNama]),
            nip: nip,
            pangkatGol: parsePangkat(rawPangkat),
            jabatan: idxJabatan !== -1 ? cleanString(row[idxJabatan]) : '',
            status: idxStatus !== -1 ? cleanString(row[idxStatus]) : ''
        };
        
        try {
            let existingMatch = existingPgw.find(p => p.nip === nip);
            if (existingMatch) {
                obj.id = parseInt(existingMatch.id);
                await localDB.pegawai.update(obj.id, obj);
                await localDB.antrianSync.put({ action: 'savePegawai', payload: obj, status: 'pending' });
                countTimpa++;
            } else {
                if (!isElectron) delete obj.id;
                obj.id = await localDB.pegawai.put(obj);
                await localDB.antrianSync.put({ action: 'savePegawai', payload: obj, status: 'pending' });
                countBaru++;
            }
        } catch(e) {
            console.error("Gagal insert baris", row, e);
        }
    }
    
    if (countBaru === 0 && countTimpa === 0) {
        return Swal.fire('Info', 'Tidak ada data valid untuk diimport. (Pastikan format kolom NIP dan Nama terisi)', 'info');
    }
    
    Swal.fire('Hasil Import', `<b>Rincian Import Pegawai:</b><br>Berhasil ditambah: ${countBaru}<br>Berhasil ditimpa: ${countTimpa}<br>Gagal / Dilewati (Tanpa NIP): ${countGagal}`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('mdlImportDapodik')).hide();
    loadPegawai();
}

async function importDataSiswa(rows) {
    const headerIdx = findHeaderRowIndex(rows);
    if (headerIdx === -1) {
        return Swal.fire('Gagal', 'Tidak menemukan header "Nama" di file Excel ini.', 'error');
    }
    
    const headers = rows[headerIdx].map(v => cleanString(v).toLowerCase());
    
    const idxNama = headers.indexOf('nama');
    const idxNipd = headers.findIndex(h => h === 'nipd' || h === 'nis' || h === 'no induk');
    const idxNisn = headers.indexOf('nisn');
    const idxTmptLahir = headers.findIndex(h => h.includes('tempat lahir'));
    const idxTglLahir = headers.findIndex(h => h.includes('tanggal lahir'));
    const idxJk = headers.findIndex(h => h === 'jk' || h === 'jenis kelamin' || h === 'l/p');
    const idxAyah = headers.findIndex(h => h === 'nama ayah' || h === 'data ayah');
    const idxIbu = headers.findIndex(h => h === 'nama ibu kandung' || h === 'nama ibu' || h === 'data ibu');
    const idxKelas = headers.findIndex(h => h === 'rombel saat ini' || h === 'kelas');
    
    if (idxNama === -1) return Swal.fire('Gagal', 'Kolom Nama tidak ditemukan.', 'error');
    
    const existingSis = await localDB.siswa.toArray();

    let countBaru = 0;
    let countTimpa = 0;
    let countGagal = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idxNama]) {
            countGagal++;
            continue;
        }
        if (cleanString(row[idxNama]).toLowerCase() === 'nama') {
            countGagal++;
            continue;
        }
        
        let nisnVal = idxNisn !== -1 ? cleanString(row[idxNisn]) : '';
        if (nisnVal.startsWith("'")) nisnVal = nisnVal.substring(1);

        if (!nisnVal || nisnVal === '' || nisnVal === '-') {
            countGagal++;
            continue; // Lewati jika tidak ada NISN sesuai permintaan user
        }
        
        let obj = {
            nama: cleanString(row[idxNama]),
            nipd: idxNipd !== -1 ? cleanString(row[idxNipd]) : '',
            nisn: nisnVal,
            tmptLahir: idxTmptLahir !== -1 ? cleanString(row[idxTmptLahir]) : '',
            tglLahir: idxTglLahir !== -1 ? cleanString(row[idxTglLahir]) : '',
            jk: idxJk !== -1 ? cleanString(row[idxJk]) : '',
            kelas: idxKelas !== -1 ? cleanString(row[idxKelas]) : '',
            namaAyah: idxAyah !== -1 ? cleanString(row[idxAyah]) : '',
            namaIbu: idxIbu !== -1 ? cleanString(row[idxIbu]) : ''
        };
        
        try {
            let existingMatch = existingSis.find(s => s.nisn === nisnVal);
            if (existingMatch) {
                obj.id = parseInt(existingMatch.id);
                await localDB.siswa.update(obj.id, obj);
                await localDB.antrianSync.put({ action: 'saveSiswa', payload: obj, status: 'pending' });
                countTimpa++;
            } else {
                if (!isElectron) delete obj.id;
                obj.id = await localDB.siswa.put(obj);
                await localDB.antrianSync.put({ action: 'saveSiswa', payload: obj, status: 'pending' });
                countBaru++;
            }
        } catch(e) {
            console.error("Gagal insert baris", row, e);
        }
    }
    
    if (countBaru === 0 && countTimpa === 0) {
        return Swal.fire('Info', 'Tidak ada data valid untuk diimport. (Pastikan format kolom NISN dan Nama terisi)', 'info');
    }
    
    Swal.fire('Hasil Import', `<b>Rincian Import Siswa:</b><br>Berhasil ditambah: ${countBaru}<br>Berhasil ditimpa: ${countTimpa}<br>Gagal / Dilewati (Tanpa NISN): ${countGagal}`, 'success');
    bootstrap.Modal.getInstance(document.getElementById('mdlImportDapodik')).hide();
    loadSiswa();
}
