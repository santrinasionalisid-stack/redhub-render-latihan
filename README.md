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


## V8 — Statistik & Analitik Kehadiran

- Menambahkan kartu tingkat kehadiran berbentuk donut dengan jumlah hadir dan belum absen.
- Menambahkan grafik batang per unit (DPC, PAC, Badan, Sayap) yang mengikuti data anggota lokal.
- Analitik dihitung ulang otomatis setelah tambah, edit, atau hapus anggota; tidak memakai angka tren historis palsu.
- Semua angka berasal dari data demo di browser dan bukan data live/produksi REDHUB.
- Tema Light/Dark dan tata letak responsif tetap digunakan.


## V9 — RedHub Signature UI

- Menambahkan **brand stage** khusus RedHub dengan tagline “Terhubung dalam struktur. Terukur dalam kehadiran.” dan detail visual bertema command center.
- Mengganti tipografi antarmuka ke Poppins dan menyelaraskan palet dengan identitas RedHub: merah #D90429, merah gelap #A60D1A, workspace netral, serta sidebar charcoal.
- Memperhalus hierarki visual, kartu statistik, status navigasi, tombol utama, batas komponen, dan kontras Light/Dark.
- Menata ulang brand stage agar tetap ringkas dan terbaca pada layar ponsel.
- Perubahan dibatasi pada presentasi; logika CRUD, localStorage, filter, statistik, analitik kehadiran, dan ekspor CSV tetap dipertahankan.

### Catatan validasi V9

- Pemeriksaan statis struktur dan selector dilakukan setelah perubahan.
- Visual QA di browser desktop/mobile dan verifikasi deployment Render tetap perlu dilakukan sebelum memberi nilai akhir 90/100.


## V10 — Precision layout polish

- Menyamakan dimensi tombol tema dan kartu administrator pada topbar desktop, serta menjaga proporsi setara pada tablet dan ponsel.
- Merapikan breakpoint form agar kolom input dan tombol aksi tidak terdesak pada viewport yang lebih sempit.
- Memperhalus fokus input, transisi interaksi, keterbacaan badge, dan scrollbar tabel.
- Perubahan hanya pada CSS; JavaScript CRUD, localStorage, pencarian/filter, statistik, analitik, dan ekspor CSV tidak diubah.
- Validasi akhir tetap memerlukan pemeriksaan visual pada deployment Render di desktop, tablet, dan ponsel.


## V13 — Role-based REDHUB workspaces

- Menambahkan halaman login demo dengan pilihan peran Super Admin, Admin Kesekretariatan, dan Pengurus.
- Navigasi dan halaman dibatasi berdasarkan peran untuk simulasi UI; menu Kelola Admin, Pengaturan WhatsApp, Audit Log, dan Konfigurasi Sistem hanya tampil untuk Super Admin.
- Menambahkan pratinjau halaman Struktur Organisasi, Rapat/Kegiatan, Scanner QR, Undangan & WhatsApp, Absensi, Laporan, portal Pengurus, QR Saya, Riwayat Kehadiran, Rapor, Profil, serta halaman administrasi Super Admin.
- Mempertahankan tampilan V12 sebagai basis visual dan menambahkan shell navigasi drawer serta layout mobile-first.
- Login, data, scan QR, pengiriman WhatsApp, dan konfigurasi pada versi ini adalah simulasi lokal; tidak terhubung ke backend, Firebase, atau akun produksi.
- Perubahan dilakukan pada repository latihan ini saja; `organisasi-attendance` tidak diubah.

### Verifikasi V13

- JavaScript syntax parse: PASS (Node-compatible parser check).
- Render aktual di Render: belum diverifikasi; wajib ditinjau setelah deployment.
- CSS brace balance: PASS. QA viewport 360, 390, 430, 768, 1024, 1366, 1440 px masih perlu ditinjau.
- Status UI: READY FOR USER REVIEW setelah hasil aktual dirender; bukan visual PASS.
