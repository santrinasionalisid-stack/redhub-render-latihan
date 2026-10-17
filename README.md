# REDHUB Render Latihan

Repository latihan frontend dashboard REDHUB. **Bukan aplikasi REDHUB produksi.**

## Versi UI

- **V7 — Premium Enterprise UI refresh**: layout dashboard, sidebar desktop, navigasi ringkas di layar kecil, kartu statistik, toolbar tabel, badge unit/status, serta desain Light/Dark.
- **V6 — Ekspor CSV**: ekspor daftar anggota ke CSV dengan UTF-8 BOM.
- **V5 — CRUD anggota**: tambah, edit, hapus, dan simpan data pada `localStorage`.
- **V4 — Statistik otomatis**: kartu statistik dihitung dari data anggota di browser.
- **V3 — Dasar dashboard responsif**.

## Fitur yang dipertahankan

- Tema Light/Dark, pilihan tema tersimpan pada browser.
- Tambah, edit, hapus anggota.
- Penyimpanan data anggota di `localStorage` browser.
- Pencarian berdasarkan nama dan filter unit/status.
- Statistik total anggota, hadir, belum absen, unit, dan persentase hadir.
- Ekspor seluruh data anggota ke CSV.
- Tata letak responsif dengan sidebar tetap di desktop dan navigasi horizontal ringkas di layar kecil.

## Menjalankan secara lokal

Buka `index.html` di browser modern. Tidak memerlukan proses build atau dependency tambahan.

## Batasan demo

- Data anggota tersimpan hanya pada browser/perangkat yang digunakan, bukan database server.
- Login dan kontrol akses belum diterapkan.
- Angka awal kartu statistik pada HTML akan dihitung ulang oleh JavaScript berdasarkan data anggota demo yang sedang dimuat.
- Jangan gunakan data organisasi yang sensitif atau data produksi pada demo ini.

## Checklist verifikasi manual V7

1. Pastikan tombol Light/Dark mengubah warna seluruh halaman dan pilihan tetap tersimpan setelah refresh.
2. Tambah anggota, edit data, lalu hapus anggota; periksa statistik dan tabel.
3. Uji pencarian nama dan filter unit/status secara bersamaan.
4. Ekspor CSV dan periksa isi file.
5. Periksa desktop, tablet, dan layar handphone; pastikan halaman tidak meluber secara horizontal (tabel boleh digeser di area tabelnya).
6. Pastikan repository ini saja yang diperbarui; repository REDHUB produksi tidak disentuh.
