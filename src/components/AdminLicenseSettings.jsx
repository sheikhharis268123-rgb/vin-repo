import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  Server,
  Clock,
  Globe,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { licenseService } from '../services/licenseService';

/**
 * WheelClarify - Admin Dashboard License Management Tab
 * File: src/components/AdminLicenseSettings.jsx
 *
 * Allows the site owner to enter, activate, verify, and persist their
 * WheelClarify Remote Subscription License Key via `/api/verify-license.php`
 * and `/api/save-license.php`.
 */
export const AdminLicenseSettings = ({ onLicenseChange }) => {
  const [licenseKey, setLicenseKey] = useState(() => licenseService.getSavedLicenseKey());
  const [licenseState, setLicenseState] = useState(() => licenseService.getLicenseState());
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    // Perform an initial verification check on mount to sync with server/cache
    handleVerifyLicense(licenseKey, false, true);
  }, []);

  const calculateRemainingValidity = (expiresAt) => {
    if (!expiresAt) return { label: 'No Active Term', daysLeft: 0, isExpired: true };
    const expDate = new Date(expiresAt);
    if (Number.isNaN(expDate.getTime())) {
      return { label: expiresAt, daysLeft: 0, isExpired: false };
    }
    const diffMs = expDate.getTime() - Date.now();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      return {
        label: `Expired on ${expDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`,
        daysLeft: 0,
        isExpired: true,
      };
    }
    return {
      label: `${expDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} (${daysLeft} days remaining)`,
      daysLeft,
      isExpired: false,
    };
  };

  const handleVerifyLicense = async (
    keyToVerify = licenseKey,
    forceRefresh = true,
    silent = false
  ) => {
    const cleanKey = (keyToVerify || '').trim().toUpperCase();
    setLicenseKey(cleanKey);
    setIsVerifying(true);
    if (!silent) setFeedback(null);

    try {
      // 1. Send POST request to /api/verify-license.php
      const verifiedState = await licenseService.verifyLicense(cleanKey, forceRefresh);

      // 2. Also persist key to localStorage & server config (/api/save-license.php)
      await licenseService.saveLicenseToServer(cleanKey);

      setLicenseState(verifiedState);
      if (typeof onLicenseChange === 'function') {
        onLicenseChange(verifiedState);
      }

      if (!silent) {
        if (verifiedState.valid) {
          setFeedback({
            type: 'success',
            message: `License verified & activated! Connected domain: ${verifiedState.domain}`,
          });
        } else {
          setFeedback({
            type: 'error',
            message:
              verifiedState.error ||
              'License verification failed. Services have been locked until a valid key is activated.',
          });
        }
      }
    } catch (err) {
      if (!silent) {
        setFeedback({
          type: 'error',
          message: 'Unable to reach licensing endpoint. Applied local cache policy.',
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveToServerConfig = async () => {
    const cleanKey = (licenseKey || '').trim().toUpperCase();
    setLicenseKey(cleanKey);
    setIsSavingConfig(true);
    setFeedback(null);

    try {
      const result = await licenseService.saveLicenseToServer(cleanKey);
      setLicenseState(result.state);
      if (typeof onLicenseChange === 'function') {
        onLicenseChange(result.state);
      }
      setFeedback({
        type: result.state.valid ? 'success' : 'error',
        message: result.state.valid
          ? 'License key saved to localStorage and server configuration (/api/save-license.php).'
          : result.state.error || 'Saved key is invalid or suspended. Features are currently locked.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyKey = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1800);
  };

  const validity = calculateRemainingValidity(licenseState?.expires_at);
  const isLicenseActive = Boolean(licenseState?.valid);
  const vinReportsActive = Boolean(
    licenseState?.valid && licenseState?.features?.vin_reports
  );
  const paymentGatewayActive = Boolean(
    licenseState?.valid && licenseState?.features?.payment_gateway
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 text-xs font-bold uppercase tracking-wider">
              <Key className="w-3.5 h-3.5" />
              Remote License Validation System
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              WheelClarify Subscription & Feature Gate
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Manage your site&apos;s remote API subscription key. Core services including{' '}
              <span className="text-slate-200 font-semibold">
                VIN Database Search / PDF Reports
              </span>{' '}
              and{' '}
              <span className="text-slate-200 font-semibold">
                Payment Gateway Processing
              </span>{' '}
              are verified against the central licensing authority with a 12-hour encrypted local
              cache TTL.
            </p>
          </div>

          {/* License Status Badge */}
          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Current License Status
            </span>
            {isLicenseActive ? (
              <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-black text-sm uppercase tracking-wider">Active</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-300 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span className="font-black text-sm uppercase tracking-wider">
                  Suspended / Invalid
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Bound Domain:{' '}
                <strong className="text-slate-200 font-mono">
                  {licenseState?.domain ||
                    (typeof window !== 'undefined' ? window.location.hostname : 'localhost')}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-semibold">{feedback.message}</div>
        </div>
      )}

      {/* License Key Input & Activation Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-5 mb-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Assigned Subscriber License Key
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your subscriber key below to authenticate with{' '}
              <code className="text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                /api/verify-license.php
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Last Checked:{' '}
              <strong className="text-slate-700">
                {licenseState?.checked_at
                  ? new Date(licenseState.checked_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Just now'}
              </strong>
            </span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyLicense(licenseKey, true, false);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="wheelclarify-license-key-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2"
            >
              License Key
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="wheelclarify-license-key-input"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="WC-KEY-884920-PRO"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-slate-900 font-mono text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
                />
                <button
                  type="button"
                  onClick={handleCopyKey}
                  title="Copy License Key"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {copiedKey ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                {isVerifying ? 'Verifying License...' : 'Activate / Verify License'}
              </button>

              <button
                type="button"
                onClick={handleSaveToServerConfig}
                disabled={isSavingConfig || isVerifying}
                className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
              >
                <Server className="w-4 h-4" />
                {isSavingConfig ? 'Saving...' : 'Save to Server Config'}
              </button>
            </div>
          </div>

          {/* Quick Preset Simulation Bar for Admin Testing */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Test Keys:
            </span>
            <button
              type="button"
              onClick={() => handleVerifyLicense('WC-KEY-884920-PRO', true, false)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono font-semibold transition-colors cursor-pointer"
            >
              WC-KEY-884920-PRO (Full Active)
            </button>
            <button
              type="button"
              onClick={() => handleVerifyLicense('WC-VINONLY-4410-PRO', true, false)}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-mono font-semibold transition-colors cursor-pointer"
            >
              WC-VINONLY-4410-PRO (VIN Only)
            </button>
            <button
              type="button"
              onClick={() => handleVerifyLicense('WC-KEY-SUSPENDED-000', true, false)}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-mono font-semibold transition-colors cursor-pointer"
            >
              WC-KEY-SUSPENDED-000 (Suspended / Lock All)
            </button>
          </div>
        </form>
      </div>

      {/* Subscription Metadata & Expiration Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isLicenseActive
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}
          >
            {isLicenseActive ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              License Status
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  isLicenseActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isLicenseActive ? 'Active' : 'Suspended / Invalid'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Plan: <strong className="text-slate-700">{licenseState?.plan || 'Standard'}</strong>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              !validity.isExpired && isLicenseActive
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Expiration Date & Validity
            </div>
            <div className="mt-1 text-sm font-black text-slate-900">
              {isLicenseActive ? validity.label : 'No Active Subscription Term'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isLicenseActive && validity.daysLeft > 0
                ? `Auto-renews or validates via 12h cache TTL`
                : 'Renew subscription to restore locked gates'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cache & Resilience Policy
            </div>
            <div className="mt-1 text-sm font-black text-slate-900">
              12-Hour Local File Cache
            </div>
            <p className="text-xs text-slate-500 mt-1">
              File: <code className="font-mono text-slate-700">.license_cache.json</code>
              {licenseState?.offline_grace ? ' (Offline Fallback Active)' : ' (Synced)'}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Access Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
            Licensed Feature Access Gates
          </h3>
          <span className="text-xs text-slate-500">
            Enforced by PHP & API Protection Gateways (HTTP 403 on unauthorized requests)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: VIN Database & PDF Report Services */}
          <div
            className={`rounded-2xl border-2 p-6 transition-all ${
              vinReportsActive
                ? 'bg-white border-emerald-500/30 shadow-sm'
                : 'bg-rose-50/40 border-rose-300 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    vinReportsActive
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  }`}
                >
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    1. VIN Database & PDF Report Services
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Gate: /api/vin-report.php
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                  vinReportsActive
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {vinReportsActive ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Active
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Locked
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              Controls live 17-digit VIN decoding, federal NMVTIS / NHTSA database queries, and
              automated PDF vehicle history dossier generation.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Feature Flag:</span>
              <code
                className={`font-mono font-bold px-2 py-0.5 rounded ${
                  vinReportsActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                features.vin_reports = {String(vinReportsActive)}
              </code>
            </div>

            {!vinReportsActive && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  Returns HTTP 403: &quot;VIN Report feature is locked. Active subscription
                  required.&quot;
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Payment Gateway Processing */}
          <div
            className={`rounded-2xl border-2 p-6 transition-all ${
              paymentGatewayActive
                ? 'bg-white border-emerald-500/30 shadow-sm'
                : 'bg-rose-50/40 border-rose-300 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    paymentGatewayActive
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    2. Payment Gateway Processing
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Gate: /api/process-payment.php
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                  paymentGatewayActive
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {paymentGatewayActive ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Active
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Locked
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              Controls customer checkout sessions, Stripe &amp; PayPal credit/debit card
              processing, and automated order confirmation creation.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Feature Flag:</span>
              <code
                className={`font-mono font-bold px-2 py-0.5 rounded ${
                  paymentGatewayActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                features.payment_gateway = {String(paymentGatewayActive)}
              </code>
            </div>

            {!paymentGatewayActive && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  Returns HTTP 403: &quot;Payment Gateway is locked. Active subscription
                  required.&quot;
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLicenseSettings;
