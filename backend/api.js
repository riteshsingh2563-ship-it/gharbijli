/**
 * GharBijli Backend API Request Handler (Bhilai, Chhattisgarh)
 * Compatible with Node http.Server, Express, and Vercel serverless functions.
 */

const url = require('url');
const store = require('./store');

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
  });
  res.end(JSON.stringify(data));
}

async function handleApiRequest(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    res.end();
    return true;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  // Only handle /api paths
  if (!pathname.startsWith('/api')) {
    return false;
  }

  // Ensure database sync from MongoDB Atlas is fully hydrated
  await store.ensureInitialized();

  try {
    // 1. Health check
    if (pathname === '/api/health') {
      const stats = await store.getAdminStats();
      const services = await store.getServices(true);
      const techs = await store.getTechnicians();
      sendJson(res, 200, {
        status: 'UP',
        service: 'GharBijli Bhilai Backend Engine',
        version: '2.0.0',
        city: 'Bhilai, Chhattisgarh',
        database: 'MongoDB Atlas (Cluster: ghar-bijli)',
        timestamp: new Date().toISOString(),
        totalBookings: stats.totalBookings,
        techniciansActive: techs.filter(t => t.active).length,
        totalServices: services.length
      });
      return true;
    }

    // MongoDB Atlas Live Diagnostic
    if (pathname === '/api/test-mongo') {
      try {
        const { MongoClient } = require('mongodb');
        const uri = process.env.MONGODB_URI || 'mongodb+srv://riteshsingh2563_db_user:L2WIPeTUl44lzfvp@ghar-bijli.xmuka3y.mongodb.net/gharbijli?retryWrites=true&w=majority';
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 6000 });
        await client.connect();
        const d = client.db('gharbijli');
        const colls = await d.listCollections().toArray();
        await client.close();
        sendJson(res, 200, { success: true, collections: colls.map(c => c.name) });
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
      return true;
    }

    // Admin Login / Auth Lock Gate
    if (pathname === '/api/admin/auth' && method === 'POST') {
      const body = await parseJsonBody(req);
      const password = (body.password || body.pin || '').trim();
      if (password === 'gharbijli@2026' || password === '2026' || password === 'admin') {
        sendJson(res, 200, { success: true, token: 'gb_adm_' + Date.now(), message: 'Admin authenticated' });
      } else {
        sendJson(res, 401, { error: 'Invalid Admin Password / Security PIN' });
      }
      return true;
    }

    // 2. Dynamic App Config & Server-Driven UI (100% Backend-Controlled)
    if (pathname === '/api/app-config' && method === 'GET') {
      const config = await store.getAppConfig();
      sendJson(res, 200, { success: true, config });
      return true;
    }

    // 3. Admin: Update App Config, Banners, Promos, Hero
    if (pathname === '/api/admin/app-config' && (method === 'PATCH' || method === 'POST')) {
      const body = await parseJsonBody(req);
      const updated = await store.updateAppConfig(body);
      sendJson(res, 200, { success: true, config: updated });
      return true;
    }

    // 4. Services Catalog: List
    if (pathname === '/api/services' && method === 'GET') {
      const all = query.all === 'true' || query.all === '1';
      const services = await store.getServices(all);
      sendJson(res, 200, { success: true, count: services.length, services });
      return true;
    }

    // 5. Admin: Create New Service
    if (pathname === '/api/admin/services' && method === 'POST') {
      const body = await parseJsonBody(req);
      try {
        const added = await store.addService(body);
        sendJson(res, 201, { success: true, service: added });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // 6. Admin: Update Specific Service (/api/admin/services/:id)
    const adminServiceMatch = pathname.match(/^\/api\/admin\/services\/([A-Za-z0-9_-]+)$/);
    if (adminServiceMatch) {
      const serviceId = adminServiceMatch[1];
      if (method === 'PATCH' || method === 'POST' || method === 'PUT') {
        const body = await parseJsonBody(req);
        try {
          const updated = await store.updateService(serviceId, body);
          sendJson(res, 200, { success: true, service: updated });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return true;
      }
      if (method === 'DELETE') {
        try {
          const removed = await store.deleteService(serviceId);
          sendJson(res, 200, { success: true, message: 'Service removed', service: removed });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return true;
      }
    }

    // 7. Categories: List
    if (pathname === '/api/categories' && method === 'GET') {
      const categories = await store.getCategories();
      sendJson(res, 200, { success: true, count: categories.length, categories });
      return true;
    }

    // 8. Admin: Update Category (/api/admin/categories/:id)
    const adminCatMatch = pathname.match(/^\/api\/admin\/categories\/([A-Za-z0-9_-]+)$/);
    if (adminCatMatch && (method === 'PATCH' || method === 'POST')) {
      const catId = adminCatMatch[1];
      const body = await parseJsonBody(req);
      try {
        const updated = await store.updateCategory(catId, body);
        sendJson(res, 200, { success: true, category: updated });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // 9. Auth: Send OTP
    if (pathname === '/api/auth/send-otp' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.phone) {
        sendJson(res, 400, { error: 'Phone number is required' });
        return true;
      }
      const result = store.sendOtp(body.phone);
      sendJson(res, 200, result);
      return true;
    }

    // 10. Auth: Verify OTP
    if (pathname === '/api/auth/verify-otp' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.phone || !body.code) {
        sendJson(res, 400, { error: 'Both phone and code are required' });
        return true;
      }
      const user = store.verifyOtp(body.phone, body.code);
      sendJson(res, 200, { success: true, user });
      return true;
    }

    // 11. Auth: User Profile (GET & POST)
    if (pathname === '/api/auth/profile' && method === 'GET') {
      const uid = query.uid;
      const email = query.email;
      let user = null;
      if (uid) {
        user = await store.getUser(uid);
      }
      if (!user && email) {
        user = await store.getUserByEmail(email);
      }
      sendJson(res, 200, { success: true, user: user || null });
      return true;
    }
    if (pathname === '/api/auth/profile' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.uid) {
        sendJson(res, 400, { error: 'User uid is required' });
        return true;
      }
      const profileUpdates = {
        profileCompleted: true
      };
      if (body.displayName) profileUpdates.displayName = body.displayName;
      if (body.name) profileUpdates.displayName = body.name;
      if (body.email) profileUpdates.email = body.email;
      if (body.phoneNumber) profileUpdates.phoneNumber = body.phoneNumber;
      if (body.phone) profileUpdates.phoneNumber = body.phone;
      if (body.address) {
        profileUpdates.address = body.address;
        profileUpdates.defaultAddress = body.address;
      }
      if (body.defaultAddress) profileUpdates.defaultAddress = body.defaultAddress;

      const updated = await store.updateUser(body.uid, profileUpdates);
      sendJson(res, 200, { success: true, user: updated });
      return true;
    }

    // 11b. Auth: Google One-Tap / Google Sign-In (Direct MongoDB Atlas Sync)
    if (pathname === '/api/auth/google' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.email) {
        sendJson(res, 400, { error: 'Email is required for Google Sign-In' });
        return true;
      }
      try {
        const user = await store.upsertGoogleUser({
          email: body.email,
          name: body.name || body.displayName,
          picture: body.picture || body.photoURL,
          sub: body.sub || body.googleId
        });
        sendJson(res, 200, { success: true, user });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // 11d. Auth: Create Mobile Login Bridge Session
    if (pathname === '/api/auth/session/create' && (method === 'GET' || method === 'POST')) {
      const sessionId = await store.createAuthSession();
      sendJson(res, 200, { success: true, sessionId });
      return true;
    }

    // 11e. Auth: Save Mobile Login Bridge Session
    if (pathname === '/api/auth/session/save' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.sessionId || !body.user) {
        sendJson(res, 400, { error: 'sessionId and user are required' });
        return true;
      }
      await store.saveAuthSession(body.sessionId, body.user);
      try {
        await store.upsertGoogleUser({
          email: body.user.email,
          name: body.user.displayName,
          picture: body.user.photoURL,
          sub: body.user.uid
        });
      } catch (e) {}
      sendJson(res, 200, { success: true });
      return true;
    }

    // 11f. Auth: Check Mobile Login Bridge Session
    if (pathname === '/api/auth/session/check' && method === 'GET') {
      const parsedUrl = url.parse(req.url, true);
      const sessionId = parsedUrl.query.id || parsedUrl.query.sessionId;
      if (!sessionId) {
        sendJson(res, 400, { error: 'Session ID is required' });
        return true;
      }
      const status = await store.checkAuthSession(sessionId);
      sendJson(res, 200, { success: true, ...status });
      return true;
    }

    // 11c. Auth: Direct Phone Login (Zero OTP hassle, stored directly in MongoDB Atlas)
    if (pathname === '/api/auth/phone-direct' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.phone) {
        sendJson(res, 400, { error: 'Phone number is required' });
        return true;
      }
      try {
        const user = await store.upsertPhoneDirect({
          phone: body.phone,
          name: body.name,
          address: body.address
        });
        sendJson(res, 200, { success: true, user });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // 11d. Admin: List Registered Users / Customers
    if (pathname === '/api/admin/users' && method === 'GET') {
      const users = await store.getAllUsers();
      sendJson(res, 200, { success: true, total: users.length, users });
      return true;
    }

    // 12. Technicians Directory
    if (pathname === '/api/technicians' && method === 'GET') {
      const technicians = await store.getTechnicians();
      sendJson(res, 200, {
        success: true,
        count: technicians.length,
        technicians: technicians
      });
      return true;
    }

    // 13. Admin: Add New Technician
    if (pathname === '/api/admin/technicians' && method === 'POST') {
      const body = await parseJsonBody(req);
      try {
        const created = await store.addTechnician(body);
        sendJson(res, 201, { success: true, technician: created });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // 13b. Admin: Update or Delete Technician (/api/admin/technicians/:id)
    const adminTechMatch = pathname.match(/^\/api\/admin\/technicians\/([A-Za-z0-9_-]+)$/);
    if (adminTechMatch && (method === 'PATCH' || method === 'POST')) {
      const techId = adminTechMatch[1];
      const body = await parseJsonBody(req);
      try {
        const updated = await store.updateTechnician(techId, body);
        sendJson(res, 200, { success: true, technician: updated });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    if (adminTechMatch && method === 'DELETE') {
      const techId = adminTechMatch[1];
      try {
        const deleted = await store.deleteTechnician(techId);
        sendJson(res, 200, { success: true, technician: deleted });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // 14. Bookings: List
    if (pathname === '/api/bookings' && method === 'GET') {
      const bookings = await store.getBookings({
        customerUid: query.customerUid,
        customerPhone: query.customerPhone,
        customerEmail: query.customerEmail,
        bookingStatus: query.status
      });
      sendJson(res, 200, { success: true, count: bookings.length, bookings });
      return true;
    }

    // 15. Bookings: Create New
    if (pathname === '/api/bookings' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.serviceId) {
        sendJson(res, 400, { error: 'Service ID is required' });
        return true;
      }
      const booking = await store.createBooking(body);
      sendJson(res, 201, { success: true, booking });
      return true;
    }

    // 16. Admin: Overview KPI Stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const stats = await store.getAdminStats();
      sendJson(res, 200, { success: true, stats });
      return true;
    }

    // 17. Admin: All Bookings Feed
    if (pathname === '/api/admin/bookings' && method === 'GET') {
      const bookings = await store.getBookings({});
      sendJson(res, 200, {
        success: true,
        count: bookings.length,
        bookings: bookings
      });
      return true;
    }

    // 18. Admin: All Emergencies
    if (pathname === '/api/admin/emergencies' && method === 'GET') {
      const emergencies = store.getEmergencyTickets ? await store.getEmergencyTickets() : (store.data.emergencyTickets || []);
      sendJson(res, 200, {
        success: true,
        count: emergencies.length,
        emergencies: emergencies
      });
      return true;
    }

    // 19. Admin: Reset Demo Data
    if (pathname === '/api/admin/reset-demo' && method === 'POST') {
      store.seedDemoData();
      sendJson(res, 200, { success: true, message: 'Demo data reset successfully' });
      return true;
    }

    // 20. Bookings: Specific Booking Route (/api/bookings/:id)
    const bookingMatch = pathname.match(/^\/api\/bookings\/([A-Za-z0-9_-]+)(?:\/(cancel|status|review|assign))?$/);
    if (bookingMatch) {
      const bookingId = bookingMatch[1];
      const subAction = bookingMatch[2];

      // GET /api/bookings/:id
      if (!subAction && method === 'GET') {
        const booking = await store.getBookingById(bookingId);
        if (!booking) {
          sendJson(res, 404, { error: 'Booking not found' });
          return true;
        }
        sendJson(res, 200, { success: true, booking });
        return true;
      }

      // POST /api/bookings/:id/assign
      if (subAction === 'assign' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.technicianId) {
          sendJson(res, 400, { error: 'technicianId is required' });
          return true;
        }
        try {
          const assigned = await store.assignTechnician(bookingId, body.technicianId);
          sendJson(res, 200, { success: true, booking: assigned });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return true;
      }

      // PATCH or POST /api/bookings/:id/cancel
      if (subAction === 'cancel' && (method === 'PATCH' || method === 'POST')) {
        const body = await parseJsonBody(req);
        try {
          const cancelled = await store.cancelBooking(bookingId, body.reason, body.customerUid);
          sendJson(res, 200, { success: true, booking: cancelled });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return true;
      }

      // PATCH or POST /api/bookings/:id/status
      if (subAction === 'status' && (method === 'PATCH' || method === 'POST')) {
        const body = await parseJsonBody(req);
        if (!body.status) {
          sendJson(res, 400, { error: 'Status is required' });
          return true;
        }
        const updated = await store.updateBookingStatus(
          bookingId,
          body.status,
          body.note || '',
          body.extraFields || {}
        );
        if (!updated) {
          sendJson(res, 404, { error: 'Booking not found' });
          return true;
        }
        sendJson(res, 200, { success: true, booking: updated });
        return true;
      }

      // POST /api/bookings/:id/review
      if (subAction === 'review' && method === 'POST') {
        const body = await parseJsonBody(req);
        try {
          const reviewed = await store.submitReview(bookingId, body.rating, body.feedback);
          sendJson(res, 200, { success: true, booking: reviewed });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return true;
      }
    }

    // 21. Emergency SOS (Bhilai)
    if (pathname === '/api/emergency' && method === 'POST') {
      const body = await parseJsonBody(req);
      const ticket = await store.createEmergencyTicket(body);
      sendJson(res, 201, {
        success: true,
        message: 'Emergency Bhilai Electrician dispatched on high-priority SLA',
        ticket
      });
      return true;
    }

    // Unmatched API endpoint
    sendJson(res, 404, { error: `Endpoint not found: ${pathname}` });
    return true;

  } catch (err) {
    console.error(`[API Error] ${pathname}:`, err);
    sendJson(res, 500, { error: 'Internal Server Error: ' + err.message });
    return true;
  }
}

module.exports = {
  handleApiRequest
};
