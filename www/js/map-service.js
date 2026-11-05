/**
 * GharBijli Map & Location Service (Bhilai & Durg, Chhattisgarh)
 * Dual-Engine Location Picker: Google Maps JS API + Leaflet/OpenStreetMap Fallback
 * Provides interactive map dragging, center pin drop, GPS geolocation, and reverse geocoding
 */

const GharBijliMapService = (function () {
  "use strict";

  let mapInstance = null;
  let activeEngine = "leaflet"; // 'google' or 'leaflet'
  let currentPosition = {
    lat: 21.2120,
    lng: 81.3733,
    areaName: "Civic Centre, Bhilai"
  };
  let onLocationChangeCallback = null;
  let isMoving = false;
  let geocodeTimeout = null;

  // Well-known Bhilai & Durg localities for instant offline search & quick selection
  const BHILAI_LOCALITIES = [
    { name: "Civic Centre, Bhilai", lat: 21.2120, lng: 81.3733, pincode: "490006" },
    { name: "Sector 6, Bhilai", lat: 21.1985, lng: 81.3765, pincode: "490006" },
    { name: "Sector 7 & 8, Bhilai", lat: 21.1920, lng: 81.3850, pincode: "490006" },
    { name: "Sector 9 & 10 (HUDCO), Bhilai", lat: 21.1790, lng: 81.3650, pincode: "490006" },
    { name: "Nehru Nagar (East & West), Bhilai", lat: 21.2330, lng: 81.3325, pincode: "490020" },
    { name: "Smriti Nagar & Junwani, Bhilai", lat: 21.2420, lng: 81.3190, pincode: "490020" },
    { name: "Supela & Power House, Bhilai", lat: 21.2050, lng: 81.3480, pincode: "490023" },
    { name: "Vaishali Nagar, Bhilai", lat: 21.2180, lng: 81.3410, pincode: "490023" },
    { name: "Risali & Ruabandha, Bhilai", lat: 21.1750, lng: 81.3420, pincode: "490006" },
    { name: "Durg City (Station Road), Durg", lat: 21.1904, lng: 81.2849, pincode: "491001" }
  ];

  const PATNA_LOCALITIES = BHILAI_LOCALITIES; // Backward-compatible alias

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

    const defaultLat = (GharBijliConfig.maps && GharBijliConfig.maps.defaultCenter && GharBijliConfig.maps.defaultCenter.lat) || 21.2120;
    const defaultLng = (GharBijliConfig.maps && GharBijliConfig.maps.defaultCenter && GharBijliConfig.maps.defaultCenter.lng) || 81.3733;
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
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GharBijliConfig.maps.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Map
   */
  function initGoogleMap(container, lat, lng) {
    const options = {
      center: { lat, lng },
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
      ]
    };

    mapInstance = new google.maps.Map(container, options);

    mapInstance.addListener("dragstart", () => {
      isMoving = true;
      togglePinFloating(true);
    });

    mapInstance.addListener("idle", () => {
      if (isMoving) {
        isMoving = false;
        togglePinFloating(false);
        const center = mapInstance.getCenter();
        const curLat = center.lat();
        const curLng = center.lng();
        debouncedReverseGeocode(curLat, curLng);
      }
    });

    debouncedReverseGeocode(lat, lng);
  }

  /**
   * Load Leaflet SDK
   */
  function loadLeafletSdk() {
    return new Promise((resolve) => {
      if (window.L) {
        resolve();
        return;
      }
      const checkInterval = setInterval(() => {
        if (window.L) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 3000);
    });
  }

  /**
   * Initialize Leaflet Map
   */
  function initLeafletMap(container, lat, lng) {
    if (!window.L) return;

    if (mapInstance && mapInstance.remove) {
      mapInstance.remove();
    }

    mapInstance = L.map(container, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(mapInstance);

    L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

    mapInstance.on("movestart", () => {
      isMoving = true;
      togglePinFloating(true);
    });

    mapInstance.on("moveend", () => {
      isMoving = false;
      togglePinFloating(false);
      const center = mapInstance.getCenter();
      debouncedReverseGeocode(center.lat, center.lng);
    });

    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 250);

    debouncedReverseGeocode(lat, lng);
  }

  function togglePinFloating(isFloating) {
    const pin = document.getElementById("map-center-pin");
    if (!pin) return;
    if (isFloating) {
      pin.classList.add("pin-floating");
    } else {
      pin.classList.remove("pin-floating");
    }
  }

  function debouncedReverseGeocode(lat, lng) {
    if (geocodeTimeout) clearTimeout(geocodeTimeout);
    geocodeTimeout = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 350);
  }

  async function reverseGeocode(lat, lng) {
    // 1. Check local closest Bhilai locality first for instant snappy UI
    let closest = null;
    let minDistance = Infinity;

    for (const loc of BHILAI_LOCALITIES) {
      const d = Math.hypot(loc.lat - lat, loc.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = loc;
      }
    }

    // Default fallback address
    let result = {
      street: closest ? closest.name : "Civic Centre",
      area: closest ? closest.name.split(",")[0] : "Civic Centre",
      city: "Bhilai",
      state: "Chhattisgarh",
      pincode: closest ? closest.pincode : "490006",
      fullAddress: `${closest ? closest.name : 'Civic Centre, Bhilai'} - ${closest ? closest.pincode : '490006'}`,
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
          const road = a.road || a.pedestrian || a.suburb || (closest ? closest.name : "Civic Centre");
          const neighbourhood = a.neighbourhood || a.suburb || a.city_district || "";
          const city = a.city || a.town || "Bhilai";
          const pincode = a.postcode || (closest ? closest.pincode : "490006");

          result.street = `${road}${neighbourhood ? ', ' + neighbourhood : ''}`;
          result.area = neighbourhood || road;
          result.city = city;
          result.pincode = pincode;
          result.fullAddress = `${result.street}, ${city} - ${pincode}`;
        }
      }
    } catch (err) {
      // Offline fallback: Use closest Bhilai locality
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
          // If GPS fails on desktop or emulator, pan to Bhilai Civic Centre
          panTo(21.2120, 81.3733);
          resolve({ lat: 21.2120, lng: 81.3733 });
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
    BHILAI_LOCALITIES,
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
