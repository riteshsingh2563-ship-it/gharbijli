const http = require('http');
const https = require('https');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== GHARBIJLI END-TO-END VERIFICATION SUITE ===\n');
  const baseUrl = 'http://localhost:3000';

  // 1. Health check
  console.log('1. Testing /api/health...');
  const health = await request(`${baseUrl}/api/health`);
  console.log('   Status:', health.status, '| Service:', health.data.service, '| DB:', health.data.database);
  if (health.status !== 200 || !health.data.database.includes('MongoDB')) throw new Error('Health check failed');

  // 2. MongoDB live diagnostic
  console.log('2. Testing /api/test-mongo...');
  const mongo = await request(`${baseUrl}/api/test-mongo`);
  console.log('   Status:', mongo.status, '| Collections:', mongo.data.collections.join(', '));
  if (!mongo.data.success || mongo.data.collections.length < 5) throw new Error('Mongo check failed');

  // 3. Admin PIN auth
  console.log('3. Testing /api/admin/auth with PIN 2026...');
  const auth = await request(`${baseUrl}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { pin: '2026' });
  console.log('   Status:', auth.status, '| Success:', auth.data.success);
  if (!auth.data.success) throw new Error('Admin auth failed');

  // 4. Fetch App Config (Bhilai localized)
  console.log('4. Testing /api/app-config...');
  const config = await request(`${baseUrl}/api/app-config`);
  console.log('   Area:', config.data.config.app.serviceArea, '| Default Locality:', config.data.config.defaultArea);
  if (!config.data.config.app.serviceArea.includes('Bhilai')) throw new Error('Localization check failed');

  // 5. Technicians list
  console.log('5. Testing /api/technicians...');
  const techs = await request(`${baseUrl}/api/technicians`);
  console.log('   Technicians count:', techs.data.count, '| Lead:', techs.data.technicians[0].name, '(' + techs.data.technicians[0].rating + ')');
  if (techs.data.count < 6) throw new Error('Technicians count unexpected');

  // 6. Direct Phone Auth
  console.log('6. Testing /api/auth/phone-direct...');
  const userRes = await request(`${baseUrl}/api/auth/phone-direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '9876543210', name: 'Ritesh Singh', address: 'Plot 42, Sector 6, Bhilai' });
  console.log('   User UID:', userRes.data.user.uid, '| Name:', userRes.data.user.displayName);
  if (!userRes.data.success) throw new Error('Phone auth failed');

  // 7. Booking Creation & Auto Dispatch Matching
  console.log('7. Testing /api/bookings (Create new booking in Bhilai Sector 6)...');
  const bookingRes = await request(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    customerUid: userRes.data.user.uid,
    customerName: 'Ritesh Singh',
    customerPhone: '+919876543210',
    serviceId: 'regular-fan-installation',
    address: 'House 14, Street 7, Sector 6, Bhilai',
    preferredArea: 'sector 6'
  });
  const b = bookingRes.data.booking;
  console.log('   Created Booking:', b.bookingId, '| Matched Electrician:', b.technicianName, '| Status:', b.bookingStatus);
  if (!bookingRes.data.success || !b.bookingId) throw new Error('Booking creation failed');

  // 8. Emergency SOS Dispatch
  console.log('8. Testing /api/emergency (SOS Electrical Dispatch)...');
  const sosRes = await request(`${baseUrl}/api/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Emergency Test',
    phone: '+919876543210',
    address: 'Nehru Nagar, Bhilai',
    area: 'nehru nagar',
    issueType: 'Sparks in main switchboard'
  });
  console.log('   Ticket:', sosRes.data.ticket.ticketId, '| Priority SLA:', sosRes.data.ticket.targetSlaMinutes + 'm', '| Assigned:', sosRes.data.ticket.dispatchedTechnician.name);
  if (!sosRes.data.success) throw new Error('SOS dispatch failed');

  console.log('\n>>> ALL 8 CORE SUITE TESTS PASSED 100%! <<<\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err.message);
  process.exit(1);
});
