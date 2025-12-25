// consent.js - User consent management for data collection
// Stores consent in chrome.storage.local

const CONSENT_KEY = 'dataCollectionConsent';
const CONSENT_VERSION_KEY = 'consentVersion';
const CURRENT_CONSENT_VERSION = 1;

/**
 * Check if user has given consent for data collection
 * @returns {Promise<boolean>}
 */
async function hasConsent() {
  try {
    const result = await chrome.storage.local.get([CONSENT_KEY, CONSENT_VERSION_KEY]);

    // If no consent stored, return false
    if (!result[CONSENT_KEY]) {
      return false;
    }

    // If consent version is outdated, require re-consent
    if (result[CONSENT_VERSION_KEY] !== CURRENT_CONSENT_VERSION) {
      return false;
    }

    return result[CONSENT_KEY] === true;
  } catch (error) {
    console.error('[SepYap] Error checking consent:', error);
    return false; // Default to no consent on error
  }
}

/**
 * Set user consent for data collection
 * @param {boolean} consent - User's consent decision
 * @returns {Promise<void>}
 */
async function setConsent(consent) {
  try {
    await chrome.storage.local.set({
      [CONSENT_KEY]: consent === true,
      [CONSENT_VERSION_KEY]: CURRENT_CONSENT_VERSION,
      consentDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SepYap] Error setting consent:', error);
    throw error;
  }
}

/**
 * Get consent status (synchronous check from cached value)
 * Note: This checks the last known value, use hasConsent() for async check
 * @returns {boolean|null} - true/false if known, null if not set
 */
function getConsentSync() {
  // This is a best-effort sync check
  // For accurate check, use hasConsent() async function
  return null; // Always return null to force async check
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.SepYapConsent = {
    hasConsent,
    setConsent,
    getConsentSync
  };
  // Legacy support
  window.GroceryMatcherConsent = window.SepYapConsent;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hasConsent, setConsent, getConsentSync };
}

