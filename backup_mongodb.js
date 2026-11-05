/**
 * GharBijli MongoDB Atlas 1-Click Backup Utility
 * Exports all live collections into timestamped JSON backup files in data/backups/
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('./backend/db');

async function backup() {
  console.log('[Backup] Connecting to MongoDB Atlas cluster "ghar-bijli"...');
  const db = await getDb();
  if (!db) {
    console.error('[Backup] Failed to connect to MongoDB Atlas!');
    process.exit(1);
  }

  const collections = await db.listCollections().toArray();
  const backupDir = path.join(__dirname, 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotFolder = path.join(backupDir, `backup_${timestamp}`);
  fs.mkdirSync(snapshotFolder, { recursive: true });

  console.log(`[Backup] Backing up ${collections.length} collections to ${snapshotFolder}...`);
  const report = {};

  for (const c of collections) {
    const docs = await db.collection(c.name).find({}).toArray();
    const filePath = path.join(snapshotFolder, `${c.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    report[c.name] = docs.length;
    console.log(`  ✓ Backed up collection [${c.name}]: ${docs.length} documents`);
  }

  const manifestPath = path.join(snapshotFolder, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    database: 'gharbijli',
    cluster: 'ghar-bijli',
    collections: report
  }, null, 2), 'utf8');

  console.log('\n[SUCCESS] Full MongoDB Atlas Cloud Backup Completed Successfully!');
  console.log(`Location: ${snapshotFolder}`);
  process.exit(0);
}

backup();
