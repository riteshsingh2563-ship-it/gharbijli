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

  try {
    // 1. Health check
    if (pathname === '/api/health') {
      sendJson(res, 200, {
        status: 'UP',
        service: 'GharBijli Bhilai Backend Engine',
        version: '2.0.0',
        city: 'Bhilai, Chhattisgarh',
        timestamp: new Date().toISOString(),
        totalBookings: store.data.bookings.length,
        techniciansActive: store.data.technicians.filter(t => t.active).length,
        totalServices: store.data.services.length
      });
      return true;
    }

    // 2. Dynamic App Config & Server-Driven UI (100% Backend-Controlled)
    if (pathname === '/api/app-config' && method === 'GET') {
      const config = store.getAppConfig();
      sendJson(res, 200, { success: true, config });
      return true;
    }

    // 3. Admin: Update App Config, Banners, Promos, Hero
    if (pathname === '/api/admin/app-config' && (method === 'PATCH' || method === 'POST')) {
      const body = await parseJsonBody(req);
      const updated = store.updateAppConfig(body);
      sendJson(res, 200, { success: true, config: updated });
      return true;
    }

    // 4. Services Catalog: List
    if (pathname === '/api/services' && method === 'GET') {
      const all = query.all === 'true' || query.all === '1';
      const services = store.getServices(all);
      sendJson(res, 200, { success: true, count: services.length, services });
      return true;
    }

    // 5. Admin: Create New Service
    if (pathname === '/api/admin/services' && method === 'POST') {
      const body = await parseJsonBody(req);
      try {
        const added = store.addService(body);
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
          const updated = store.updateService(serviceId, body);
          sendJson(res, 200, { success: true, service: updated });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return true;
      }
      if (method === 'DELETE') {
        try {
          const removed = store.deleteService(serviceId);
          sendJson(res, 200, { success: true, message: 'Service removed', service: removed });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return true;
      }
    }

    // 7. Categories: List
    if (pathname === '/api/categories' && method === 'GET') {
      const categories = store.getCategories();
      sendJson(res, 200, { success: true, count: categories.length, categories });
      return true;
    }

    // 8. Admin: Update Category (/api/admin/categories/:id)
    const adminCatMatch = pathname.match(/^\/api\/admin\/categories\/([A-Za-z0-9_-]+)$/);
    if (adminCatMatch && (method === 'PATCH' || method === 'POST')) {
      const catId = adminCatMatch[1];
      const body = await parseJsonBody(req);
      try {
        const updated = store.updateCategory(catId, body);
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

    // 11. Auth: Update User Profile
    if (pathname === '/api/auth/profile' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.uid) {
        sendJson(res, 400, { error: 'User uid is required' });
        return true;
      }
      const updated = store.updateUser(body.uid, {
        displayName: body.displayName,
        defaultAddress: body.defaultAddress
      });
      sendJson(res, 200, { success: true, user: updated });
      return true;
    }

    // 12. Technicians Directory
    if (pathname === '/api/technicians' && method === 'GET') {
      sendJson(res, 200, {
        success: true,
        count: store.data.technicians.length,
        technicians: store.getTechnicians()
      });
      return true;
    }

    // 13. Admin: Update Technician (/api/admin/technicians/:id)
    const adminTechMatch = pathname.match(/^\/api\/admin\/technicians\/([A-Za-z0-9_-]+)$/);
    if (adminTechMatch && (method === 'PATCH' || method === 'POST')) {
      const techId = adminTechMatch[1];
      const body = await parseJsonBody(req);
      try {
        const updated = store.updateTechnician(techId, body);
        sendJson(res, 200, { success: true, technician: updated });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // 14. Bookings: List
    if (pathname === '/api/bookings' && method === 'GET') {
      const bookings = store.getBookings({
        customerUid: query.customerUid,
        customerPhone: query.customerPhone,
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
      const booking = store.createBooking(body);
      sendJson(res, 201, { success: true, booking });
      return true;
    }

    // 16. Admin: Overview KPI Stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const stats = store.getAdminStats();
      sendJson(res, 200, { success: true, stats });
      return true;
    }

    // 17. Admin: All Bookings Feed
    if (pathname === '/api/admin/bookings' && method === 'GET') {
      sendJson(res, 200, {
        success: true,
        count: store.data.bookings.length,
        bookings: store.data.bookings
      });
      return true;
    }

    // 18. Admin: All Emergencies
    if (pathname === '/api/admin/emergencies' && method === 'GET') {
      sendJson(res, 200, {
        success: true,
        count: store.data.emergencyTickets.length,
        emergencies: store.data.emergencyTickets
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
        const booking = store.getBookingById(bookingId);
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
          const assigned = store.assignTechnician(bookingId, body.technicianId);
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
          const cancelled = store.cancelBooking(bookingId, body.reason, body.customerUid);
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
        const updated = store.updateBookingStatus(
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
          const reviewed = store.submitReview(bookingId, body.rating, body.feedback);
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
      const ticket = store.createEmergencyTicket(body);
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
