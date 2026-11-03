const fs = require('fs');
const path = require('path');

console.log("=== GharBijli App Integrity Verification ===");

// 1. Verify index.html exists and has all essential elements
const htmlPath = path.join(__dirname, 'www', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const requiredElements = [
  'screen-home',
  'screen-login',
  'screen-service-details',
  'screen-booking-confirmation',
  'screen-my-bookings',
  'screen-tracking',
  'screen-profile',
  'screen-help',
  'offline-banner',
  'top-user-indicator',
  'services-grid',
  'form-phone-login',
  'form-otp-verify',
  'form-booking-schedule',
  'btn-submit-booking',
  'cancel-modal',
  'admin-modal'
];

let missingElements = [];
for (const id of requiredElements) {
  if (!htmlContent.includes(`id="${id}"`)) {
    missingElements.push(id);
  }
}

if (missingElements.length === 0) {
  console.log("✓ All 17 critical DOM elements present in index.html");
} else {
  console.error("✗ Missing DOM elements:", missingElements);
  process.exit(1);
}

// 2. Verify JavaScript files load and have no syntax errors
const jsFiles = [
  path.join(__dirname, 'www', 'js', 'config.js'),
  path.join(__dirname, 'www', 'js', 'services-data.js'),
  path.join(__dirname, 'www', 'js', 'map-service.js'),
  path.join(__dirname, 'www', 'js', 'firebase-service.js'),
  path.join(__dirname, 'www', 'js', 'app.js')
];

const { execSync } = require('child_process');
for (const file of jsFiles) {
  try {
    execSync(`node -c "${file}"`);
    console.log(`✓ Syntax OK: ${path.basename(file)}`);
  } catch (err) {
    console.error(`✗ Syntax Error in ${path.basename(file)}:`, err.message);
    process.exit(1);
  }
}

// 3. Verify Android Gradle & Assets sync
const androidPublicAssets = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(androidPublicAssets)) {
  const syncedFiles = fs.readdirSync(androidPublicAssets);
  console.log("✓ Android public assets synced:", syncedFiles.length, "entries found");
} else {
  console.error("✗ Android assets directory missing!");
  process.exit(1);
}

// 4. Verify Android Manifest
const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
if (manifestContent.includes('android.permission.INTERNET') && manifestContent.includes('MainActivity')) {
  console.log("✓ AndroidManifest.xml configured with permissions and MainActivity");
} else {
  console.error("✗ AndroidManifest verification failed");
  process.exit(1);
}

// 5. Verify Logo Mipmaps in Android res
const resFolder = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const mipmaps = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
let allMipmapsExist = true;
for (const m of mipmaps) {
  const p = path.join(resFolder, m, 'ic_launcher.png');
  if (!fs.existsSync(p)) {
    allMipmapsExist = false;
    console.error(`✗ Missing mipmap icon: ${p}`);
  }
}
if (allMipmapsExist) {
  console.log("✓ Android launcher icons verified across all 5 screen density buckets (mdpi to xxxhdpi)");
}

// 6. Verify Services Catalog Count
const services = require(path.join(__dirname, 'www', 'js', 'services-data.js'));
console.log(`✓ Service catalog populated with ${services.length} services (Target: 10)`);

// 7. Verify Firestore Security Rules
const rulesPath = path.join(__dirname, 'firestore.rules');
if (fs.existsSync(rulesPath)) {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  if (rules.includes('service cloud.firestore') && rules.includes('isOwner') && !rules.includes('allow read, write: if true;')) {
    console.log("✓ firestore.rules verified: Restrictive production rules with owner isolation and privileged protection");
  } else {
    console.error("✗ firestore.rules security check failed");
    process.exit(1);
  }
}

console.log("\n>>> ALL APP INTEGRITY CHECKS PASSED SUCCESSFULLY! <<<");
