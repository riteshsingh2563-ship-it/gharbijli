/**
 * GharBijli Backend API Request Handler
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
        service: 'GharBijli Patna Backend Engine',
        version: '1.2.0',
        timestamp: new Date().toISOString(),
        totalBookings: store.data.bookings.length,
        techniciansActive: store.data.technicians.filter(t => t.active).length
      });
      return true;
    }

    // 2. Auth: Send OTP
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

    // 3. Auth: Verify OTP
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

    // 4. Auth: Update User Profile
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

    // 5. Technicians Directory
    if (pathname === '/api/technicians' && method === 'GET') {
      sendJson(res, 200, {
        success: true,
        count: store.data.technicians.length,
        technicians: store.getTechnicians()
      });
      return true;
    }

    // 6. Bookings: List
    if (pathname === '/api/bookings' && method === 'GET') {
      const bookings = store.getBookings({
        customerUid: query.customerUid,
        customerPhone: query.customerPhone,
        bookingStatus: query.status
      });
      sendJson(res, 200, { success: true, count: bookings.length, bookings });
      return true;
    }

    // 7. Bookings: Create New
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

    // 8. Bookings: Specific Booking Route (/api/bookings/:id)
    const bookingMatch = pathname.match(/^\/api\/bookings\/([A-Za-z0-9_-]+)(?:\/(cancel|status|review))?$/);
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

    // 9. Emergency SOS
    if (pathname === '/api/emergency' && method === 'POST') {
      const body = await parseJsonBody(req);
      const ticket = store.createEmergencyTicket(body);
      sendJson(res, 201, {
        success: true,
        message: 'Emergency Patna Electrician dispatched on high-priority SLA',
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
