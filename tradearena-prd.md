# TradeArena — Product Requirements Document (PRD)

**Product:** TradeArena  
**Document Type:** Master Product & Engineering Specification  
**Architecture:** Modular Monolith  
**Repository:** Monorepo (`/frontend` + `/backend`)  
**Primary Purpose:** Automated stock-picking tournament evaluation

---

# 1. Product Overview

TradeArena adalah web application untuk mengelola turnamen stock picking saham Indonesia.

Masalah utama yang diselesaikan adalah proses evaluasi manual setelah market close. Saat ini admin harus membuka chart setiap emiten satu per satu untuk menentukan apakah participant terkena Cut Loss, Trailing Stop, atau tetap open sampai closing, kemudian menghitung return dan points secara manual.

TradeArena mengotomatisasi seluruh proses tersebut menggunakan historical intraday market data.

```text
PARTICIPANT PICK
        ↓
MARKET CLOSE
        ↓
HISTORICAL INTRADAY MARKET DATA
        ↓
DETERMINISTIC TRADE EVALUATION
        ↓
INITIAL CL / TRAILING STOP / MARKET CLOSE
        ↓
REALIZED RETURN
        ↓
POINTS
        ↓
DAILY RESULT
        ↓
LEADERBOARD
```

TradeArena bukan trading bot, broker, order execution system, atau investment recommendation engine.

---

# 2. Problem Statement

Dalam tournament BSJP, setiap participant memilih emiten. Setelah sesi perdagangan selesai, admin perlu menentukan hasil setiap simulated trade.

Manual workflow memiliki masalah:

- admin harus membuka chart satu per satu;
- semakin banyak participant semakin besar workload;
- perhitungan trailing stop dapat tidak konsisten;
- sulit melakukan audit terhadap hasil lama;
- human error dapat memengaruhi fairness;
- ranking harian dan overall membutuhkan rekap manual.

TradeArena harus mengubah admin workflow dari:

> "Periksa seluruh pick."

menjadi:

> "Periksa hanya exception yang ditandai sistem."

---

# 3. Product Objectives

MVP harus:

1. Mengelola tournament, participant, rules, dan daily stock picks.
2. Mengambil historical intraday data setelah market close.
3. Menggunakan data yang sama untuk seluruh participant yang memilih symbol sama.
4. Menentukan simulated exit secara deterministic.
5. Mendukung Initial CL minimum -3%.
6. Mendukung Trailing Stop minimum -3% dari highest valid price.
7. Menggunakan actual valid price level sebagai simulated exit, bukan theoretical decimal threshold.
8. Menghitung realized return.
9. Mengonversi result menjadi points.
10. Menghasilkan daily result dan overall leaderboard.
11. Memberikan calculation evidence.
12. Menandai data yang tidak aman dievaluasi sebagai REVIEW_REQUIRED.
13. Memungkinkan manual override dengan audit trail.

---

# 4. Target Users

## 4.1 Admin
Pengelola tournament/community.

## 4.2 Participant
Peserta tournament.

Participant login/self-service dapat menjadi Post-MVP. MVP boleh menggunakan admin sebagai pihak yang memasukkan pick.

---

# 5. User Roles

## ADMIN
Boleh:
- login;
- manage tournament;
- manage tournament rules;
- manage participants;
- manage picks;
- trigger/retry data sync;
- melihat evaluation;
- melakukan manual review;
- override result dengan reason;
- melihat daily result;
- melihat leaderboard.

## PARTICIPANT
Post-MVP atau optional MVP:
- login;
- submit pick sesuai rules;
- melihat own result;
- melihat leaderboard.

Participant tidak boleh mengubah evaluation.

---

# 6. Core Tournament Rules

Tournament configuration minimal:

```text
name
start_date
end_date
initial_stop_percentage
trailing_stop_percentage
entry_rule
market_close_rule
candle_ambiguity_policy
price_fraction_policy
gap_policy
points_rule
timezone
status
```

Default untuk BSJP:

```text
Initial CL       = minimum -3%
Trailing Stop    = minimum -3% dari peak
Timezone         = Asia/Jakarta
Market           = IDX
```

Rule tidak boleh tersembunyi di frontend.

Backend adalah source of truth.

---

# 7. Critical Stop Rule

## 7.1 Initial Cut Loss

Jika entry price:

```text
100
```

theoretical threshold:

```text
100 × 97% = 97
```

Namun angka theoretical hanya threshold.

Official simulated exit harus menggunakan valid market price level berdasarkan tournament price-fraction policy dan actual chronological market movement.

Initial CL -3% berarti:

> Stop mulai valid ketika penurunan minimum telah mencapai 3%.

Jika actual valid next price level menghasilkan -3.5%, maka result menggunakan actual -3.5%, bukan dipaksa -3%.

---

# 8. Trailing Stop Rule

Trailing Stop adalah percentage static sebesar 3% dari highest valid price yang telah tercapai sejak entry.

Contoh:

```text
Entry  = 100
Peak   = 109

Theoretical TS Threshold:
109 × 97%
= 105.73
```

Misalnya price ladder yang relevan:

```text
106 → drawdown dari peak belum mencapai -3%
105 → drawdown sudah melewati -3%
```

Maka simulated exit:

```text
105
```

Bukan:

```text
105.73
```

Realized return:

```text
(105 - 100) / 100 × 100
= +5%
```

Rule:

> Initial CL dan Trailing Stop menggunakan batas minimum -3%. Ketika actual valid market price pertama mencapai atau melewati threshold tersebut, actual valid price digunakan sebagai exit.

Trailing stop hanya boleh bergerak ke arah yang mengunci profit lebih tinggi. Tidak boleh turun kembali.

---

# 9. Important Distinction: Threshold vs Exit Price

Sistem harus membedakan:

```text
theoretical_stop_threshold
```

dengan:

```text
actual_exit_price
```

Threshold digunakan untuk mendeteksi kapan stop valid.

Actual exit price digunakan untuk menghitung tournament result.

Jangan menghitung realized return menggunakan theoretical decimal price jika market/tournament policy membutuhkan valid exchange price level.

---

# 10. Entry Rule

Setiap pick minimal memiliki:

```text
participant_id
tournament_id
trading_date
stock_id
entry_price
entry_timestamp nullable
entry_source
status
```

Entry source dapat berupa:

```text
MANUAL
MARKET_OPEN
SUBMISSION_PRICE
OTHER_TOURNAMENT_RULE
```

Entry rule harus explicit.

Tidak boleh membuat asumsi tersembunyi mengenai entry.

---

# 11. Historical Market Data Requirement

TradeArena tidak membutuhkan realtime market data.

Data diambil setelah market close.

Preferred interval:

```text
1 minute
```

Canonical candle:

```text
symbol
trading_date
timestamp
open
high
low
close
volume nullable
provider
```

1-minute dipilih untuk mengurangi ambiguity urutan intraday.

---

# 12. Market Data Provider Architecture

Core application tidak boleh coupling ke satu provider.

```text
Provider
   ↓
Provider Adapter
   ↓
Normalizer
   ↓
Canonical Candle
   ↓
Evaluation Engine
```

Contract konseptual:

```ts
interface MarketDataProvider {
  getIntradayCandles(params: {
    symbol: string;
    tradingDate: string;
    interval: '1m';
  }): Promise<IntradayCandle[]>;
}
```

Provider implementation bertanggung jawab terhadap:
- authentication/API key;
- request formatting;
- provider response mapping;
- retryable error classification;
- rate limit handling;
- data validation.

Evaluation Engine hanya menerima canonical data.

---

# 13. Data Fetch Strategy

Setelah market close:

1. Ambil seluruh eligible picks hari tersebut.
2. Ambil unique stock symbols.
3. Fetch historical data satu kali per unique symbol/date.
4. Store canonical candle.
5. Reuse data untuk seluruh participant dengan symbol sama.

Contoh:

```text
30 picks
8 unique stocks
```

TradeArena hanya perlu fetch 8 symbol datasets, bukan 30.

Jangan mengambil seluruh IDX jika tidak dibutuhkan.

---

# 14. Market Data Sync

Flow:

```text
Scheduler
↓
Create Sync Run
↓
Collect Today's Eligible Picks
↓
Resolve Unique Symbols
↓
Fetch Historical Intraday
↓
Validate
↓
Normalize
↓
Persist
↓
Evaluate Picks
↓
Calculate Points
↓
Finalize Results
```

Requirement:
- idempotent;
- retryable;
- duplicate safe;
- per-symbol status;
- provider failure visible;
- tidak menghasilkan fake result.

---

# 15. Candle Ambiguity

OHLC tidak selalu menjelaskan urutan transaksi di dalam satu candle.

Contoh:

```text
Open  100
High  110
Low   105
Close 108
```

Tidak diketahui secara pasti apakah high atau low terjadi lebih dahulu.

Karena urutan dapat memengaruhi trailing stop:

1. Preferred interval = 1-minute.
2. Evaluation Engine harus memiliki explicit `candle_ambiguity_policy`.
3. Default MVP policy harus konservatif dan konsisten.
4. Policy harus terdokumentasi dan versioned.
5. AI tidak boleh menebak urutan intrabar.

Jika ambiguity material tidak dapat diselesaikan secara deterministic berdasarkan configured policy, result dapat menjadi:

```text
REVIEW_REQUIRED
```

---

# 16. Price Fraction / Tick Size Policy

TradeArena harus mendukung valid price fraction policy.

Tujuannya bukan sekadar rounding theoretical threshold, melainkan memastikan result mengikuti level harga yang dianggap valid oleh tournament.

Domain service:

```text
PriceFractionService
```

Responsibilities:
- menentukan valid tick/price levels;
- mengubah theoretical threshold menjadi comparison boundary;
- menentukan actual valid exit candidate;
- versioning rule jika regulation/tournament policy berubah.

Rule harus unit-testable.

Jangan hardcode angka tanpa dokumentasi.

---

# 17. Gap Policy

Gap atau jump antar valid levels dapat membuat exit aktual melewati -3%.

Default BSJP principle:

> -3% adalah minimum stop threshold, bukan guaranteed exact loss.

Jika first valid actual price setelah threshold menghasilkan -4%, actual -4% digunakan sebagai exit/result jika itu sesuai configured execution policy.

Gap policy harus versioned dan configurable.

---

# 18. Trade Evaluation Engine

Trade Evaluation Engine adalah core domain.

Engine harus deterministic dan sebisa mungkin dibuat sebagai pure/testable domain logic.

Input:

```text
Pick
Tournament Rules
Canonical Intraday Candles
Price Fraction Policy
Calculation Version
```

Output minimal:

```text
entry_price
exit_price
exit_timestamp
exit_reason
highest_price
maximum_floating_return
theoretical_stop_threshold
actual_stop_or_exit_price
realized_return
evaluation_status
calculation_version
evidence
```

---

# 19. Evaluation Algorithm Direction

Conceptual:

```text
highestPrice = entryPrice
initialThreshold = entryPrice * (1 - initialStopPct)
currentThreshold = initialThreshold

for candle chronological:

    evaluate movement using configured ambiguity policy

    update highestPrice when a new valid peak is reached

    trailingThreshold =
        highestPrice * (1 - trailingStopPct)

    currentThreshold =
        max(initialThreshold, trailingThreshold)

    if actual chronological market movement
       reaches/passes currentThreshold:

        determine actual valid exit price
        using price fraction + gap policy

        close position
        stop processing later candles

if no stop until market end:
    exit using official close
```

Implementation detail harus mengikuti acceptance tests, bukan hanya pseudocode ini.

---

# 20. Exit Reason

Enum minimal:

```text
INITIAL_CL
TRAILING_STOP
MARKET_CLOSE
MANUAL_OVERRIDE
```

Evaluation status terpisah dari exit reason.

---

# 21. Evaluation Status

```text
PENDING
PENDING_DATA
PROCESSING
COMPLETED
REVIEW_REQUIRED
OVERRIDDEN
```

Jangan menandai COMPLETED jika data belum cukup.

---

# 22. Market Close Rule

Jika posisi belum closed oleh initial CL/trailing stop sampai akhir sesi:

```text
exit_reason = MARKET_CLOSE
exit_price = official close
```

Return:

```text
(exit_price - entry_price)
/
entry_price
× 100
```

---

# 23. Points Engine

Trade evaluation dan tournament scoring harus terpisah.

```text
Trade Evaluation
↓
Realized Return
↓
Points Engine
↓
Points
```

Default simplest rule dapat:

```text
points = realized_return_percentage
```

Tetapi formula harus dirancang agar dapat diganti tanpa mengubah evaluation calculation.

Simpan:

```text
points_rule_version
```

---

# 24. Daily Result

Daily result minimal menampilkan:

```text
Participant
Stock
Entry
Peak
Exit
Exit Time
Exit Reason
Maximum Floating Return
Realized Return
Points
Evaluation Status
```

---

# 25. Leaderboard

Overall leaderboard minimal:

```text
Rank
Participant
Total Points
Total Picks
Win Count
Loss Count
Average Return
Best Result
Worst Result
```

Rank dihitung dari result.

Jangan menyimpan static rank jika dapat dihitung dari authoritative point data.

Tie-breaker harus menjadi explicit tournament rule jika diperlukan.

---

# 26. Evaluation Evidence

Setiap completed evaluation harus dapat dijelaskan.

Simpan minimal:

```text
market_data_provider
market_data_date
entry_price
entry_timestamp
peak_price
theoretical_threshold
actual_exit_price
exit_timestamp
exit_reason
realized_return
calculation_version
price_fraction_rule_version
points_rule_version
relevant_evidence
```

Tujuan:

Admin dapat menjawab:

> Mengapa pick ini memperoleh +5%?

---

# 27. Manual Review & Override

Jika:
- data hilang;
- provider error;
- candle invalid;
- suspension;
- ambiguity material;
- unusual market condition;

jangan membuat hasil palsu.

Gunakan:

```text
REVIEW_REQUIRED
```

Override harus menyimpan:

```text
original_evaluation
override_exit_price
override_return
override_points
reason
admin_user_id
timestamp
```

Original tidak boleh dihapus.

---

# 28. Functional Requirements

## Tournament
- CRUD tournament.
- Activate/close tournament.
- Configure rules.
- Validate date period.

## Participant
- CRUD participant.
- Add/remove participant from tournament.

## Picks
- Create/update pick sebelum locked/finalized.
- Enforce duplicate constraint berdasarkan tournament rule.
- Validate stock.
- Store entry source.

## Market Data
- Provider abstraction.
- Fetch unique symbols.
- Persist historical candles.
- Retry failure.
- Track sync run.

## Evaluation
- Deterministic.
- CL.
- Trailing stop.
- Tick/fraction.
- Gap.
- Candle ambiguity.
- Market close.
- Evidence.
- Calculation version.

## Points
- Calculate points.
- Version formula.

## Results
- Daily result.
- Overall leaderboard.

## Admin Operations
- Sync monitoring.
- Retry.
- Review.
- Override.
- Audit trail.

---

# 29. MVP Scope

Included:

1. Admin Authentication
2. Tournament Management
3. Tournament Rules
4. Participant Management
5. Stock Master
6. Pick Management
7. Provider Adapter
8. Intraday Historical Fetch
9. Market Data Storage
10. Sync Engine
11. Initial CL Engine
12. Trailing Stop Engine
13. Price Fraction Policy
14. Gap Policy
15. Candle Ambiguity Policy
16. Market Close Exit
17. Evaluation Evidence
18. Points Engine
19. Daily Results
20. Leaderboard
21. Evaluation Status
22. Manual Review/Override
23. Sync Monitoring
24. Responsive Admin UI
25. Automated Tests
26. `run.sh` + `run.bat`

---

# 30. Out of Scope MVP

- real broker execution;
- realtime price streaming;
- robo trading;
- portfolio management;
- investment recommendation;
- AI judging;
- ML prediction;
- microservices;
- multi-tenant SaaS;
- payment;
- advanced social features.

---

# 31. Future Scope

- participant login;
- participant self-submit pick;
- automatic submission deadline;
- public leaderboard;
- export Excel/PDF;
- notifications;
- tournament seasons;
- participant analytics;
- shareable result card;
- badges;
- AI-generated tournament recap;
- multi-community SaaS;
- tick/trade-data evaluation.

---

# 32. Suggested Backend Modules

```text
AuthModule
UsersModule
TournamentsModule
ParticipantsModule
StocksModule
PicksModule
MarketDataModule
ProvidersModule
SyncModule
EvaluationModule
PriceFractionModule
PointsModule
ResultsModule
LeaderboardModule
AuditModule
AdminModule
```

Keep within one NestJS modular monolith.

---

# 33. Suggested Frontend Features

```text
features/
├── auth/
├── dashboard/
├── tournaments/
├── participants/
├── picks/
├── results/
├── leaderboard/
├── evaluations/
└── admin-sync/
```

Responsive behavior wajib dipikirkan per feature.

---

# 34. Data Model Direction

Entities/tables minimal:

```text
users
refresh_tokens

tournaments
tournament_rules

participants
tournament_participants

stocks
stock_picks

market_data_providers
intraday_candles

market_sync_runs
market_sync_items

trade_evaluations
trade_evaluation_evidence

points_results
daily_results or derived result view

evaluation_overrides
audit_logs
```

Suggested uniqueness:
- participant + tournament membership unique;
- candle unique by provider/symbol/timestamp/interval or canonical strategy;
- one active evaluation per pick + calculation version;
- one point result per evaluation + points rule version;
- pick uniqueness based on tournament rule.

Use migrations.

---

# 35. Historical Data Integrity

Do not silently overwrite historical result.

If calculation rules change:
- increment `calculation_version`;
- preserve prior evaluation where required;
- document migration/recalculation policy.

Historical market data should preserve provider/source metadata.

---

# 36. API Convention

REST JSON:

```text
/api/v1
```

Examples:

```text
POST   /auth/login

GET    /tournaments
POST   /tournaments
GET    /tournaments/:id

GET    /tournaments/:id/participants
POST   /tournaments/:id/participants

GET    /picks
POST   /picks

POST   /market-sync/runs
GET    /market-sync/runs/:id

GET    /evaluations
GET    /evaluations/:id
POST   /evaluations/:id/retry
POST   /evaluations/:id/override

GET    /results/daily
GET    /leaderboards/:tournamentId
```

Use DTO validation and consistent error schema.

---

# 37. Authentication & Authorization

MVP:
- admin email/username + password;
- password hashing;
- JWT access token;
- refresh token rotation or secure session equivalent;
- logout/revocation.

Authorization enforced backend.

Frontend route guard hanya UX, bukan security boundary.

---

# 38. Background Jobs

Queues:

```text
market-data-sync
evaluate-picks
calculate-points
```

Job requirements:
- idempotent;
- retry with backoff;
- structured logging;
- no duplicate final result;
- per-item failure tracking.

Do not process heavy batch work synchronously inside HTTP request if job queue is more appropriate.

---

# 39. Scheduler

Scheduler hanya memicu orchestration.

Example:

```text
Market Close + configured delay
↓
enqueue daily evaluation pipeline
```

Jadwal harus configurable.

Admin juga dapat manual trigger/retry.

---

# 40. Error Handling

External provider failure:
- mark PENDING_DATA or REVIEW_REQUIRED;
- log error;
- retry;
- never fabricate candle/result.

Validation failure:
- reject with useful API error.

Evaluation ambiguity:
- follow configured deterministic policy;
- if still unsafe, REVIEW_REQUIRED.

---

# 41. Security

- no API keys hardcoded;
- `.env` not committed;
- `.env.example` contains placeholders only;
- secrets never exposed to frontend;
- password hash;
- authorization in backend;
- request validation;
- rate limit auth endpoints if appropriate;
- sanitize logs;
- do not log tokens/API keys;
- audit admin override.

---

# 42. Logging & Observability

Use structured logging.

Important metadata:
- tournament_id;
- trading_date;
- stock_symbol;
- pick_id;
- sync_run_id;
- evaluation_id;
- provider;
- calculation_version.

Provide health endpoint.

---

# 43. Testing Strategy

Critical unit tests:

## Price Fraction
- threshold exactly valid;
- threshold between valid ticks;
- lower level produces >3% drawdown;
- boundary changes.

## Initial CL
- exact -3%;
- actual exit >3% loss because valid level;
- no CL.

## Trailing Stop
- rising peak;
- static trailing percentage;
- stop only moves upward;
- exit after pullback;
- no exit before minimum -3%.

## Candle Ambiguity
- same candle high/low scenario;
- configured policy behavior.

## Gap
- threshold skipped;
- actual exit level.

## Market Close
- no stop;
- official close result.

## Evaluation
- later candle ignored after exit;
- chronological ordering;
- duplicate/re-run deterministic.

## Sync
- duplicate fetch safe;
- retry;
- partial provider failure.

## Points
- correct conversion;
- versioned formula.

## Auth
- login;
- invalid credentials;
- protected endpoint.

Integration/E2E:
- admin creates tournament;
- participant + pick;
- market data available;
- evaluation runs;
- points generated;
- leaderboard updated.

---

# 44. Seed / Development Fixtures

Provide development seed:
- admin user;
- sample tournament;
- participants;
- stocks;
- deterministic candle scenarios.

Fixtures are allowed in test/dev only.

Never route production result through fake market data.

---

# 45. Documentation

Required:

```text
README.md
prd.md
docs/progress.md
docs/architecture/
docs/decisions/
```

README:
- prerequisites;
- environment setup;
- Docker setup;
- database migration;
- seed;
- `run.sh`;
- `run.bat`;
- tests;
- build.

---

# 46. Monorepo Structure

```text
TradeArena/
├── frontend/
├── backend/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── progress.md
├── prd.md
├── run.sh
├── run.bat
├── docker-compose.yml
├── README.md
├── .env.example
└── .gitignore
```

---

# 47. Launcher Requirement

Project wajib memiliki:

```text
run.sh
run.bat
```

## run.sh
Target:
- Linux;
- macOS;
- Git Bash.

## run.bat
Target:
- Windows.

Both:
1. dijalankan dari repository root;
2. menjalankan frontend dan backend sekaligus;
3. tidak membutuhkan dua terminal manual;
4. menampilkan output/log yang cukup untuk development;
5. tidak hardcode machine-specific absolute path;
6. menghentikan child processes dengan benar ketika launcher dihentikan;
7. usage didokumentasikan di README.

Redis/PostgreSQL dependency dapat dijalankan melalui Docker Compose sesuai setup project.

---

# 48. Development Milestones

## M0 — Project Bootstrap

### Objective
Membuat foundation yang bisa dijalankan.

### Scope
- monorepo;
- Next.js frontend;
- NestJS backend;
- PostgreSQL;
- Prisma;
- Redis;
- Docker Compose;
- env;
- lint/test/build;
- health endpoint;
- `run.sh`;
- `run.bat`;
- README;
- progress docs.

### Deliverables
Working development environment.

### Acceptance Criteria
- backend starts;
- frontend starts;
- DB connection works;
- Redis connection works if required;
- migration works;
- `./run.sh` runs FE+BE;
- `run.bat` runs FE+BE on Windows;
- stopping launcher stops child processes;
- lint/test/build baseline passes;
- README setup works.

---

## M1 — Authentication

### Objective
Secure admin access.

### Scope
- user schema;
- admin seed;
- password hashing;
- login;
- access/refresh token;
- backend guard;
- frontend login.

### Acceptance Criteria
- valid admin can login;
- invalid credential rejected;
- protected API inaccessible without auth;
- frontend session works;
- logout/revoke works;
- tests pass.

---

## M2 — Tournament Core

### Objective
Represent tournament and explicit business rules.

### Scope
- tournament CRUD;
- tournament rules;
- date/status;
- stop percentages;
- ambiguity;
- gap;
- price fraction;
- point rule;
- calculation rule version direction.

### Acceptance Criteria
- admin can create/edit tournament;
- required rules validated;
- default BSJP -3% CL/TS supported;
- frontend can manage tournament;
- tests pass.

---

## M3 — Participants, Stocks & Picks

### Objective
Capture tournament inputs.

### Scope
- participant CRUD;
- tournament membership;
- stock master;
- stock pick;
- entry data;
- duplicate validation.

### Acceptance Criteria
- participant assigned tournament;
- valid stock pick can be created;
- invalid/duplicate pick rejected according to rule;
- daily pick list works;
- tests pass.

---

## M4 — Market Data Integration

### Objective
Obtain canonical intraday data.

### Scope
- provider interface;
- provider adapter;
- normalizer;
- candle schema;
- fetch by symbol/date;
- unique symbol strategy;
- sync run tracking;
- retry/error handling.

### Acceptance Criteria
- provider implementation returns normalized candle;
- duplicate candle prevented;
- unique symbols fetched once per date;
- provider failure visible;
- no fake result produced;
- tests with mocked provider HTTP responses pass.

Live provider verification may remain blocked only if valid credential/account is unavailable, but adapter and tests must be complete.

---

## M5 — Trade Evaluation Engine

### Objective
Implement tournament judging correctly.

### Scope
- chronological candle processing;
- initial CL;
- trailing stop;
- peak;
- threshold vs actual exit;
- price fraction;
- gap;
- ambiguity;
- market close;
- evidence;
- calculation version.

### Acceptance Criteria
- predefined scenarios produce expected result;
- trailing stop -3% minimum works;
- actual valid exit can result in drawdown >3%;
- no later candle processed after exit;
- market close fallback works;
- ambiguity policy deterministic;
- same input produces same output;
- critical unit tests pass.

This milestone is the most important business-logic milestone.

---

## M6 — Points & Results

### Objective
Convert evaluation into tournament result.

### Scope
- points engine;
- point version;
- daily result;
- stats aggregation.

### Acceptance Criteria
- completed evaluation creates correct point result;
- changing points formula does not require changing evaluation engine;
- daily result correct;
- tests pass.

---

## M7 — Leaderboard & Dashboard

### Objective
Give admin usable tournament overview.

### Scope
- overall leaderboard;
- daily leaderboard;
- admin dashboard;
- responsive UI;
- evaluation detail.

### Acceptance Criteria
- ranking derived from authoritative points;
- admin can inspect evidence;
- mobile and desktop usable;
- loading/error/empty states exist;
- critical frontend tests pass.

---

## M8 — Automation & Exception Handling

### Objective
Make post-market process mostly automatic.

### Scope
- scheduler;
- BullMQ jobs;
- daily orchestration;
- retry;
- PENDING_DATA;
- REVIEW_REQUIRED;
- manual override;
- audit.

### Acceptance Criteria
- daily pipeline can run without checking each pick manually;
- failures isolated;
- retry works;
- override requires reason;
- original result preserved;
- audit recorded.

---

## M9 — MVP Stabilization

### Objective
Prepare reliable MVP release.

### Scope
- end-to-end verification;
- security review;
- performance sanity;
- migration verification;
- docs;
- deployment;
- bug fixing.

### Acceptance Criteria
- lint passes;
- backend tests pass;
- frontend tests pass;
- E2E critical flow passes;
- backend production build passes;
- frontend production build passes;
- migrations run on clean DB;
- Docker deployment works;
- launcher docs work;
- no critical known calculation defect;
- MVP release criteria satisfied.

---

# 49. Execution Order

Strict default:

```text
M0
↓
M1
↓
M2
↓
M3
↓
M4
↓
M5
↓
M6
↓
M7
↓
M8
↓
M9
```

Do not skip a milestone unless repository evidence proves its Acceptance Criteria are already satisfied.

---

# 50. Definition of Done

A milestone is DONE only if:

1. required scope implemented;
2. schema/migration included;
3. API implemented where required;
4. frontend implemented where required;
5. validation exists;
6. error state handled;
7. tests relevant to milestone pass;
8. lint passes;
9. affected builds pass;
10. acceptance criteria verified;
11. docs/progress updated;
12. no known critical blocker hidden.

Creating folders/interfaces alone is not completion.

---

# 51. MVP Release Criteria

TradeArena MVP is releasable when:

- admin can login;
- tournament and rules can be configured;
- participants and picks can be managed;
- historical intraday data can be synchronized;
- evaluation engine correctly handles CL and trailing stop;
- -3% treated as minimum stop threshold;
- actual valid exit level determines actual result;
- market close fallback works;
- result calculation reproducible;
- points generated;
- daily result generated;
- overall leaderboard generated;
- exceptions visibly flagged;
- manual override audited;
- responsive admin UI usable;
- critical tests pass;
- production builds pass;
- clean DB migration works;
- documentation exists.

---

# 52. AI Coding Agent Rules

The Coding Agent must:

1. Read all `prd.md` before coding.
2. Inspect actual repository state.
3. Read README, docs, schema, migrations, env example, tests, dependencies, git status/diff where available.
4. Determine milestone completion from Acceptance Criteria, not filenames.
5. Work only on first incomplete milestone.
6. Complete milestone as a working vertical slice.
7. Do not skip milestone.
8. Do not implement Post-MVP while MVP incomplete.
9. Backend is source of truth.
10. Evaluation must be deterministic.
11. AI/LLM must never decide tournament result.
12. Provider integration must use adapter.
13. Evaluation engine must remain provider-agnostic.
14. Separate theoretical threshold from actual exit price.
15. Historical data/result must not silently change.
16. Store calculation version.
17. Manual override must preserve original result.
18. External API failure must never create fake result.
19. Use REVIEW_REQUIRED where result cannot safely be determined.
20. No production mock data.
21. Never hardcode API key/password/token.
22. Use migrations for schema changes.
23. Sync/background jobs must be idempotent.
24. Heavy batch processing should use jobs, not blocking HTTP.
25. Run relevant lint/test/build before declaring completion.
26. Never claim PASS if command was not run.
27. Do not disable tests to hide failure.
28. Do not suppress meaningful TypeScript errors.
29. Avoid unjustified `any`.
30. Do not introduce microservices/Kubernetes/extra databases without proven requirement.
31. Avoid large unrelated refactors.
32. Follow responsive mobile requirements.
33. Update `docs/progress.md` after milestone work.
34. Document architecture-changing decisions in `/docs/decisions`.
35. If credential/payment/licensing prevents live external verification, complete adapter/contracts/tests using HTTP mocks and explicitly document remaining blocker.
36. Do not invent provider responses.
37. Preserve working code.
38. Fix verification failures within current milestone before moving on.

---

# 53. Required Progress Documentation

`docs/progress.md` should contain for each milestone:

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

Status:

```text
Not Started
In Progress
Partial
Blocked
Completed
```

---

# 54. Agent Final Report Format

After work:

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
Backend Test:
Frontend Test:
Backend Build:
Frontend Build:
Migration:
E2E:

KNOWN LIMITATIONS:
- ...

BLOCKERS:
- ...

NEXT:
- ...
```

Use PASS/FAIL/NOT RUN truthfully.

---

# 55. Engineering Priority

When tradeoffs exist:

1. Fairness / Calculation Correctness
2. Data Integrity
3. Security
4. PRD Requirement
5. Reproducibility
6. Maintainability
7. MVP Scope Discipline
8. Development Speed
9. Performance Optimization

---

# 56. Final Product Principle

```text
DATA FIRST
    ↓
DETERMINISTIC EVALUATION
    ↓
AUDITABLE RESULT
    ↓
POINTS
    ↓
LEADERBOARD
```

TradeArena tidak dibangun untuk menjadi trading platform yang kompleks.

TradeArena dibangun agar tournament stock picking dapat dijalankan secara konsisten, transparan, dan jauh lebih efisien.

**Admin menangani exception, sistem menangani perhitungan rutin.**
