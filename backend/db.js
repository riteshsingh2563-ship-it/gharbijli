/**
 * GharBijli MongoDB Atlas Database Client
 * Provides persistent cloud storage for production and serverless environments.
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Load local environment settings without requiring a separate dotenv package.
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath);
    } else {
      const contents = fs.readFileSync(envPath, 'utf8');
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (!match || process.env[match[1]] !== undefined) continue;
        let value = match[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    }
  }
} catch (_) {}

const MONGODB_URI = process.env.MONGODB_URI;

let client = null;
let db = null;
let isConnected = false;
let connectPromise = null;

async function getDb() {
  if (!MONGODB_URI) {
    console.error('[MongoDB] MONGODB_URI is not configured.');
    return null;
  }
  if (db && isConnected) return db;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      if (!client) {
        client = new MongoClient(MONGODB_URI, {
          serverSelectionTimeoutMS: 8000,
          connectTimeoutMS: 8000,
        });
      }
      await client.connect();
      db = client.db('gharbijli');
      isConnected = true;
      console.log('[MongoDB] Connected successfully to Atlas cluster "ghar-bijli"');
      return db;
    } catch (err) {
      console.error('[MongoDB] Connection error:', err.message);
      isConnected = false;
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

async function loadAllFromMongo() {
  try {
    const database = await getDb();
    if (!database) return null;

    // Keep cold-start hydration to small reference data. Operational collections
    // (bookings, emergencies, users) are queried on demand by BackendStore.
    const [appConfigDoc, categories, services, technicians] = await Promise.all([
      database.collection('app_config').findOne({ _id: 'global_config' }),
      database.collection('categories').find({}).sort({ order: 1 }).toArray(),
      database.collection('services').find({}).toArray(),
      database.collection('technicians').find({}).toArray()
    ]);

    const cleanDoc = (d) => {
      if (!d) return d;
      const { _id, ...rest } = d;
      return rest;
    };

    return {
      appConfig: appConfigDoc ? cleanDoc(appConfigDoc) : null,
      categories: categories && categories.length ? categories.map(cleanDoc) : null,
      services: services && services.length ? services.map(cleanDoc) : null,
      technicians: technicians && technicians.length ? technicians.map(cleanDoc) : null
    };
  } catch (err) {
    console.error('[MongoDB] loadAllFromMongo failed:', err.message);
    return null;
  }
}

async function syncAppConfigToMongo(appConfig) {
  try {
    const database = await getDb();
    if (!database) return;
    await database.collection('app_config').updateOne(
      { _id: 'global_config' },
      { $set: { ...appConfig, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[MongoDB] syncAppConfig error:', err.message);
  }
}

async function syncCategoriesToMongo(categories) {
  try {
    const database = await getDb();
    if (!database || !Array.isArray(categories)) return;
    for (const cat of categories) {
      await database.collection('categories').updateOne(
        { id: cat.id },
        { $set: cat },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('[MongoDB] syncCategories error:', err.message);
  }
}

async function syncServiceToMongo(service) {
  try {
    const database = await getDb();
    if (!database || !service || !service.id) return;
    await database.collection('services').updateOne(
      { id: service.id },
      { $set: service },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[MongoDB] syncService error:', err.message);
  }
}

async function deleteServiceFromMongo(serviceId) {
  try {
    const database = await getDb();
    if (!database || !serviceId) return;
    await database.collection('services').deleteOne({ id: serviceId });
  } catch (err) {
    console.warn('[MongoDB] deleteService error:', err.message);
  }
}

async function syncBookingToMongo(booking) {
  if (!booking || !booking.bookingId) throw new Error('A booking ID is required for MongoDB sync');
  const database = await getDb();
  if (!database) {
    if (process.env.VERCEL) throw new Error('MongoDB is unavailable while saving the booking');
    return false;
  }
  try {
    await database.collection('bookings').updateOne(
      { bookingId: booking.bookingId },
      { $set: booking },
      { upsert: true }
    );
    return true;
  } catch (err) {
    if (process.env.VERCEL) throw err;
    console.warn('[MongoDB] syncBooking error:', err.message);
    return false;
  }
}

async function syncEmergencyTicketToMongo(ticket) {
  try {
    const database = await getDb();
    if (!database || !ticket || !ticket.ticketId) return;
    await database.collection('emergency_tickets').updateOne(
      { ticketId: ticket.ticketId },
      { $set: ticket },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[MongoDB] syncEmergencyTicket error:', err.message);
  }
}

async function syncTechnicianToMongo(tech) {
  try {
    const database = await getDb();
    if (!database || !tech || !tech.id) return;
    await database.collection('technicians').updateOne(
      { id: tech.id },
      { $set: tech },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[MongoDB] syncTechnician error:', err.message);
  }
}

async function deleteTechnicianFromMongo(techId) {
  try {
    const database = await getDb();
    if (!database || !techId) return;
    await database.collection('technicians').deleteOne({ id: techId });
  } catch (err) {
    console.warn('[MongoDB] deleteTechnician error:', err.message);
  }
}

async function syncUserToMongo(user) {
  if (!user || !user.uid) throw new Error('A user ID is required for MongoDB sync');
  const database = await getDb();
  if (!database) {
    if (process.env.VERCEL) throw new Error('MongoDB is unavailable while saving the user');
    return false;
  }
  try {
    await database.collection('users').updateOne(
      { uid: user.uid },
      { $set: user },
      { upsert: true }
    );
    return true;
  } catch (err) {
    if (process.env.VERCEL) throw err;
    console.warn('[MongoDB] syncUser error:', err.message);
    return false;
  }
}

async function syncAllToMongo(data) {
  try {
    const database = await getDb();
    if (!database) return false;

    if (data.appConfig) {
      await syncAppConfigToMongo(data.appConfig);
    }
    if (data.categories && data.categories.length) {
      await syncCategoriesToMongo(data.categories);
    }
    if (data.services && data.services.length) {
      for (const s of data.services) {
        await syncServiceToMongo(s);
      }
    }
    if (data.technicians && data.technicians.length) {
      for (const t of data.technicians) {
        await database.collection('technicians').updateOne(
          { id: t.id },
          { $set: t },
          { upsert: true }
        );
      }
    }
    if (data.bookings && data.bookings.length) {
      for (const b of data.bookings) {
        await syncBookingToMongo(b);
      }
    }
    if (data.emergencyTickets && data.emergencyTickets.length) {
      for (const em of data.emergencyTickets) {
        await syncEmergencyTicketToMongo(em);
      }
    }
    if (data.users && typeof data.users === 'object') {
      const uList = Object.values(data.users);
      for (const u of uList) {
        await syncUserToMongo(u);
      }
    }
    console.log('[MongoDB] Complete initial database sync succeeded!');
    return true;
  } catch (err) {
    console.error('[MongoDB] syncAllToMongo failed:', err.message);
    return false;
  }
}

module.exports = {
  getDb,
  loadAllFromMongo,
  syncAppConfigToMongo,
  syncCategoriesToMongo,
  syncServiceToMongo,
  deleteServiceFromMongo,
  syncBookingToMongo,
  syncEmergencyTicketToMongo,
  syncUserToMongo,
  syncTechnicianToMongo,
  deleteTechnicianFromMongo,
  syncAllToMongo
};
