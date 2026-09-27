/**
 * Payment Gateway Connection Verification Service
 * Optimized for Hostinger Static Web Hosting
 *
 * CRUCIAL RULE: Never check local backend routes like /api/... or /check-payment.php
 * for connection checks, as static hosting returns 200 OK HTML pages which falsely pass checks.
 *
 * Both Stripe and PayPal verifications make direct client-side requests to official APIs.
 */

export interface PaymentConnectionResult {
  connected: boolean;
  message: string;
  details?: string;
  source: 'direct';
}

/**
 * Safely parse JSON from a response, detecting HTML error pages
 */
async function parseJsonResponse(res: Response): Promise<{ isJson: boolean; data: any; rawText: string }> {
  try {
    const rawText = await res.text();
    const trimmed = rawText.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.includes('<html')) {
      return { isJson: false, data: null, rawText };
    }
    const data = JSON.parse(trimmed);
    return { isJson: true, data, rawText };
  } catch {
    return { isJson: false, data: null, rawText: '' };
  }
}

/**
 * Verify Stripe Credentials
 * Makes direct client-side GET request to https://api.stripe.com/v1/balance with Authorization: Bearer <SECRET_KEY>.
 * Only marks as CONNECTED if res.ok AND data.object === 'balance'.
 * If Stripe returns a 401 error or invalid response, displays DISCONNECTED with the exact error message (data.error.message).
 */
export async function verifyStripeCredentials(params: {
  secretKey: string;
  publishableKey?: string;
  testMode?: boolean;
}): Promise<PaymentConnectionResult> {
  const sk = params.secretKey?.trim();

  if (!sk) {
    return {
      connected: false,
      message: 'Stripe Secret Key is missing. Please enter your Stripe Secret Key before testing.',
      source: 'direct',
    };
  }

  // Direct client-side fetch to official Stripe API
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sk}`,
      },
    });

    const parsed = await parseJsonResponse(res);

    if (!parsed.isJson) {
      return {
        connected: false,
        message: `Stripe returned non-JSON response (HTTP ${res.status}).`,
        source: 'direct',
      };
    }

    const data = parsed.data;

    // Check res.ok AND ensure data.object === 'balance'
    if (res.ok && data?.object === 'balance') {
      const modeStr = data.livemode ? 'Live Production Mode' : 'Sandbox (Test) Mode';
      const currencies = data?.available
        ?.map((a: any) => a.currency?.toUpperCase())
        .filter(Boolean)
        .join(', ') || 'USD';

      return {
        connected: true,
        message: `Connected: Stripe API credentials verified directly (200 OK)! Mode: ${modeStr}. Supported settlement currencies: ${currencies}.`,
        details: `Livemode: ${Boolean(data.livemode)}`,
        source: 'direct',
      };
    }

    // If Stripe returns a 401 error or invalid response, display DISCONNECTED with the exact error message (data.error.message)
    const exactErrorMessage = data?.error?.message || `Stripe API rejected credentials (HTTP ${res.status}).`;
    return {
      connected: false,
      message: exactErrorMessage,
      details: data?.error?.type ? `Type: ${data.error.type}` : undefined,
      source: 'direct',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Network error contacting Stripe API.',
      source: 'direct',
    };
  }
}

/**
 * Verify PayPal Credentials
 * Makes direct client-side fetch to https://api-m.paypal.com/v1/oauth2/token (or sandbox) with Basic Auth.
 * Only marks as CONNECTED if res.ok AND an access_token exists in the JSON response.
 */
export async function verifyPaypalCredentials(params: {
  clientId: string;
  secretKey: string;
  sandboxMode?: boolean;
}): Promise<PaymentConnectionResult> {
  const cid = params.clientId?.trim();
  const secret = params.secretKey?.trim();
  const isSandbox = Boolean(params.sandboxMode);

  if (!cid || !secret) {
    return {
      connected: false,
      message: 'PayPal Client ID and Secret Key are both required. Please enter both credentials.',
      source: 'direct',
    };
  }

  const baseUrl = isSandbox
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  try {
    const authHeader = `Basic ${btoa(`${cid}:${secret}`)}`;

    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const parsed = await parseJsonResponse(res);

    if (!parsed.isJson) {
      return {
        connected: false,
        message: `PayPal returned non-JSON response (HTTP ${res.status}).`,
        source: 'direct',
      };
    }

    const data = parsed.data;

    // Only mark as CONNECTED if res.ok AND an access_token exists in the JSON response
    if (res.ok && data?.access_token) {
      const modeStr = isSandbox ? 'Sandbox Mode' : 'Live Production Mode';
      const appId = data.app_id || 'Active App';

      return {
        connected: true,
        message: `Connected: PayPal OAuth2 verified directly! Active access token generated. Mode: ${modeStr} (App ID: ${appId}).`,
        details: `Expires in: ${data.expires_in || 32400}s`,
        source: 'direct',
      };
    }

    // If PayPal rejected or error response, display DISCONNECTED with the exact error message
    const exactErrorMessage = data?.error_description || data?.error || `PayPal API rejected credentials (HTTP ${res.status}).`;
    return {
      connected: false,
      message: exactErrorMessage,
      details: data?.error ? `Error: ${data.error}` : undefined,
      source: 'direct',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Network error contacting PayPal OAuth API.',
      source: 'direct',
    };
  }
}
