# Implementation Plan — User Roles, Google SSO, and Tournament Participant Approval System

Menyesuaikan arsitektur sistem TradeArena dan dokumen PRD (`tradearena-prd.md`) sesuai kebutuhan otentikasi, otorisasi, dan alur kepesertaan turnamen yang baru.

## 1. Ringkasan Kebutuhan Baru

1. **Role Sistem Utama**:
   - Sistem hanya memiliki 2 role otorisasi utama: `ADMIN` dan `USER`.
   - Mayoritas pengguna yang mendaftar adalah `USER` biasa.
   - `ADMIN` memiliki kendali penuh atas sistem dan turnamen.
2. **Pendaftaran & Login Google SSO**:
   - Pengguna dapat mendaftar/masuk menggunakan Akun Google (Google OAuth / SSO).
   - Setiap pengguna yang mendaftar via Google otomatis mendapatkan role `USER` (belum menjadi peserta turnamen manapun).
3. **Menu User Management (Khusus Admin)**:
   - Menu baru di sidebar Admin untuk mengelola seluruh user terdaftar.
   - Admin dapat mengubah role pengguna (misal mempromosikan `USER` menjadi `ADMIN` atau sebaliknya).
4. **Entitas Participant & Relasi Turnamen**:
   - `Participant` bukan lagi role sistem, melainkan relasi partisipasi antara `User` dan `Tournament`.
   - Satu `User` dapat mendaftarkan diri (*Apply*) ke berbagai turnamen.
   - Setiap turnamen memiliki **Manajemen Peserta Independen** dengan status persetujuan (*approval workflow*):
     - `PENDING`: User baru mendaftar/mengajukan diri.
     - `APPROVED`: Disetujui oleh Admin turnamen (hanya yang berstatus disetujui yang dapat memilih saham/picks).
     - `REJECTED`: Ditolak oleh Admin.
5. **Pembaruan Dokumen PRD**:
   - Memperbarui `tradearena-prd.md` pada bagian Target Users, User Roles, Data Architecture, dan Tournament Participation Flow.

---

## 2. Rencana Perubahan Teknis

### A. Skema Database (Prisma)
- **Model `User`**:
  - Ubah `Role` enum dari `[ADMIN, PARTICIPANT]` menjadi `[ADMIN, USER]`.
  - Tambahkan `provider` (`LOCAL` / `GOOGLE`) dan `googleId` (opsional).
  - Buat `passwordHash` opsional (`String?`) untuk mendukung akun yang hanya login via Google SSO.
- **Relasi `TournamentParticipant`**:
  - Hubungkan langsung ke `User` (atau relasi `User` -> `Participant` -> `TournamentParticipant`).
  - Tambahkan `status`: `ParticipantStatus` (`PENDING`, `APPROVED`, `REJECTED`).
  - Tambahkan timestamp `reviewedAt`, `reviewedByUserId`, dan catatan `reviewNotes`.

### B. Backend API (NestJS)
- **Auth Module**:
  - Endpoint Google SSO: `POST /api/v1/auth/google` (menerima Google ID Token / credential, memverifikasi profil Google, mendaftarkan user baru dengan role `USER` jika belum ada, atau login jika sudah ada).
  - Fallback local authentication tetap dipertahankan untuk master admin seed (`admin@tradearena.id`).
- **Users Module (CRUD & Role Management)**:
  - `GET /api/v1/users` (khusus role `ADMIN`, list user dengan pagination & search).
  - `PATCH /api/v1/users/:id/role` (khusus role `ADMIN`, update role `ADMIN` atau `USER`).
- **Tournament Participants Module**:
  - `POST /api/v1/tournaments/:id/join` (User dengan role `USER` mendaftarkan diri ke turnamen -> status `PENDING`).
  - `GET /api/v1/tournaments/:id/participants` (Menampilkan daftar pendaftar beserta statusnya).
  - `PATCH /api/v1/tournaments/:id/participants/:participantId/status` (Admin melakukan `APPROVE` atau `REJECT`).

### C. Frontend UI (Next.js)
- **Autentikasi & Login**:
  - Tombol *"Masuk dengan Google"* (Google SSO button) di halaman `/login`.
  - Integrasi Google Sign-In SDK / Provider.
- **User Management Page (`/users`)**:
  - Halaman khusus Admin untuk melihat daftar user, tanggal daftar, provider (Google/Email), dan dropdown untuk ganti role.
- **Tournament Participant Flow**:
  - **Di sisi User**: Pada halaman detail turnamen, jika user login sebagai `USER` dan belum terdaftar, tampilkan tombol *"Daftar Ikut Turnamen Ini"*. Jika sudah daftar, tampilkan status *"Menunggu Persetujuan Admin"* atau *"Terdaftar (Approved)"*.
  - **Di sisi Admin**: Di dalam halaman detail turnamen (`/tournaments/[id]`), tambahkan tab/panel **"Persetujuan Peserta (Applicant Review)"** dengan tombol aksi *Setujui (Approve)* dan *Tolak (Reject)*.

### D. PRD Update
- Perbarui `tradearena-prd.md` di Bagian 4, 5, 6, dan 14 untuk mencerminkan arsitektur role `ADMIN` vs `USER`, Google SSO, dan turnamen *independent participant registration & approval*.

---

## 3. Rencana Verifikasi
- Migration Prisma dijalankan dan skema database diperbarui tanpa merusak relasi existing.
- Unit test backend diperbarui untuk menguji role guard baru (`ADMIN` & `USER`) dan approval flow.
- Pengujian interaktif end-to-end:
  1. Registrasi via Google SSO otomatis menjadi `USER`.
  2. User mengajukan diri ke turnamen -> status `PENDING`.
  3. Admin login -> menyetujui user -> status berubah menjadi `APPROVED`.
  4. Admin membuka menu User Management dan dapat mengubah role user.
