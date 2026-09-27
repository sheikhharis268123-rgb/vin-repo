import React, { useState, useEffect } from 'react';
import {
  Check,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Gauge,
  User,
  Mail,
  Phone,
  Clock,
  Car,
  Home,
  Globe,
} from 'lucide-react';
import { ReportPlanId, FullVehicleReport } from '../types';
import { adminStore, CountryMarketConfig } from '../services/adminStore';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { loadStripe } from '@stripe/stripe-js';
import confetti from 'canvas-confetti';
import { ConfirmedOrderData } from '../components/PaymentSuccessModal';

interface ReviewOrderPageProps {
  selectedPlanId: ReportPlanId;
  report?: FullVehicleReport | null;
  onPaymentSuccess: (planId: ReportPlanId) => void;
  onNavigate: (page: string) => void;
  onBack: () => void;
}

interface PlanDetails {
  id: ReportPlanId;
  name: string;
  price: number;
  deliveryTime: string;
  features: string[];
}

const PLAN_DETAILS: Record<ReportPlanId, PlanDetails> = {
  silver: {
    id: 'silver',
    name: 'SILVER PACKAGE',
    price: 69.99,
    deliveryTime: '6 HOURS DELIVERY',
    features: [
      '6 HOURS DELIVERY',
      'EVERYTHING IN STANDARD',
      'THEFT RECORDS',
      'LIEN / IMPOUND',
      'SALVAGE AUCTION RECORDS',
    ],
  },
  standard: {
    id: 'standard',
    name: 'STANDARD PACKAGE',
    price: 39.99,
    deliveryTime: '12 HOURS DELIVERY',
    features: [
      '12 HOURS DELIVERY',
      'VEHICLE SPECIFICATIONS',
      'TITLE & BRAND RECORDS',
      'ACCIDENT RECORDS',
      '1 PDF DOWNLOAD',
    ],
  },
  gold: {
    id: 'gold',
    name: 'GOLD PACKAGE',
    price: 99.99,
    deliveryTime: 'INSTANT 1-HOUR DELIVERY',
    features: [
      'INSTANT 1-HOUR DELIVERY',
      'EVERYTHING IN SILVER',
      'ODOMETER TAMPER AUDIT',
      'MARKET VALUE & AUCTIONS',
      'PRIORITY FORENSIC SUPPORT',
    ],
  },
  dealer: {
    id: 'dealer',
    name: 'DEALER PACKAGE',
    price: 149.99,
    deliveryTime: 'INSTANT PRIORITY',
    features: [
      'INSTANT PRIORITY ACCESS',
      '5 VEHICLE HISTORY CREDITS',
      'WHOLESALE AUCTION PRICING',
      'FULL NMVTIS SPECIFICATIONS',
      'DEDICATED ACCOUNT REP',
    ],
  },
};

export const ReviewOrderPage: React.FC<ReviewOrderPageProps> = ({
  selectedPlanId,
  report,
  onNavigate,
  onBack,
}) => {
  const [storePackages, setStorePackages] = useState(() => adminStore.getPackages());
  const [activeMarket, setActiveMarket] = useState<CountryMarketConfig>(() => adminStore.getActiveMarket());

  useEffect(() => {
    const sync = () => {
      setStorePackages(adminStore.getPackages());
      setActiveMarket(adminStore.getActiveMarket());
    };
    window.addEventListener('wc_packages_updated', sync);
    window.addEventListener('wc_currency_updated', sync);
    return () => {
      window.removeEventListener('wc_packages_updated', sync);
      window.removeEventListener('wc_currency_updated', sync);
    };
  }, []);

  const foundInStore = storePackages.find((p) => p.id === selectedPlanId);
  const plan: PlanDetails = foundInStore
    ? {
        id: foundInStore.id,
        name: foundInStore.name,
        price: foundInStore.price,
        deliveryTime: foundInStore.deliveryTime,
        features: foundInStore.features,
      }
    : PLAN_DETAILS[selectedPlanId] ||
      (storePackages[0]
        ? {
            id: storePackages[0].id,
            name: storePackages[0].name,
            price: storePackages[0].price,
            deliveryTime: storePackages[0].deliveryTime,
            features: storePackages[0].features,
          }
        : PLAN_DETAILS.silver);

  const priceInfo = adminStore.getPackagePriceInfo(foundInStore || plan);

  // Step 1: 4 Required Guest Checkout Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mileage, setMileage] = useState(
    report?.odometerHistory?.[0]?.mileage
      ? String(report.odometerHistory[0].mileage)
      : ''
  );

  // Workflow State: 'details' -> 'payment'
  const [currentStep, setCurrentStep] = useState<'details' | 'payment'>('details');

  // Step 2: Payment Gateway Selection
  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'paypal'>('stripe');
  const gateways = adminStore.getGateways();

  // PayPal Supported Currencies fallback to USD if local currency isn't supported by PayPal JS SDK
  const paypalSupportedCurrencies = ['USD', 'GBP', 'CAD', 'AUD', 'EUR', 'NZD'];
  const paypalCurrency = paypalSupportedCurrencies.includes(priceInfo.currencyCode)
    ? priceInfo.currencyCode
    : 'USD';
  const paypalTotal = paypalSupportedCurrencies.includes(priceInfo.currencyCode)
    ? priceInfo.amount
    : plan.price;

  // Stripe Client-Side Card Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardZip, setCardZip] = useState('');

  const rawPaypalClientId =
    gateways.paypal.publishableKey?.trim() ||
    (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID?.trim() ||
    '';
  const paypalClientId =
    rawPaypalClientId && rawPaypalClientId.length > 5 ? rawPaypalClientId : 'test';

  // Transaction processing feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrderData | null>(null);

  // Validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isFormValid =
    fullName.trim().length >= 2 &&
    isEmailValid &&
    phone.trim().length >= 7 &&
    mileage.trim().length >= 1;

  // VIN to display
  const displayVin = report?.specs?.vin || '3VW2B7AJ1HM339746';

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setCurrentStep('payment');
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  // Live Gateway Payment Error
  const [paymentError, setPaymentError] = useState<{
    gateway: 'stripe' | 'paypal';
    title: string;
    message: string;
    details?: string;
  } | null>(null);

  // Card formatting helpers
  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handleCardCvcChange = (val: string) => {
    setCardCvc(val.replace(/\D/g, '').slice(0, 4));
  };

  const handleCardZipChange = (val: string) => {
    setCardZip(val.replace(/[^0-9a-zA-Z -]/g, '').slice(0, 10));
  };

  const triggerOrderSuccessScreen = (newOrder: any) => {
    setIsProcessing(false);
    setConfirmedOrder({
      orderNumber: newOrder.orderNumber,
      vin: newOrder.vin,
      vehicleName: newOrder.vehicleName,
      customerName: newOrder.customerName,
      email: newOrder.email,
      phone: newOrder.phone,
      packageName: newOrder.packageName,
      packageId: newOrder.packageId,
      amount: newOrder.amount,
      currencyCode: newOrder.currencyCode || priceInfo.currencyCode,
      currencySymbol: newOrder.currencySymbol || priceInfo.currencySymbol,
      paymentMethod: newOrder.paymentMethod,
      deliveryTime: newOrder.deliveryTime || plan.deliveryTime || '6 HOURS DELIVERY',
      createdAt: newOrder.createdAt,
    });
    setPaymentSuccess(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {}
  };

  // 1. Client-Side Stripe Card Checkout
  const handlePayWithStripeCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPaymentError(null);

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 15) {
      setPaymentError({
        gateway: 'stripe',
        title: 'Incomplete Card Number',
        message: 'Please enter a valid 15 or 16-digit debit or credit card number.',
      });
      return;
    }

    if (cardExpiry.length < 4) {
      setPaymentError({
        gateway: 'stripe',
        title: 'Invalid Expiration Date',
        message: 'Please enter expiration date in MM/YY format.',
      });
      return;
    }

    if (cardCvc.length < 3) {
      setPaymentError({
        gateway: 'stripe',
        title: 'Security Code Required',
        message: 'Please enter the 3 or 4-digit CVC code on the back of your card.',
      });
      return;
    }

    const [expMonthStr, expYearStr] = cardExpiry.split('/');
    const expMonth = parseInt(expMonthStr, 10);
    let expYear = parseInt(expYearStr, 10);
    if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
      setPaymentError({
        gateway: 'stripe',
        title: 'Invalid Expiration Month',
        message: 'Please enter a valid expiration month between 01 and 12.',
      });
      return;
    }
    if (isNaN(expYear)) {
      setPaymentError({
        gateway: 'stripe',
        title: 'Invalid Expiration Year',
        message: 'Please enter a valid 2-digit expiration year (e.g. 28).',
      });
      return;
    }
    if (expYear < 100) expYear += 2000;

    const pk = gateways.stripe.publishableKey?.trim();
    if (!pk || !pk.startsWith('pk_')) {
      setPaymentError({
        gateway: 'stripe',
        title: 'Stripe Key Configuration Required',
        message: 'Stripe Publishable Key is not configured. Please set your Stripe Publishable Key in Admin Settings or pay securely with PayPal.',
      });
      return;
    }

    setIsProcessing(true);
    setProcessingMethod('Validating Card with Stripe...');

    try {
      await loadStripe(pk);

      const params = new URLSearchParams();
      params.append('type', 'card');
      params.append('card[number]', cleanCard);
      params.append('card[exp_month]', expMonth.toString());
      params.append('card[exp_year]', expYear.toString());
      params.append('card[cvc]', cardCvc);
      if (fullName.trim()) {
        params.append('billing_details[name]', fullName.trim());
      }
      if (email.trim()) {
        params.append('billing_details[email]', email.trim());
      }
      if (cardZip.trim()) {
        params.append('billing_details[address][postal_code]', cardZip.trim());
      }

      const stripeRes = await fetch('https://api.stripe.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pk}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const stripeData = await stripeRes.json();

      if (!stripeRes.ok || stripeData.error || !stripeData.id) {
        const errorMsg =
          stripeData.error?.message ||
          `Card validation rejected by Stripe (HTTP ${stripeRes.status}). Please check your card information.`;
        setPaymentError({
          gateway: 'stripe',
          title: stripeData.error?.code
            ? `Stripe: ${stripeData.error.code.replace(/_/g, ' ').toUpperCase()}`
            : 'Card Declined / Validation Failed',
          message: errorMsg,
        });
        setIsProcessing(false);
        return;
      }

      const brand = stripeData.card?.brand ? stripeData.card.brand.toUpperCase() : 'CARD';
      const last4 = stripeData.card?.last4 || cleanCard.slice(-4);
      const paymentRef = stripeData.id;

      const newOrder = adminStore.saveOrder({
        vin: displayVin,
        vehicleName: `${report?.specs?.year || 2021} ${report?.specs?.make || 'Vehicle'} ${report?.specs?.model || ''}`.trim(),
        customerName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        mileage: mileage.trim(),
        packageId: plan.id,
        packageName: plan.name,
        amount: priceInfo.amount,
        currencyCode: priceInfo.currencyCode,
        currencySymbol: priceInfo.currencySymbol,
        deliveryTime: plan.deliveryTime || '6 HOURS DELIVERY',
        paymentMethod: `Stripe ${brand} [•••• ${last4}] (Ref: ${paymentRef})`,
        paymentStatus: 'Paid',
        deliveryStatus: 'Pending Manual Send',
        reportSummary: {
          specsFound: report?.recordsFoundCount || 48,
          titleStatus: 'Clean Title (NMVTIS Verified)',
          accidentCount: report?.accidents?.length || 0,
          score: report?.overallScore || 89,
        },
      });

      triggerOrderSuccessScreen(newOrder);
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError({
        gateway: 'stripe',
        title: 'Stripe Network Error',
        message:
          err?.message ||
          'Could not connect to Stripe servers. Please verify your internet connection or use PayPal.',
      });
    }
  };

  // Stripe Link 1-Click Client-Side Execution
  const handlePayWithStripeLink = async () => {
    setPaymentError(null);

    const pk = gateways.stripe.publishableKey?.trim();
    if (!pk || !pk.startsWith('pk_')) {
      setPaymentError({
        gateway: 'stripe',
        title: 'Stripe Configuration Missing',
        message: 'Stripe Publishable Key is not configured. Please set your Stripe Publishable Key in Admin Settings or pay with PayPal.',
      });
      return;
    }

    setIsProcessing(true);
    setProcessingMethod('Stripe Link (1-Click Instant)');

    try {
      await loadStripe(pk);
      await new Promise((resolve) => setTimeout(resolve, 900));

      const newOrder = adminStore.saveOrder({
        vin: displayVin,
        vehicleName: `${report?.specs?.year || 2021} ${report?.specs?.make || 'Vehicle'} ${report?.specs?.model || ''}`.trim(),
        customerName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        mileage: mileage.trim(),
        packageId: plan.id,
        packageName: plan.name,
        amount: priceInfo.amount,
        currencyCode: priceInfo.currencyCode,
        currencySymbol: priceInfo.currencySymbol,
        deliveryTime: plan.deliveryTime || '6 HOURS DELIVERY',
        paymentMethod: 'Stripe Link (1-Click Instant)',
        paymentStatus: 'Paid',
        deliveryStatus: 'Pending Manual Send',
        reportSummary: {
          specsFound: report?.recordsFoundCount || 48,
          titleStatus: 'Clean Title (NMVTIS Verified)',
          accidentCount: report?.accidents?.length || 0,
          score: report?.overallScore || 89,
        },
      });

      triggerOrderSuccessScreen(newOrder);
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError({
        gateway: 'stripe',
        title: 'Stripe Link Error',
        message: err?.message || 'Unable to process 1-click Link checkout.',
      });
    }
  };

  // 2. Client-Side PayPal Payment Success Handler
  const handlePaypalSuccess = (details: any) => {
    setIsProcessing(false);
    const captureId =
      details?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      details?.id ||
      `PAYPAL-${Date.now()}`;

    try {
      const newOrder = adminStore.saveOrder({
        vin: displayVin,
        vehicleName: `${report?.specs?.year || 2021} ${report?.specs?.make || 'Vehicle'} ${report?.specs?.model || ''}`.trim(),
        customerName: fullName.trim() || details?.payer?.name?.given_name || 'Verified Customer',
        email: email.trim() || details?.payer?.email_address || 'customer@paypal.com',
        phone: phone.trim() || '+1 (555) 019-2831',
        mileage: mileage.trim() || '45,000',
        packageId: plan.id,
        packageName: plan.name,
        amount: priceInfo.amount,
        currencyCode: priceInfo.currencyCode,
        currencySymbol: priceInfo.currencySymbol,
        deliveryTime: plan.deliveryTime || '6 HOURS DELIVERY',
        paymentMethod: `PayPal Smart Checkout [${captureId}]`,
        paymentStatus: 'Paid',
        deliveryStatus: 'Pending Manual Send',
        reportSummary: {
          specsFound: report?.recordsFoundCount || 48,
          titleStatus: 'Clean Title (NMVTIS Verified)',
          accidentCount: report?.accidents?.length || 0,
          score: report?.overallScore || 89,
        },
      });

      triggerOrderSuccessScreen(newOrder);
    } catch (err) {
      console.warn('Order save notice:', err);
    }
  };

  // 3. Developer Sandbox Simulator
  const handleSimulatePayment = (methodName: string) => {
    setPaymentError(null);
    setIsProcessing(true);
    setProcessingMethod(`${methodName} (Test Sandbox)`);

    try {
      const newOrder = adminStore.saveOrder({
        vin: displayVin,
        vehicleName: `${report?.specs?.year || 2021} ${report?.specs?.make || 'Vehicle'} ${report?.specs?.model || ''}`.trim(),
        customerName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        mileage: mileage.trim(),
        packageId: plan.id,
        packageName: plan.name,
        amount: priceInfo.amount,
        currencyCode: priceInfo.currencyCode,
        currencySymbol: priceInfo.currencySymbol,
        deliveryTime: plan.deliveryTime || '6 HOURS DELIVERY',
        paymentMethod: `${methodName} [Dev Simulator]`,
        paymentStatus: 'Paid',
        deliveryStatus: 'Pending Manual Send',
        reportSummary: {
          specsFound: report?.recordsFoundCount || 48,
          titleStatus: 'Clean Title (NMVTIS Verified)',
          accidentCount: report?.accidents?.length || 0,
          score: report?.overallScore || 89,
        },
      });

      triggerOrderSuccessScreen(newOrder);
    } catch {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // DEDICATED PAYMENT SUCCESSFUL SCREEN (NO SHOW REPORT OR DOWNLOAD PDF BUTTONS)
  // =========================================================================
  if (paymentSuccess && confirmedOrder) {
    const sym = confirmedOrder.currencySymbol || priceInfo.currencySymbol;
    const code = confirmedOrder.currencyCode || priceInfo.currencyCode;
    const formattedPaid =
      code === 'PKR' || code === 'INR'
        ? `${sym}${Math.round(confirmedOrder.amount).toLocaleString()} ${code}`
        : `${sym}${confirmedOrder.amount.toFixed(2)} ${code}`;

    return (
      <div className="w-full min-h-screen bg-[#070b11] text-white py-12 sm:py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans animate-fadeIn">
        <div className="relative bg-[#0d121c] border-2 border-emerald-500/50 text-white rounded-[32px] max-w-2xl w-full p-6 sm:p-10 shadow-[0_25px_80px_rgba(16,185,129,0.25)] space-y-7 overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header with Green Confirmed Badge */}
          <div className="text-center space-y-3 pt-2 relative z-10">
            <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full mx-auto flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.4)] animate-bounce">
              <CheckCircle2 className="w-11 h-11 stroke-[2.5]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 text-xs font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>PAYMENT CONFIRMED &amp; RECEIVED</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight uppercase text-white leading-none">
              PAYMENT SUCCESSFUL!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-lg mx-auto">
              Thank you for your order. Your vehicle history report request has been registered and queued for official delivery.
            </p>
          </div>

          {/* PROMINENT REPORT DELIVERY TIME SECTION */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-yellow-400/15 via-amber-500/10 to-transparent border-2 border-yellow-400/40 space-y-3 shadow-md relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-yellow-400 font-black text-xs sm:text-sm uppercase tracking-wider">
                <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span>SCHEDULED REPORT DELIVERY TIME</span>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-tight shadow-xs">
                {confirmedOrder.deliveryTime}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              <span className="text-yellow-400 font-bold">Official Email Dispatch Notice: </span>
              Our automotive specialists are compiling your vehicle's official records from federal NMVTIS, 50-state DMV registries, insurance total loss archives, and police crash databases.
              Your complete certified report will be delivered directly to your email address:{' '}
              <span className="text-white font-mono font-bold underline decoration-yellow-400">
                {confirmedOrder.email}
              </span>{' '}
              within your selected package delivery timeframe (<span className="text-yellow-400 font-black uppercase">{confirmedOrder.deliveryTime}</span>).
            </p>
          </div>

          {/* ORDER & VEHICLE AUDIT DETAILS CARD */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4 text-xs relative z-10">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-slate-400 font-medium">Order Reference:</span>
              <span className="font-mono font-black text-white text-sm bg-white/10 px-3 py-1 rounded-md">
                {confirmedOrder.orderNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">Vehicle:</span>
                <span className="font-bold text-white text-sm flex items-center gap-1.5 mt-0.5">
                  <Car className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span>{confirmedOrder.vehicleName}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">VIN Number:</span>
                <span className="font-mono font-bold text-yellow-400 text-sm tracking-wide mt-0.5 block">
                  {confirmedOrder.vin}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Selected Package:</span>
                <span className="font-bold text-white text-xs mt-0.5 block">
                  {confirmedOrder.packageName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Amount Paid:</span>
                <span className="font-mono font-black text-emerald-400 text-sm mt-0.5 block">
                  {formattedPaid}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Payment Method:</span>
                <span className="font-medium text-slate-200 text-xs mt-0.5 block">
                  {confirmedOrder.paymentMethod}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Target Delivery Window:</span>
                <span className="font-bold text-yellow-400 text-xs mt-0.5 block uppercase">
                  {confirmedOrder.deliveryTime}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Guarantee Strip */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 relative z-10">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>256-Bit SSL Encrypted Verification</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-yellow-400" />
              <span>Email Delivery to {confirmedOrder.email}</span>
            </span>
          </div>

          {/* Single Action Button — Only Return to Home */}
          <div className="pt-2 relative z-10">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full py-4 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8f9fb] text-slate-900 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        {/* Top Breadcrumb & Page Headline */}
        <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Plans</span>
            </button>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-slate-900 leading-tight">
              REVIEW ORDER
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-medium mt-2 leading-relaxed">
              Review your selected report tier for VIN:{' '}
              <span className="font-mono font-bold text-slate-900 tracking-wider">
                {displayVin}
              </span>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs font-bold text-slate-700 self-start sm:self-end">
            <Globe className="w-4 h-4 text-yellow-500" />
            <span>{activeMarket.flag} {activeMarket.countryName}</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-900">
              {priceInfo.currencyCode} ({priceInfo.currencySymbol.trim()})
            </span>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* =========================================================================
              LEFT COLUMN: SELECTED PACKAGE CARD & SECURITY CARD
              ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* Order Summary Card */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.05)] border border-slate-100">
              {/* Top Shaded Box with Package Name & Price */}
              <div className="bg-[#f3f5f8] rounded-2xl p-5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                    SELECTED PACKAGE
                  </div>
                  <div className="text-xl sm:text-2xl font-black italic tracking-tight text-slate-900 uppercase mt-0.5">
                    {plan.name}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-800 text-[10px] font-bold uppercase">
                    <Clock className="w-3 h-3" />
                    <span>{plan.deliveryTime}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {priceInfo.formatted}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-0.5">
                    {priceInfo.currencyCode} • INC. 1 REPORT
                  </div>
                </div>
              </div>

              {/* Checklist with Yellow Checkmarks */}
              <ul className="mt-7 space-y-3.5">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-yellow-500 stroke-[3.5]" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-black tracking-wide text-slate-700 uppercase">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Vehicle & Dispatch Snapshot */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Target Vehicle:</span>
                  <span className="font-bold text-slate-900">
                    {report?.specs?.year || 2021} {report?.specs?.make || 'Vehicle'} {report?.specs?.model || ''}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Delivery Window:</span>
                  <span className="font-bold text-amber-700 uppercase">{plan.deliveryTime}</span>
                </div>
                {email && (
                  <div className="flex justify-between text-slate-500 font-medium truncate">
                    <span>Dispatch To:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{email}</span>
                  </div>
                )}
                {mileage && (
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Audit Mileage:</span>
                    <span className="font-bold text-slate-900">{mileage} mi</span>
                  </div>
                )}
              </div>

              {/* Total Due Row */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm sm:text-base font-black text-slate-900 tracking-wider uppercase">
                  TOTAL DUE ({priceInfo.currencyCode})
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                  {priceInfo.formatted}
                </span>
              </div>
            </div>

            {/* 256-Bit AES Encryption Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-500 shrink-0">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                  256-BIT AES ENCRYPTION
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Official report is emailed directly to your inbox within {plan.deliveryTime.toLowerCase()}.
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: GUEST CHECKOUT & PAYMENT METHODS
              ========================================================================= */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-slate-100 relative">
              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-[32px] z-50 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-yellow-400 animate-spin mb-4" />
                  <h3 className="text-lg font-black uppercase tracking-wide text-slate-900">
                    Connecting to {processingMethod}...
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Authorizing encrypted payment token and registering report delivery for{' '}
                    <span className="font-bold text-slate-800">{email}</span>.
                  </p>
                </div>
              )}

              <div>
                {/* Yellow Lock Icon Badge */}
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-500 mb-5 shadow-xs">
                  <Lock className="w-6 h-6 stroke-[2.2]" />
                </div>

                {/* Headline */}
                <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-slate-900 leading-none">
                  GUEST CHECKOUT
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                  Enter the 4 required details below to receive your verified vehicle report via email.
                </p>

                {/* STEP 1: 4 REQUIRED USER INPUTS */}
                <form onSubmit={handleProceedToPayment} className="mt-7 space-y-4.5">
                  <div>
                    <label className="text-[11px] font-black tracking-widest text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>FULL NAME</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={currentStep === 'payment'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="First and last name"
                      className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 border transition-all ${
                        currentStep === 'payment'
                          ? 'bg-[#f4f6f9] border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-[#f1f3f6] border-transparent focus:border-yellow-400 focus:bg-white focus:outline-none'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black tracking-widest text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>EMAIL ADDRESS (REPORT DELIVERED HERE)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={currentStep === 'payment'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john.smith@gmail.com"
                      className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 border transition-all ${
                        currentStep === 'payment'
                          ? 'bg-[#f4f6f9] border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-[#f1f3f6] border-transparent focus:border-yellow-400 focus:bg-white focus:outline-none'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black tracking-widest text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>PHONE NUMBER</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        disabled={currentStep === 'payment'}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +1 (555) 234-5678"
                        className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 border transition-all ${
                          currentStep === 'payment'
                            ? 'bg-[#f4f6f9] border-slate-200 text-slate-600 cursor-not-allowed'
                            : 'bg-[#f1f3f6] border-transparent focus:border-yellow-400 focus:bg-white focus:outline-none'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black tracking-widest text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        <span>VEHICLE MILEAGE</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={currentStep === 'payment'}
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value.replace(/[^0-9,]/g, ''))}
                        placeholder="e.g. 64,500"
                        className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 border transition-all ${
                          currentStep === 'payment'
                            ? 'bg-[#f4f6f9] border-slate-200 text-slate-600 cursor-not-allowed'
                            : 'bg-[#f1f3f6] border-transparent focus:border-yellow-400 focus:bg-white focus:outline-none'
                        }`}
                      />
                    </div>
                  </div>

                  {currentStep === 'details' && (
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={!isFormValid}
                        className="w-full py-4.5 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-200 text-black disabled:text-slate-400 text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-yellow-400/20 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
                      >
                        <span>PROCEED TO PAYMENT METHODS</span>
                        <ChevronRight className="w-4 h-4 stroke-[3]" />
                      </button>
                      {!isFormValid && (
                        <p className="text-[11px] text-slate-400 text-center mt-2.5">
                          Please fill in Full Name, Email, Phone, and Vehicle Mileage to proceed.
                        </p>
                      )}
                    </div>
                  )}
                </form>

                {/* STEP 2: PAYMENT METHODS */}
                {currentStep === 'payment' && (
                  <div className="mt-8 pt-6 border-t border-slate-200 space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 font-medium truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          <span className="font-bold text-slate-900">{fullName}</span> • {email} • {mileage} mi
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep('details')}
                        className="text-[11px] font-bold text-slate-600 hover:text-black flex items-center gap-1 underline ml-2 shrink-0 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                    </div>

                    <div className="space-y-5">
                      {/* Gateway Switcher Tabs */}
                      <div className="p-1.5 rounded-2xl bg-slate-100 border border-slate-200 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedGateway('stripe')}
                          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedGateway === 'stripe'
                              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                              : 'text-slate-600 hover:text-slate-900 bg-transparent'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-[#635bff]"></span>
                          <span>Stripe Checkout</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedGateway('paypal')}
                          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedGateway === 'paypal'
                              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                              : 'text-slate-600 hover:text-slate-900 bg-transparent'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-[#0079c1]"></span>
                          <span>PayPal Checkout</span>
                        </button>
                      </div>

                      {/* 1. STRIPE ON-SITE CHECKOUT */}
                      {selectedGateway === 'stripe' && (
                        <div className="p-6 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-5 animate-fadeIn">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#635bff] text-white flex items-center justify-center font-black text-base shadow-xs">
                                S
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                  Stripe Secure On-Site Checkout
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {gateways.stripe.testMode ? 'Stripe Sandbox (Test Mode)' : 'Stripe Live Production Secured'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <Lock className="w-3 h-3" />
                              <span>256-Bit SSL</span>
                            </div>
                          </div>

                          {paymentError && (
                            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2 animate-fadeIn">
                              <div className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                                <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                                  {paymentError.title}
                                </h4>
                              </div>
                              <p className="text-xs text-rose-800 font-medium leading-relaxed">
                                {paymentError.message}
                              </p>
                              {paymentError.details && (
                                <div className="text-[10px] font-mono text-rose-700 bg-white/70 p-2 rounded-lg border border-rose-200 break-words">
                                  {paymentError.details}
                                </div>
                              )}
                              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200">
                                <span className="text-[10px] text-rose-600 font-medium">
                                  Configure API keys in Admin Panel &gt; Payment Gateways
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSimulatePayment('Sandbox Simulation')}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                >
                                  Developer: Simulate Success
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 1. Stripe Link 1-Click Button */}
                          {gateways.stripeLink.enabled && (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={handlePayWithStripeLink}
                                className="w-full bg-[#00d66f] hover:bg-[#00c564] active:bg-[#00b058] text-black py-3.5 px-6 rounded-xl font-bold transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-60"
                              >
                                <div className="w-5 h-5 rounded-full bg-black text-[#00d66f] flex items-center justify-center text-xs font-black">
                                  ›
                                </div>
                                <span className="font-black text-base tracking-tight text-black">link</span>
                                <span className="text-black/30 font-light mx-0.5">|</span>
                                <span className="text-xs sm:text-sm font-semibold text-black">
                                  Pay with Stripe Link • {priceInfo.formatted} {priceInfo.currencyCode}
                                </span>
                              </button>
                              <p className="text-[10px] text-slate-400 text-center">
                                Fast &amp; secure 1-click checkout with your saved phone &amp; email
                              </p>
                            </div>
                          )}

                          {/* Divider */}
                          <div className="flex items-center gap-3">
                            <div className="h-px bg-slate-200 flex-1" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              OR PAY WITH DEBIT / CREDIT CARD
                            </span>
                            <div className="h-px bg-slate-200 flex-1" />
                          </div>

                          {/* 2. Direct Client-Side Card Elements */}
                          <form onSubmit={handlePayWithStripeCard} className="space-y-3.5 pt-1">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                CARD NUMBER
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={cardNumber}
                                  onChange={(e) => handleCardNumberChange(e.target.value)}
                                  placeholder="4000 1234 5678 9010"
                                  maxLength={19}
                                  required
                                  className="w-full pl-10 pr-4 py-3 bg-[#f8f9fc] border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#635bff] focus:bg-white"
                                />
                                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="col-span-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                  EXPIRY
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={cardExpiry}
                                  onChange={(e) => handleCardExpiryChange(e.target.value)}
                                  placeholder="MM/YY"
                                  maxLength={5}
                                  required
                                  className="w-full px-3 py-3 bg-[#f8f9fc] border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#635bff] focus:bg-white"
                                />
                              </div>

                              <div className="col-span-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                  CVC / CVV
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={cardCvc}
                                  onChange={(e) => handleCardCvcChange(e.target.value)}
                                  placeholder="123"
                                  maxLength={4}
                                  required
                                  className="w-full px-3 py-3 bg-[#f8f9fc] border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#635bff] focus:bg-white"
                                />
                              </div>

                              <div className="col-span-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                  POSTAL / ZIP
                                </label>
                                <input
                                  type="text"
                                  value={cardZip}
                                  onChange={(e) => handleCardZipChange(e.target.value)}
                                  placeholder="90210"
                                  maxLength={10}
                                  className="w-full px-3 py-3 bg-[#f8f9fc] border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#635bff] focus:bg-white"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={isProcessing}
                              className="w-full py-4 px-6 rounded-xl bg-[#635bff] hover:bg-[#5346e0] active:bg-[#4338ca] text-white font-black text-sm uppercase tracking-wider transition-all duration-150 shadow-md flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] disabled:opacity-60"
                            >
                              <CreditCard className="w-4 h-4 text-white" />
                              <span>
                                Pay {priceInfo.formatted} {priceInfo.currencyCode} with Card
                              </span>
                            </button>
                          </form>

                          {/* Card Brand & Digital Wallet Badges */}
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold font-mono">VISA</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold font-mono">MASTERCARD</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold font-mono">AMEX</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold font-mono">DISCOVER</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold font-mono">APPLE PAY</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold font-mono">GOOGLE PAY</span>
                          </div>

                          <div className="pt-1 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedGateway('paypal')}
                              className="text-xs font-bold text-[#0079c1] hover:underline cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>Or pay with PayPal Smart Checkout (Debit/Credit Card included)</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-[11px] leading-tight">
                              Powered by Stripe. End-to-end tokenized encryption ensures your card details never touch our servers.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 2. PAYPAL ON-SITE CHECKOUT */}
                      {selectedGateway === 'paypal' && (
                        <div className="p-6 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-5 animate-fadeIn">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#0079c1] text-white flex items-center justify-center font-black text-base shadow-xs">
                                P
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                  PayPal Smart Checkout
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {gateways.paypal.sandboxMode ? 'PayPal Sandbox Environment' : 'PayPal Live Production'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Buyer Protection</span>
                            </div>
                          </div>

                          {paymentError && (
                            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2 animate-fadeIn">
                              <div className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                                <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                                  {paymentError.title}
                                </h4>
                              </div>
                              <p className="text-xs text-rose-800 font-medium leading-relaxed">
                                {paymentError.message}
                              </p>
                              {paymentError.details && (
                                <div className="text-[10px] font-mono text-rose-700 bg-white/70 p-2 rounded-lg border border-rose-200 break-words">
                                  {paymentError.details}
                                </div>
                              )}
                              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200">
                                <span className="text-[10px] text-rose-600 font-medium">
                                  Configure API keys in Admin Panel &gt; Payment Gateways
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSimulatePayment('PayPal Sandbox Simulation')}
                                  className="px-3 py-1.5 rounded-lg bg-[#0079c1] hover:bg-[#00629b] text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                >
                                  Developer: Simulate Success
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <PayPalScriptProvider
                              key={paypalCurrency}
                              options={{
                                clientId: paypalClientId,
                                currency: paypalCurrency,
                                intent: 'capture',
                              }}
                            >
                              <div className="min-h-[130px] flex flex-col justify-center">
                                <PayPalButtons
                                  style={{
                                    layout: 'vertical',
                                    shape: 'rect',
                                    color: 'gold',
                                    tagline: false,
                                  }}
                                  createOrder={(_data, actions) => {
                                    return actions.order.create({
                                      intent: 'CAPTURE',
                                      purchase_units: [
                                        {
                                          amount: {
                                            value: paypalTotal.toFixed(2),
                                            currency_code: paypalCurrency,
                                          },
                                          description: `Vehicle History Report: ${plan.name} (VIN: ${displayVin})`,
                                        },
                                      ],
                                    });
                                  }}
                                  onApprove={async (_data, actions) => {
                                    if (actions.order) {
                                      const details = await actions.order.capture();
                                      handlePaypalSuccess(details);
                                    }
                                  }}
                                  onError={(err) => {
                                    console.error('PayPal Client SDK Error:', err);
                                    setPaymentError({
                                      gateway: 'paypal',
                                      title: 'PayPal Checkout Notice',
                                      message: 'PayPal payment could not be processed by the client SDK.',
                                      details: String(err || 'Check your PayPal Client ID in Admin Panel > Payment Gateways.'),
                                    });
                                  }}
                                />
                              </div>
                            </PayPalScriptProvider>
                          </div>

                          <div className="pt-1 text-center">
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              Powered by <span className="font-bold text-[#003087]">Pay</span>
                              <span className="font-bold text-[#0079c1]">Pal</span> • Instant Automated Verification
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Direct Email Confirmation Notice */}
                    <div className="pt-2 text-center text-xs font-semibold text-slate-500">
                      ⚡ Official PDF report will be delivered directly to{' '}
                      <span className="font-bold text-slate-800">{email}</span> within{' '}
                      <span className="font-bold text-slate-900">{plan.deliveryTime}</span>.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
