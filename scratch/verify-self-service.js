const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('--- 1. Login as Admin ---');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3333,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@tradearena.local', password: 'AdminSecurePass123!' }
  );

  console.log('Login status:', loginRes.status);
  const token = loginRes.data.accessToken;
  const adminUser = loginRes.data.user;
  console.log('User logged in:', adminUser.name, 'Role:', adminUser.role);

  console.log('\n--- 2. Get Tournaments ---');
  const tourneysRes = await request({
    hostname: 'localhost',
    port: 3333,
    path: '/api/v1/tournaments',
    method: 'GET',
  });
  console.log('Tournaments count:', tourneysRes.data.length);
  const activeTourney = tourneysRes.data[0];
  console.log('Selected tournament:', activeTourney.name, 'ID:', activeTourney.id);

  console.log('\n--- 3. Ensure User is Enrolled in Tournament ---');
  // First apply to tournament as this user
  const applyRes = await request(
    {
      hostname: 'localhost',
      port: 3333,
      path: `/api/v1/tournaments/${activeTourney.id}/apply`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
    {}
  );
  console.log('Apply response status:', applyRes.status, applyRes.data.message || applyRes.data.status);

  // If status is PENDING, as admin let's make sure it's APPROVED
  const statusRes = await request({
    hostname: 'localhost',
    port: 3333,
    path: `/api/v1/tournaments/${activeTourney.id}/my-status`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Current membership status:', statusRes.data.status);

  if (statusRes.data.status === 'PENDING') {
    console.log('Approving membership as admin...');
    const applicantsRes = await request({
      hostname: 'localhost',
      port: 3333,
      path: `/api/v1/tournaments/${activeTourney.id}/applicants?status=PENDING`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const myApp = applicantsRes.data.find((a) => a.participant?.email === adminUser.email);
    if (myApp) {
      await request(
        {
          hostname: 'localhost',
          port: 3333,
          path: `/api/v1/tournaments/${activeTourney.id}/applicants/${myApp.participant.id}/review`,
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        { status: 'APPROVED' }
      );
      console.log('Approved successfully!');
    }
  }

  console.log('\n--- 4. Test GET /tournaments/:id/my-pick ---');
  const myPickStatus = await request({
    hostname: 'localhost',
    port: 3333,
    path: `/api/v1/tournaments/${activeTourney.id}/my-pick`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('My pick status HTTP:', myPickStatus.status);
  console.log('Enrolled:', myPickStatus.data.enrolled, 'IsApproved:', myPickStatus.data.isApproved);
  console.log('Lock status:', myPickStatus.data.isLocked, 'Lock Cutoff:', myPickStatus.data.lockCutoff);
  console.log('Existing Pick:', myPickStatus.data.pick ? myPickStatus.data.pick.stock.symbol : 'None');

  console.log('\n--- 5. Get Stocks List ---');
  const stocksRes = await request({
    hostname: 'localhost',
    port: 3333,
    path: '/api/v1/stocks',
    method: 'GET',
  });
  const stock = stocksRes.data[0];
  console.log('Selected stock for pick:', stock.symbol, stock.name, 'ID:', stock.id);

  console.log('\n--- 6. Test POST /tournaments/:id/my-pick (Submit Pick) ---');
  const submitRes = await request(
    {
      hostname: 'localhost',
      port: 3333,
      path: `/api/v1/tournaments/${activeTourney.id}/my-pick`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
    {
      stockId: stock.id,
      tradingDate: activeTourney.startDate.substring(0, 10),
      entryPrice: 9150,
    }
  );
  console.log('Submit pick HTTP:', submitRes.status);
  if (submitRes.status === 201 || submitRes.status === 200) {
    console.log('Pick successfully submitted/updated!');
    console.log('Pick ID:', submitRes.data.id, 'Stock:', submitRes.data.stock?.symbol);
  } else {
    console.log('Submit pick error:', submitRes.data);
  }

  console.log('\n--- 7. Test GET /my-tournaments/picks-overview ---');
  const overviewRes = await request({
    hostname: 'localhost',
    port: 3333,
    path: '/api/v1/my-tournaments/picks-overview',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Overview HTTP:', overviewRes.status);
  console.log('Active tournaments count:', overviewRes.data.length);
  if (overviewRes.data.length > 0) {
    console.log('First tournament overview:', {
      name: overviewRes.data[0].tournamentName,
      todayPick: overviewRes.data[0].todayPick ? overviewRes.data[0].todayPick.stock?.symbol : 'None',
      isLocked: overviewRes.data[0].isLocked,
    });
  }

  console.log('\n--- VERIFICATION FINISHED SUCCESSFULLY ---');
}

main().catch(console.error);
