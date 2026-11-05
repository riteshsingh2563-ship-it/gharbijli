/**
 * GharBijli Customer Application Configuration
 * Domain: gharbijli.me
 */
const GharBijliConfig = {
  app: {
    name: "GharBijli",
    hindiName: "घरबिजली",
    tagline: "घर की हर बिजली समस्या का पक्का हल",
    version: "1.2.0",
    serviceArea: "Bhilai & Durg (Chhattisgarh)",
    currency: "₹",
    supportEmail: "support@gharbijli.me",
    supportPhone: "+919876543210",
    supportWhatsApp: "919876543210",
    supportHours: "8:00 AM – 9:00 PM (Monday – Sunday)",
  },

  /**
   * Google Maps & Geolocation Configuration
   * Put your Google Maps API Key here. If placeholder, the app automatically runs interactive Leaflet/OSM engine.
   */
  maps: {
    googleMapsApiKey: "GOOGLE_MAPS_API_KEY_PLACEHOLDER",
    defaultCenter: {
      lat: 21.2120, // Bhilai Civic Centre / Nehru Nagar center
      lng: 81.3733,
      areaName: "Civic Centre, Bhilai"
    },
    defaultZoom: 15
  },

  firebase: {
    apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
    authDomain: "gharbijli-app.firebaseapp.com",
    projectId: "gharbijli-app",
    storageBucket: "gharbijli-app.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
  },

  auth: {
    defaultCountryCode: "+91",
    otpLength: 6,
    resendCooldownSeconds: 30,
    testNumbers: [
      { phone: "+919999999999", code: "123456", label: "Dev Test Account 1" },
      { phone: "+919876543210", code: "654321", label: "Dev Test Account 2" }
    ]
  },

  statuses: {
    PENDING_CONFIRMATION: {
      key: "PENDING_CONFIRMATION",
      label: "Booking Received",
      hindiLabel: "बुकिंग प्राप्त हुई",
      badgeClass: "badge-pending",
      description: "Booking received. Operator confirmation call will arrive shortly."
    },
    CONFIRMED: {
      key: "CONFIRMED",
      label: "Booking Confirmed",
      hindiLabel: "बुकिंग स्वीकृत",
      badgeClass: "badge-confirmed",
      description: "Booking verified with customer. Assigning local electrician."
    },
    TECHNICIAN_ASSIGNMENT_PENDING: {
      key: "TECHNICIAN_ASSIGNMENT_PENDING",
      label: "Matching Electrician",
      hindiLabel: "इलेक्ट्रीशियन खोज रहे हैं",
      badgeClass: "badge-assigned",
      description: "Finding the nearest verified electrical partner in Bhilai."
    },
    TECHNICIAN_ASSIGNED: {
      key: "TECHNICIAN_ASSIGNED",
      label: "Electrician Assigned",
      hindiLabel: "इलेक्ट्रीशियन नियुक्त",
      badgeClass: "badge-assigned",
      description: "Verified GharBijli partner assigned to your service request."
    },
    ON_THE_WAY: {
      key: "ON_THE_WAY",
      label: "On The Way",
      hindiLabel: "रास्ते में हैं",
      badgeClass: "badge-ontheway",
      description: "Partner has left and is traveling to your doorstep."
    },
    IN_PROGRESS: {
      key: "IN_PROGRESS",
      label: "Service In Progress",
      hindiLabel: "काम जारी है",
      badgeClass: "badge-inprogress",
      description: "Inspection and electrical repair work currently ongoing."
    },
    COMPLETED: {
      key: "COMPLETED",
      label: "Service Completed",
      hindiLabel: "कार्य पूर्ण",
      badgeClass: "badge-completed",
      description: "Work verified, completed and cash collected."
    },
    CANCELLED: {
      key: "CANCELLED",
      label: "Booking Cancelled",
      hindiLabel: "रद्द किया गया",
      badgeClass: "badge-cancelled",
      description: "This booking request was cancelled."
    }
  },

  payment: {
    defaultMethod: "CASH_ON_DELIVERY",
    methodLabel: "Cash on Delivery / Pay Cash After Service",
    statuses: {
      PENDING: "Payment Pending",
      COLLECTED: "Cash Collected",
      NOT_APPLICABLE: "Not Applicable"
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GharBijliConfig;
}
