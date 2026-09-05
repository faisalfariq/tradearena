# TradeArena — Feature Table

## Product Summary
**TradeArena** adalah web application untuk mengelola turnamen stock picking saham Indonesia dan mengotomatisasi evaluasi hasil pick setelah market close menggunakan historical intraday market data.

Prinsip utama:
- Sistem tidak membutuhkan realtime market data.
- Trade result dihitung secara deterministic, bukan oleh AI/LLM.
- Initial Cut Loss dan Trailing Stop menggunakan batas minimum **-3%**.
- Jika level harga valid berikutnya membuat penurunan aktual lebih besar dari -3%, maka level harga valid aktual tersebut digunakan sebagai exit.
- Admin hanya perlu menangani exception/review, bukan memeriksa seluruh chart secara manual.

---

# MVP

| No. | Nama Fitur / Modul | Deskripsi | Priority |
|---:|---|---|---|
| 1 | Project Foundation | Monorepo `/frontend` + `/backend`, environment, Docker Compose, README, `run.sh`, `run.bat`, lint/test/build baseline. | CORE |
| 2 | Admin Authentication | Login admin, session/token handling, logout, protected routes. | CORE |
| 3 | Tournament Management | Membuat, mengubah, membuka/menutup tournament dan periode kompetisi. | CORE |
| 4 | Tournament Rules | Menyimpan rule seperti initial CL %, trailing stop %, entry rule, close-at-market-close, ambiguity policy, dan point rule. | CORE |
| 5 | Participant Management | CRUD participant dan assignment participant ke tournament. | CORE |
| 6 | Stock Master | Master kode emiten IDX yang valid untuk digunakan dalam pick. | CORE |
| 7 | Stock Pick Management | Input/edit pick participant berdasarkan trading date, symbol, entry price, entry timestamp/source jika digunakan. | CORE |
| 8 | Market Data Provider Abstraction | Interface/adapter agar source historical intraday dapat diganti tanpa mengubah evaluation engine. | CORE |
| 9 | Historical Intraday Data Fetch | Mengambil OHLC intraday, preferred 1-minute, setelah market close hanya untuk emiten yang dipick. | CORE |
| 10 | Market Data Storage | Menyimpan historical candle secara canonical dan mencegah duplicate candle. | CORE |
| 11 | Market Data Sync Engine | Batch fetch unique symbols, retry, status tracking, idempotency, API rate-limit/error handling. | CORE |
| 12 | IDX Price Fraction / Tick Rule | Menentukan valid price level berdasarkan fraksi harga IDX atau policy tournament yang dikonfigurasi. | CORE |
| 13 | Initial Cut Loss Engine | Menentukan initial stop minimal -3% dari entry dan exit aktual berdasarkan valid market price level. | CORE |
| 14 | Trailing Stop Engine | Mengikuti highest valid price dan memicu exit ketika drawdown minimal mencapai -3% dari peak. | CORE |
| 15 | Candle Ambiguity Policy | Menangani kondisi high/low pada candle yang sama secara deterministic dan konsisten. | CORE |
| 16 | Gap Handling Rule | Menentukan actual simulated exit jika market melewati threshold stop karena gap/pergerakan antar level. | CORE |
| 17 | Trade Evaluation Engine | Membaca candle kronologis dan menghasilkan exit price, exit time, reason, peak, max floating return, realized return, dan evidence. | CORE |
| 18 | Market Close Exit | Jika stop tidak tersentuh sampai sesi berakhir, simulated position ditutup di official closing price. | CORE |
| 19 | Points Engine | Mengubah realized return menjadi tournament points dengan rule yang terpisah dari evaluation engine. | CORE |
| 20 | Daily Results | Rekap hasil seluruh participant per trading day. | CORE |
| 21 | Overall Leaderboard | Ranking berdasarkan total points dengan statistik dasar participant. | CORE |
| 22 | Evaluation Evidence | Detail audit kenapa sebuah pick memperoleh hasil tertentu, termasuk source data dan calculation version. | Important |
| 23 | Evaluation Status | Status PENDING, PENDING_DATA, PROCESSING, COMPLETED, REVIEW_REQUIRED, OVERRIDDEN. | Important |
| 24 | Manual Review & Override | Admin dapat mengoreksi exception dengan reason; original calculation tetap disimpan. | Important |
| 25 | Sync Monitoring | Admin melihat fetch/sync yang sukses, gagal, retry, dan emiten yang belum memiliki data lengkap. | Important |
| 26 | Admin Dashboard | Ringkasan active tournament, picks, evaluation status, daily leaderboard, overall leaderboard. | Important |
| 27 | Responsive Mobile UI | UI khusus mobile: compact cards, bottom navigation bila sesuai, form dan leaderboard yang nyaman di smartphone. | Important |
| 28 | Audit Trail | Log perubahan penting pada tournament rules, pick, manual override, dan finalization result. | Important |
| 29 | Seed / Demo Data | Seed development untuk admin, tournament, participant, stocks, dan scenario evaluation test. | Important |
| 30 | Automated Testing | Unit/integration tests terutama untuk stop engine, price fraction, ambiguity, points, sync idempotency, dan auth. | Important |

---

# Post-MVP

| No. | Nama Fitur / Modul | Deskripsi | Priority |
|---:|---|---|---|
| 31 | Participant Authentication | Participant login dengan akses terbatas ke tournament yang diikuti. | Enhancement |
| 32 | Self-Service Pick Submission | Participant submit pick sendiri sebelum deadline. | Enhancement |
| 33 | Pick Deadline & Auto Lock | Sistem otomatis mengunci submission berdasarkan jadwal tournament. | Enhancement |
| 34 | Public Leaderboard | Leaderboard yang dapat dibuka publik tanpa login. | Enhancement |
| 35 | Export Excel / PDF | Export daily result, overall result, dan tournament recap. | Enhancement |
| 36 | Notifications | Pengingat submission, hasil harian, dan perubahan ranking. | Enhancement |
| 37 | Tournament Season | Mendukung beberapa season dan historical champion. | Enhancement |
| 38 | Advanced Point Rules | Bonus, penalty, streak, multiplier, atau formula kompetisi lain. | Enhancement |
| 39 | Participant Statistics | Win rate, average result, best/worst pick, consistency, dan history. | Enhancement |
| 40 | Shareable Result Card | Card hasil participant yang mudah dibagikan ke komunitas. | Optional |
| 41 | Achievement / Badge | Badge berdasarkan performa tournament. | Optional |
| 42 | AI Tournament Recap | AI hanya membuat narasi recap/komentar berdasarkan result yang sudah dihitung deterministic. | Optional |
| 43 | Multi-Community / Multi-Tenant | TradeArena digunakan oleh banyak komunitas dengan workspace terpisah. | Advanced |
| 44 | Tick / Trade Data Evaluation | Gunakan data lebih granular dari 1-minute candle jika provider mendukung. | Advanced |
| 45 | External Registration / Payment | Registrasi publik atau monetisasi tournament jika produk berkembang. | Advanced |

---

## MVP Success Criterion

TradeArena dianggap berhasil sebagai MVP apabila:

> Admin dapat memasukkan participant dan stock pick, lalu setelah market close sistem mengambil historical intraday data, mengevaluasi seluruh pick secara otomatis, menghitung realized return dan points, menghasilkan daily result dan leaderboard, serta hanya meminta intervention admin untuk exception yang memang tidak dapat dihitung dengan aman.
