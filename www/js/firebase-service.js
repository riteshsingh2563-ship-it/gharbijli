/**
 * GharBijli Firebase & Storage Adapter
 * Secure abstraction layer for Firebase Phone Auth and Cloud Firestore.
 * Provides live Firebase SDK bindings with fallback for isolated local development.
 */

class GharBijliFirebaseService {
  constructor(config) {
    this.config = config;
    this.isLiveFirebase = false;
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
      console.log("[GharBijli] Using local persistent storage adapter (Live Firebase credentials pending).");
      this.initLocalAdapter();
    }
  }

  initLocalAdapter() {
    this.isLiveFirebase = false;
    // Load persisted local user session
    try {
      const stored = localStorage.getItem("gb_current_user");
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      this.currentUser = null;
    }
    setTimeout(() => this.notifyAuthListeners(), 100);
  }

  onAuthStateChanged(callback) {
    this.authListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
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
    // Clean and normalize number
    let cleaned = rawPhoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = "+" + cleaned;
    } else if (!rawPhoneNumber.startsWith("+91")) {
      throw new Error("Please enter a valid 10-digit Indian mobile number.");
    }

    // Check if test phone number from config
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
      // Local or Dev Test phone mode
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

  /**
   * Alias for compatibility
   */
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
      // Validate test/local code
      if (code === this.confirmationResult.expectedCode || code === "123456") {
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
        throw new Error("Incorrect OTP entered. For testing with " + this.confirmationResult.phone + ", code is " + this.confirmationResult.expectedCode);
      }
    }
  }

  /**
   * Sync User Profile to Firestore / Local
   */
  async syncUserProfile(user) {
    const profile = {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName || "",
      updatedAt: new Date().toISOString(),
      accountStatus: "active"
    };

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
   * Strict client-side fields matching firestore.rules
   */
  async createBooking(bookingData) {
    if (!this.currentUser) {
      throw new Error("Please log in with your phone number to submit a booking.");
    }

    const bookingId = "GB-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000);
    const nowIso = new Date().toISOString();

    const record = {
      bookingId: bookingId,
      customerUid: this.currentUser.uid,
      customerPhone: this.currentUser.phoneNumber,
      customerName: this.currentUser.displayName || "Customer",
      serviceId: bookingData.serviceId,
      serviceNameSnapshot: bookingData.serviceNameSnapshot,
      pricingTypeSnapshot: bookingData.pricingTypeSnapshot || "inspection_based",
      addressSnapshot: bookingData.addressSnapshot,
      preferredDate: bookingData.preferredDate,
      preferredTimeSlot: bookingData.preferredTimeSlot,
      issueDescription: bookingData.issueDescription || "",
      customerNotes: bookingData.customerNotes || "",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
      bookingStatus: "PENDING_CONFIRMATION",
      assignedTechnician: null,
      finalAmount: null,
      createdAt: this.isLiveFirebase ? firebase.firestore.FieldValue.serverTimestamp() : nowIso,
      updatedAt: this.isLiveFirebase ? firebase.firestore.FieldValue.serverTimestamp() : nowIso,
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      statusHistory: [
        {
          status: "PENDING_CONFIRMATION",
          timestamp: nowIso,
          note: "Booking submitted by customer. Awaiting operator confirmation call."
        }
      ]
    };

    if (this.isLiveFirebase) {
      await this.db.collection("bookings").doc(bookingId).set(record);
      // Return normalized representation
      record.createdAt = nowIso;
      record.updatedAt = nowIso;
      return record;
    } else {
      const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
      bookings.unshift(record);
      localStorage.setItem("gb_bookings_db", JSON.stringify(bookings));
      return record;
    }
  }

  /**
   * Load Bookings for Authenticated Customer
   */
  async getCustomerBookings() {
    if (!this.currentUser) return [];

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
      return bookings.filter(b => b.customerUid === this.currentUser.uid);
    }
  }

  /**
   * Get Specific Booking by ID
   */
  async getBookingById(bookingId) {
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
   * Permitted ONLY when status is PENDING_CONFIRMATION or CONFIRMED
   */
  async cancelBooking(bookingId, reason) {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.customerUid !== this.currentUser.uid) {
      throw new Error("Unauthorized to modify this booking");
    }

    const permittedStatuses = ["PENDING_CONFIRMATION", "CONFIRMED", "TECHNICIAN_ASSIGNMENT_PENDING"];
    if (!permittedStatuses.includes(booking.bookingStatus)) {
      throw new Error("This booking cannot be cancelled because a technician is already dispatched or work is in progress. Please call GharBijli support.");
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
    } else {
      const bookings = JSON.parse(localStorage.getItem("gb_bookings_db") || "[]");
      const idx = bookings.findIndex(b => b.bookingId === bookingId);
      if (idx !== -1) {
        bookings[idx].bookingStatus = "CANCELLED";
        bookings[idx].cancelledAt = nowIso;
        bookings[idx].cancellationReason = reason || "Customer request";
        bookings[idx].statusHistory.push(historyEntry);
        localStorage.setItem("gb_bookings_db", JSON.stringify(bookings));
      }
    }
    return true;
  }

  /**
   * Admin / Operator Mock Foundation
   * Strictly used for testing status transitions in isolated development environments
   */
  async operatorUpdateBookingStatus(bookingId, newStatus, technicianInfo = null, collectedAmount = null) {
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
      // In live mode, this requires admin role or server environment
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
}

// Export singleton instance
window.GharBijliFirebase = new GharBijliFirebaseService(GharBijliConfig);
