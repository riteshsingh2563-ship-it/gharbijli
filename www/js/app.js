/**
 * GharBijli Android Application Controller
 * High-End Mobile Consumer UI, Navigation, Instant Search, Categorization, Booking & Tracking
 */

(function () {
  "use strict";

  // Application State
  let currentScreen = "home";
  let screenHistory = ["home"];
  let selectedService = null;
  let activeTrackingBookingId = null;
  let activeTab = "active";
  let isSubmitting = false;
  let currentSearchQuery = "";
  let selectedCategory = "ALL";
  let activeTimeSlot = "09:00 AM – 12:00 PM";
  let selectedDateString = "";

  // DOM Elements
  const screens = {
    home: document.getElementById("screen-home"),
    login: document.getElementById("screen-login"),
    serviceDetails: document.getElementById("screen-service-details"),
    bookingConfirmation: document.getElementById("screen-booking-confirmation"),
    myBookings: document.getElementById("screen-my-bookings"),
    tracking: document.getElementById("screen-tracking"),
    profile: document.getElementById("screen-profile"),
    help: document.getElementById("screen-help")
  };

  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  const offlineBanner = document.getElementById("offline-banner");
  const toastContainer = document.getElementById("toast-container");

  // ====================================================
  // NAVIGATION & ROUTING
  // ====================================================

  function navigateTo(screenId, pushHistory = true) {
    if (!screens[screenId]) return;

    Object.keys(screens).forEach((key) => {
      screens[key].classList.remove("active");
    });

    screens[screenId].classList.add("active");
    currentScreen = screenId;

    if (pushHistory && (screenHistory.length === 0 || screenHistory[screenHistory.length - 1] !== screenId)) {
      screenHistory.push(screenId);
    }

    // Scroll to top with smooth physics
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update top nav visibility
    const topNav = document.querySelector(".top-nav.uc-nav-bar");
    if (topNav) {
      topNav.style.display = screenId === "home" ? "flex" : "none";
    }

    // Update top back/menu button icon & action
    const navBackBtn = document.getElementById("btn-nav-back-circle");
    if (navBackBtn) {
      if (screenId === "home") {
        navBackBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        navBackBtn.title = "Categories Menu";
      } else {
        navBackBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
        navBackBtn.title = "Back";
      }
    }

    // Update bottom nav active indicator & visibility (hide ONLY on login)
    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav) {
      bottomNav.style.display = screenId === "login" ? "none" : "flex";
    }
    const floatMenu = document.getElementById("btn-floating-menu");
    const stickyDiscount = document.getElementById("sticky-bottom-discount");
    const stickyCart = document.getElementById("sticky-cart-bar");
    if (floatMenu) floatMenu.style.display = screenId === "home" ? "inline-flex" : "none";
    if (stickyDiscount) stickyDiscount.style.display = (screenId === "home" && getCartCount() === 0) ? "flex" : "none";
    if (stickyCart && screenId === "login") stickyCart.style.display = "none";
    updateBottomNav(screenId);

    // Screen specific lifecycle renders
    if (screenId === "home") {
      renderHomeScreen();
    } else if (screenId === "myBookings") {
      renderMyBookingsScreen();
    } else if (screenId === "profile") {
      renderProfileScreen();
    } else if (screenId === "tracking") {
      renderTrackingScreen();
    }
  }

  function goBack() {
    // If a modal bottom sheet is open, close it first
    const openModal = document.querySelector(".modal-overlay.active");
    if (openModal) {
      openModal.classList.remove("active");
      return;
    }

    if (screenHistory.length > 1) {
      screenHistory.pop(); // remove current
      const prevScreen = screenHistory[screenHistory.length - 1];
      navigateTo(prevScreen, false);
    } else {
      if (currentScreen !== "home") {
        navigateTo("home", false);
      } else {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
          window.Capacitor.Plugins.App.exitApp();
        }
      }
    }
  }

  function updateBottomNav(screenId) {
    navItems.forEach((btn) => {
      const target = btn.dataset.target;
      if (
        (target === "home" && screenId === "home") ||
        (target === "myBookings" && (screenId === "myBookings" || screenId === "tracking" || screenId === "bookingConfirmation")) ||
        (target === "help" && screenId === "help") ||
        (target === "profile" && screenId === "profile")
      ) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // ====================================================
  // TOAST NOTIFICATIONS
  // ====================================================

  function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✓" : type === "error" ? "⚠️" : "⚡";
    toast.innerHTML = `<span style="font-size:16px;">${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px) scale(0.95)";
      toast.style.transition = "all 0.28s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ====================================================
  // CAPACITOR NATIVE HOOKS
  // ====================================================

  function initCapacitorHooks() {
    if (window.Capacitor && window.Capacitor.Plugins) {
      const { App, StatusBar, SplashScreen, Network } = window.Capacitor.Plugins;

      if (StatusBar) {
        StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(() => {});
        StatusBar.setStyle({ style: "DARK" }).catch(() => {});
      }

      if (SplashScreen) {
        setTimeout(() => SplashScreen.hide().catch(() => {}), 400);
      }

      if (App) {
        App.addListener("backButton", () => {
          goBack();
        });
      }

      if (Network) {
        Network.getStatus().then((status) => {
          toggleOfflineBanner(!status.connected);
        });
        Network.addListener("networkStatusChange", (status) => {
          toggleOfflineBanner(!status.connected);
        });
      }
    } else {
      window.addEventListener("online", () => toggleOfflineBanner(false));
      window.addEventListener("offline", () => toggleOfflineBanner(true));
    }
  }

  function toggleOfflineBanner(isOffline) {
    const reallyOffline = isOffline && typeof navigator !== "undefined" && navigator.onLine === false;
    if (offlineBanner) {
      offlineBanner.classList.toggle("visible", reallyOffline);
    }
    if (reallyOffline) {
      showToast("No internet connection. Offline changes will sync when online.", "error");
    }
  }

  // ====================================================
  // 1. HOME SCREEN: SEARCH, FILTERS & CARDS
  // ====================================================

  function renderHomeScreen() {
    renderServicesGrid();
    renderHomeActiveBookingCard();
    updateUserNavIndicator();
  }

  // ====================================================
  // CART STATE & MANAGEMENT (URBAN COMPANY SPEC)
  // ====================================================
  const cart = {};

  function openMenuModal() {
    const modal = document.getElementById("uc-menu-modal");
    if (modal) modal.classList.add("active");
  }

  function closeMenuModal() {
    const modal = document.getElementById("uc-menu-modal");
    if (modal) modal.classList.remove("active");
  }

  function addToCart(serviceId) {
    cart[serviceId] = (cart[serviceId] || 0) + 1;
    updateCartUI();
    renderServicesGrid();
  }

  function removeFromCart(serviceId) {
    if (cart[serviceId] > 0) {
      cart[serviceId] -= 1;
      if (cart[serviceId] === 0) {
        delete cart[serviceId];
      }
    }
    updateCartUI();
    renderServicesGrid();
  }

  function getCartCount() {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }

  function getCartTotal() {
    let total = 0;
    Object.keys(cart).forEach((id) => {
      const s = GharBijliServices.find(item => item.id === id);
      if (s) {
        total += (s.priceNumber || 99) * cart[id];
      }
    });
    return total;
  }

  function updateCartUI() {
    const stickyCart = document.getElementById("sticky-cart-bar");
    const stickyDiscount = document.getElementById("sticky-bottom-discount");
    const countEl = document.getElementById("cart-item-count");
    const priceEl = document.getElementById("cart-total-price");

    const count = getCartCount();
    const total = getCartTotal();

    if (count > 0) {
      if (stickyDiscount) stickyDiscount.style.display = "none";
      if (stickyCart) {
        stickyCart.style.display = "flex";
        if (countEl) countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
        if (priceEl) priceEl.textContent = `₹${total}`;
      }
    } else {
      if (stickyDiscount) stickyDiscount.style.display = "flex";
      if (stickyCart) stickyCart.style.display = "none";
    }
  }

  function renderServicesGrid() {
    const grid = document.getElementById("services-grid");
    const countBadge = document.getElementById("services-count-badge");
    if (!grid) return;

    grid.innerHTML = "";

    const categoriesOrder = [
      { id: "switch-socket", title: "Switch & socket" },
      { id: "fan", title: "Fan" },
      { id: "light", title: "Light" },
      { id: "wiring", title: "Wiring" },
      { id: "mcb-submeter", title: "MCB & submeter" },
      { id: "inverter-stabiliser", title: "Inverter & stabiliser" },
      { id: "appliances", title: "TV & other appliances" },
      { id: "festive-lights", title: "Festive lights" },
      { id: "ev-charger", title: "EV charger installation" },
      { id: "consultation", title: "Book a consultation" }
    ];

    let activeServices = GharBijliServices;
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      activeServices = GharBijliServices.filter(s => 
        s.name.toLowerCase().includes(q) ||
        (s.hindiName && s.hindiName.toLowerCase().includes(q)) ||
        (s.categoryLabel && s.categoryLabel.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q)
      );
    }

    if (countBadge) {
      countBadge.textContent = `${activeServices.length} Services`;
    }

    if (activeServices.length === 0) {
      grid.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; background: #ffffff; border-radius: 16px; border: 1.5px dashed var(--border); margin: 20px 0;">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <h4 style="font-size: 15px; font-weight: 800; color: var(--ink);">No services matching "${currentSearchQuery}"</h4>
          <p style="font-size: 12px; color: var(--ink-muted); margin-top: 4px;">Try searching for "fan", "switch", "wiring", or "MCB"</p>
          <button id="btn-reset-search-empty" class="btn btn-secondary" style="width: auto; padding: 8px 18px; margin-top: 14px; font-size: 12px;">
            Show All Services
          </button>
        </div>
      `;
      const resetBtn = document.getElementById("btn-reset-search-empty");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          const searchInput = document.getElementById("search-services-input");
          if (searchInput) searchInput.value = "";
          currentSearchQuery = "";
          renderServicesGrid();
        });
      }
      return;
    }

    categoriesOrder.forEach(cat => {
      const catServices = activeServices.filter(s => s.categoryId === cat.id);
      if (catServices.length === 0) return;

      const sectionEl = document.createElement("div");
      sectionEl.className = "uc-category-section";
      sectionEl.id = `cat-section-${cat.id}`;

      const headerEl = document.createElement("h2");
      headerEl.className = "uc-category-section-title";
      headerEl.textContent = cat.title;
      sectionEl.appendChild(headerEl);

      catServices.forEach(service => {
        const row = document.createElement("div");
        row.className = "uc-service-card-row";

        const qty = cart[service.id] || 0;

        let bulletsHtml = "";
        if (service.highlights && service.highlights.length > 0) {
          bulletsHtml = `
            <ul class="uc-service-bullets">
              ${service.highlights.slice(0, 2).map(h => `<li>${h}</li>`).join('')}
            </ul>
          `;
        }

        let btnBoxHtml = "";
        if (qty > 0) {
          btnBoxHtml = `
            <div class="uc-qty-stepper">
              <button class="uc-qty-btn btn-dec" data-id="${service.id}" type="button">−</button>
              <span class="uc-qty-val">${qty}</span>
              <button class="uc-qty-btn btn-inc" data-id="${service.id}" type="button">+</button>
            </div>
          `;
        } else {
          btnBoxHtml = `
            <button class="uc-btn-add" data-id="${service.id}" type="button">Add</button>
          `;
        }

        row.innerHTML = `
          <div class="uc-service-left-col">
            <h3 class="uc-service-title">${service.name}</h3>
            <div class="uc-service-rating-row">
              <span class="uc-star">★</span>
              <span>${service.rating || '4.83'}</span>
              <span class="uc-service-reviews">(${service.reviews || '200K reviews'})</span>
            </div>
            <div class="uc-service-price-time">
              <span>${service.priceTag || 'Starts at ₹49'}</span>
              <span class="uc-service-time-dot">•</span>
              <span class="uc-service-duration">${service.estimatedDuration || '30 mins'}</span>
            </div>
            ${bulletsHtml}
            <a href="javascript:void(0)" class="uc-view-details-link" data-id="${service.id}">View details</a>
          </div>
          <div class="uc-service-right-col">
            <div class="uc-service-img-wrap">
              <img src="${service.image}" alt="${service.name}" loading="lazy" />
            </div>
            <div class="uc-service-btn-box">
              ${btnBoxHtml}
            </div>
            <span class="uc-options-label">${service.badge || '3 options'}</span>
          </div>
        `;

        const addBtn = row.querySelector(".uc-btn-add");
        if (addBtn) {
          addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            addToCart(service.id);
          });
        }
        const incBtn = row.querySelector(".btn-inc");
        if (incBtn) {
          incBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            addToCart(service.id);
          });
        }
        const decBtn = row.querySelector(".btn-dec");
        if (decBtn) {
          decBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFromCart(service.id);
          });
        }
        const detailsLink = row.querySelector(".uc-view-details-link");
        if (detailsLink) {
          detailsLink.addEventListener("click", (e) => {
            e.stopPropagation();
            openServiceDetails(service.id);
          });
        }

        sectionEl.appendChild(row);
      });

      grid.appendChild(sectionEl);
    });
  }

  function updateCategoryChips() {
    document.querySelectorAll(".category-chip").forEach((chip) => {
      if (chip.dataset.category === selectedCategory) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });
  }

  async function renderHomeActiveBookingCard() {
    const container = document.getElementById("home-active-booking-container");
    const navBadge = document.getElementById("nav-booking-badge");
    if (!container) return;

    if (!window.GharBijliFirebase.currentUser) {
      container.innerHTML = "";
      if (navBadge) navBadge.style.display = "none";
      return;
    }

    try {
      const bookings = await window.GharBijliFirebase.getCustomerBookings();
      const active = bookings.find((b) => b.bookingStatus !== "COMPLETED" && b.bookingStatus !== "CANCELLED");

      if (navBadge) {
        navBadge.style.display = active ? "block" : "none";
      }

      if (active) {
        const statusMeta = GharBijliConfig.statuses[active.bookingStatus] || {};
        container.innerHTML = `
          <div class="booking-card" style="border-left: 4px solid var(--primary); margin-bottom: 20px; box-shadow: var(--shadow-md);">
            <div class="booking-card-top">
              <span class="booking-id-tag">${active.bookingId}</span>
              <span class="status-badge ${statusMeta.badgeClass || ''}">${statusMeta.label || active.bookingStatus}</span>
            </div>
            <div class="booking-card-service">${active.serviceNameSnapshot}</div>
            <div class="booking-card-datetime">
              <span>📅 ${active.preferredDate}</span> • <span>⏰ ${active.preferredTimeSlot}</span>
            </div>
            <div class="booking-card-footer">
              <span style="font-size: 11px; font-weight: 700; color: var(--success-dark);">💵 Cash After Service</span>
              <button class="btn btn-primary" style="width: auto; padding: 6px 14px; font-size: 12px;" id="btn-track-active-home">
                Track Live Status →
              </button>
            </div>
          </div>
        `;
        document.getElementById("btn-track-active-home").addEventListener("click", () => {
          openTracking(active.bookingId);
        });
      } else {
        container.innerHTML = "";
      }
    } catch (err) {
      container.innerHTML = "";
    }
  }

  function updateUserNavIndicator() {
    const label = document.getElementById("top-user-label");
    const userBtn = document.getElementById("top-user-indicator");
    const user = window.GharBijliFirebase ? window.GharBijliFirebase.currentUser : null;
    if (userBtn && label) {
      if (user && user.phoneNumber) {
        userBtn.title = `Account: ${user.phoneNumber}`;
        label.innerHTML = `👤<span style="position:absolute; bottom:3px; right:3px; width:7px; height:7px; background:#059669; border-radius:50%; border:1.5px solid #fff;"></span>`;
      } else {
        userBtn.title = "Log In or Sign Up";
        label.innerHTML = `👤`;
      }
    }
  }

  // ====================================================
  // 2. SERVICE DETAILS & SCHEDULING FORM
  // ====================================================

  function openServiceDetails(serviceId, preselectedSlot = null) {
    selectedService = GharBijliServices.find((s) => s.id === serviceId);
    if (!selectedService) return;

    const iconContainer = document.getElementById("detail-service-icon");
    if (iconContainer) {
      if (selectedService.image) {
        iconContainer.innerHTML = `<img src="${selectedService.image}" alt="${selectedService.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 14px;" />`;
      } else {
        iconContainer.textContent = selectedService.icon;
      }
    }
    document.getElementById("detail-service-title").textContent = selectedService.name;
    document.getElementById("detail-service-hindi").textContent = selectedService.hindiName;
    document.getElementById("detail-service-desc").textContent = selectedService.description;
    document.getElementById("detail-service-price").textContent = selectedService.priceNote;
    document.getElementById("detail-service-duration").textContent = selectedService.estimatedDuration;

    // Common issues chips
    const issuesContainer = document.getElementById("detail-common-issues");
    issuesContainer.innerHTML = "";
    if (selectedService.commonIssues && selectedService.commonIssues.length > 0) {
      selectedService.commonIssues.forEach((issue) => {
        const span = document.createElement("span");
        span.className = "quick-chip";
        span.textContent = issue;
        span.addEventListener("click", () => {
          const problemInput = document.getElementById("booking-problem-desc");
          if (problemInput) {
            problemInput.value = issue;
            showToast(`Added problem: "${issue}"`, "info");
          }
        });
        issuesContainer.appendChild(span);
      });
    }

    // Populate Urban Company Inclusions & Exclusions
    const includedList = document.getElementById("detail-included-list");
    if (includedList && selectedService.included) {
      includedList.innerHTML = selectedService.included.map((item) => `
        <li><span class="uc-green-tick">✓</span> <span>${item}</span></li>
      `).join('');
    }
    const excludedList = document.getElementById("detail-excluded-list");
    if (excludedList && selectedService.excluded) {
      excludedList.innerHTML = selectedService.excluded.map((item) => `
        <li><span class="uc-red-cross">✕</span> <span>${item}</span></li>
      `).join('');
    }

    // Pre-fill user name if logged in
    const user = window.GharBijliFirebase.currentUser;
    if (user && user.displayName) {
      document.getElementById("booking-customer-name").value = user.displayName;
    }

    // Initialize Date Pills (Today, Tomorrow, Day After)
    initDatePills();

    // Time Slot selection handling
    if (preselectedSlot) {
      activeTimeSlot = preselectedSlot;
    }
    updateTimeSlotPills();

    navigateTo("serviceDetails");
  }

  function initDatePills() {
    const pillsRow = document.getElementById("quick-date-pills");
    const dateInput = document.getElementById("booking-date");
    if (!pillsRow || !dateInput) return;

    pillsRow.innerHTML = "";
    const today = new Date();
    const days = ["Today", "Tomorrow", "Day After"];

    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const isoDate = `${yyyy}-${mm}-${dd}`;

      const monthName = d.toLocaleDateString("en-IN", { month: "short" });
      const dayFormatted = `${dd} ${monthName}`;

      if (i === 0 && !dateInput.value) {
        dateInput.value = isoDate;
        dateInput.min = isoDate;
        selectedDateString = isoDate;
      }

      const pill = document.createElement("div");
      pill.className = `date-pill ${i === 0 ? "active" : ""}`;
      pill.dataset.date = isoDate;
      pill.innerHTML = `
        <div class="pill-day">${days[i]}</div>
        <div class="pill-date">${dayFormatted}</div>
      `;

      pill.addEventListener("click", () => {
        document.querySelectorAll(".date-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        dateInput.value = isoDate;
        selectedDateString = isoDate;
      });

      pillsRow.appendChild(pill);
    }

    dateInput.addEventListener("change", (e) => {
      selectedDateString = e.target.value;
      document.querySelectorAll(".date-pill").forEach((p) => {
        if (p.dataset.date === selectedDateString) {
          p.classList.add("active");
        } else {
          p.classList.remove("active");
        }
      });
    });
  }

  function updateTimeSlotPills() {
    const slotPills = document.querySelectorAll(".slot-pill");
    const hiddenSlotInput = document.getElementById("booking-time-slot");

    slotPills.forEach((pill) => {
      if (pill.dataset.slot === activeTimeSlot) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });

    if (hiddenSlotInput) {
      hiddenSlotInput.value = activeTimeSlot;
    }
  }

  // ====================================================
  // 3. BOOKING SUBMISSION & CONFIRMATION
  // ====================================================

  async function handleBookingSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!window.GharBijliFirebase.currentUser) {
      showToast("Please log in with your mobile number to schedule.", "info");
      navigateTo("login");
      return;
    }

    const customerName = document.getElementById("booking-customer-name").value.trim();
    const houseNo = document.getElementById("address-house").value.trim();
    const street = document.getElementById("address-street").value.trim();
    const landmark = document.getElementById("address-landmark").value.trim();
    const pincode = document.getElementById("address-pincode").value.trim();
    const city = document.getElementById("address-city").value.trim() || "Patna, Bihar";
    const preferredDate = document.getElementById("booking-date").value;
    const preferredTimeSlot = document.getElementById("booking-time-slot").value || activeTimeSlot;
    const problemDesc = document.getElementById("booking-problem-desc").value.trim();

    // Validation
    if (!customerName) {
      showToast("Please enter your name.", "error");
      return;
    }
    if (!houseNo || !street) {
      showToast("Please enter your complete address (House/Flat & Street).", "error");
      return;
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      showToast("Please enter a valid 6-digit Patna pincode (e.g. 800001).", "error");
      return;
    }
    if (!preferredDate) {
      showToast("Please select your service date.", "error");
      return;
    }

    // Update profile display name if entered
    if (customerName && customerName !== window.GharBijliFirebase.currentUser.displayName) {
      await window.GharBijliFirebase.updateProfileName(customerName);
    }

    const submitBtn = document.getElementById("btn-submit-booking");
    submitBtn.disabled = true;
    submitBtn.textContent = "Scheduling visit...";
    isSubmitting = true;

    try {
      const fullAddress = `${houseNo}, ${street}${landmark ? ', Near ' + landmark : ''}, ${city} - ${pincode}`;
      const latEl = document.getElementById("booking-lat");
      const lngEl = document.getElementById("booking-lng");
      const coordinates = {
        lat: latEl ? (parseFloat(latEl.value) || 25.6093) : 25.6093,
        lng: lngEl ? (parseFloat(lngEl.value) || 85.1235) : 85.1235
      };

      const bookingData = {
        serviceId: selectedService.id,
        serviceNameSnapshot: selectedService.name,
        pricingTypeSnapshot: selectedService.pricingType,
        addressSnapshot: {
          houseNo,
          street,
          landmark,
          pincode,
          city,
          fullAddress,
          coordinates
        },
        preferredDate,
        preferredTimeSlot,
        issueDescription: problemDesc,
        customerNotes: problemDesc
      };

      const createdRecord = await window.GharBijliFirebase.createBooking(bookingData);
      showToast("Booking request registered successfully! Operator will call shortly.", "success");
      openConfirmationScreen(createdRecord);
    } catch (err) {
      showToast(err.message || "Failed to schedule booking. Please retry.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Schedule Service Visit →";
      isSubmitting = false;
    }
  }

  function openConfirmationScreen(record) {
    document.getElementById("confirm-booking-id").textContent = record.bookingId;
    document.getElementById("confirm-service-name").textContent = record.serviceNameSnapshot;
    document.getElementById("confirm-date").textContent = record.preferredDate;
    document.getElementById("confirm-time-slot").textContent = record.preferredTimeSlot;
    document.getElementById("confirm-address").textContent = record.addressSnapshot.fullAddress;

    activeTrackingBookingId = record.bookingId;
    screenHistory = ["home"];
    navigateTo("bookingConfirmation");
  }

  // ====================================================
  // 4. PHONE LOGIN & OTP VERIFICATION
  // ====================================================

  let confirmationResultHolder = null;
  let otpResendTimerInterval = null;

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    const phoneInput = document.getElementById("login-phone-number");
    const rawDigits = phoneInput.value.replace(/\D/g, "");

    if (rawDigits.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    const fullPhoneNumber = `+91${rawDigits}`;
    const sendBtn = document.getElementById("btn-send-otp");
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending OTP...";

    try {
      const fn = window.GharBijliFirebase.requestPhoneOtp || window.GharBijliFirebase.sendPhoneVerificationCode;
      const result = await fn.call(window.GharBijliFirebase, fullPhoneNumber, "recaptcha-container");
      confirmationResultHolder = result;

      document.getElementById("otp-sent-to-number").textContent = fullPhoneNumber;
      document.getElementById("auth-step-phone").style.display = "none";
      document.getElementById("auth-step-otp").style.display = "block";

      startOtpResendTimer();
      focusFirstOtpBox();

      // If test number, auto-fill dev code 123456
      if (rawDigits === "9999999999") {
        fillOtpDigits("123456");
        showToast("Dev mode: Auto-filled test OTP 123456", "info");
      } else {
        showToast(`Verification code sent to ${fullPhoneNumber}`, "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to send OTP. Please retry.", "error");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Get Verification OTP →";
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    const digitInputs = document.querySelectorAll(".otp-digit");
    let code = "";
    digitInputs.forEach((input) => (code += input.value.trim()));

    if (code.length !== 6) {
      showToast("Please enter all 6 digits of the OTP.", "error");
      return;
    }

    const verifyBtn = document.getElementById("btn-verify-otp");
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";

    try {
      const fn = window.GharBijliFirebase.verifyOtpCode || window.GharBijliFirebase.confirmVerificationCode;
      const user = await fn.call(window.GharBijliFirebase, code);
      showToast("Phone verified successfully! Welcome to GharBijli.", "success");

      // Reset login form
      document.getElementById("auth-step-otp").style.display = "none";
      document.getElementById("auth-step-phone").style.display = "block";
      digitInputs.forEach((i) => (i.value = ""));

      updateUserNavIndicator();

      // Return to service details if user was in booking flow, else profile or home
      if (selectedService) {
        navigateTo("serviceDetails");
      } else if (screenHistory.includes("profile")) {
        navigateTo("profile");
      } else {
        navigateTo("home");
      }
    } catch (err) {
      showToast(err.message || "Invalid OTP code. Please retry.", "error");
      digitInputs.forEach((i) => (i.value = ""));
      focusFirstOtpBox();
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify & Proceed →";
    }
  }

  function startOtpResendTimer() {
    let timeLeft = GharBijliConfig.auth.resendCooldownSeconds || 30;
    const timerText = document.getElementById("otp-timer-text");
    const resendBtn = document.getElementById("btn-resend-otp");

    if (resendBtn) resendBtn.disabled = true;
    clearInterval(otpResendTimerInterval);

    otpResendTimerInterval = setInterval(() => {
      timeLeft--;
      if (timerText) timerText.textContent = `Resend in ${timeLeft}s`;

      if (timeLeft <= 0) {
        clearInterval(otpResendTimerInterval);
        if (timerText) timerText.textContent = "";
        if (resendBtn) resendBtn.disabled = false;
      }
    }, 1000);
  }

  function focusFirstOtpBox() {
    const first = document.querySelector(".otp-digit");
    if (first) first.focus();
  }

  function fillOtpDigits(code) {
    const inputs = document.querySelectorAll(".otp-digit");
    for (let i = 0; i < inputs.length && i < code.length; i++) {
      inputs[i].value = code[i];
    }
  }

  function setupOtpAutoAdvance() {
    const inputs = document.querySelectorAll(".otp-digit");
    inputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        if (input.value.length === 1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
        // Auto submit if all 6 digits entered
        let full = "";
        inputs.forEach((i) => (full += i.value));
        if (full.length === 6) {
          const form = document.getElementById("form-otp-verify");
          if (form) form.requestSubmit();
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });

      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (pasted.length === 6) {
          fillOtpDigits(pasted);
          const form = document.getElementById("form-otp-verify");
          if (form) form.requestSubmit();
        }
      });
    });
  }

  // ====================================================
  // 5. MY BOOKINGS SCREEN
  // ====================================================

  async function renderMyBookingsScreen() {
    const listEl = document.getElementById("my-bookings-list");
    if (!listEl) return;

    if (!window.GharBijliFirebase.currentUser) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; background: #ffffff; border-radius: var(--radius-lg); border: 1.5px solid var(--border);">
          <div style="font-size: 40px; margin-bottom: 12px;">📱</div>
          <h4 style="font-size: 16px; font-weight: 850; color: var(--ink);">Log In to View Bookings</h4>
          <p style="font-size: 12.5px; color: var(--ink-muted); margin: 6px 0 16px;">Enter your phone number to track live status and technician dispatch.</p>
          <button class="btn uc-auth-btn-primary" id="btn-login-from-bookings" style="width: auto !important; margin: 0 auto; padding: 12px 28px !important; font-size: 14px !important;">Log In with Mobile →</button>
        </div>
      `;
      document.getElementById("btn-login-from-bookings").addEventListener("click", () => navigateTo("login"));
      return;
    }

    listEl.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--ink-muted);">Loading your bookings...</div>`;

    try {
      const allBookings = await window.GharBijliFirebase.getCustomerBookings();

      const filtered = allBookings.filter((b) => {
        const isClosed = b.bookingStatus === "COMPLETED" || b.bookingStatus === "CANCELLED";
        return activeTab === "active" ? !isClosed : isClosed;
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 40px 16px; background: #ffffff; border-radius: var(--radius-lg); border: 1.5px dashed var(--border);">
            <div style="font-size: 36px; margin-bottom: 10px;">⚡</div>
            <h4 style="font-size: 16px; font-weight: 850; color: var(--ink);">${activeTab === 'active' ? 'No Active Bookings' : 'No Past Bookings'}</h4>
            <p style="font-size: 12.5px; color: var(--ink-muted); margin: 4px 0 16px;">${activeTab === 'active' ? 'Need electrical repair in Patna? Book a verified electrician in 60 seconds.' : 'Your completed and cancelled services will appear here.'}</p>
            ${activeTab === 'active' ? '<button class="btn btn-primary" id="btn-book-from-empty" style="width: auto; padding: 10px 24px;">Explore Electrical Services →</button>' : ''}
          </div>
        `;
        const bookBtn = document.getElementById("btn-book-from-empty");
        if (bookBtn) bookBtn.addEventListener("click", () => navigateTo("home"));
        return;
      }

      listEl.innerHTML = "";

      filtered.forEach((booking) => {
        const statusMeta = GharBijliConfig.statuses[booking.bookingStatus] || {};
        const card = document.createElement("div");
        card.className = "booking-card";
        card.innerHTML = `
          <div class="booking-card-top">
            <span class="booking-id-tag">${booking.bookingId}</span>
            <span class="status-badge ${statusMeta.badgeClass || ''}">${statusMeta.label || booking.bookingStatus}</span>
          </div>
          <div class="booking-card-service">${booking.serviceNameSnapshot}</div>
          <div class="booking-card-datetime">
            <span>📅 ${booking.preferredDate}</span> • <span>⏰ ${booking.preferredTimeSlot}</span>
          </div>
          <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
            📍 ${booking.addressSnapshot ? booking.addressSnapshot.fullAddress : 'Patna'}
          </div>
          <div class="booking-card-footer">
            <span style="font-size: 11.5px; font-weight: 750; color: var(--success-dark);">💵 Cash After Service</span>
            <button class="btn btn-primary btn-track-card" data-id="${booking.bookingId}" style="width: auto; padding: 6px 14px; font-size: 12px;">
              Track Status →
            </button>
          </div>
        `;

        card.querySelector(".btn-track-card").addEventListener("click", (e) => {
          e.stopPropagation();
          openTracking(booking.bookingId);
        });
        listEl.appendChild(card);
      });
    } catch (err) {
      listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#dc2626;">Failed to load bookings: ${err.message}</div>`;
    }
  }

  // ====================================================
  // 6. LIVE STATUS TRACKING SCREEN (CANONICAL 8 STAGES)
  // ====================================================

  async function openTracking(bookingId) {
    activeTrackingBookingId = bookingId;
    navigateTo("tracking");
  }

  async function renderTrackingScreen() {
    if (!activeTrackingBookingId) {
      navigateTo("myBookings");
      return;
    }

    try {
      const booking = await window.GharBijliFirebase.getBookingById(activeTrackingBookingId);
      if (!booking) {
        showToast("Booking record not found.", "error");
        navigateTo("myBookings");
        return;
      }

      document.getElementById("tracking-booking-id-tag").textContent = booking.bookingId;
      document.getElementById("tracking-service-title").textContent = booking.serviceNameSnapshot;

      const statusMeta = GharBijliConfig.statuses[booking.bookingStatus] || {};
      const badgeEl = document.getElementById("tracking-status-badge");
      badgeEl.className = `status-badge ${statusMeta.badgeClass || ''}`;
      badgeEl.textContent = statusMeta.label || booking.bookingStatus;

      document.getElementById("tracking-status-desc").textContent = statusMeta.description || "";
      document.getElementById("tracking-address-text").textContent = booking.addressSnapshot ? booking.addressSnapshot.fullAddress : "Patna";

      // Render Verified Partner Profile Card
      renderTrackingPartnerCard(booking);

      // Render Canonical 8-Stage Timeline
      renderTrackingTimeline(booking.bookingStatus);

      // Disable cancel button if already on the way or in progress
      const cancelBtn = document.getElementById("btn-cancel-booking-trigger");
      const unCancellable = ["ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(booking.bookingStatus);
      if (cancelBtn) {
        cancelBtn.style.display = unCancellable ? "none" : "block";
      }
    } catch (err) {
      showToast("Error loading booking details: " + err.message, "error");
    }
  }

  function renderTrackingPartnerCard(booking) {
    const container = document.getElementById("tracking-partner-container");
    if (!container) return;

    const assigned = ["TECHNICIAN_ASSIGNED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"].includes(booking.bookingStatus);

    if (assigned) {
      const partnerName = booking.technicianName || "Manoj Kumar";
      const partnerRating = booking.technicianRating || "4.9 ★ (142 repairs)";
      const partnerPhone = booking.technicianPhone || "+919876543210";

      container.innerHTML = `
        <div class="partner-profile-card">
          <div class="partner-avatar-wrap">
            <div class="partner-avatar-img">👷‍♂️</div>
            <div class="partner-info">
              <h4>${partnerName}</h4>
              <div class="partner-badge">
                <span>🛡️</span> Verified GharBijli Partner • ${partnerRating}
              </div>
            </div>
          </div>
          <a href="tel:${partnerPhone}" class="partner-call-btn">
            📞 Call
          </a>
        </div>
      `;
    } else {
      container.innerHTML = "";
    }
  }

  function renderTrackingTimeline(currentStatus) {
    const list = document.getElementById("tracking-timeline-list");
    if (!list) return;

    const stageKeys = [
      "PENDING_CONFIRMATION",
      "CONFIRMED",
      "TECHNICIAN_ASSIGNMENT_PENDING",
      "TECHNICIAN_ASSIGNED",
      "ON_THE_WAY",
      "IN_PROGRESS",
      "COMPLETED"
    ];

    const currentIndex = stageKeys.indexOf(currentStatus);
    const isCancelled = currentStatus === "CANCELLED";

    list.innerHTML = "";

    stageKeys.forEach((key, index) => {
      const meta = GharBijliConfig.statuses[key] || {};
      const item = document.createElement("div");

      let itemClass = "timeline-item";
      let markerText = (index + 1).toString();

      if (isCancelled) {
        itemClass += " cancelled";
      } else if (index < currentIndex) {
        itemClass += " done";
        markerText = "✓";
      } else if (index === currentIndex) {
        itemClass += " active";
      }

      item.className = itemClass;
      item.innerHTML = `
        <div class="timeline-marker">${markerText}</div>
        <div class="timeline-content">
          <h5>${meta.label} <span style="font-size:11px; font-weight:normal; color:var(--ink-muted);">(${meta.hindiLabel})</span></h5>
          <p>${meta.description}</p>
        </div>
      `;
      list.appendChild(item);
    });

    if (isCancelled) {
      const cancelItem = document.createElement("div");
      cancelItem.className = "timeline-item active";
      cancelItem.innerHTML = `
        <div class="timeline-marker" style="background:var(--urgent); border-color:var(--urgent); color:#fff;">✕</div>
        <div class="timeline-content">
          <h5 style="color:var(--urgent);">Booking Cancelled (रद्द किया गया)</h5>
          <p>This service request was cancelled.</p>
        </div>
      `;
      list.appendChild(cancelItem);
    }
  }

  // ====================================================
  // 7. USER PROFILE SCREEN
  // ====================================================

  function renderProfileScreen() {
    const user = window.GharBijliFirebase.currentUser;
    const loggedInView = document.getElementById("profile-logged-in-view");
    const guestView = document.getElementById("profile-guest-view");
    const phoneEl = document.getElementById("profile-display-phone");

    if (user) {
      if (loggedInView) loggedInView.style.display = "block";
      if (guestView) guestView.style.display = "none";
      if (phoneEl) {
        let phone = user.phoneNumber || "+91 99999 99999";
        if (phone.startsWith("+91") && phone.length === 13) {
          phone = `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
        }
        phoneEl.textContent = phone;
      }
    } else {
      if (loggedInView) loggedInView.style.display = "none";
      if (guestView) guestView.style.display = "block";
    }
  }

  // ====================================================
  // 8. EVENT LISTENERS & INITIALIZATION
  // ====================================================

  function bindEvents() {
    // Brand Logo Home Navigation
    const brandBtn = document.getElementById("btn-brand-home");
    if (brandBtn) {
      brandBtn.addEventListener("click", () => navigateTo("home"));
    }

    // Top Navigation Back Button Circle (Menu on Home, Back on Sub-screens)
    const navBackBtn = document.getElementById("btn-nav-back-circle");
    if (navBackBtn) {
      navBackBtn.addEventListener("click", () => {
        if (currentScreen === "home") {
          openMenuModal();
        } else {
          goBack();
        }
      });
    }

    // Top Navigation Search Button Circle
    const navSearchBtn = document.getElementById("btn-nav-search-circle");
    const searchWrap = document.getElementById("search-bar-wrap");
    if (navSearchBtn && searchWrap) {
      navSearchBtn.addEventListener("click", () => {
        if (searchWrap.style.display === "none" || !searchWrap.style.display) {
          searchWrap.style.display = "flex";
          const input = document.getElementById("search-services-input");
          if (input) input.focus();
        } else {
          searchWrap.style.display = "none";
        }
      });
    }

    // Top Navigation Share Button Circle
    const navShareBtn = document.getElementById("btn-nav-share-circle");
    if (navShareBtn) {
      navShareBtn.addEventListener("click", () => {
        if (navigator.share) {
          navigator.share({
            title: "GharBijli Electricians in Patna",
            text: "Book certified electricians in Patna starting at ₹49 with GharBijli",
            url: "https://gharbijli.me"
          }).catch(() => {});
        } else {
          showToast("GharBijli link copied! Share with family & friends", "info");
        }
      });
    }

    // Floating Menu Button (Screenshot_2026-11-02-20-49-02-43)
    const floatMenuBtn = document.getElementById("btn-floating-menu");
    const menuModal = document.getElementById("uc-menu-modal");
    const menuCloseBtn = document.getElementById("btn-uc-menu-close");

    if (floatMenuBtn) floatMenuBtn.addEventListener("click", openMenuModal);
    if (menuCloseBtn) menuCloseBtn.addEventListener("click", closeMenuModal);
    if (menuModal) {
      menuModal.addEventListener("click", (e) => {
        if (e.target === menuModal) closeMenuModal();
      });
    }

    // Category Grid and Menu Scroll Navigation
    function scrollToCategory(categoryId) {
      closeMenuModal();
      const targetSection = document.getElementById(`cat-section-${categoryId}`);
      if (targetSection) {
        const topOffset = targetSection.getBoundingClientRect().top + window.pageYOffset - 75;
        window.scrollTo({ top: topOffset, behavior: "smooth" });
      }
    }

    document.querySelectorAll(".uc-cat-card").forEach((card) => {
      card.addEventListener("click", () => {
        const catId = card.dataset.category;
        scrollToCategory(catId);
      });
    });

    document.querySelectorAll(".uc-menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const catId = item.dataset.category;
        scrollToCategory(catId);
      });
    });

    // View Cart CTA Button
    const viewCartBtn = document.getElementById("btn-view-cart");
    if (viewCartBtn) {
      viewCartBtn.addEventListener("click", () => {
        const serviceIds = Object.keys(cart);
        if (serviceIds.length > 0) {
          openServiceDetails(serviceIds[0]);
          setTimeout(() => {
            const schedForm = document.getElementById("form-booking-schedule");
            if (schedForm) schedForm.scrollIntoView({ behavior: "smooth" });
          }, 250);
        }
      });
    }

    // Dynamic Header Title Scroll Effect
    const navTitleWrap = document.getElementById("uc-nav-title-wrap");
    window.addEventListener("scroll", () => {
      if (window.scrollY > 120) {
        if (navTitleWrap) navTitleWrap.classList.add("scrolled");
      } else {
        if (navTitleWrap) navTitleWrap.classList.remove("scrolled");
      }
    });

    // Top Location Picker & Area Selection
    const topLocBtn = document.getElementById("btn-top-location-picker");
    const areaModal = document.getElementById("area-modal");
    if (topLocBtn && areaModal) {
      topLocBtn.addEventListener("click", () => {
        areaModal.classList.add("active");
      });
    }

    const areaBtns = document.querySelectorAll(".select-area-btn");
    areaBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const areaName = btn.dataset.area || "Bailey Road";
        const topAreaLabel = document.getElementById("top-selected-area");
        if (topAreaLabel) topAreaLabel.textContent = `${areaName}, Patna`;
        if (areaModal) areaModal.classList.remove("active");
        showToast(`📍 Location updated to ${areaName}, Patna`, "info");
      });
    });

    // Earliest Slot Timing Modal
    const earliestBtn = document.getElementById("btn-hero-earliest-slot");
    const timingModal = document.getElementById("timing-modal");
    const closeTimingBtn = document.getElementById("btn-close-timing-modal");
    const okTimingBtn = document.getElementById("btn-timing-modal-ok");
    if (earliestBtn && timingModal) {
      earliestBtn.addEventListener("click", () => timingModal.classList.add("active"));
    }
    if (closeTimingBtn && timingModal) closeTimingBtn.addEventListener("click", () => timingModal.classList.remove("active"));
    if (okTimingBtn && timingModal) okTimingBtn.addEventListener("click", () => timingModal.classList.remove("active"));

    // Customer Reviews Modal
    const reviewsBtn = document.getElementById("btn-hero-reviews");
    const reviewsModal = document.getElementById("reviews-modal");
    const closeReviewsBtn = document.getElementById("btn-close-reviews-modal");
    const okReviewsBtn = document.getElementById("btn-reviews-modal-ok");
    if (reviewsBtn && reviewsModal) {
      reviewsBtn.addEventListener("click", () => reviewsModal.classList.add("active"));
    }
    if (closeReviewsBtn && reviewsModal) closeReviewsBtn.addEventListener("click", () => reviewsModal.classList.remove("active"));
    if (okReviewsBtn && reviewsModal) okReviewsBtn.addEventListener("click", () => reviewsModal.classList.remove("active"));

    // Visitation Promo Offer Modal
    const promoCard = document.getElementById("btn-visitation-promo");
    const bottomPromo = document.getElementById("sticky-bottom-discount");
    const offerModal = document.getElementById("offer-promo-modal");
    const closeOfferBtn = document.getElementById("btn-close-offer-modal");
    const okOfferBtn = document.getElementById("btn-offer-modal-ok");

    function openOfferModal() {
      if (offerModal) offerModal.classList.add("active");
    }
    if (promoCard) promoCard.addEventListener("click", openOfferModal);
    if (bottomPromo) bottomPromo.addEventListener("click", openOfferModal);
    if (closeOfferBtn && offerModal) closeOfferBtn.addEventListener("click", () => offerModal.classList.remove("active"));
    if (okOfferBtn && offerModal) {
      okOfferBtn.addEventListener("click", () => {
        offerModal.classList.remove("active");
        showToast("✓ Patna launch discount PATNA50 automatically applied at checkout!", "success");
      });
    }

    // Modal overlay backdrop click dismiss
    [timingModal, reviewsModal, offerModal, areaModal].forEach((modal) => {
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) modal.classList.remove("active");
        });
      }
    });

    // Top User Status Button
    const topUserBtn = document.getElementById("top-user-indicator");
    if (topUserBtn) {
      topUserBtn.addEventListener("click", () => {
        if (window.GharBijliFirebase && window.GharBijliFirebase.currentUser) {
          navigateTo("profile");
        } else {
          navigateTo("login");
        }
      });
    }

    // Bottom Navigation Items
    navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        navigateTo(target);
      });
    });

    // Search Input Real-Time Filtering
    const searchInput = document.getElementById("search-services-input");
    const clearSearchBtn = document.getElementById("btn-clear-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        currentSearchQuery = e.target.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = currentSearchQuery ? "flex" : "none";
        }
        renderServicesGrid();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        currentSearchQuery = "";
        clearSearchBtn.style.display = "none";
        renderServicesGrid();
      });
    }

    // Category Filter Chips
    const categoryStrip = document.getElementById("category-filter-strip");
    if (categoryStrip) {
      categoryStrip.addEventListener("click", (e) => {
        const chip = e.target.closest(".category-chip");
        if (!chip) return;
        selectedCategory = chip.dataset.category;
        updateCategoryChips();
        renderServicesGrid();
      });
    }

    // Hero Urgent Booking Banner
    const urgentTrigger = document.getElementById("btn-urgent-booking-trigger");
    if (urgentTrigger) {
      urgentTrigger.addEventListener("click", () => {
        openServiceDetails("electrical-wiring", "URGENT_1HR");
      });
    }

    // Patna Locality Selector Modal (area-modal)
    const locationBtn = document.getElementById("btn-select-location");
    if (locationBtn && areaModal) {
      locationBtn.addEventListener("click", () => {
        areaModal.classList.add("active");
      });

      areaModal.addEventListener("click", (e) => {
        if (e.target === areaModal) {
          areaModal.classList.remove("active");
        }
      });

      document.querySelectorAll(".select-area-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const area = btn.dataset.area;
          document.getElementById("current-location-text").textContent = `Patna • ${area}`;
          const streetInput = document.getElementById("address-street");
          if (streetInput) {
            streetInput.value = `${area}, Patna`;
          }
          areaModal.classList.remove("active");
          showToast(`Location set to Patna (${area})`, "info");
        });
      });
    }

    // Service Details Back Button
    const backServiceBtn = document.getElementById("btn-back-service-details");
    if (backServiceBtn) {
      backServiceBtn.addEventListener("click", () => goBack());
    }

    // Interactive Map Location Picker
    const mapPickerBtn = document.getElementById("btn-open-map-picker");
    const mapModal = document.getElementById("map-location-modal");
    const mapCloseBtn = document.getElementById("btn-close-map-modal");
    const mapLocateGpsBtn = document.getElementById("btn-locate-gps");
    const mapConfirmBtn = document.getElementById("btn-confirm-map-location");
    const mapSearchInput = document.getElementById("map-search-input");
    const mapSuggestionsBox = document.getElementById("map-suggestions-box");

    function updateMapLocationPreview(pos) {
      const titleEl = document.getElementById("map-detected-title");
      const subEl = document.getElementById("map-detected-sub");
      if (titleEl) titleEl.textContent = pos.street || "Bailey Road, Patna";
      if (subEl) subEl.textContent = `${pos.area || 'Patna'} - ${pos.pincode || '800001'} (${pos.lat}, ${pos.lng})`;
    }

    function getMapService() {
      return window.GharBijliMapService || (typeof GharBijliMapService !== "undefined" ? GharBijliMapService : null);
    }

    if (mapPickerBtn && mapModal) {
      mapPickerBtn.addEventListener("click", () => {
        mapModal.classList.add("active");
        setTimeout(() => {
          const svc = getMapService();
          if (svc) {
            svc.initMap("map-container", updateMapLocationPreview);
          }
        }, 150);
      });
    }

    if (mapCloseBtn && mapModal) {
      mapCloseBtn.addEventListener("click", () => {
        mapModal.classList.remove("active");
      });
    }

    if (mapLocateGpsBtn) {
      mapLocateGpsBtn.addEventListener("click", async () => {
        showToast("Locating current GPS coordinates...", "info");
        try {
          const svc = getMapService();
          if (svc) {
            await svc.locateCurrentPosition();
            showToast("GPS position centered on map!", "success");
          }
        } catch (err) {
          showToast(err.message || "Failed to acquire GPS location.", "error");
        }
      });
    }

    if (mapConfirmBtn && mapModal) {
      mapConfirmBtn.addEventListener("click", () => {
        const svc = getMapService();
        if (!svc) return;
        const pos = svc.getCurrentPosition();

        const streetInput = document.getElementById("address-street");
        const pincodeInput = document.getElementById("address-pincode");
        const latInput = document.getElementById("booking-lat");
        const lngInput = document.getElementById("booking-lng");
        const statusText = document.getElementById("map-trigger-status-text");
        const headerLocation = document.getElementById("current-location-text");

        if (streetInput) streetInput.value = pos.street || pos.fullAddress;
        if (pincodeInput && pos.pincode) pincodeInput.value = pos.pincode;
        if (latInput) latInput.value = pos.lat;
        if (lngInput) lngInput.value = pos.lng;

        if (statusText) {
          statusText.textContent = `✓ Pinned on Map: ${pos.area || 'Patna'} (${pos.pincode || '800001'})`;
          statusText.style.color = "var(--success-dark)";
          statusText.style.fontWeight = "750";
        }
        if (headerLocation) {
          headerLocation.textContent = `Patna • ${pos.area || 'Bailey Rd'}`;
        }

        mapModal.classList.remove("active");
        showToast("Service location confirmed on map!", "success");
      });
    }

    if (mapSearchInput && mapSuggestionsBox) {
      mapSearchInput.addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        const svc = getMapService();
        if (!q || !svc) {
          mapSuggestionsBox.style.display = "none";
          return;
        }

        const matches = svc.PATNA_LOCALITIES.filter((loc) =>
          loc.name.toLowerCase().includes(q)
        );

        if (matches.length === 0) {
          mapSuggestionsBox.innerHTML = `<div style="padding:10px 14px; font-size:12px; color:var(--ink-muted);">No Patna area found matching "${q}"</div>`;
          mapSuggestionsBox.style.display = "block";
          return;
        }

        mapSuggestionsBox.innerHTML = "";
        matches.forEach((loc) => {
          const item = document.createElement("div");
          item.className = "map-suggestion-item";
          item.innerHTML = `<span>📍</span> <span>${loc.name} (${loc.pincode})</span>`;
          item.addEventListener("click", () => {
            mapSearchInput.value = loc.name;
            mapSuggestionsBox.style.display = "none";
            svc.panTo(loc.lat, loc.lng, 16);
            showToast(`Centered on ${loc.name}`, "info");
          });
          mapSuggestionsBox.appendChild(item);
        });
        mapSuggestionsBox.style.display = "block";
      });

      document.addEventListener("click", (e) => {
        if (!mapSearchInput.contains(e.target) && !mapSuggestionsBox.contains(e.target)) {
          mapSuggestionsBox.style.display = "none";
        }
      });
    }

    // Service Details Time Slot Pills
    document.querySelectorAll(".slot-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        activeTimeSlot = pill.dataset.slot;
        updateTimeSlotPills();
      });
    });

    // Quick Locality Chips inside Address Form
    document.querySelectorAll(".quick-chip[data-area]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const area = chip.dataset.area;
        const streetInput = document.getElementById("address-street");
        if (streetInput) {
          streetInput.value = `${area}, Patna`;
        }
        showToast(`Auto-filled address: ${area}`, "info");
      });
    });

    // Booking Form Submit
    const bookingForm = document.getElementById("form-booking-schedule");
    if (bookingForm) {
      bookingForm.addEventListener("submit", handleBookingSubmit);
    }

    // Booking Confirmation Action Buttons
    const trackNewBtn = document.getElementById("btn-track-new-booking");
    if (trackNewBtn) {
      trackNewBtn.addEventListener("click", () => {
        openTracking(activeTrackingBookingId);
      });
    }

    const returnHomeBtn = document.getElementById("btn-return-home");
    if (returnHomeBtn) {
      returnHomeBtn.addEventListener("click", () => navigateTo("home"));
    }

    // Phone Login Form
    const phoneForm = document.getElementById("form-phone-login");
    if (phoneForm) {
      phoneForm.addEventListener("submit", handlePhoneSubmit);
    }

    // OTP Verify Form
    const otpForm = document.getElementById("form-otp-verify");
    if (otpForm) {
      otpForm.addEventListener("submit", handleOtpSubmit);
    }

    // 1-Tap Dev Fill Button
    const fillDevBtn = document.getElementById("btn-fill-test-account");
    if (fillDevBtn) {
      fillDevBtn.addEventListener("click", () => {
        const phoneInput = document.getElementById("login-phone-number");
        if (phoneInput) {
          phoneInput.value = "9999999999";
          phoneForm.requestSubmit();
        }
      });
    }

    // Resend OTP Button
    const resendBtn = document.getElementById("btn-resend-otp");
    if (resendBtn) {
      resendBtn.addEventListener("click", () => {
        phoneForm.requestSubmit();
      });
    }

    // Setup OTP Auto-Advance
    setupOtpAutoAdvance();

    // Tracking Back Button
    const backTrackingBtn = document.getElementById("btn-back-tracking");
    if (backTrackingBtn) {
      backTrackingBtn.addEventListener("click", () => goBack());
    }

    // Cancel Booking Modal Trigger
    const cancelModal = document.getElementById("cancel-modal");
    const cancelTrigger = document.getElementById("btn-cancel-booking-trigger");
    const cancelCloseBtn = document.getElementById("btn-cancel-close");
    const cancelConfirmBtn = document.getElementById("btn-cancel-confirm");

    if (cancelTrigger && cancelModal) {
      cancelTrigger.addEventListener("click", () => {
        cancelModal.classList.add("active");
      });
    }

    if (cancelCloseBtn && cancelModal) {
      cancelCloseBtn.addEventListener("click", () => {
        cancelModal.classList.remove("active");
      });
    }

    if (cancelConfirmBtn && cancelModal) {
      cancelConfirmBtn.addEventListener("click", async () => {
        const reason = document.getElementById("cancel-reason-select").value;
        try {
          cancelConfirmBtn.disabled = true;
          await window.GharBijliFirebase.cancelBooking(activeTrackingBookingId, reason);
          cancelModal.classList.remove("active");
          showToast("Booking cancelled successfully.", "info");
          renderTrackingScreen();
        } catch (err) {
          showToast("Failed to cancel: " + err.message, "error");
        } finally {
          cancelConfirmBtn.disabled = false;
        }
      });
    }

    // My Bookings Tab Switcher
    const tabActive = document.getElementById("tab-active-bookings");
    const tabPast = document.getElementById("tab-past-bookings");

    if (tabActive && tabPast) {
      tabActive.addEventListener("click", () => {
        activeTab = "active";
        tabActive.style.background = "#ffffff";
        tabActive.style.color = "#5e35b1";
        tabActive.style.fontWeight = "800";
        tabPast.style.background = "transparent";
        tabPast.style.color = "#64748b";
        tabPast.style.fontWeight = "600";
        renderMyBookingsScreen();
      });

      tabPast.addEventListener("click", () => {
        activeTab = "past";
        tabPast.style.background = "#ffffff";
        tabPast.style.color = "#5e35b1";
        tabPast.style.fontWeight = "800";
        tabActive.style.background = "transparent";
        tabActive.style.color = "#64748b";
        tabActive.style.fontWeight = "600";
        renderMyBookingsScreen();
      });
    }

    // Admin / Operator Simulation Modal
    const adminModal = document.getElementById("admin-modal");
    const openAdminBtn = document.getElementById("btn-open-operator-panel");
    const closeAdminBtn = document.getElementById("btn-admin-close");
    const applyAdminBtn = document.getElementById("btn-admin-apply");
    const adminBookingSelect = document.getElementById("admin-booking-select");
    const adminStatusSelect = document.getElementById("admin-status-select");

    if (openAdminBtn && adminModal) {
      openAdminBtn.addEventListener("click", async () => {
        const bookings = await window.GharBijliFirebase.getCustomerBookings();
        adminBookingSelect.innerHTML = "";
        if (bookings.length === 0) {
          adminBookingSelect.innerHTML = "<option value=''>No bookings found</option>";
        } else {
          bookings.forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b.bookingId;
            opt.textContent = `${b.bookingId} — ${b.serviceNameSnapshot} (${b.bookingStatus})`;
            adminBookingSelect.appendChild(opt);
          });
        }
        adminModal.classList.add("active");
      });
    }

    if (closeAdminBtn && adminModal) {
      closeAdminBtn.addEventListener("click", () => {
        adminModal.classList.remove("active");
      });
    }

    if (applyAdminBtn && adminModal) {
      applyAdminBtn.addEventListener("click", async () => {
        const bookingId = adminBookingSelect.value;
        const newStatus = adminStatusSelect.value;
        if (!bookingId) return;

        try {
          applyAdminBtn.disabled = true;
          await window.GharBijliFirebase.updateBookingStatus(bookingId, newStatus);
          showToast(`Status updated to ${newStatus}`, "success");
          adminModal.classList.remove("active");
          if (currentScreen === "tracking") {
            renderTrackingScreen();
          } else if (currentScreen === "home") {
            renderHomeActiveBookingCard();
          }
        } catch (err) {
          showToast("Failed to update status: " + err.message, "error");
        } finally {
          applyAdminBtn.disabled = false;
        }
      });
    }

    // User Logout
    const logoutBtn = document.getElementById("btn-user-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await window.GharBijliFirebase.signOut();
        showToast("Logged out successfully.", "info");
        renderProfileScreen();
      });
    }

    // Profile screen navigation shortcuts
    const profBookings = document.getElementById("btn-profile-my-bookings");
    if (profBookings) profBookings.addEventListener("click", () => navigateTo("myBookings"));

    const profHelp = document.getElementById("btn-profile-help");
    if (profHelp) profHelp.addEventListener("click", () => navigateTo("help"));

    const profAbout = document.getElementById("btn-profile-about");
    if (profAbout) profAbout.addEventListener("click", () => {
      showToast("GharBijli (Patna) — Bihar's 1st Local Electrician Network", "info");
    });

    const profTerms = document.getElementById("btn-profile-terms");
    if (profTerms) profTerms.addEventListener("click", () => {
      showToast("All jobs are 100% Cash on Delivery with transparent pricing.", "info");
    });

    // Guest Profile shortcuts
    const guestLoginBtn = document.getElementById("btn-guest-login");
    if (guestLoginBtn) guestLoginBtn.addEventListener("click", () => navigateTo("login"));

    const guestHelp = document.getElementById("btn-guest-help");
    if (guestHelp) guestHelp.addEventListener("click", () => navigateTo("help"));

    // Login screen back button
    const backLoginBtn = document.getElementById("btn-back-login");
    if (backLoginBtn) backLoginBtn.addEventListener("click", () => goBack());

    // Login screen edit phone number link
    const editPhoneBtn = document.getElementById("btn-edit-phone-number");
    if (editPhoneBtn) {
      editPhoneBtn.addEventListener("click", () => {
        const stepOtp = document.getElementById("auth-step-otp");
        const stepPhone = document.getElementById("auth-step-phone");
        if (stepOtp) stepOtp.style.display = "none";
        if (stepPhone) stepPhone.style.display = "block";
        const phoneInput = document.getElementById("login-phone-number");
        if (phoneInput) phoneInput.focus();
      });
    }
  }

  // ====================================================
  // APP INITIALIZATION
  // ====================================================

  function init() {
    initCapacitorHooks();
    bindEvents();
    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav) bottomNav.style.display = "none";
    const floatMenu = document.getElementById("btn-floating-menu");
    const stickyDiscount = document.getElementById("sticky-bottom-discount");
    if (floatMenu) floatMenu.style.display = "inline-flex";
    if (stickyDiscount) stickyDiscount.style.display = "flex";
    renderHomeScreen();

    // Query parameter triggers for automated testing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("loginAsTest") && window.GharBijliFirebase) {
      window.GharBijliFirebase.currentUser = {
        uid: "test-user-patna-123",
        phoneNumber: "+919876543210"
      };
      updateUserNavIndicator();
    }
    if (urlParams.has("stepOtp")) {
      const pStep = document.getElementById("auth-step-phone");
      const oStep = document.getElementById("auth-step-otp");
      const numEl = document.getElementById("otp-sent-to-number");
      if (pStep) pStep.style.display = "none";
      if (oStep) oStep.style.display = "block";
      if (numEl) numEl.textContent = "+91 99999 99999";
    }
    if (urlParams.has("screen")) {
      const scr = urlParams.get("screen");
      navigateTo(scr, false);
    }
    if (urlParams.has("detail")) {
      const detailId = urlParams.get("detail");
      openServiceDetails(detailId);
    }
    if (urlParams.has("scrollY")) {
      const scrollY = parseInt(urlParams.get("scrollY") || "0", 10);
      window.scrollTo(0, scrollY);
      document.documentElement.scrollTop = scrollY;
      setTimeout(() => {
        window.scrollTo(0, scrollY);
        document.documentElement.scrollTop = scrollY;
      }, 200);
    }
    if (urlParams.has("modal")) {
      const modalParam = urlParams.get("modal");
      if (modalParam === "timing") {
        const m = document.getElementById("timing-modal");
        if (m) m.classList.add("active");
      } else if (modalParam === "reviews") {
        const m = document.getElementById("reviews-modal");
        if (m) m.classList.add("active");
      } else if (modalParam === "offer") {
        const m = document.getElementById("offer-promo-modal");
        if (m) m.classList.add("active");
      } else if (modalParam === "location") {
        const m = document.getElementById("location-selector-modal");
        if (m) m.classList.add("active");
      }
    }
    if (urlParams.has("menu")) {
      openMenuModal();
    }
    if (urlParams.has("add")) {
      const addId = urlParams.get("add");
      addToCart(addId);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
