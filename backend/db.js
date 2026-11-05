/**
 * GharBijli MongoDB Atlas Database Client
 * Provides persistent cloud storage for production and serverless environments.
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Automatically load .env if present
try {
  if (typeof process.loadEnvFile === 'function') {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
} catch (e) {
  // Ignore env load errors in non-file environments
}

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://riteshsingh2563_db_user:L2WIPeTUl44lzfvp@ghar-bijli.xmuka3y.mongodb.net/gharbijli?retryWrites=true&w=majority';

let client = null;
let db = null;
let isConnected = false;
let connectPromise = null;

async function getDb() {
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

    const [appConfigDoc, categories, services, technicians, bookings, emergencyTickets] = await Promise.all([
      database.collection('app_config').findOne({ _id: 'global_config' }),
      database.collection('categories').find({}).sort({ order: 1 }).toArray(),
      database.collection('services').find({}).toArray(),
      database.collection('technicians').find({}).toArray(),
      database.collection('bookings').find({}).sort({ createdAt: -1 }).toArray(),
      database.collection('emergency_tickets').find({}).sort({ createdAt: -1 }).toArray()
    ]);

    // Clean internal mongo _id fields for clean json delivery if needed
    const cleanDoc = (d) => {
      if (!d) return d;
      const { _id, ...rest } = d;
      return rest;
    };

    return {
      appConfig: appConfigDoc ? cleanDoc(appConfigDoc) : null,
      categories: categories && categories.length ? categories.map(cleanDoc) : null,
      services: services && services.length ? services.map(cleanDoc) : null,
      technicians: technicians && technicians.length ? technicians.map(cleanDoc) : null,
      bookings: bookings ? bookings.map(cleanDoc) : [],
      emergencyTickets: emergencyTickets ? emergencyTickets.map(cleanDoc) : []
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
  try {
    const database = await getDb();
    if (!database || !booking || !booking.bookingId) return;
    await database.collection('bookings').updateOne(
      { bookingId: booking.bookingId },
      { $set: booking },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[MongoDB] syncBooking error:', err.message);
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
  syncAllToMongo
};
