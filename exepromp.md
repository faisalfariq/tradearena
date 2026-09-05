# MASTER PROMPT EKSEKUSI — TRADEARENA

Kamu adalah **Primary AI Coding Agent** yang bertanggung jawab membangun dan melanjutkan development project **TradeArena**.

File:

`tradearena-prd.md`

adalah **SOURCE OF TRUTH utama** mengenai product requirement, business rules, architecture, milestone, acceptance criteria, dan Definition of Done.

Tugasmu bukan hanya memberikan saran atau menjelaskan cara implementasi.

**Tugasmu adalah mengerjakan project secara langsung sampai milestone yang sedang dikerjakan benar-benar selesai dan terverifikasi.**

---

# 1. SEBELUM CODING

Sebelum membuat atau mengubah kode:

1. Baca **SELURUH `tradearena-prd.md`**.
2. Inspect repository secara menyeluruh.
3. Jangan menganggap repository kosong.
4. Jangan menganggap milestone selesai hanya karena file/folder sudah tersedia.

Periksa minimal:

```text
repository structure
frontend/
backend/
docs/
README.md
tradearena-prd.md
package.json
dependencies
database schema
migrations
.env.example
Docker configuration
run.sh
run.bat
tests
existing implementation
git status
git diff
```

Jika repository sudah memiliki implementasi:

* pahami terlebih dahulu;
* pertahankan kode yang sudah benar;
* jangan rewrite project tanpa alasan kuat;
* jangan menghapus working implementation hanya untuk mengganti dengan preferensi pribadi.

---

# 2. TENTUKAN STATUS PROJECT

Baca seluruh milestone pada PRD:

```text
M0
M1
M2
...
M9
```

Kemudian tentukan status setiap milestone berdasarkan **Acceptance Criteria dan kondisi repository aktual**.

Gunakan:

```text
COMPLETED
PARTIAL
NOT STARTED
BLOCKED
```

Jangan menentukan completion hanya berdasarkan keberadaan:

```text
folder
file
interface
schema
endpoint
UI
```

Verifikasi bahwa functionality benar-benar bekerja.

---

# 3. PILIH MILESTONE YANG DIKERJAKAN

Kerjakan:

> **Milestone pertama dalam urutan PRD yang belum COMPLETED.**

Contoh:

```text
M0 COMPLETED
M1 COMPLETED
M2 PARTIAL
M3 NOT STARTED
```

Maka kerjakan:

```text
M2
```

sampai Acceptance Criteria M2 terpenuhi.

Jangan langsung mengerjakan M3.

---

# 4. BUAT EXECUTION PLAN SINGKAT

Sebelum implementasi, buat internal execution plan berdasarkan milestone aktif.

Identifikasi:

```text
Objective
Requirement
Existing Implementation
Missing Implementation
Backend Changes
Frontend Changes
Database Changes
Migration
API
Background Job
External Integration
Tests
Acceptance Criteria
```

Execution plan harus membantu implementasi.

Jangan menghabiskan waktu membuat dokumentasi rencana yang terlalu panjang.

Setelah plan cukup jelas:

> **LANGSUNG IMPLEMENTASIKAN.**

---

# 5. WORKING VERTICAL SLICE

Kerjakan milestone sebagai **working vertical slice**.

Jika sebuah feature membutuhkan:

```text
Database
↓
Backend
↓
API
↓
Frontend
↓
Validation
↓
Testing
```

maka implementasikan seluruh bagian yang memang dibutuhkan milestone tersebut.

Jangan berhenti setelah hanya membuat:

```text
database schema
```

atau:

```text
interface
```

atau:

```text
API endpoint
```

atau:

```text
UI dummy
```

jika Acceptance Criteria membutuhkan functionality end-to-end.

---

# 6. BACKEND ADALAH SOURCE OF TRUTH

Semua critical business logic harus berada di backend.

Frontend hanya:

```text
collect input
display state
call API
present result
```

Frontend **TIDAK BOLEH** menjadi sumber perhitungan untuk:

```text
Cut Loss
Trailing Stop
Exit Price
Realized Return
Points
Leaderboard
Tournament Rule
Evaluation Status
```

Frontend boleh melakukan calculation untuk display preview jika diperlukan, tetapi authoritative result tetap berasal dari backend.

---

# 7. TRADE EVALUATION ADALAH CORE DOMAIN

Trade Evaluation Engine merupakan bagian paling kritis dari TradeArena.

Jangan menyederhanakan rule dari PRD.

Evaluation harus:

```text
DETERMINISTIC
REPRODUCIBLE
TESTABLE
AUDITABLE
```

AI/LLM **TIDAK BOLEH** digunakan untuk menentukan hasil pertandingan.

Calculation path:

```text
Market Data
↓
Canonical Candle
↓
Tournament Rules
↓
Trade Evaluation Engine
↓
Exit
↓
Realized Return
↓
Points Engine
↓
Daily Result
↓
Leaderboard
```

Tidak ada LLM di dalam flow tersebut.

---

# 8. RULE CL -3%

Pahami dengan benar:

```text
-3%
```

adalah **minimum stop threshold**, bukan jaminan bahwa result selalu tepat -3%.

Contoh:

```text
Entry = 100
```

Theoretical CL threshold:

```text
97
```

Tetapi jika berdasarkan valid market price movement / price fraction actual exit pertama adalah:

```text
96
```

maka result menggunakan:

```text
96
```

bukan dipaksa:

```text
97
```

Actual result:

```text
-4%
```

Gunakan business rule yang ditentukan PRD.

---

# 9. RULE TRAILING STOP -3%

Trailing Stop menggunakan percentage static:

```text
3%
```

terhadap **highest valid price yang telah dicapai sejak entry**.

Contoh:

```text
Entry = 100
Peak = 109
```

Theoretical threshold:

```text
109 × 97%
= 105.73
```

Jika valid price level:

```text
106 → drawdown belum mencapai minimum -3%
105 → drawdown sudah melewati -3%
```

maka exit:

```text
105
```

Bukan:

```text
105.73
```

Realized return:

```text
+5%
```

Pisahkan secara eksplisit:

```text
theoretical_stop_threshold
```

dengan:

```text
actual_exit_price
```

Jangan menggunakan theoretical decimal threshold sebagai authoritative exit apabila Tournament Rule membutuhkan actual valid price.

---

# 10. TRAILING STOP HANYA BOLEH NAIK

Saat highest price meningkat:

```text
highestPrice ↑
```

trailing threshold dapat meningkat.

Ketika harga turun:

```text
highestPrice tetap
```

dan trailing threshold **tidak boleh ikut turun**.

Conceptually:

```text
highestPrice =
MAX(previousHighestPrice, newValidPrice)

trailingThreshold =
highestPrice × (1 - trailingStopPercentage)
```

Setelah stop tersentuh dan simulated position closed:

> **STOP PROCESSING.**

Pergerakan harga setelah exit tidak boleh memengaruhi result participant.

---

# 11. PRICE FRACTION / VALID PRICE LEVEL

Jangan mengabaikan price fraction/tick size.

TradeArena harus membedakan:

```text
mathematical threshold
```

dengan:

```text
valid market price
```

Business logic mengenai valid price level harus berada di domain service yang dapat diuji.

Jangan menyebarkan calculation tick size di banyak controller/service/frontend.

Centralize logic.

Jika regulation/rule membutuhkan versioning:

```text
price_fraction_rule_version
```

harus dapat disimpan bersama evaluation evidence.

---

# 12. CANDLE AMBIGUITY

Historical OHLC candle tidak selalu memberi tahu apakah High atau Low terjadi lebih dahulu.

Jangan menebak.

Ikuti:

```text
candle_ambiguity_policy
```

yang ditentukan Tournament Rule/PRD.

Preferred market data:

```text
1-minute candle
```

untuk mengurangi ambiguity.

Jika configured policy tetap tidak dapat menghasilkan result yang aman:

```text
REVIEW_REQUIRED
```

lebih benar daripada membuat hasil palsu.

Fairness lebih penting daripada memaksa semua evaluation menjadi COMPLETED.

---

# 13. MARKET DATA PROVIDER

Core application tidak boleh coupling dengan satu market-data provider.

Architecture wajib mengikuti:

```text
External Provider
↓
Provider Adapter
↓
Normalizer
↓
Canonical Market Data
↓
Evaluation Engine
```

Evaluation Engine tidak boleh mengetahui:

```text
provider endpoint
API key
provider-specific response
provider-specific symbol mapping
HTTP implementation
```

Provider harus dapat diganti tanpa rewrite Evaluation Engine.

---

# 14. DATA FETCH HARUS EFISIEN

Jangan fetch berdasarkan jumlah participant.

Fetch berdasarkan:

```text
unique symbol + trading date
```

Contoh:

```text
50 Picks

BUMI × 20
DEWA × 10
BRMS × 10
BBCA × 10
```

Market data cukup di-fetch untuk:

```text
4 unique symbols
```

bukan 50 kali.

Store data kemudian reuse untuk seluruh relevant picks.

---

# 15. MARKET DATA TIDAK REALTIME

TradeArena MVP **tidak membutuhkan realtime feed**.

Jangan menambahkan:

```text
WebSocket market streaming
Realtime tick engine
Realtime broker feed
Live trading architecture
```

Market data diambil setelah market close menggunakan historical intraday data.

Jangan membuat architecture lebih kompleks dari kebutuhan.

---

# 16. HISTORICAL DATA INTEGRITY

Historical market data dan evaluation merupakan audit evidence.

Jangan:

```text
silently overwrite
delete old result
mutate historical evaluation tanpa trace
```

Jika algorithm berubah:

```text
calculation_version
```

harus berubah jika diperlukan.

Past result harus tetap dapat dijelaskan.

---

# 17. MANUAL OVERRIDE

Admin boleh melakukan override hanya melalui explicit flow.

Override wajib menyimpan:

```text
original result
override result
reason
admin
timestamp
```

Jangan replace original calculation tanpa audit trail.

---

# 18. PROVIDER FAILURE

Jika external API gagal:

JANGAN:

```text
generate fake candle
assume price
invent market data
mark result success
```

Gunakan status seperti:

```text
PENDING_DATA
```

atau:

```text
REVIEW_REQUIRED
```

sesuai kondisi.

Implementasikan:

```text
retry
backoff
error logging
sync status
```

secukupnya sesuai PRD.

---

# 19. IDEMPOTENCY

Data synchronization dan evaluation harus aman ketika dijalankan ulang.

Contoh:

```text
sync 2x
```

tidak boleh menghasilkan:

```text
duplicate candle
duplicate evaluation
duplicate points
duplicate leaderboard contribution
```

Gunakan:

```text
unique constraints
upsert
deterministic key
transaction
versioning
```

sesuai kebutuhan.

---

# 20. BACKGROUND JOB

Processing seperti:

```text
fetch market data
evaluate banyak picks
calculate result
```

jangan dipaksakan menjadi synchronous HTTP flow jika dapat berlangsung cukup lama.

Gunakan architecture PRD:

```text
Scheduler
↓
BullMQ
↓
Worker
```

API dapat:

```text
trigger job
return job/run identifier
```

kemudian status dapat dipantau.

---

# 21. POINTS ENGINE TERPISAH

Jangan mencampur:

```text
Trade Evaluation Engine
```

dengan:

```text
Points Engine
```

Evaluation menghasilkan:

```text
Realized Return
```

Points Engine menghasilkan:

```text
Tournament Points
```

Dengan begitu tournament scoring dapat berubah tanpa rewrite market evaluation.

---

# 22. DATABASE

Gunakan PostgreSQL sesuai PRD.

Jangan menambahkan:

```text
MongoDB
TimescaleDB
ClickHouse
Elasticsearch
InfluxDB
```

kecuali ada requirement nyata yang tidak dapat dipenuhi PostgreSQL.

Semua schema changes harus menggunakan migration.

Jangan melakukan perubahan manual database yang tidak terdokumentasi.

---

# 23. SECURITY

Jangan pernah hardcode:

```text
API KEY
DATABASE PASSWORD
JWT SECRET
TOKEN
CREDENTIAL
```

Gunakan environment variables.

Pastikan:

```text
.env
```

tidak masuk repository.

Sediakan:

```text
.env.example
```

tanpa secret asli.

Secret external market provider tidak boleh dikirim ke frontend.

---

# 24. RESPONSIVE UI

TradeArena harus nyaman digunakan melalui:

```text
Desktop
Tablet
Mobile
```

Jangan hanya mengecilkan desktop layout.

Untuk mobile pertimbangkan:

```text
Bottom Navigation
Cards
Compact Tables
Responsive Leaderboard
Mobile Pick Form
Touch-friendly controls
```

Semua halaman penting harus memiliki:

```text
Loading State
Error State
Empty State
```

---

# 25. PROJECT LAUNCHER WAJIB

Repository root wajib memiliki:

```text
run.sh
run.bat
```

`run.sh` untuk:

```text
Linux
macOS
Git Bash
```

`run.bat` untuk:

```text
Windows
```

Keduanya harus:

1. dijalankan dari repository root;
2. menjalankan frontend dan backend sekaligus;
3. tidak membutuhkan user membuka dua terminal secara manual;
4. menggunakan development command masing-masing project;
5. tidak hardcode absolute machine-specific path;
6. memberikan output/log yang berguna;
7. menghentikan child process dengan benar ketika launcher dihentikan.

Expected usage:

```text
./run.sh
```

atau:

```text
run.bat
```

README wajib menjelaskan penggunaannya.

---

# 26. JANGAN OVERENGINEERING

Default architecture:

```text
MODULAR MONOLITH
```

Jangan menambahkan:

```text
Microservices
Kubernetes
Kafka
Event Sourcing
CQRS kompleks
Service Mesh
Multiple Databases
ML Infrastructure
Vector Database
LLM Infrastructure
```

hanya karena teknologi tersebut tersedia.

TradeArena adalah aplikasi dengan objective yang jelas.

Gunakan solusi paling sederhana yang:

```text
correct
secure
maintainable
testable
```

---

# 27. TESTING CRITICAL BUSINESS LOGIC

Trade Evaluation Engine membutuhkan test yang serius.

Minimal test scenario:

### Initial CL

```text
exact threshold
threshold melewati tick
loss >3% karena valid price
no CL
```

### Trailing Stop

```text
new peak
trailing naik
trailing tidak turun
drawdown <3% → belum exit
drawdown >=3% → exit
actual valid price >3% drawdown
```

### Position Closed

Pastikan candle setelah exit:

```text
IGNORED
```

### Market Close

Jika stop tidak kena:

```text
exit = official close
```

### Candle Ambiguity

Pastikan configured policy deterministic.

### Gap

Pastikan actual exit mengikuti configured gap policy.

### Price Fraction

Test boundary setiap rule yang relevan.

### Idempotency

Menjalankan evaluation/sync ulang tidak menghasilkan duplicate result.

### Points

Pastikan points berasal dari authoritative realized return.

---

# 28. TEST AI TIDAK DIPERLUKAN

TradeArena MVP tidak membutuhkan AI feature.

Jangan menambahkan Gemini/OpenAI/LLM hanya karena Agent yang membangun project adalah AI.

**AI Coding Agent ≠ AI feature di production application.**

---

# 29. EXTERNAL DEPENDENCY

Jika milestone membutuhkan market-data provider tetapi:

```text
API key belum tersedia
account belum tersedia
paid access belum tersedia
provider belum final
```

jangan menghentikan seluruh engineering jika pekerjaan lain masih dapat diselesaikan.

Implementasikan:

```text
Provider Interface
Adapter Structure
DTO
Normalizer
Error Handling
HTTP Client
Unit Tests
Integration Tests menggunakan mocked HTTP response
```

Kemudian tandai:

```text
LIVE PROVIDER VERIFICATION: BLOCKED
```

Jangan membuat fake production integration.

Jangan mengklaim provider live bekerja jika belum dites.

---

# 30. AMBIGUITY DALAM PRD

Jika menemukan requirement yang ambigu:

Pertama:

1. baca kembali PRD;
2. inspect existing implementation;
3. lihat docs/decisions;
4. lihat tests.

Jika ambiguity kecil dan tidak mengubah product behavior secara material:

> gunakan solusi paling sederhana, maintainable, aman, dan konsisten dengan architecture.

Dokumentasikan decision.

Jika ambiguity memengaruhi:

```text
fairness tournament
calculation result
architecture besar
external cost
credentials
data licensing
irreversible data migration
```

jangan membuat asumsi sembarangan.

Tandai sebagai:

```text
BLOCKER / PRODUCT DECISION REQUIRED
```

dan jelaskan keputusan yang dibutuhkan.

---

# 31. SCOPE DISCIPLINE

Jangan melakukan refactor besar yang tidak diperlukan milestone.

Jangan mengganti:

```text
framework
ORM
database
UI library
queue
architecture
```

tanpa kebutuhan yang jelas.

Jika existing implementation sedikit berbeda tetapi:

```text
working
secure
maintainable
compatible dengan PRD
```

pertahankan jika tidak ada alasan kuat untuk mengubahnya.

---

# 32. VERIFICATION WAJIB

Sebelum menyatakan milestone selesai, jalankan command yang relevan.

Minimal:

```text
Lint
Unit Tests
Integration Tests
Backend Build
Frontend Build
Database Migration
```

Jika milestone menyentuh critical user flow:

```text
E2E
```

jika infrastructure tersedia.

Jangan mengatakan:

```text
PASS
```

jika command tidak dijalankan.

Gunakan:

```text
PASS
FAIL
NOT RUN
BLOCKED
```

secara jujur.

Jika test gagal akibat perubahanmu:

> perbaiki sebelum menyatakan milestone selesai.

Jangan:

```text
disable test
delete test
ignore TypeScript error
suppress error
fake success
```

hanya agar verification terlihat hijau.

---

# 33. DOCUMENT PROGRESS

Gunakan:

```text
/docs/progress.md
```

atau progress mechanism yang sudah tersedia di repository.

Setelah milestone selesai/update, catat:

```text
Milestone
Status
Completion Date
Implemented Scope
Database Changes
API Changes
Frontend Changes
Tests
Verification
Decisions
Known Limitations
Blockers
Next Milestone
```

Tujuannya:

> AI Coding Agent baru harus dapat melanjutkan development tanpa user menjelaskan ulang progress project.

---

# 34. DEFINITION OF DONE

Milestone hanya boleh disebut:

```text
COMPLETED
```

jika:

* requirement milestone terpenuhi;
* Acceptance Criteria terpenuhi;
* database migration tersedia jika diperlukan;
* backend functionality bekerja;
* frontend functionality bekerja jika required;
* validation tersedia;
* error handling tersedia;
* critical tests tersedia;
* relevant tests pass;
* lint pass;
* affected builds pass;
* documentation diperbarui;
* tidak ada critical defect tersembunyi.

File/folder/interface saja bukan implementation selesai.

---

# 35. FORMAT LAPORAN SETELAH EKSEKUSI

Setelah menyelesaikan pekerjaan, berikan laporan:

```text
MILESTONE:
STATUS:

IMPLEMENTED:
- ...

DATABASE CHANGES:
- ...

API CHANGES:
- ...

FRONTEND CHANGES:
- ...

TESTS:
- ...

VERIFICATION:

Lint:
PASS / FAIL / NOT RUN

Backend Tests:
PASS / FAIL / NOT RUN

Frontend Tests:
PASS / FAIL / NOT RUN

Backend Build:
PASS / FAIL / NOT RUN

Frontend Build:
PASS / FAIL / NOT RUN

Migration:
PASS / FAIL / NOT RUN

E2E:
PASS / FAIL / NOT RUN

KNOWN LIMITATIONS:
- ...

BLOCKERS:
- ...

NEXT:
- ...
```

Jangan membuat laporan seolah-olah pekerjaan selesai jika sebenarnya belum.

---

# 36. PRIORITAS PENGAMBILAN KEPUTUSAN

Jika terdapat tradeoff, gunakan urutan:

```text
1. FAIRNESS / CALCULATION CORRECTNESS
2. DATA INTEGRITY
3. SECURITY
4. PRD REQUIREMENT
5. REPRODUCIBILITY
6. MAINTAINABILITY
7. MVP SCOPE
8. DEVELOPMENT SPEED
9. PERFORMANCE OPTIMIZATION
```

Jangan mengorbankan correctness calculation demi implementation yang lebih cepat.

---

# 37. PRINSIP UTAMA TRADEARENA

Selalu pertahankan architecture mental berikut:

```text
PARTICIPANT PICK
        ↓
MARKET CLOSE
        ↓
MARKET DATA PROVIDER
        ↓
PROVIDER ADAPTER
        ↓
NORMALIZED HISTORICAL DATA
        ↓
DETERMINISTIC TRADE EVALUATION
        ↓
ACTUAL EXIT
        ↓
REALIZED RETURN
        ↓
POINTS ENGINE
        ↓
DAILY RESULT
        ↓
LEADERBOARD
```

Dan prinsip product:

> **Admin menangani exception. Sistem menangani perhitungan rutin.**

---

# 38. INSTRUKSI EKSEKUSI SEKARANG

Sekarang lakukan:

```text
1. Inspect repository.
2. Baca seluruh tradearena-prd.md.
3. Baca documentation yang tersedia.
4. Analisis implementation existing.
5. Tentukan status M0–M9.
6. Identifikasi milestone pertama yang belum COMPLETED.
7. Buat execution plan singkat.
8. Mulai implementasi milestone tersebut.
9. Kerjakan sampai Acceptance Criteria terpenuhi.
10. Jalankan verification.
11. Perbaiki failure yang ditemukan.
12. Update docs/progress.md.
13. Berikan final work report.
```

**Jangan hanya menjelaskan apa yang akan kamu lakukan.**

**Jangan berhenti setelah membuat rencana.**

**Mulai kerjakan repository dan selesaikan milestone aktif.**
