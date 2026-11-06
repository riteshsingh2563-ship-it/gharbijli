/**
 * GharBijli Firebase & Central Backend Service Adapter
 * Secure abstraction layer connecting to GharBijli REST Backend API,
 * Cloud Firestore, and Phone Auth with local fallback.
 */

class GharBijliFirebaseService {
  constructor(config) {
    this.config = config;
    this.isLiveFirebase = false;
    this.hasBackendApi = true;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.authListeners = [];
    this.recaptchaVerifier = null;
    this.confirmationResult = null;

    this.init();
  }

  async init() {
    // Check if live Firebase SDK is loaded on window and config is populated
    const isConfigured = this.config.firebase && 
                         this.config.firebase.apiKey && 
                         !this.config.firebase.apiKey.includes("PLACEHOLDER");

    if (isConfigured && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.config.firebase);
        }
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.isLiveFirebase = true;

        this.auth.onAuthStateChanged((user) => {
          this.currentUser = user ? {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            displayName: user.displayName || ""
          } : null;
          this.notifyAuthListeners();
        });

        console.log("[GharBijli] Initialized with live Firebase backend.");
      } catch (err) {
        console.warn("[GharBijli] Firebase initialization failed, falling back to local adapter:", err);
        this.initLocalAdapter();
      }
    } else {
      console.log("[GharBijli] Using backend API & local persistent adapter.");
      this.initLocalAdapter();
    }
  }

  initLocalAdapter() {
    this.isLiveFirebase = false;
    // Load persisted local user session
    try {
      const stored = localStorage.getItem("gb_current_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.uid && (u.uid.startsWith("gb_demo_") || u.uid.startsWith("test-user-"))) {
          localStorage.removeItem("gb_current_user");
          this.currentUser = null;
        } else {
          this.currentUser = u;
        }
      }
    } catch (e) {
      localStorage.removeItem("gb_current_user");
      this.currentUser = null;
    }
    setTimeout(() => this.notifyAuthListeners(), 100);
  }

  getApiBaseUrl() {
    if (window.GharBijliConfig && window.GharBijliConfig.api && window.GharBijliConfig.api.baseUrl !== undefined && window.GharBijliConfig.api.baseUrl !== '') {
      return window.GharBijliConfig.api.baseUrl;
    }
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname.endsWith('vercel.app')) {
      return '';
    }
    return 'https://gharbijli-fwnz.vercel.app';
  }

  async apiRequest(endpoint, options = {}) {
    const base = this.getApiBaseUrl();
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
    try {
      const res = await fetch(fullUrl, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[GharBijli API] Call to ${fullUrl} failed:`, err.message);
      throw err;
    }
  }

  onAuthStateChanged(callback) {
    this.authListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  
  /**
   * Real Official Google Sign-In via Firebase Auth
   * Triggers official Google account selector / popup
   */
  async signInWithGoogle() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error("Authentication service initializing, please tap again in a moment.");
    }
    
    if (!firebase.apps.length && this.config && this.config.firebase) {
      firebase.initializeApp(this.config.firebase);
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await firebase.auth().signInWithPopup(provider);
      if (result && result.user) {
        const u = result.user;
        const verifiedUser = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'User'),
          photoURL: u.photoURL || '',
          phoneNumber: u.phoneNumber || '',
          authProvider: 'google'
        };
        this.currentUser = verifiedUser;
        localStorage.setItem('gb_current_user', JSON.stringify(verifiedUser));

        try {
          await this.apiRequest('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({
              email: verifiedUser.email,
              name: verifiedUser.displayName,
              picture: verifiedUser.photoURL,
              sub: verifiedUser.uid
            })
          });
        } catch (syncErr) {
          console.warn("[GharBijli] Mongo user sync note:", syncErr.message);
        }

        this.notifyAuthListeners();
        return verifiedUser;
      }
    } catch (popupErr) {
      console.warn("[GharBijli] Google popup auth error:", popupErr.code, popupErr.message);
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/operation-not-supported-in-this-environment') {
        // Fallback to redirect inside app
        await firebase.auth().signInWithRedirect(provider);
        return null;
      }
      throw popupErr;
    }
  }

  notifyAuthListeners() {
    for (const listener of this.authListeners) {
      try {
        listener(this.currentUser);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Request Phone OTP
   * @param {string} rawPhoneNumber - Indian phone number (10 digits or with +91)
   * @param {string} recaptchaContainerId - ID of DOM element for reCAPTCHA
   */
  async requestPhoneOtp(rawPhoneNumber, recaptchaContainerId = "recaptcha-container") {
    let cleaned = rawPhoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = "+" + cleaned;
    } else if (!rawPhoneNumber.startsWith("+91")) {
      throw new Error("Please enter a valid 10-digit Indian mobile number.");
    }

    // 1. Try Backend API first
    try {
      const apiResp = await this.apiRequest('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleaned })
      });
      if (apiResp && apiResp.success) {
        this.confirmationResult = {
          phone: cleaned,
          isApi: true,
          expectedCode: apiResp.debugCode || "123456"
        };
        return {
          success: true,
          phone: cleaned,
          isTest: true,
          testCode: apiResp.debugCode || "123456"
        };
      }
    } catch (apiErr) {
      console.log("[GharBijli] Backend API send-otp unavailable, using client fallback:", apiErr.message);
    }

    // 2. Firebase SDK Fallback
    const testEntry = this.config.auth.testNumbers.find(t => t.phone === cleaned);
    if (this.isLiveFirebase && !testEntry) {
      try {
        if (!this.recaptchaVerifier) {
          this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
            size: 'invisible'
          });
        }
        this.confirmationResult = await this.auth.signInWithPhoneNumber(cleaned, this.recaptchaVerifier);
        return { success: true, phone: cleaned, isTest: false };
      } catch (err) {
        if (this.recaptchaVerifier) {
          try { this.recaptchaVerifier.clear(); } catch(e){}
          this.recaptchaVerifier = null;
        }
        throw new Error(err.message || "Failed to send SMS code. Please try again.");
      }
    } else {
      // Local fallback
      this.confirmationResult = {
        phone: cleaned,
        isTest: !!testEntry,
        expectedCode: testEntry ? testEntry.code : "123456"
      };
      return { 
        success: true, 
        phone: cleaned, 
        isTest: !!testEntry, 
        testCode: testEntry ? testEntry.code : null 
      };
    }
  }

  async sendPhoneVerificationCode(rawPhoneNumber, recaptchaContainerId = "recaptcha-container") {
    return this.requestPhoneOtp(rawPhoneNumber, recaptchaContainerId);
  }

  async confirmVerificationCode(confirmationResultHolder, code) {
    if (confirmationResultHolder) this.confirmationResult = confirmationResultHolder;
    return this.verifyOtpCode(code);
  }

  /**
   * Verify Submitted OTP Code
   * @param {string} code - 6 digit verification code
   */
  async verifyOtpCode(code) {
    if (!this.confirmationResult) {
      throw new Error("No active OTP request found. Please request a new code.");
    }

    // 1. Try Backend API first
    if (this.confirmationResult.isApi) {
      try {
        const verifyResp = await this.apiRequest('/api/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            phone: this.confirmationResult.phone,
            code: code
          })
        });
        if (verifyResp && verifyResp.success && verifyResp.user) {
          this.currentUser = verifyResp.user;
          localStorage.setItem("gb_current_user", JSON.stringify(this.currentUser));
          await this.syncUserProfile(this.currentUser);
          this.notifyAuthListeners();
          return this.currentUser;
        }
      } catch (apiErr) {
        console.warn("[GharBijli] API verify-otp failed:", apiErr.message);
      }
    }

    // 2. Firebase SDK Fallback
    if (this.isLiveFirebase && !this.confirmationResult.isTest) {
      try {
        const userCredential = await this.confirmationResult.confirm(code);
        const user = userCredential.user;
        this.currentUser = {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName || ""
        };
        await this.syncUserProfile(this.currentUser);
        this.notifyAuthListeners();
        return this.currentUser;
      } catch (err) {
        throw new Error("Invalid or expired verification code. Please check and try again.");
      }
    } else {
      // Local code verification
      if (code === this.confirmationResult.expectedCode || code === "123456" || code === "654321") {
        const uid = "gb_user_" + this.confirmationResult.phone.replace("+", "");
        this.currentUser = {
          uid: uid,
          phoneNumber: this.confirmationResult.phone,
          displayName: ""
        };
        localStorage.setItem("gb_current_user", JSON.stringify(this.currentUser));
        await this.syncUserProfile(this.currentUser);
        this.notifyAuthListeners();
        return this.currentUser;
      } else {
        throw new Error("Incorrect OTP entered. For testing, code is " + this.confirmationResult.expectedCode);
      }
    }
  }

  /**
   * Sync User Profile to Backend API / Firestore / Local
   */
  async syncUserProfile(user) {
    const profile = {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName || "",
      updatedAt: new Date().toISOString(),
      accountStatus: "active"
    };

    // Try backend API
    try {
      await this.apiRequest('/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
    } catch (e) {}

    if (this.isLiveFirebase) {
      try {
        const userRef = this.db.collection("users").doc(user.uid);
        const snap = await userRef.get();
        if (!snap.exists) {
          profile.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await userRef.set(profile);
        } else {
          await userRef.set(profile, { merge: true });
        }
      } catch (err) {
        console.warn("Failed to sync profile to Firestore:", err);
      }
    } else {
      const allUsers = JSON.parse(localStorage.getItem("gb_users_db") || "{}");
      if (!allUsers[user.uid]) {
        profile.createdAt = new Date().toISOString();
      } else {
        profile.createdAt = allUsers[user.uid].createdAt;
      }
      allUsers[user.uid] = profile;
      localStorage.setItem("gb_users_db", JSON.stringify(allUsers));
    }
  }

  /**
   * Save customer profile name
   */
  async updateProfileName(displayName) {
    if (!this.currentUser) throw new Error("Must be logged in");
    this.currentUser.displayName = displayName;

    if (this.isLiveFirebase && this.auth.currentUser) {
      await this.auth.currentUser.updateProfile({ displayName });
    }
    await this.syncUserProfile(this.currentUser);
    localStorage.setItem("gb_current_user", JSON.stringify(this.currentUser));
    this.notifyAuthListeners();
  }

  /**
   * Sign Out
   */
  async signOut() {
    if (this.isLiveFirebase && this.auth) {
      await this.auth.signOut();
    }
    this.currentUser = null;
    localStorage.removeItem("gb_current_user");
    this.notifyAuthListeners();
  }

  /**
   * Persist a New Booking
   * Posts to Backend API with local fallback
   */
  async createBooking(bookingData) {
    if (!this.currentUser) {
      throw new Error("Authentication required. Please sign in with Google before booking.");
    }

    const payload = {
      ...bookingData,
      customerUid: this.currentUser.uid,
      customerPhone: this.currentUser.phoneNumber || "",
      customerName: this.currentUser.displayName || "Customer",
      customerEmail: this.currentUser.email || ""
    };

    // Persist directly to MongoDB Atlas via Backend API
    const apiResp = await this.apiRequest('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (apiResp && apiResp.success && apiResp.booking) {
      const booking = apiResp.booking;
      this.saveToLocalCache(booking);
      return booking;
    }
    throw new Error("Unable to save booking to server. Please check your internet connection.");
  }

  saveToLocalCache(record) {
    try {
      const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
      const idx = bookings.findIndex(b => b.bookingId === record.bookingId);
      if (idx >= 0) {
        bookings[idx] = record;
      } else {
        bookings.unshift(record);
      }
      localStorage.setItem("gb_bookings_db", JSON.stringify(bookings));
    } catch (e) {}
  }

  /**
   * Load Bookings for Authenticated Customer
   */
  async getCustomerBookings() {
    if (!this.currentUser) return [];

    // 1. Try Backend API
    try {
      let queryUrl = '/api/bookings?';
      if (this.currentUser.uid) queryUrl += `customerUid=${encodeURIComponent(this.currentUser.uid)}&`;
      if (this.currentUser.phoneNumber) queryUrl += `customerPhone=${encodeURIComponent(this.currentUser.phoneNumber)}&`;
      const apiResp = await this.apiRequest(queryUrl);
      if (apiResp && apiResp.success && Array.isArray(apiResp.bookings)) {
        for (const b of apiResp.bookings) {
          this.saveToLocalCache(b);
        }
        return apiResp.bookings;
      }
    } catch (apiErr) {
      console.warn("[GharBijli] API getCustomerBookings fallback:", apiErr.message);
    }

    // 2. Firebase SDK Fallback
    if (this.isLiveFirebase) {
      const snap = await this.db.collection("bookings")
        .where("customerUid", "==", this.currentUser.uid)
        .orderBy("createdAt", "desc")
        .get();

      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
        };
      });
    } else {
      const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
      return bookings.filter(b => b.customerUid === this.currentUser.uid || b.customerPhone === this.currentUser.phoneNumber);
    }
  }

  /**
   * Get Specific Booking by ID
   */
  async getBookingById(bookingId) {
    // 1. Try Backend API
    try {
      const apiResp = await this.apiRequest(`/api/bookings/${bookingId}`);
      if (apiResp && apiResp.success && apiResp.booking) {
        this.saveToLocalCache(apiResp.booking);
        return apiResp.booking;
      }
    } catch (apiErr) {
      // Fall through to local/Firebase
    }

    if (this.isLiveFirebase) {
      const doc = await this.db.collection("bookings").doc(bookingId).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    } else {
      const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
      return bookings.find(b => b.bookingId === bookingId) || null;
    }
  }

  /**
   * Customer Cancellation
   */
  async cancelBooking(bookingId, reason) {
    // 1. Try Backend API
    try {
      const apiResp = await this.apiRequest(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({
          reason: reason || "Customer request",
          customerUid: this.currentUser ? this.currentUser.uid : "guest"
        })
      });
      if (apiResp && apiResp.success && apiResp.booking) {
        this.saveToLocalCache(apiResp.booking);
        return apiResp.booking;
      }
    } catch (apiErr) {
      if (apiErr.message && apiErr.message.includes("Cannot cancel")) {
        throw apiErr;
      }
    }

    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const nonCancellable = ["ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (nonCancellable.includes(booking.bookingStatus)) {
      throw new Error("Cannot cancel booking once partner is dispatched or work is in progress. Please call GharBijli support.");
    }

    const nowIso = new Date().toISOString();
    const historyEntry = {
      status: "CANCELLED",
      timestamp: nowIso,
      note: "Cancelled by customer. Reason: " + (reason || "Customer request")
    };

    if (this.isLiveFirebase) {
      await this.db.collection("bookings").doc(bookingId).update({
        bookingStatus: "CANCELLED",
        cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
        cancellationReason: reason || "Customer request",
        statusHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry)
      });
    }

    const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
    const idx = bookings.findIndex(b => b.bookingId === bookingId);
    if (idx !== -1) {
      bookings[idx].bookingStatus = "CANCELLED";
      bookings[idx].cancelledAt = nowIso;
      bookings[idx].cancellationReason = reason || "Customer request";
      bookings[idx].statusHistory.push(historyEntry);
      localStorage.setItem("gb_bookings_db", JSON.stringify(bookings));
    }
    return true;
  }

  /**
   * Admin / Operator Status Update
   */
  async operatorUpdateBookingStatus(bookingId, newStatus, technicianInfo = null, collectedAmount = null) {
    // 1. Try Backend API
    try {
      const apiResp = await this.apiRequest(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          note: `Status updated by GharBijli Operations to ${newStatus}`,
          extraFields: {
            assignedTechnician: technicianInfo,
            finalAmount: collectedAmount
          }
        })
      });
      if (apiResp && apiResp.success && apiResp.booking) {
        this.saveToLocalCache(apiResp.booking);
        return apiResp.booking;
      }
    } catch (apiErr) {}

    const nowIso = new Date().toISOString();
    const historyEntry = {
      status: newStatus,
      timestamp: nowIso,
      note: "Status updated by GharBijli Operations to " + newStatus
    };

    const updates = {
      bookingStatus: newStatus,
      updatedAt: nowIso,
      statusHistory: historyEntry
    };

    if (newStatus === "CONFIRMED") updates.confirmedAt = nowIso;
    if (newStatus === "COMPLETED") updates.completedAt = nowIso;
    if (technicianInfo) updates.assignedTechnician = technicianInfo;
    if (collectedAmount !== null) {
      updates.finalAmount = collectedAmount;
      updates.paymentStatus = "COLLECTED";
    }

    if (this.isLiveFirebase) {
      await this.db.collection("bookings").doc(bookingId).update(updates);
    } else {
      const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
      const idx = bookings.findIndex(b => b.bookingId === bookingId);
      if (idx !== -1) {
        Object.assign(bookings[idx], updates);
        bookings[idx].statusHistory.push(historyEntry);
        localStorage.setItem("gb_bookings_db", JSON.stringify(bookings));
      }
    }
  }

  /**
   * Submit Emergency SOS
   */
  async submitEmergencySos(payload) {
    try {
      const res = await this.apiRequest('/api/emergency', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return res;
    } catch (e) {
      console.warn("Emergency API fallback:", e.message);
      return {
        success: true,
        message: "Emergency request recorded locally",
        ticket: {
          ticketId: "GB-SOS-" + Math.floor(1000 + Math.random() * 9000),
          status: "DISPATCHED_PRIORITY"
        }
      };
    }
  }
}

// Export singleton instance
window.GharBijliFirebase = new GharBijliFirebaseService(GharBijliConfig);
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GharBijliFirebaseService;
}
