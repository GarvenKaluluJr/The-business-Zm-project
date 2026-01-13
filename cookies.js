// cookies.js - Cookie Consent Manager for The Business Zm

export const COOKIES = {
  consentKey: "tbz_cookie_consent",
  preferencesKey: "tbz_cookie_preferences",
  expiryDays: 365,
};

// Cookie categories used in the barbershop app
export const COOKIE_CATEGORIES = {
  necessary: {
    id: "necessary",
    name: "Necessary",
    description: "Essential cookies for the website to function. These include authentication, services preferences, and booking form data.",
    required: true,
    features: [
      "Stores your custom services configuration",
      "Manages authentication and secure sessions",
    ],
    // Technical cookie names (hidden from users, used only for cleanup)
    _cookies: ["mvp_services_v1", "sb-*"],
  },
  functional: {
    id: "functional",
    name: "Functional",
    description: "Cookies that remember your preferences and choices to provide enhanced functionality.",
    required: false,
    features: [
      "Remembers your last selected booking date",
      "Remembers your preferred service for faster booking",
    ],
    // Technical cookie names (hidden from users, used only for cleanup)
    _cookies: ["tbz_last_booking_date", "tbz_preferred_service"],
  },
};

// Cookie utility functions
export const CookieUtil = {
  /**
   * Set a cookie with expiration
   */
  set(name, value, days = COOKIES.expiryDays) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  },

  /**
   * Get a cookie value
   */
  get(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  },

  /**
   * Delete a cookie
   */
  delete(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  },

  /**
   * Check if cookie exists
   */
  exists(name) {
    return this.get(name) !== null;
  },
};

// Consent Manager
export class CookieConsent {
  constructor() {
    this.consent = this.loadConsent();
    this.preferences = this.loadPreferences();
  }

  /**
   * Load consent status from cookie
   */
  loadConsent() {
    const saved = CookieUtil.get(COOKIES.consentKey);
    return saved ? JSON.parse(saved) : null;
  }

  /**
   * Load cookie preferences
   */
  loadPreferences() {
    const saved = CookieUtil.get(COOKIES.preferencesKey);
    if (saved) {
      return JSON.parse(saved);
    }
    // Default: only necessary cookies
    return {
      necessary: true,
      functional: false,
    };
  }

  /**
   * Check if user has given consent
   */
  hasConsent() {
    return this.consent !== null;
  }

  /**
   * Check if a specific category is allowed
   */
  isAllowed(category) {
    if (category === "necessary") return true;
    return this.preferences[category] === true;
  }

  /**
   * Save consent and preferences
   */
  saveConsent(preferences) {
    this.preferences = preferences;
    this.consent = {
      timestamp: new Date().toISOString(),
      preferences: preferences,
    };

    CookieUtil.set(COOKIES.consentKey, JSON.stringify(this.consent));
    CookieUtil.set(COOKIES.preferencesKey, JSON.stringify(preferences));

    // Clean up cookies for disabled categories
    this.cleanupDisabledCookies();
  }

  /**
   * Accept all cookies
   */
  acceptAll() {
    const allPreferences = {};
    Object.keys(COOKIE_CATEGORIES).forEach((key) => {
      allPreferences[key] = true;
    });
    this.saveConsent(allPreferences);
  }

  /**
   * Accept only necessary cookies
   */
  acceptNecessary() {
    const necessaryOnly = {};
    Object.keys(COOKIE_CATEGORIES).forEach((key) => {
      necessaryOnly[key] = COOKIE_CATEGORIES[key].required;
    });
    this.saveConsent(necessaryOnly);
  }

  /**
   * Withdraw consent (reset)
   */
  withdrawConsent() {
    CookieUtil.delete(COOKIES.consentKey);
    CookieUtil.delete(COOKIES.preferencesKey);
    this.consent = null;
    this.preferences = this.loadPreferences();
    this.cleanupDisabledCookies();
  }

  /**
   * Clean up cookies for disabled categories
   */
  cleanupDisabledCookies() {
    Object.entries(COOKIE_CATEGORIES).forEach(([categoryId, category]) => {
      if (!this.isAllowed(categoryId) && !category.required) {
        // Delete cookies for disabled non-necessary categories
        const cookieNames = category._cookies || [];
        cookieNames.forEach((cookieName) => {
          // Handle wildcards like sb-*
          if (cookieName.includes("*")) {
            const prefix = cookieName.replace("*", "");
            const allCookies = document.cookie.split(";");
            allCookies.forEach((c) => {
              const name = c.split("=")[0].trim();
              if (name.startsWith(prefix)) {
                CookieUtil.delete(name);
              }
            });
          } else {
            CookieUtil.delete(cookieName);
          }
        });
      }
    });
  }
}

// Functional cookies helper (only set if allowed)
export class FunctionalCookies {
  constructor(consentManager) {
    this.consent = consentManager;
  }

  /**
   * Save last booking date
   */
  saveLastBookingDate(date) {
    if (this.consent.isAllowed("functional")) {
      CookieUtil.set("tbz_last_booking_date", date, 30);
    }
  }

  /**
   * Get last booking date
   */
  getLastBookingDate() {
    if (this.consent.isAllowed("functional")) {
      return CookieUtil.get("tbz_last_booking_date");
    }
    return null;
  }

  /**
   * Save preferred service
   */
  savePreferredService(serviceId) {
    if (this.consent.isAllowed("functional")) {
      CookieUtil.set("tbz_preferred_service", serviceId, 90);
    }
  }

  /**
   * Get preferred service
   */
  getPreferredService() {
    if (this.consent.isAllowed("functional")) {
      return CookieUtil.get("tbz_preferred_service");
    }
    return null;
  }
}

// UI Helper functions
export function createCookieBanner() {
  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.className = "cookie-banner";
  banner.innerHTML = `
    <div class="cookie-banner__content">
      <div class="cookie-banner__text">
        <p class="cookie-banner__desc">
          We use necessary cookies to make our website work. Optional cookies help improve your experience.
        </p>
      </div>
      <div class="cookie-banner__actions">
        <button class="btn btn--ghost" id="cookie-settings-btn" type="button">Customize</button>
        <button class="btn btn--ghost" id="cookie-reject-btn" type="button">Necessary only</button>
        <button class="btn btn--primary" id="cookie-accept-btn" type="button">Accept all</button>
      </div>
    </div>
  `;
  return banner;
}

export function createCookieSettingsDialog() {
  const dialog = document.createElement("dialog");
  dialog.id = "cookie-settings-dialog";
  dialog.className = "dialog";
  
  let categoriesHTML = "";
  Object.entries(COOKIE_CATEGORIES).forEach(([id, category]) => {
    // Build user-friendly features list (NO technical cookie names)
    const featuresList = category.features
      .map((feature) => `<li>${feature}</li>`)
      .join("");

    categoriesHTML += `
      <div class="cookie-category">
        <div class="cookie-category__header">
          <div>
            <h4 class="cookie-category__name">${category.name}</h4>
            <p class="cookie-category__desc">${category.description}</p>
          </div>
          <label class="cookie-toggle">
            <input 
              type="checkbox" 
              id="cookie-toggle-${id}" 
              data-category="${id}"
              ${category.required ? "checked disabled" : ""}
            />
            <span class="cookie-toggle__slider"></span>
          </label>
        </div>
        <ul class="cookie-category__list">
          ${featuresList}
        </ul>
      </div>
    `;
  });

  dialog.innerHTML = `
    <div class="dialog__header">
      <h3 class="dialog__title">Cookie Settings</h3>
      <button class="iconbtn" id="cookie-dialog-close" type="button" aria-label="Close">✕</button>
    </div>
    <div class="dialog__body">
      <p class="muted" style="margin-top: 0;">
        Manage your cookie preferences. You can change these settings at any time by clicking the cookie icon in the footer.
      </p>
      <div class="cookie-categories">
        ${categoriesHTML}
      </div>
      <div class="divider"></div>
      <div class="panelbar">
        <button class="btn btn--primary" id="cookie-save-btn" type="button">Save preferences</button>
        <button class="btn btn--ghost" id="cookie-accept-all-btn" type="button">Accept all</button>
      </div>
    </div>
  `;
  return dialog;
}

export function showCookieBanner() {
  const existing = document.getElementById("cookie-banner");
  if (existing) return;

  const banner = createCookieBanner();
  document.body.appendChild(banner);

  // Trigger animation
  setTimeout(() => banner.classList.add("cookie-banner--visible"), 100);
}

export function hideCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  if (banner) {
    banner.classList.remove("cookie-banner--visible");
    setTimeout(() => banner.remove(), 300);
  }
}

export function openCookieSettings() {
  let dialog = document.getElementById("cookie-settings-dialog");
  if (!dialog) {
    dialog = createCookieSettingsDialog();
    document.body.appendChild(dialog);
  }

  // Load current preferences
  const consent = new CookieConsent();
  Object.keys(COOKIE_CATEGORIES).forEach((id) => {
    const toggle = document.getElementById(`cookie-toggle-${id}`);
    if (toggle && !toggle.disabled) {
      toggle.checked = consent.isAllowed(id);
    }
  });

  dialog.showModal();
}

export function closeCookieSettings() {
  const dialog = document.getElementById("cookie-settings-dialog");
  if (dialog) dialog.close();
}

// Initialize cookie consent system
export function initCookieConsent() {
  const consent = new CookieConsent();
  const functional = new FunctionalCookies(consent);

  // Show banner if no consent yet
  if (!consent.hasConsent()) {
    showCookieBanner();
  }

  // Banner event listeners
  document.addEventListener("click", (e) => {
    if (e.target.id === "cookie-accept-btn") {
      consent.acceptAll();
      hideCookieBanner();
    } else if (e.target.id === "cookie-reject-btn") {
      consent.acceptNecessary();
      hideCookieBanner();
    } else if (e.target.id === "cookie-settings-btn") {
      openCookieSettings();
    } else if (e.target.id === "cookie-dialog-close") {
      closeCookieSettings();
    } else if (e.target.id === "cookie-save-btn") {
      // Save custom preferences
      const preferences = {};
      Object.keys(COOKIE_CATEGORIES).forEach((id) => {
        const toggle = document.getElementById(`cookie-toggle-${id}`);
        preferences[id] = toggle ? toggle.checked : COOKIE_CATEGORIES[id].required;
      });
      consent.saveConsent(preferences);
      closeCookieSettings();
      hideCookieBanner();
    } else if (e.target.id === "cookie-accept-all-btn") {
      consent.acceptAll();
      closeCookieSettings();
      hideCookieBanner();
    } else if (e.target.id === "cookie-preferences-link") {
      e.preventDefault();
      openCookieSettings();
    }
  });

  // Add cookie preferences link to footer
  const footer = document.querySelector(".footer__row");
  if (footer) {
    const cookieLink = document.createElement("button");
    cookieLink.className = "linklike";
    cookieLink.id = "cookie-preferences-link";
    cookieLink.type = "button";
    cookieLink.textContent = "🍪 Cookies";
    footer.appendChild(cookieLink);
  }

  return { consent, functional };
}