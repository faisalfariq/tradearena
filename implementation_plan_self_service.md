# Rencana Implementasi: Portal Input Mandiri Peserta (Self-Service Picks & 08:45 WIB Lock)

Membangun modul input mandiri di mana peserta turnamen (role `USER`) yang telah berstatus `APPROVED` dapat secara mandiri memilih saham harian (*Daily Pick*) mereka setiap pagi sebelum batas waktu penguncian otomatis (08:45 WIB), mengedit/membatalkan pick sebelum batas waktu, serta memantau status evaluasi dan riwayat trade mereka.

---

## 1. Arsitektur & Aturan Bisnis (Business Rules)

1. **Otorisasi Peserta**:
   - Hanya pengguna yang sudah terdaftar dalam turnamen bersangkutan dengan status kepesertaan `APPROVED` yang diizinkan mengirim pick saham.
   - Peserta yang berstatus `PENDING`, `REJECTED`, atau `DISQUALIFIED` ditolak dengan pesan yang informatif.
2. **Aturan 1 Saham per Hari (1 Pick / Day / Tournament)**:
   - Satu peserta hanya dapat memiliki 1 pick saham aktif per hari perdagangan bursa (IDX).
   - Jika peserta ingin mengganti saham sebelum batas waktu penguncian, sistem memperbarui (*update*) pick tersebut atau membatalkannya.
3. **Batas Waktu Penguncian Otomatis (08:45 WIB Lock Enforcement)**:
   - Pengiriman, pengubahan, dan pembatalan pick untuk tanggal hari ini dibuka sejak pukul 00:00 WIB hingga 08:45:00 WIB.
   - Tepat pukul 08:45 WIB, sistem menolak seluruh mutasi pick untuk hari tersebut (`403 Forbidden: Pick harian telah dikunci sejak pukul 08:45 WIB`).
   - Menyediakan fleksibilitas konfigurasi (`BYPASS_PICK_LOCK=true`) agar tim dev/penguji tetap dapat menguji pengiriman pick di luar jam bursa.
4. **Parameter Pick**:
   - `stockId`: ID emiten saham IDX aktif (pencarian instan berdasarkan kode ticker misal `BBCA`, `BBRI`, `ASII` atau nama perseroan).
   - `tradingDate`: Tanggal perdagangan bursa (default: hari ini).
   - `entryPrice`: Harga perkiraan entry (default: harga acuan saham saat pembukaan / `MARKET_OPEN`).
   - `entrySource`: Default `MARKET_OPEN`.
   - TP / SL: Diturunkan otomatis dari konfigurasi aturan turnamen aktif (misal `initialStopPct = 3%`, `trailingStopPct = 3%`).

---

## 2. Rincian Pengembangan Teknis

### A. Backend API (NestJS)

1. **DTOs (`backend/src/picks/dto/`)**:
   - `SubmitMyPickDto`:
     - `stockId` (UUID, mandatory)
     - `tradingDate` (Date string YYYY-MM-DD, optional, defaults to today WIB)
     - `entryPrice` (Positive number, optional)
     - `entrySource` (Enum `EntrySource`, optional, default `MARKET_OPEN`)
2. **Service (`PicksService`)**:
   - `getMyPickStatus(tournamentId: string, userId: string, dateStr?: string)`:
     - Mengembalikan data apakah user terdaftar & `APPROVED`.
     - Mengembalikan status kunci waktu (apakah sudah lewat 08:45 WIB untuk tanggal tersebut).
     - Mengembalikan pick aktif user pada tanggal tersebut (jika sudah ada) beserta relasi stock dan evaluasi.
     - Mengembalikan ringkasan aturan turnamen (Stop Loss % dan Trailing Stop %).
   - `submitMyPick(tournamentId: string, userId: string, dto: SubmitMyPickDto)`:
     - Validasi status `APPROVED` membership turnamen.
     - Validasi lock cutoff (08:45 WIB).
     - Validasi tanggal berada dalam rentang turnamen.
     - Upsert / Create pick (jika sudah ada pick hari ini, perbarui emiten yang dipilih).
   - `cancelMyPick(tournamentId: string, userId: string, pickId: string)`:
     - Validasi kepemilikan pick oleh user.
     - Validasi batas waktu sebelum 08:45 WIB.
     - Hapus pick jika belum terkunci.
   - `getMyActiveTournamentsSummary(userId: string)`:
     - Mengambil seluruh turnamen aktif yang diikuti user dengan status `APPROVED`.
     - Menyertakan status pick hari ini (apakah sudah submit atau belum) untuk navigasi cepat.
3. **Controller (`PicksController`)**:
   - `GET /tournaments/:tournamentId/my-pick`: Mengambil status dan pick user saat ini.
   - `POST /tournaments/:tournamentId/my-pick`: Submit / update pick mandiri.
   - `DELETE /tournaments/:tournamentId/my-pick/:pickId`: Batalkan pick sebelum 08:45 WIB.
   - `GET /my-tournaments/picks-overview`: Ringkasan status pick di seluruh turnamen yang diikuti.

### B. Frontend UI (Next.js)

1. **Sidebar Navigation**:
   - Tambahkan menu **"Pick Saham Saya" (`/my-picks`)** di sidebar untuk role `USER` dan `ADMIN`.
2. **Halaman Baru: Portal Mandiri Peserta (`frontend/src/app/my-picks/page.tsx`)**:
   - **Header Jam Bursa & Fase Harian (WIB)**:
     - Jam digital real-time WIB (Asia/Jakarta).
     - Badge fase dinamis:
       - 🟢 *Prapasar (Batas 08:45 WIB)* — Formulir pick dibuka!
       - 🔒 *Sesi Bursa / Terkunci (08:45 - 16:00 WIB)* — Pick terkunci, pasar aktif.
       - 📊 *Pascapasar / Evaluasi (16:00+ WIB)* — Evaluasi selesai & leaderboard dihitung.
   - **Pemilih Turnamen Aktif**:
     - Menampilkan tab / selector untuk setiap turnamen yang diikuti user.
     - Indikator status approval (`APPROVED`, `PENDING`, `DISQUALIFIED`).
   - **Formulir / Kartu Pick Hari Ini**:
     - Jika **Belum Memilih**:
       - Kartu interaktif memilih saham IDX (dengan input pencarian ticker/nama).
       - Menampilkan indikator aturan turnamen: *Initial Stop Loss (-3%)* dan *Trailing Stop (-3%)*.
       - Tombol submit besar: *"🚀 Konfirmasi & Kirim Pick Hari Ini"*.
     - Jika **Sudah Memilih**:
       - Kartu rangkuman pick bergaya glassmorphism: Kode Ticker (e.g. `BBCA`), Nama Perusahaan, Estimasi Entry, Jam Kirim.
       - Perhitungan level harga Stop Loss otomatis: misal Entry Rp 9.200 -> Stop Loss level Rp 8.924 (-3.00%).
       - Tombol *"Ganti Saham"* dan *"Batalkan Pick"* (aktif sebelum 08:45 WIB).
       - Badge 🔒 *"Terkunci"* jika sudah melewati 08:45 WIB.
   - **Tabel Riwayat Pick & Hasil**:
     - Daftar seluruh pick sebelumnya beserta hasil evaluasinya (`TP_HIT`, `SL_HIT`, `EOD_CLOSE`), realized return %, dan tombol bukti (*Evidence*).
3. **Penyempurnaan di Detail Turnamen (`/tournaments/[id]`)**:
   - Banner status di tab Turnamen jika user yang login adalah peserta `APPROVED`: menampilkan pick hari ini beserta link cepat ke `/my-picks`.

---

## 3. Tahapan Eksekusi

1. **Langkah 1**: Buat endpoint backend di `PicksService` dan `PicksController` (`my-pick` workflow + 08:45 WIB lock).
2. **Langkah 2**: Jalankan pengujian unit & verifikasi API menggunakan script test.
3. **Langkah 3**: Buat halaman frontend `/my-picks` dan hubungkan menu sidebar.
4. **Langkah 4**: Uji coba komprehensif alur peserta (login sebagai `USER` -> pilih saham -> verifikasi status terkunci -> verifikasi integrasi evaluasi).
