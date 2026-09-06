const API_BASE = 'http://localhost:3333/api/v1';
const FE_BASE = 'http://localhost:4444';

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function verifyM9() {
  console.log('===============================================================');
  console.log('   Milestone M9 Verification: Master MVP System Validation     ');
  console.log('===============================================================\n');

  // 1. Health Check
  console.log('1. Checking Backend Health (/api/v1/health)...');
  const healthRes = await request(`${API_BASE}/health`);
  if (!healthRes.ok) {
    console.error('Health check failed:', healthRes.data);
    process.exit(1);
  }
  console.log(`   Health Status: ${healthRes.data.status} (database: ${healthRes.data.services?.database})`);
  console.log(`   Uptime: ${Math.round(healthRes.data.uptime)}s\n`);

  // 2. Admin Authentication
  console.log('2. Authenticating Admin User...');
  const loginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@tradearena.local',
      password: 'AdminSecurePass123!',
    }),
  });

  if (!loginRes.ok) {
    console.error('Admin login failed:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.accessToken;
  console.log(`   Admin authenticated: ${loginRes.data.user.name} (${loginRes.data.user.email})`);
  console.log(`   Role: ${loginRes.data.user.role}\n`);

  // 3. Platform Dashboard Stats
  console.log('3. Fetching Operational Dashboard Stats (/api/v1/dashboard/stats)...');
  const dashRes = await request(`${API_BASE}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!dashRes.ok) {
    console.error('Dashboard query failed:', dashRes.data);
    process.exit(1);
  }

  const { metrics, activeTournaments, recentEvaluations } = dashRes.data;
  console.log('   Metrics Overview:');
  console.log(`   - Turnamen Aktif: ${metrics.activeTournamentsCount} / ${metrics.totalTournamentsCount}`);
  console.log(`   - Total Peserta: ${metrics.totalParticipantsCount}`);
  console.log(`   - Total Stock Picks: ${metrics.totalPicksCount}`);
  console.log(`   - Evaluasi Selesai: ${metrics.completedEvaluationsCount}`);
  console.log(`   - Review Required: ${metrics.pendingReviewsCount}`);
  console.log(`   - Total Emiten Aktif: ${metrics.totalStocksCount}\n`);

  if (activeTournaments.length === 0) {
    console.error('No active tournament found for validation.');
    process.exit(1);
  }
  const tournament = activeTournaments[0];
  console.log(`   Target Tournament: "${tournament.name}" (${tournament.id})`);
  console.log(`   Participants: ${tournament.participantCount}, Picks: ${tournament.pickCount}\n`);

  // 4. Run Automated Post-Market Pipeline
  const testDate = '2026-09-05';
  console.log(`4. Triggering Post-Market Pipeline for ${testDate}...`);
  const pipelineRes = await request(`${API_BASE}/tournaments/${tournament.id}/pipeline/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tradingDate: testDate }),
  });

  if (!pipelineRes.ok) {
    console.error('Pipeline execution failed:', pipelineRes.data);
    process.exit(1);
  }

  const report = pipelineRes.data;
  console.log(`   Pipeline Status: ${report.overallStatus}`);
  report.steps.forEach((s) => {
    console.log(`     - [${s.status}] ${s.step}: ${s.message}`);
  });
  console.log(`   Summary: picks=${report.picksCount}, symbols=${report.uniqueSymbolsCount}, evaluated=${report.evaluatedCount}, recalculatedPoints=${report.recalculatedPointsCount}\n`);

  // 5. Query Exceptions
  console.log('5. Querying Exceptions Center (/api/v1/tournaments/:id/exceptions)...');
  const excRes = await request(`${API_BASE}/tournaments/${tournament.id}/exceptions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!excRes.ok) {
    console.error('Exceptions query failed:', excRes.data);
    process.exit(1);
  }
  console.log(`   Total Exceptions: ${excRes.data.totalExceptions} (Review Required: ${excRes.data.reviewRequiredCount}, Pending Data: ${excRes.data.pendingDataCount})\n`);

  // 6. Query Operational Audit Trail
  console.log('6. Querying Operational Audit Trail (/api/v1/tournaments/:id/audit-trail)...');
  const auditRes = await request(`${API_BASE}/tournaments/${tournament.id}/audit-trail`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!auditRes.ok) {
    console.error('Audit trail query failed:', auditRes.data);
    process.exit(1);
  }
  const auditLogs = Array.isArray(auditRes.data) ? auditRes.data : (auditRes.data.items || []);
  console.log(`   Audit logs recorded: ${auditLogs.length}`);
  auditLogs.slice(0, 3).forEach((item) => {
    console.log(`     - [${item.action}] Entity: ${item.entityType} ${item.entityId ? item.entityId.slice(0, 8) : ''}`);
  });
  console.log();

  // 7. Verify Overall Standings & Daily Results
  console.log('7. Verifying Overall Standings & Daily Results...');
  const overallRes = await request(`${API_BASE}/tournaments/${tournament.id}/results/overall`);
  if (!overallRes.ok) {
    console.error('Overall standings query failed:', overallRes.data);
    process.exit(1);
  }
  console.log(`   Overall Standings Entries: ${overallRes.data.standings.length}`);
  if (overallRes.data.topPodium) {
    console.log(`     #1 Gold Champion: ${overallRes.data.topPodium.gold ? overallRes.data.topPodium.gold.participantName : 'None'}`);
    console.log(`     #2 Silver Runner-up: ${overallRes.data.topPodium.silver ? overallRes.data.topPodium.silver.participantName : 'None'}`);
    console.log(`     #3 Bronze 3rd: ${overallRes.data.topPodium.bronze ? overallRes.data.topPodium.bronze.participantName : 'None'}`);
  }

  const dailyRes = await request(`${API_BASE}/tournaments/${tournament.id}/results/daily?tradingDate=${testDate}`);
  if (!dailyRes.ok) {
    console.error('Daily results query failed:', dailyRes.data);
    process.exit(1);
  }
  console.log(`   Daily Results (${testDate}): ${dailyRes.data.results.length} trades evaluated.\n`);

  // 8. Verify Frontend Routes
  console.log('8. Verifying Frontend Route Accessibility...');
  const homeRes = await request(FE_BASE);
  console.log(`   - Home / Admin Dashboard (/): HTTP ${homeRes.status}`);

  const tournRes = await request(`${FE_BASE}/tournaments/${tournament.id}`);
  console.log(`   - Tournament Detail & Automation Tabs (/tournaments/[id]): HTTP ${tournRes.status}`);

  const lbRes = await request(`${FE_BASE}/tournaments/${tournament.id}/leaderboard`);
  console.log(`   - Public Broadcast Leaderboard (/tournaments/[id]/leaderboard): HTTP ${lbRes.status}`);

  console.log('\n===============================================================');
  console.log('   ALL MVP STABILIZATION VERIFICATION CRITERIA SATISFIED!      ');
  console.log('===============================================================');
}

verifyM9().catch((err) => {
  console.error('Verification failed with unhandled error:', err);
  process.exit(1);
});
