# GharBijli (घारबिजली) — Production-Ready Android Customer Application

> **Domain:** [gharbijli.me](https://gharbijli.me)  
> **Package Name:** `me.gharbijli.app`  
> **Platform:** Android (Capacitor Native Android Studio Project)  
> **Market:** India (Local home electrical services & fan winding coordination)

---

## 1. Project Overview & Architecture

GharBijli connects households with reliable local electrical repair and installation services. The initial business model is specifically tailored for a lean, practical local operation in India:

1. **Customer Submits Request**: Customer chooses electrical repair or winding coordination, selects address and date/slot.
2. **Phone Confirmation**: GharBijli operations calls customer to verify problem and confirm availability.
3. **Partner Dispatch**: A verified freelance electrician partner (or winding shop coordinator) is dispatched.
4. **Cash on Delivery**: Customer inspects and pays cash directly after service completion.
5. **Auditing**: Status and collected cash are recorded in persistent storage.

### Technology Stack
- **Native Android Layer**: Capacitor 8.6 with Android Studio native project (`/android`), Java runtime, Gradle wrapper, AndroidX.
- **Frontend Layer**: Google Stitch brand-inspired mobile UI (`#ff6500`, `#ffc400`, `#111827`, Inter & system typography, responsive layout).
- **Native Android Bridge**: `@capacitor/app` (hardware back button), `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/network`.
- **Backend / Auth**: Firebase Phone Authentication with SMS OTP verification & Cloud Firestore.
- **Security**: Strict Firestore Security Rules (`firestore.rules`) enforcing owner isolation, no payment manipulation, and privileged status restrictions.

---

## 2. Directory Structure

```
d:\projects\gharbijli\
├── android\                             # Full Native Android Studio Project
│   ├── app\src\main\AndroidManifest.xml # Android app manifest (permissions & intents)
│   ├── app\src\main\java\me\gharbijli\app\MainActivity.java
│   ├── app\src\main\res\                # Launcher icons across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
│   └── app\src\main\assets\public\      # Synced web distribution bundle
├── assets\                              # Authentic brand assets
│   ├── logo.png                         # Horizontal GharBijli branding
│   └── logo-square.png                  # Square GharBijli logo icon
├── www\                                 # Single-Page Mobile Web Application
│   ├── index.html                       # Core application shell mounting all 8 views
│   ├── css\
│   │   └── main.css                     # Google Stitch design system & components
│   ├── js\
│   │   ├── config.js                    # Firebase configuration & status definitions
│   │   ├── services-data.js             # 10 electrical services with Hindi descriptions
│   │   ├── firebase-service.js          # Phone auth & Firestore adapter with offline support
│   │   └── app.js                       # Controller, routing, forms, native hardware hooks
│   └── assets\                          # Web icons and logos
├── standalone-screens\                  # Standalone previewable HTML files
│   ├── home_gharbijli.html
│   ├── login_otp_verification.html
│   ├── service_details_schedule.html
│   ├── my_bookings.html
│   ├── booking_status_tracking.html     # Canonical 8-stage consolidated tracker
│   └── booking_status_tracking (1).html # Alternate reference version
├── firestore.rules                      # Production Firestore Security Rules
├── firestore.indexes.json               # Firestore Composite Query Indexes
├── capacitor.config.json                # Capacitor configuration (me.gharbijli.app)
├── package.json                         # Dependencies & project scripts
└── test_app_integrity.js                # Automated verification script
```

---

## 3. Implemented Customer Screens

1. **Home Screen (`home_gharbijli.html`)**:
   - GharBijli logo header, location pill (Patna), authentication indicator.
   - Emergency electrical problem banner with 60-second booking call-to-action.
   - Quick-access active booking card if the logged-in customer has an ongoing job.
   - Grid of 10 electrical categories with Hindi subtitles and transparent pricing notes.
   - "How GharBijli Works" 4-step explanation.
   - Operator simulation panel button for local dev testing.

2. **Phone Login & OTP Verification (`login_otp_verification.html`)**:
   - 10-digit Indian mobile number input with `+91` prefix validation (`[6-9]\d{9}`).
   - Firebase Phone Authentication request with invisible reCAPTCHA.
   - 6-digit OTP entry with auto-focus, paste, and backspace handling.
   - 30-second resend cooldown timer.
   - Built-in test phone numbers: `+91 99999 99999` and `+91 98765 43210` with code `123456`.
   - Automatic customer profile creation upon successful verification.

3. **Service Details & Scheduling (`service_details_schedule.html`)**:
   - Dynamic service overview with common issues solved and duration estimate.
   - Address form: House/Flat No, Street, Landmark, Pincode (6 digits), City.
   - Date picker (strictly prevents past dates; range: today to +7 days).
   - Available time slots (Morning, Afternoon, Evening, Late Evening).
   - Problem description and special electrician notes.
   - Upfront notice: *"Cash on Delivery / Cash after service"*.
   - Debounced submission preventing duplicate bookings.

4. **Booking Confirmation Screen**:
   - Unique reference ID generator (`GB-2026-XXXXX`).
   - Clear operational prompt: *"Our team will call your mobile number shortly to verify availability and dispatch the nearest electrician."*
   - Summary of address, scheduled date/time, and payment mode.
   - Direct buttons to Track Status and View My Bookings.

5. **My Bookings (`my_bookings.html`)**:
   - Customer-scoped view (`customerUid == auth.currentUser.uid`).
   - Active Bookings vs. Past/Completed filter tabs.
   - Status badges with clear color indicators.
   - Empty state with direct "Book a Service" CTA.

6. **Booking Status Tracking (`booking_status_tracking.html`)**:
   - Consolidated canonical tracking screen based on Google Stitch designs.
   - 8-stage operational progression:
     1. Pending Confirmation
     2. Booking Confirmed
     3. Electrician Allocation
     4. Electrician Assigned (Verified Partner Card)
     5. On The Way
     6. Service In Progress
     7. Service Completed
     8. Cancelled
   - Recorded milestone timestamps.
   - Permitted cancellation flow with reason dropdown (allowed only before dispatch/work in progress).

7. **Profile Screen**:
   - Verified mobile number display.
   - Full name editing and local/cloud persistence.
   - App version and region details.
   - Safe log out action.

8. **Help & Support Screen**:
   - Operational helpline hours (8:00 AM – 8:00 PM).
   - Support email: `support@gharbijli.me`.
   - Comprehensive FAQs for motor rewinding turnaround, inspection charges, and cancellation policy.

---

## 4. Firebase Setup Instructions

When connecting to your live Firebase project:

1. Open [Firebase Console](https://console.firebase.google.com/) and create a project named **`gharbijli-app`**.
2. **Enable Phone Authentication**:
   - Go to **Build** -> **Authentication** -> **Sign-in method**.
   - Enable **Phone**.
   - Add development test phone numbers under *"Phone numbers for testing"* (e.g. `+91 9999999999` with code `123456`).
3. **Register Android App**:
   - Register Android app with package name `me.gharbijli.app`.
   - Download `google-services.json` and place it in `android/app/google-services.json`.
4. **Register Web App**:
   - Create a Web App in the same Firebase project.
   - Copy the configuration object and paste it into `www/js/config.js` under `GharBijliConfig.firebase`.
5. **Deploy Security Rules**:
   - Deploy `firestore.rules` using Firebase CLI:
     ```bash
     firebase deploy --only firestore:rules
     ```
   - Deploy `firestore.indexes.json`:
     ```bash
     firebase deploy --only firestore:indexes
     ```

---

## 5. Building & Running the Android App

### Opening in Android Studio
1. Open **Android Studio**.
2. Select **Open an Existing Project** and choose the `d:\projects\gharbijli\android` directory.
3. Allow Gradle to sync.
4. Connect an Android phone via USB (or start an Android Virtual Device / BlueStacks emulator).
5. Click **Run (Shift + F10)** to install and launch the app.

### Building APK via Command Line
From `d:\projects\gharbijli\android`:
```bash
./gradlew assembleDebug
```
The generated APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Syncing Web Assets after UI Changes
Whenever you modify HTML, CSS, or JS in `www/`:
```bash
node node_modules/@capacitor/cli/bin/capacitor sync android
```

---

## 6. Verification Results

Run the automated integrity test anytime:
```bash
node test_app_integrity.js
```
**Test Results:**
- `✓` All 17 critical DOM elements present in `www/index.html`
- `✓` Syntax valid in `config.js` and `services-data.js`
- `✓` Android public assets synced cleanly into `android/app/src/main/assets/public`
- `✓` `AndroidManifest.xml` configured with `INTERNET` and `ACCESS_NETWORK_STATE`
- `✓` Android launcher icons generated for all 5 densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) from the original square logo asset
- `✓` 10 electrical services loaded with Hindi descriptions
- `✓` `firestore.rules` verified: Restrictive production rules with owner isolation, payment status lock, and technician boundaries
