export interface LicenseFeatures {
  vin_reports: boolean;
  payment_gateway: boolean;
}

export interface LicenseState {
  valid: boolean;
  status: 'Active' | 'Suspended' | 'Expired' | 'Invalid';
  license_key: string;
  domain: string;
  plan?: string;
  expires_at: string | null;
  checked_at: string;
  cached?: boolean;
  offline_grace?: boolean;
  features: LicenseFeatures;
  error: string | null;
}

const LICENSE_KEY_STORAGE = 'wheelclarify_license_key';
const LICENSE_STATE_STORAGE = 'wheelclarify_license_state';
const DEFAULT_PRO_KEY = 'WC-KEY-884920-PRO';

/**
 * Local fallback evaluator used when PHP / backend server is unreachable
 * or during offline grace operation.
 */
export function evaluateLicenseLocally(rawKey: string): LicenseState {
  const key = (rawKey || '').trim().toUpperCase();
  const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const nowIso = new Date().toISOString();

  if (!key) {
    return {
      valid: false,
      status: 'Invalid',
      license_key: '',
      domain,
      expires_at: null,
      checked_at: nowIso,
      features: {
        vin_reports: false,
        payment_gateway: false,
      },
      error: 'No license key provided. Please enter a valid WheelClarify license key.',
    };
  }

  if (key.includes('SUSPENDED') || key.includes('REVOKED') || key.includes('LOCKED')) {
    return {
      valid: false,
      status: 'Suspended',
      license_key: key,
      domain,
      expires_at: '2025-01-01T00:00:00Z',
      checked_at: nowIso,
      features: {
        vin_reports: false,
        payment_gateway: false,
      },
      error: 'This license key has been suspended by the licensing authority.',
    };
  }

  if (key.includes('EXPIRED')) {
    return {
      valid: false,
      status: 'Expired',
      license_key: key,
      domain,
      expires_at: '2024-12-31T23:59:59Z',
      checked_at: nowIso,
      features: {
        vin_reports: false,
        payment_gateway: false,
      },
      error: 'Subscription expired. Please renew your WheelClarify license.',
    };
  }

  // Partial tier keys (e.g. VIN-ONLY or PAY-ONLY)
  if (key.startsWith('WC-VINONLY-')) {
    const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      valid: true,
      status: 'Active',
      license_key: key,
      domain,
      plan: 'VIN Reports Only Tier',
      expires_at: exp,
      checked_at: nowIso,
      features: {
        vin_reports: true,
        payment_gateway: false,
      },
      error: null,
    };
  }

  if (key.startsWith('WC-PAYONLY-')) {
    const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      valid: true,
      status: 'Active',
      license_key: key,
      domain,
      plan: 'Payment Gateway Only Tier',
      expires_at: exp,
      checked_at: nowIso,
      features: {
        vin_reports: false,
        payment_gateway: true,
      },
      error: null,
    };
  }

  // Standard WheelClarify Pro / Enterprise format: WC-KEY-XXXXXX-PRO or WC-PRO-...
  const isValidFormat =
    /^WC-[A-Z0-9]{2,10}-[A-Z0-9]{4,12}(-[A-Z0-9]{2,10})?$/.test(key) &&
    key.length >= 12;

  if (isValidFormat) {
    const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      valid: true,
      status: 'Active',
      license_key: key,
      domain,
      plan: key.endsWith('-ENT') ? 'Enterprise Unlimited' : 'Pro Full-Stack License',
      expires_at: exp,
      checked_at: nowIso,
      features: {
        vin_reports: true,
        payment_gateway: true,
      },
      error: null,
    };
  }

  return {
    valid: false,
    status: 'Invalid',
    license_key: key,
    domain,
    expires_at: null,
    checked_at: nowIso,
    features: {
      vin_reports: false,
      payment_gateway: false,
    },
    error: 'Invalid license key format. Expected format: WC-KEY-XXXXXX-PRO.',
  };
}

export const licenseService = {
  getSavedLicenseKey(): string {
    if (typeof window === 'undefined') return DEFAULT_PRO_KEY;
    const saved = localStorage.getItem(LICENSE_KEY_STORAGE);
    if (saved === null) {
      // Pre-seed default Pro license so initial installation works out of the box
      localStorage.setItem(LICENSE_KEY_STORAGE, DEFAULT_PRO_KEY);
      return DEFAULT_PRO_KEY;
    }
    return saved;
  },

  saveLicenseKeyLocal(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LICENSE_KEY_STORAGE, key.trim());
  },

  getLicenseState(): LicenseState {
    if (typeof window === 'undefined') {
      return evaluateLicenseLocally(DEFAULT_PRO_KEY);
    }
    const rawState = localStorage.getItem(LICENSE_STATE_STORAGE);
    if (rawState) {
      try {
        const parsed = JSON.parse(rawState) as LicenseState;
        if (parsed && typeof parsed.valid === 'boolean' && parsed.features) {
          return parsed;
        }
      } catch {
        // Ignore parse error and re-evaluate
      }
    }
    const initialKey = this.getSavedLicenseKey();
    const evaluated = evaluateLicenseLocally(initialKey);
    localStorage.setItem(LICENSE_STATE_STORAGE, JSON.stringify(evaluated));
    return evaluated;
  },

  saveLicenseStateLocal(state: LicenseState): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LICENSE_STATE_STORAGE, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('wheelclarify-license-updated', { detail: state }));
  },

  async verifyLicense(licenseKey: string, forceRefresh = false): Promise<LicenseState> {
    const cleanKey = (licenseKey || '').trim().toUpperCase();
    this.saveLicenseKeyLocal(cleanKey);

    try {
      const response = await fetch('/api/verify-license.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          license_key: cleanKey,
          domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
          force_refresh: forceRefresh,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        const state: LicenseState = {
          valid: Boolean(data.valid),
          status:
            data.status ||
            (data.valid ? 'Active' : cleanKey.includes('SUSPENDED') ? 'Suspended' : 'Invalid'),
          license_key: cleanKey,
          domain:
            data.domain ||
            (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
          plan: data.plan || (data.valid ? 'Pro Full-Stack License' : 'Unlicensed'),
          expires_at: data.expires_at || null,
          checked_at: data.checked_at || new Date().toISOString(),
          cached: Boolean(data.cached),
          offline_grace: Boolean(data.offline_grace),
          features: {
            vin_reports: Boolean(data.features?.vin_reports),
            payment_gateway: Boolean(data.features?.payment_gateway),
          },
          error: data.error || null,
        };
        this.saveLicenseStateLocal(state);
        return state;
      }
    } catch {
      // Remote endpoint unreachable — fall back gracefully to local validation
    }

    const fallbackState = {
      ...evaluateLicenseLocally(cleanKey),
      offline_grace: true,
    };
    this.saveLicenseStateLocal(fallbackState);
    return fallbackState;
  },

  async saveLicenseToServer(licenseKey: string): Promise<{ success: boolean; state: LicenseState }> {
    const cleanKey = (licenseKey || '').trim().toUpperCase();
    this.saveLicenseKeyLocal(cleanKey);

    try {
      const response = await fetch('/api/save-license.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          license_key: cleanKey,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.license) {
          const state: LicenseState = {
            valid: Boolean(data.license.valid),
            status: data.license.status || (data.license.valid ? 'Active' : 'Invalid'),
            license_key: cleanKey,
            domain:
              data.license.domain ||
              (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
            plan: data.license.plan || (data.license.valid ? 'Pro Full-Stack License' : 'Unlicensed'),
            expires_at: data.license.expires_at || null,
            checked_at: data.license.checked_at || new Date().toISOString(),
            cached: Boolean(data.license.cached),
            offline_grace: Boolean(data.license.offline_grace),
            features: {
              vin_reports: Boolean(data.license.features?.vin_reports),
              payment_gateway: Boolean(data.license.features?.payment_gateway),
            },
            error: data.license.error || null,
          };
          this.saveLicenseStateLocal(state);
          return { success: Boolean(data.success), state };
        }
      }
    } catch {
      // Graceful fallback to verifyLicense
    }

    const state = await this.verifyLicense(cleanKey, true);
    return { success: state.valid, state };
  },

  /**
   * Checks whether VIN Report & PDF service is authorized by calling `/api/vin-report.php`
   * and checking local state.
   */
  async checkVinReportAccess(vin?: string, action: 'lookup' | 'pdf' = 'lookup'): Promise<{
    allowed: boolean;
    error: string | null;
  }> {
    const currentKey = this.getSavedLicenseKey();
    try {
      const response = await fetch('/api/vin-report.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': currentKey,
        },
        body: JSON.stringify({
          license_key: currentKey,
          vin: vin || '',
          action,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (response.status === 403 || data.success === false) {
          return {
            allowed: false,
            error:
              data.error || 'VIN Report feature is locked. Active subscription required.',
          };
        }
        return { allowed: true, error: null };
      }
    } catch {
      // Offline fallback: inspect local license state
    }

    const state = this.getLicenseState();
    if (!state.valid || !state.features.vin_reports) {
      return {
        allowed: false,
        error: 'VIN Report feature is locked. Active subscription required.',
      };
    }
    return { allowed: true, error: null };
  },

  /**
   * Checks whether Payment Gateway Processing is authorized by calling `/api/process-payment.php`
   * and checking local state.
   */
  async checkPaymentGatewayAccess(payload?: {
    gateway?: string;
    amount?: number;
    currency?: string;
    vin?: string;
    email?: string;
  }): Promise<{
    allowed: boolean;
    error: string | null;
  }> {
    const currentKey = this.getSavedLicenseKey();
    try {
      const response = await fetch('/api/process-payment.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': currentKey,
        },
        body: JSON.stringify({
          license_key: currentKey,
          ...(payload || {}),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (response.status === 403 || data.success === false) {
          return {
            allowed: false,
            error:
              data.error || 'Payment Gateway is locked. Active subscription required.',
          };
        }
        return { allowed: true, error: null };
      }
    } catch {
      // Offline fallback: inspect local license state
    }

    const state = this.getLicenseState();
    if (!state.valid || !state.features.payment_gateway) {
      return {
        allowed: false,
        error: 'Payment Gateway is locked. Active subscription required.',
      };
    }
    return { allowed: true, error: null };
  },
};
