/**
 * GharBijli Map & Location Service
 * Dual-Engine Location Picker: Google Maps JS API + Leaflet/OpenStreetMap Fallback
 * Provides interactive map dragging, center pin drop, GPS geolocation, and reverse geocoding
 */

const GharBijliMapService = (function () {
  "use strict";

  let mapInstance = null;
  let activeEngine = "leaflet"; // 'google' or 'leaflet'
  let currentPosition = {
    lat: 25.6093,
    lng: 85.1235,
    areaName: "Bailey Road, Patna"
  };
  let onLocationChangeCallback = null;
  let isMoving = false;
  let geocodeTimeout = null;

  // Well-known Patna localities for instant offline search & quick selection
  const PATNA_LOCALITIES = [
    { name: "Bailey Road (Saguna More)", lat: 25.6085, lng: 85.0485, pincode: "801503" },
    { name: "Boring Road (Chauraha)", lat: 25.6186, lng: 85.1165, pincode: "800001" },
    { name: "Kankarbagh (Main Colony)", lat: 25.5941, lng: 85.1554, pincode: "800020" },
    { name: "Danapur Cantt / Khagaul", lat: 25.6324, lng: 85.0422, pincode: "801503" },
    { name: "Patliputra Colony", lat: 25.6305, lng: 85.1082, pincode: "800013" },
    { name: "Ashiana Nagar / Rukanpura", lat: 25.6174, lng: 85.0782, pincode: "800025" },
    { name: "Rajendra Nagar / Kadamkuan", lat: 25.6025, lng: 85.1612, pincode: "800016" },
    { name: "Anisabad / Phulwari Sharif", lat: 25.5815, lng: 85.0924, pincode: "800002" },
    { name: "Gola Road (Danapur)", lat: 25.6264, lng: 85.0592, pincode: "801503" },
    { name: "Patna City (Chowk)", lat: 25.5978, lng: 85.2215, pincode: "800008" }
  ];

  /**
   * Check if Google Maps is configured
   */
  function hasValidGoogleKey() {
    const key = GharBijliConfig.maps && GharBijliConfig.maps.googleMapsApiKey;
    return key && key !== "GOOGLE_MAPS_API_KEY_PLACEHOLDER" && key.length > 20;
  }

  /**
   * Initialize Map inside a DOM element
   */
  async function initMap(containerId, onLocationChange) {
    onLocationChangeCallback = onLocationChange;
    const container = document.getElementById(containerId);
    if (!container) return;

    const defaultLat = (GharBijliConfig.maps && GharBijliConfig.maps.defaultCenter.lat) || 25.6093;
    const defaultLng = (GharBijliConfig.maps && GharBijliConfig.maps.defaultCenter.lng) || 85.1235;
    currentPosition.lat = defaultLat;
    currentPosition.lng = defaultLng;

    if (hasValidGoogleKey()) {
      try {
        await loadGoogleMapsSdk();
        initGoogleMap(container, defaultLat, defaultLng);
        activeEngine = "google";
        return;
      } catch (err) {
        console.warn("[GharBijliMap] Google Maps failed to load, falling back to Leaflet:", err);
      }
    }

    // Leaflet / OpenStreetMap Engine
    await loadLeafletSdk();
    initLeafletMap(container, defaultLat, defaultLng);
    activeEngine = "leaflet";
  }

  /**
   * Google Maps SDK Dynamic Loader
   */
  function loadGoogleMapsSdk() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      const key = GharBijliConfig.maps.googleMapsApiKey;
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  function initGoogleMap(container, lat, lng) {
    const center = new google.maps.LatLng(lat, lng);
    mapInstance = new google.maps.Map(container, {
      center: center,
      zoom: GharBijliConfig.maps.defaultZoom || 15,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy"
    });

    mapInstance.addListener("dragstart", () => {
      isMoving = true;
      triggerPinBounce(true);
    });

    mapInstance.addListener("idle", () => {
      if (isMoving) {
        isMoving = false;
        triggerPinBounce(false);
        const center = mapInstance.getCenter();
        currentPosition.lat = center.lat();
        currentPosition.lng = center.lng();
        debouncedReverseGeocode(currentPosition.lat, currentPosition.lng);
      }
    });

    debouncedReverseGeocode(lat, lng);
  }

  /**
   * Leaflet SDK Dynamic Loader
   */
  function loadLeafletSdk() {
    return new Promise((resolve) => {
      if (window.L) {
        resolve();
        return;
      }

      // Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Leaflet JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      script.onerror = () => {
        console.warn("[GharBijliMap] Leaflet CDN unavailable, local fallback active.");
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  function initLeafletMap(container, lat, lng) {
    if (!window.L) {
      console.warn("[GharBijliMap] Leaflet not loaded.");
      return;
    }

    if (mapInstance && mapInstance.remove) {
      try { mapInstance.remove(); } catch(e){}
    }

    mapInstance = L.map(container, {
      center: [lat, lng],
      zoom: GharBijliConfig.maps.defaultZoom || 15,
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Voyager tiles - fast, clean mobile aesthetic
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors"
    }).addTo(mapInstance);

    // Call invalidateSize multiple times to handle transition animation
    [50, 150, 300, 600].forEach((delay) => {
      setTimeout(() => {
        if (mapInstance && mapInstance.invalidateSize) {
          mapInstance.invalidateSize();
        }
      }, delay);
    });

    mapInstance.on("movestart", () => {
      isMoving = true;
      triggerPinBounce(true);
    });

    mapInstance.on("moveend", () => {
      isMoving = false;
      triggerPinBounce(false);
      const center = mapInstance.getCenter();
      currentPosition.lat = center.lat;
      currentPosition.lng = center.lng;
      debouncedReverseGeocode(currentPosition.lat, currentPosition.lng);
    });

    // Initial geocode
    debouncedReverseGeocode(lat, lng);
  }

  function triggerPinBounce(isDragging) {
    const pin = document.getElementById("map-center-pin");
    if (pin) {
      if (isDragging) {
        pin.classList.add("dragging");
      } else {
        pin.classList.remove("dragging");
      }
    }
  }

  /**
   * Debounced Reverse Geocoding
   */
  function debouncedReverseGeocode(lat, lng) {
    clearTimeout(geocodeTimeout);
    geocodeTimeout = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 350);
  }

  async function reverseGeocode(lat, lng) {
    // 1. Check local closest Patna locality first for instant snappy UI
    let closest = null;
    let minDistance = Infinity;

    for (const loc of PATNA_LOCALITIES) {
      const d = Math.hypot(loc.lat - lat, loc.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = loc;
      }
    }

    // Default fallback address
    let result = {
      street: closest ? closest.name : "Bailey Road",
      area: closest ? closest.name.split(" ")[0] : "Bailey Road",
      city: "Patna",
      state: "Bihar",
      pincode: closest ? closest.pincode : "800001",
      fullAddress: `${closest ? closest.name : 'Bailey Road'}, Patna - ${closest ? closest.pincode : '800001'}`,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    };

    // 2. Fetch live reverse geocode from Nominatim API if connected
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const road = a.road || a.pedestrian || a.suburb || (closest ? closest.name : "Bailey Road");
          const neighbourhood = a.neighbourhood || a.suburb || a.city_district || "";
          const city = a.city || a.town || "Patna";
          const pincode = a.postcode || (closest ? closest.pincode : "800001");

          result.street = `${road}${neighbourhood ? ', ' + neighbourhood : ''}`;
          result.area = neighbourhood || road;
          result.city = city;
          result.pincode = pincode;
          result.fullAddress = `${result.street}, ${city} - ${pincode}`;
        }
      }
    } catch (err) {
      // Offline fallback: Use closest Patna locality
    }

    currentPosition = { ...currentPosition, ...result };

    if (onLocationChangeCallback) {
      onLocationChangeCallback(result);
    }
  }

  /**
   * Geolocation: Pan to device's current GPS position
   */
  function locateCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your device."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          panTo(lat, lng);
          resolve({ lat, lng });
        },
        (err) => {
          // If GPS fails on desktop or emulator, pan to Patna center
          panTo(25.6093, 85.1235);
          resolve({ lat: 25.6093, lng: 85.1235 });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }

  /**
   * Pan to Lat Lng
   */
  function panTo(lat, lng, zoom = 16) {
    currentPosition.lat = lat;
    currentPosition.lng = lng;

    if (activeEngine === "google" && mapInstance) {
      mapInstance.panTo(new google.maps.LatLng(lat, lng));
      mapInstance.setZoom(zoom);
    } else if (activeEngine === "leaflet" && mapInstance) {
      mapInstance.setView([lat, lng], zoom, { animate: true });
    }

    debouncedReverseGeocode(lat, lng);
  }

  const serviceApi = {
    initMap,
    locateCurrentPosition,
    panTo,
    PATNA_LOCALITIES,
    getCurrentPosition: () => currentPosition
  };

  if (typeof window !== "undefined") {
    window.GharBijliMapService = serviceApi;
  }

  return serviceApi;
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = GharBijliMapService;
}
