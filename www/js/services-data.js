/**
 * GharBijli Service Catalog (Urban Company Exact Design Specification)
 * Complete electrical services mapped to 11 official Urban Company categories.
 * All prices in INR, COD / Pay after service model, 30-day warranty, Bhilai & Durg local rates.
 */

const GharBijliCategories = [
  { id: "switch-socket", name: "Switch & socket", icon: "assets/categories/switch-socket.png" },
  { id: "fan", name: "Fan", icon: "assets/categories/fan.png" },
  { id: "light", name: "Light", icon: "assets/categories/light.png" },
  { id: "wiring", name: "Wiring", icon: "assets/categories/wiring.png" },
  { id: "doorbell-security", name: "Doorbell & security", icon: "assets/categories/doorbell-security.png" },
  { id: "mcb-submeter", name: "MCB & submeter", icon: "assets/categories/mcb-submeter.png" },
  { id: "inverter-stabiliser", name: "Inverter & stabiliser", icon: "assets/categories/inverter-stabiliser.png" },
  { id: "appliances", name: "TV & other appliances", icon: "assets/categories/appliances.png" },
  { id: "festive-lights", name: "Festive lights", icon: "assets/categories/festive-lights.png" },
  { id: "ev-charger", name: "EV charger installation", icon: "assets/categories/ev-charger.png" },
  { id: "consultation", name: "Book a consultation", icon: "assets/categories/consultation.png" }
];

const GharBijliServices = [
  // --- Switch & Socket ---
  {
    id: "switch-socket-repair",
    categoryId: "switch-socket",
    category: "Switches",
    categoryLabel: "Switch & socket",
    name: "Switch replace/ install",
    hindiName: "स्विच रिप्लेस / इन्स्टॉल",
    icon: "🔌",
    image: "assets/images/switch-repair.jpg",
    badge: "5 options",
    rating: 4.83,
    reviews: "229K reviews",
    mrp: "₹79",
    priceTag: "Starts at ₹49",
    priceNumber: 49,
    discountBadge: "38% OFF",
    warranty: "30-Day Guarantee",
    description: "Replacement or fresh fitting of 1-way, 2-way, or bell switches. Safe earthing check and testing included.",
    pricingType: "standard",
    estimatedDuration: "30 mins",
    highlights: [
      "Modular & non-modular switch fitting",
      "Short-circuit safety check included",
      "Pay cash after testing switch operation"
    ],
    included: [
      "Removal of old burnt/loose switch",
      "Wire striping, tightening & terminal connection",
      "Live voltage & load testing"
    ],
    excluded: [
      "Cost of switch board or modular plates",
      "Major concealed wall cutting"
    ]
  },
  {
    id: "socket-repair",
    categoryId: "switch-socket",
    category: "Switches",
    categoryLabel: "Switch & socket",
    name: "Socket replace/ install",
    hindiName: "सॉकेट रिप्लेस / इन्स्टॉल",
    icon: "🔌",
    image: "assets/images/switch-repair.jpg",
    badge: "5 options",
    rating: 4.83,
    reviews: "11K reviews",
    mrp: "₹99",
    priceTag: "Starts at ₹59",
    priceNumber: 59,
    discountBadge: "40% OFF",
    warranty: "30-Day Guarantee",
    description: "6A or 16A power socket fitting for heavy appliances like geyser, AC, microwave, or iron.",
    pricingType: "standard",
    estimatedDuration: "30 mins",
    highlights: [
      "6A and 16A power socket installation",
      "Proper neutral & ground earthing verification",
      "Pay cash after testing"
    ],
    included: [
      "Old socket removal and wire inspection",
      "Tight terminal fitting with earthing loop",
      "Load & polarity test"
    ],
    excluded: [
      "Cost of new socket (at actuals)"
    ]
  },
  {
    id: "switchboard-install-repair",
    categoryId: "switch-socket",
    category: "Switches",
    categoryLabel: "Switch & socket",
    name: "Full switchboard repair/replace",
    hindiName: "फुल स्विचबोर्ड रिपेयर / रिप्लेस",
    icon: "🎛️",
    image: "assets/images/switchboard.jpg",
    badge: "5 options",
    rating: 4.83,
    reviews: "61K reviews",
    mrp: "₹199",
    priceTag: "Starts at ₹129",
    priceNumber: 129,
    discountBadge: "35% OFF",
    warranty: "30-Day Guarantee",
    description: "Complete modular or wooden switchboard disassembly, terminal reconnection, burnt wire trimming and board fitting.",
    pricingType: "standard",
    estimatedDuration: "45 mins",
    highlights: [
      "Complete board rewiring & cleanup",
      "Sparks & loose contact rectification",
      "Pay cash after testing"
    ],
    included: [
      "Inspection of all switches, sockets & regulator",
      "Tightening all internal screw terminals",
      "Safety earthing continuity verification"
    ],
    excluded: [
      "Cost of new modular plate if broken"
    ]
  },

  // --- Fan ---
  {
    id: "fan-installation",
    categoryId: "fan",
    category: "Fans",
    categoryLabel: "Fan",
    name: "Regular ceiling fan installation",
    hindiName: "सीलिंग पंखा इन्स्टॉलेशन",
    icon: "🌀",
    image: "assets/images/fan-installation.jpg",
    badge: "3 options",
    rating: 4.85,
    reviews: "108K reviews",
    mrp: "₹149",
    priceTag: "Starts at ₹89",
    priceNumber: 89,
    discountBadge: "40% OFF",
    warranty: "30-Day Guarantee",
    description: "Ceiling fan assembly, blade alignment, down-rod hook fixing, regulator connection and balancing.",
    pricingType: "standard",
    estimatedDuration: "35 mins",
    highlights: [
      "Ceiling hook safety check & clamp locking",
      "Proper blade angle balancing for maximum air throw",
      "Pay cash after full speed run"
    ],
    included: [
      "Fan assembly and blade fitting",
      "Ceiling rod wiring & shackle connection",
      "Full speed test with regulator check"
    ],
    excluded: [
      "Cost of down-rod extension or ceiling anchor fastener"
    ]
  },
  {
    id: "fan-winding",
    categoryId: "fan",
    category: "Fans",
    categoryLabel: "Fan",
    name: "Smart/BLDC ceiling fan replace/install",
    hindiName: "स्मार्ट / BLDC पंखा रिप्लेस / इन्स्टॉल",
    icon: "🌀",
    image: "assets/images/fan-winding.jpg",
    badge: "3 options",
    rating: 4.83,
    reviews: "29K reviews",
    mrp: "₹149",
    priceTag: "Starts at ₹89",
    priceNumber: 89,
    discountBadge: "40% OFF",
    warranty: "30-Day Guarantee",
    description: "Specialized installation for BLDC smart fans with remote pairing, bypass wiring and balancing.",
    pricingType: "standard",
    estimatedDuration: "45 mins",
    highlights: [
      "Remote controller pairing & bypass wiring",
      "Quiet motor balancing and speed calibration",
      "Pay cash after remote testing"
    ],
    included: [
      "Bypassing mechanical wall regulator for BLDC",
      "Remote frequency calibration",
      "Full speed run test"
    ],
    excluded: [
      "Batteries for remote (unless in fan box)"
    ]
  },
  {
    id: "fan-repair",
    categoryId: "fan",
    category: "Fans",
    categoryLabel: "Fan",
    name: "Fan repair & noise fix",
    hindiName: "पंखा रिपेयर व आवाज़ ठीक करना",
    icon: "🌀",
    image: "assets/images/fan-repair.jpg",
    badge: "4 options",
    rating: 4.79,
    reviews: "91K reviews",
    mrp: "₹199",
    priceTag: "Starts at ₹119",
    priceNumber: 119,
    discountBadge: "40% OFF",
    warranty: "30-Day Guarantee",
    description: "Diagnosis and fix for slow speed, humming noise, wobbling, bearing jam or capacitor breakdown.",
    pricingType: "standard",
    estimatedDuration: "40 mins",
    highlights: [
      "Capacitor, bearing & motor speed diagnosis",
      "Wobble correction & noise elimination",
      "Pay cash after repair"
    ],
    included: [
      "Doorstep unmounting and blade balance check",
      "Capacitor health & motor humming diagnosis",
      "Cleanup after work"
    ],
    excluded: [
      "Cost of replacement capacitor/bearings (at actuals)"
    ]
  },

  // --- Light ---
  {
    id: "light-install-repair",
    categoryId: "light",
    category: "Lighting",
    categoryLabel: "Light",
    name: "Light & bulb installation",
    hindiName: "लाइट व बल्ब फिटिंग",
    icon: "💡",
    image: "assets/images/lighting.jpg",
    badge: "2 options",
    rating: 4.84,
    reviews: "346K reviews",
    mrp: "₹99",
    priceTag: "Starts at ₹69",
    priceNumber: 69,
    discountBadge: "30% OFF",
    warranty: "30-Day Guarantee",
    description: "Wall bracket light, LED bulb holder, ceiling batten or spot light replacement and fitting.",
    pricingType: "standard",
    estimatedDuration: "25 mins",
    highlights: [
      "Wall bracket, holder and LED fitting",
      "Clean drill hole & neat anchor mounting",
      "Pay cash after testing"
    ],
    included: [
      "Drill work and wall anchor screw fixing",
      "Wire striping, insulation & holder connection",
      "Light testing"
    ],
    excluded: [
      "Cost of light fixture itself"
    ]
  },

  // --- Wiring ---
  {
    id: "electrical-wiring",
    categoryId: "wiring",
    category: "Wiring",
    categoryLabel: "Wiring",
    name: "Short circuit & fault finding",
    hindiName: "शॉर्ट सर्किट व फॉल्ट रिपेयर",
    icon: "⚡",
    image: "assets/images/wiring.jpg",
    badge: "Most Urgent",
    rating: 4.88,
    reviews: "150K reviews",
    mrp: "₹299",
    priceTag: "Starts at ₹199",
    priceNumber: 199,
    discountBadge: "33% OFF",
    warranty: "30-Day Guarantee",
    description: "Multimeter diagnosis of tripping circuits, sparking joints, burnt insulation, and power blackouts.",
    pricingType: "inspection_based",
    estimatedDuration: "45 mins",
    highlights: [
      "Digital multimeter diagnosis for trip cause",
      "Identification of earth leakage and sparking",
      "Pay cash after power is safely restored"
    ],
    included: [
      "Circuit isolation & voltage check across points",
      "Burn joint reconnection and heat-shrink taping",
      "Safety reset test"
    ],
    excluded: [
      "Concealed wall chasing or major pipe laying"
    ]
  },

  // --- MCB & Submeter ---
  {
    id: "mcb-fuse-services",
    categoryId: "mcb-submeter",
    category: "Distribution",
    categoryLabel: "MCB & submeter",
    name: "Main board replace/install",
    hindiName: "मेन बोर्ड रिप्लेस / इन्स्टॉल",
    icon: "🛡️",
    image: "assets/images/mcb.jpg",
    badge: "2 options",
    rating: 4.82,
    reviews: "1K reviews",
    mrp: "₹349",
    priceTag: "Starts at ₹249",
    priceNumber: 249,
    discountBadge: "28% OFF",
    warranty: "30-Day Guarantee",
    description: "Distribution board box mounting, bus-bar connection, single-phase or 3-phase MCB fitting and load balance.",
    pricingType: "standard",
    estimatedDuration: "45 mins",
    highlights: [
      "Single/Double pole MCB installation",
      "Proper phase and neutral distribution",
      "Pay cash after trip testing"
    ],
    included: [
      "DIN rail mounting of MCB/RCCB breakers",
      "Heavy gauge bus-bar connection",
      "Trip button test under load"
    ],
    excluded: [
      "Cost of MCB units (at actuals)"
    ]
  },
  {
    id: "submeter-install",
    categoryId: "mcb-submeter",
    category: "Distribution",
    categoryLabel: "MCB & submeter",
    name: "Submeter installation",
    hindiName: "सबमीटर इन्स्टॉलेशन",
    icon: "📟",
    image: "assets/images/general.jpg",
    badge: "Verified",
    rating: 4.78,
    reviews: "3K reviews",
    mrp: "₹349",
    priceTag: "Starts at ₹229",
    priceNumber: 229,
    discountBadge: "34% OFF",
    warranty: "30-Day Guarantee",
    description: "Digital energy submeter installation for tenant rooms, rental flats, or commercial shops in Bhilai & Durg.",
    pricingType: "standard",
    estimatedDuration: "60 mins",
    highlights: [
      "Accurate tenant submeter wiring",
      "Tamper-proof terminal sealing & load check",
      "Pay cash after test"
    ],
    included: [
      "Wall board mounting",
      "Phase in/out and neutral wiring",
      "Pulse LED verification"
    ],
    excluded: [
      "Cost of the digital submeter unit"
    ]
  },

  // --- Inverter & Stabiliser ---
  {
    id: "inverter-services",
    categoryId: "inverter-stabiliser",
    category: "Inverters",
    categoryLabel: "Inverter & stabiliser",
    name: "Inverter installation/uninstallation",
    hindiName: "इन्वर्टर इन्स्टॉलेशन / अनइन्स्टॉल",
    icon: "🔋",
    image: "assets/images/inverter.jpg",
    badge: "3 options",
    rating: 4.78,
    reviews: "12K reviews",
    mrp: "₹449",
    priceTag: "Starts at ₹299",
    priceNumber: 299,
    discountBadge: "33% OFF",
    warranty: "30-Day Guarantee",
    description: "Complete setup for sine wave inverters, tubular battery connection, terminal greasing, and backup line routing.",
    pricingType: "standard",
    estimatedDuration: "60 mins",
    highlights: [
      "Heavy copper battery cable lugging & petroleum jelly coat",
      "Output circuit separation (lights, fans & TV)",
      "Pay cash after mains trip simulation"
    ],
    included: [
      "Terminal connection and polarity verification",
      "Distilled water level check",
      "Mains bypass test"
    ],
    excluded: [
      "Cost of battery trolley or new battery"
    ]
  },

  // --- Festive Lights ---
  {
    id: "festive-lighting",
    categoryId: "festive-lights",
    category: "Lighting",
    categoryLabel: "Festive lights",
    name: "Installation per string",
    hindiName: "फेस्टिवल लाइट स्ट्रिंग फिटिंग",
    icon: "✨",
    image: "assets/images/lighting.jpg",
    badge: "Seasonal Special",
    rating: 4.68,
    reviews: "7K reviews",
    mrp: "₹199",
    priceTag: "₹124 • 30 mins",
    priceNumber: 124,
    discountBadge: "38% OFF",
    warranty: "Service Guarantee",
    description: "Installation and secure hanging of 1 festive light string (up to 12m) with clip anchors and weatherproofing.",
    pricingType: "standard",
    estimatedDuration: "30 mins",
    highlights: [
      "1 string length can be upto 12m",
      "Installation charges for 1 light string",
      "Pay cash after illumination"
    ],
    included: [
      "Safe ladder work & nail/clip anchoring",
      "Connection to nearest wall outlet with fuse tap",
      "Water-resistant joint taping"
    ],
    excluded: [
      "Cost of light strings"
    ]
  },

  // --- EV Charger Installation ---
  {
    id: "ev-charger-services",
    categoryId: "ev-charger",
    category: "Wiring",
    categoryLabel: "EV charger installation",
    name: "2-Wheeler EV charger installation",
    hindiName: "2-व्हीलर EV चार्जर फिटिंग",
    icon: "⚡",
    image: "assets/images/wiring.jpg",
    badge: "Eco Fast",
    rating: 4.85,
    reviews: "120 reviews",
    mrp: "₹999",
    priceTag: "₹749 • 60 mins",
    priceNumber: 749,
    discountBadge: "25% OFF",
    warranty: "30-Day Guarantee",
    description: "Dedicated 16A earthing line from main board to parking bay for electric scooter charging.",
    pricingType: "standard",
    estimatedDuration: "60 mins",
    highlights: [
      "Dedicated 16A industrial plug & enclosure",
      "Rigorous earth resistance test for EV safety",
      "Pay cash after charge test"
    ],
    included: [
      "Surface conduit pipe laying up to 5 metres",
      "Weatherproof outdoor plug enclosure",
      "Charging cycle test"
    ],
    excluded: [
      "Extra wire over 5m (charged at actuals)"
    ]
  },

  // --- General Consultation ---
  {
    id: "other-electrical",
    categoryId: "consultation",
    category: "General",
    categoryLabel: "Book a consultation",
    name: "Doorstep consultation & inspection",
    hindiName: "घर पर इलेक्ट्रीशियन विज़िट व कोटेशन",
    icon: "👨‍🔧",
    image: "assets/images/electrician.jpg",
    badge: "Universal",
    rating: 4.89,
    reviews: "2.1k bookings in Bhilai",
    mrp: "₹149",
    priceTag: "Visitation ₹99",
    priceNumber: 99,
    discountBadge: "Fee Waived > ₹499",
    warranty: "Satisfaction Guaranteed",
    description: "Have a unique electrical problem or whole-home rewiring project? Book a verified senior electrician for doorstep assessment.",
    pricingType: "inspection_based",
    estimatedDuration: "30 mins",
    highlights: [
      "Full electrical health check of house",
      "Transparent upfront estimate before work starts",
      "Visitation fee waived if job > ₹499"
    ],
    included: [
      "Thorough multi-point inspection",
      "Detailed quote with transparent material costs",
      "Pay cash after inspection"
    ],
    excluded: [
      "Cost of actual electrical materials"
    ]
  }
];

// Node module export for tests + browser window attachment
if (typeof module !== "undefined" && module.exports) {
  module.exports = GharBijliServices;
}
if (typeof window !== "undefined") {
  window.GharBijliServices = GharBijliServices;
  window.GharBijliCategories = GharBijliCategories;
}
