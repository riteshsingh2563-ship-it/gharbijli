/**
 * GharBijli Firebase & Central Backend Service Adapter
 * Secure abstraction layer connecting to GharBijli REST Backend API,
 * Firebase Authentication with the GharBijli REST API.
 */

class GharBijliFirebaseService {
  constructor(config) {
    this.config = config;
    this.isLiveFirebase = false;
    this.hasBackendApi = true;
    this.auth = null;
    this.currentUser = null;
    this.authListeners = [];
    this.recaptchaVerifier = null;
    this.confirmationResult = null;

    this.init();
  }

  async init() {
    const isConfigured = this.config.firebase && 
                         this.config.firebase.apiKey && 
                         !this.config.firebase.apiKey.includes("PLACEHOLDER");

    if (isConfigured && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.config.firebase);
        }
        this.auth = firebase.auth();
        this.isLiveFirebase = true;

        // Listen for live auth state changes
        this.auth.onAuthStateChanged(async (user) => {
          if (user) {
            await this.handleAuthSuccess(user);
            if (typeof window.onGoogleLoginSuccess === 'function') {
              window.onGoogleLoginSuccess(this.currentUser);
            }
          } else {
            if (this.currentUser && this.currentUser.authProvider === 'google') {
              this.currentUser = null;
              localStorage.removeItem("gb_current_user");
            }
            this.notifyAuthListeners();
          }
        });

        console.log("[GharBijli] Initialized with live Firebase backend.");
      } catch (err) {
        console.warn("[GharBijli] Firebase initialization failed, falling back to local adapter:", err);
        this.initLocalAdapter();
      }
    } else {
      this.initLocalAdapter();
    }
  }

  initLocalAdapter() {
    this.isLiveFirebase = false;
    // A cached profile is not proof of authentication; require Firebase to restore a session.
    localStorage.removeItem('gb_current_user');
    this.currentUser = null;
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (this.config.firebase && this.config.firebase.apiKey) {
        headers['X-Firebase-Api-Key'] = this.config.firebase.apiKey;
      }
      if (this.auth && this.auth.currentUser) {
        headers.Authorization = `Bearer ${await this.auth.currentUser.getIdToken()}`;
      }
      const res = await fetch(fullUrl, {
        headers,
        signal: controller.signal,
        ...options
      });
      const contentType = res.headers.get('content-type') || '';
      const responseText = await res.text();
      let data;
      if (contentType.includes('application/json')) {
        try { data = responseText ? JSON.parse(responseText) : {}; }
        catch (_) { throw new Error(`Server returned invalid JSON (HTTP ${res.status})`); }
      } else {
        throw new Error(`Server returned an unexpected response (HTTP ${res.status})`);
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      console.warn(`[GharBijli API] Call to ${fullUrl} failed:`, err.message);
      throw err;
    } finally {
      clearTimeout(timeoutId);
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
    const nativeAuth = window.Capacitor?.Plugins?.FirebaseAuthentication ||
      (window.Capacitor?.registerPlugin ? window.Capacitor.registerPlugin('FirebaseAuthentication') : null);
    if (window.Capacitor?.isNativePlatform?.()) {
      if (!nativeAuth?.signInWithGoogle) {
        throw new Error('Native Google sign-in is unavailable. Sync and install the updated Android app.');
      }
      const result = await nativeAuth.signInWithGoogle({ useCredentialManager: false });
      const idToken = result?.credential?.idToken;
      if (!idToken) throw new Error('Google sign-in did not return an ID token.');
      const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
      const signedIn = await this.auth.signInWithCredential(credential);
      return this.handleAuthSuccess(signedIn.user);
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    const signedIn = await this.auth.signInWithPopup(provider);
    return this.handleAuthSuccess(signedIn.user);
  }

  async handleAuthSuccess(u) {
    if (this.authSuccessUid === u.uid && this.authSuccessPromise) return this.authSuccessPromise;
    this.authSuccessUid = u.uid;
    this.authSuccessPromise = this.completeAuthSuccess(u);
    try {
      return await this.authSuccessPromise;
    } finally {
      this.authSuccessPromise = null;
    }
  }

  async completeAuthSuccess(u) {
    const cachedUsers = (() => {
      try { return JSON.parse(localStorage.getItem('gb_users_db') || '{}'); }
      catch (_) { return {}; }
    })();
    const cachedProfile = cachedUsers[u.uid] || {};
    const verifiedUser = {
      ...cachedProfile,
      uid: u.uid,
      email: u.email || cachedProfile.email || '',
      displayName: u.displayName || cachedProfile.displayName || (u.email ? u.email.split('@')[0] : "Customer"),
      photoURL: u.photoURL || cachedProfile.photoURL || "",
      phoneNumber: u.phoneNumber || cachedProfile.phoneNumber || "",
      authProvider: "google"
    };
    this.currentUser = verifiedUser;
    localStorage.setItem("gb_current_user", JSON.stringify(verifiedUser));

    try {
      const idToken = this.auth && this.auth.currentUser ? await this.auth.currentUser.getIdToken() : null;
      if (!idToken) throw new Error('Missing Firebase ID token');
      const sync = await this.apiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          apiKey: this.config.firebase.apiKey
        })
      });
      if (!sync || !sync.success || !sync.user) {
        throw new Error('Backend did not return the saved customer profile');
      }
      Object.assign(verifiedUser, sync.user, {
        uid: u.uid,
        email: u.email || sync.user.email,
        authProvider: 'google'
      });
    } catch (syncErr) {
      console.warn("[GharBijli] Mongo auth sync note:", syncErr.message);
      // A temporary sync error should not discard an already saved server profile.
      try {
        const params = new URLSearchParams({ uid: u.uid });
        const profile = await this.apiRequest(`/api/auth/profile?${params.toString()}`);
        if (profile && profile.success && profile.user) {
          Object.assign(verifiedUser, profile.user, { uid: u.uid, authProvider: 'google' });
        }
      } catch (profileErr) {
        console.warn("[GharBijli] Saved profile could not be reloaded:", profileErr.message);
      }
    }

    localStorage.setItem("gb_current_user", JSON.stringify(verifiedUser));
    try {
      cachedUsers[u.uid] = { ...(cachedUsers[u.uid] || {}), ...verifiedUser };
      localStorage.setItem('gb_users_db', JSON.stringify(cachedUsers));
    } catch (_) {}
    this.notifyAuthListeners();
    return verifiedUser;
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
    throw new Error('Phone sign-in is disabled. Add your mobile number in profile setup instead.');
    /* legacy handler retained temporarily for old installations */
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
    throw new Error('OTP sign-in is disabled. Sign in with Google instead.');
    /* legacy handler retained temporarily for old installations */
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

    // The REST API and MongoDB are the canonical profile store.
    try {
      await this.apiRequest('/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
    } catch (e) {}
    const allUsers = JSON.parse(localStorage.getItem("gb_users_db") || "{}");
    profile.createdAt = allUsers[user.uid]?.createdAt || new Date().toISOString();
    allUsers[user.uid] = profile;
    localStorage.setItem("gb_users_db", JSON.stringify(allUsers));
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
  /**
   * Update Customer Profile in MongoDB Atlas & Local Session
   */
  async updateUserProfile(profileData) {
    if (!profileData || !profileData.uid) {
      throw new Error("User identifier is required");
    }
    const res = await this.apiRequest('/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
    if (res && res.success && res.user) {
      this.currentUser = { ...this.currentUser, ...res.user, profileCompleted: true };
      localStorage.setItem("gb_current_user", JSON.stringify(this.currentUser));
      this.notifyAuthListeners();
      return this.currentUser;
    }
    // Local fallback
    this.currentUser = { ...this.currentUser, ...profileData, profileCompleted: true };
    localStorage.setItem("gb_current_user", JSON.stringify(this.currentUser));
    this.notifyAuthListeners();
    return this.currentUser;
  }

  async getUserProfile() {
    if (!this.currentUser) return null;
    const params = new URLSearchParams({ uid: this.currentUser.uid });
    const result = await this.apiRequest(`/api/auth/profile?${params.toString()}`);
    return result.user || null;
  }

  async getCustomerBookings() {
    if (!this.currentUser) return [];

    // 1. Try Backend API
    let apiError = null;
    try {
      let queryUrl = '/api/bookings?';
      if (this.currentUser.uid) queryUrl += `customerUid=${encodeURIComponent(this.currentUser.uid)}&`;
      if (this.currentUser.email) queryUrl += `customerEmail=${encodeURIComponent(this.currentUser.email)}&`;
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
      apiError = apiErr;
    }

    const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
    const cached = bookings.filter(b => b.customerUid === this.currentUser.uid ||
      (this.currentUser.email && b.customerEmail === this.currentUser.email) ||
      (this.currentUser.phoneNumber && b.customerPhone === this.currentUser.phoneNumber));
    if (cached.length) return cached;
    if (apiError) throw apiError;
    return [];
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

    const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
    return bookings.find(b => b.bookingId === bookingId) || null;
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
    } catch (apiErr) { throw apiErr; }

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
    } catch (apiErr) { throw apiErr; }

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

    const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
    const idx = bookings.findIndex(b => b.bookingId === bookingId);
    if (idx !== -1) {
      Object.assign(bookings[idx], updates);
      bookings[idx].statusHistory.push(historyEntry);
      localStorage.setItem("gb_bookings_db", JSON.stringify(bookings));
    }
  }

  /**
   * Submit Emergency SOS
   */
  async submitEmergencySos(payload) {
    return this.apiRequest('/api/emergency', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

// Export singleton instance
window.GharBijliFirebase = new GharBijliFirebaseService(GharBijliConfig);
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GharBijliFirebaseService;
}
