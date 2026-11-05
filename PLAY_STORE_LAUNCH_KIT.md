# GharBijli — Google Play Store Launch Kit (November 20, 2026)
Localized Doorstep Electrical Service App for **Bhilai & Durg (Chhattisgarh, India)**.

---

## 1. Store Listing Metadata

### App Title (Max 30 characters)
```text
GharBijli: Electrician Bhilai
```

### Short Description (Max 80 characters)
```text
Doorstep verified electricians in Bhilai & Durg. Fast repairs, COD, 30m arrival.
```

### Full Description (Max 4,000 characters)
```text
घर की हर बिजली समस्या का पक्का हल — GharBijli brings verified, certified doorstep electricians directly to your home in Bhilai & Durg (Chhattisgarh) in 30 to 45 minutes!

Whether it's a ceiling fan breakdown in scorching summer heat, a sparking switchboard, blown MCB fuses, inverter setup, or complete house wiring — GharBijli provides trusted local electricians at standard, transparent prices with 100% Cash on Delivery (COD).

⚡ WHY CHOOSE GHARBIJLI IN BHILAI & DURG?
• Fast Doorstep Arrival: Electrician at your door in 30–45 minutes across all Bhilai sectors and Durg.
• Verified Local Electricians: Police-verified, background-checked electrical partners equipped with proper safety gear and multi-meters.
• Standard Transparent Pricing: Starts at just ₹99. No hidden charges or arbitrary rates.
• 100% Cash on Delivery (COD): Pay cash only AFTER your repair or installation is completed and verified.
• 15-Minute Emergency SOS: Urgent sparks, short-circuits, or total power failure? Tap SOS for priority emergency dispatch.
• 30-Day Service Guarantee: All repairs backed by a 30-day GharBijli rework warranty.

🛠️ OUR POPULAR SERVICES IN BHILAI:
1. Ceiling Fan Services: Installation, blade balancing, regulator repair, noise triage, and motor winding.
2. Switch & Socket Repairs: Replacement of 6A/16A switchboards, power plugs, modular plates, and bell buzzers.
3. Light & Chandelier Fitting: LED batten, fancy false ceiling cob lights, decorative chandeliers, and balcony lights.
4. MCB & Submeter Services: Main distribution board troubleshooting, single/three phase MCB replacement, digital sub-meter installation for tenants.
5. Inverter & Stabiliser Setup: Dual battery inverter wiring, trolley installation, and voltage stabilizer connection.
6. Appliance Installations: Geyser electrical wiring, AC power point installation, TV wall mounting power line.
7. EV Home Charger Setup: 16A/32A dedicated EV 2-wheeler and 4-wheeler doorstep charger wiring.
8. Festive & Garden Lighting: Diwali, wedding, and event decorative fairy light installation and waterproof routing.

📍 LOCALITIES SERVICED IN BHILAI & DURG:
• Civic Centre & Sector 6
• Sector 1, 2, 4, 5, 7, 8, 9 & Sector 10 (HUDCO)
• Nehru Nagar (East & West)
• Smriti Nagar & Junwani
• Supela, Power House & Vaishali Nagar
• Risali, Ruabandha & Maroda
• Durg City, Station Road & Padmanabhpur

🔒 SAFETY & PRIVACY PROMISE:
We respect your privacy. GharBijli only collects the minimum information (phone number and address) strictly necessary to navigate your electrician to your doorstep. No spam, no unnecessary permissions.

🌐 SUPPORT & OPERATIONS:
• Operations Center: Bhilai, Chhattisgarh
• Helpline & WhatsApp: +91 98765 43210
• Support Email: support@gharbijli.me
• Operations Web Portal: https://gharbijli-fwnz.vercel.app/
• Privacy Policy: https://gharbijli-fwnz.vercel.app/privacy
```

---

## 2. Store Graphic Assets Requirements

| Asset Type | Dimensions | Format | Max Size | Status in Project |
|---|---|---|---|---|
| **App Icon** | 512 x 512 px | PNG (32-bit, no alpha) | 1 MB | Source: `assets/logo-square.png` |
| **Feature Graphic** | 1024 x 500 px | PNG or JPEG | 15 MB | Source: `assets/logo.png` |
| **Phone Screenshots** | Min 1080 x 1920 px | PNG / JPEG | 8 MB ea | Min 2, Max 8 screenshots |

---

## 3. Google Play Console Declarations

### App Category & Tags
- **Primary Category:** `House & Home` (or `Business`)
- **Tags:** `Electrician`, `Home services`, `Handyman`, `Local services`, `Repairs`

### Content Rating (IARC)
- **Target Audience:** `18 and over` (General Audience)
- **Violence / Sexual content:** `No`
- **Language / Offensive content:** `No`
- **Controlled substances:** `No`
- **User interaction:** `Users can share location with the service provider for delivery/dispatch purposes.`

### Target Audience & Content
- Target age group: `18 and older`
- Appeal to children: `No`

### Data Safety Form (Google Play Compliance)
- **Data Collected:**
  1. **Personal Info:** Name and Phone number (for account creation, customer contact, and booking dispatch).
  2. **Location:** Approximate & Precise Location (only during active booking to navigate the technician to the customer's house).
- **Data Sharing:** Data is NOT shared with any third-party advertising companies.
- **Security Practices:** Data in transit is encrypted using HTTPS / TLS 1.3. Users can request account and data deletion by emailing `support@gharbijli.me`.
- **Privacy Policy URL:** `https://gharbijli-fwnz.vercel.app/privacy`

---

## 4. Signing & Keystore Information for Updates

- **Target SDK Version:** 36 (Android 16 Ready)
- **Minimum SDK Version:** 24 (Android 7.0 Nougat+)
- **Signature Schemes Applied:** APK Signature Scheme v1, v2, and v3
- **Local Keystore:** `C:\Users\ritesh singh\.android\debug.keystore`
  - Alias: `androiddebugkey`
  - Pass: `android`
- **Build Pipeline Script:** `python package_apk.py` (executes 4-byte zipalign and multi-scheme signing automatically)
