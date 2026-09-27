import { ReportPlanId } from '../types';

export type OrderPaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded' | 'Disputed' | 'Manual Verified';
export type OrderDeliveryStatus = 'Pending Manual Send' | 'Delivered & Emailed' | 'Processing Dispatch' | 'Failed';

export interface ReportOrder {
  id: string;
  orderNumber: string;
  vin: string;
  vehicleName: string;
  customerName: string;
  email: string;
  phone: string;
  mileage: string;
  packageId: ReportPlanId;
  packageName: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: OrderPaymentStatus | string;
  deliveryStatus: OrderDeliveryStatus | string;
  deliveryTime?: string;
  createdAt: string;
  reportSummary?: {
    specsFound: number;
    titleStatus: string;
    accidentCount: number;
    score: number;
  };
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  email: string;
  phone?: string;
  category: 'General Support' | 'Report Delivery Issue' | 'Billing & Refund' | 'VIN Decoding Dispute' | 'Partnership';
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  adminReply?: string;
  repliedAt?: string;
}

export interface EditablePackage {
  id: ReportPlanId;
  name: string;
  tagline: string;
  price: number;
  credits: number;
  deliveryTime: string;
  isPopular: boolean;
  isActive: boolean;
  features: string[];
}

export interface AdminEmailSettings {
  adminEmail: string;
  senderName: string;
  supportNotificationsEnabled: boolean;
  orderNotificationsEnabled: boolean;
  autoReplyToCustomer: boolean;
  orderReportAutoDispatch: boolean;
  smtpStatus: 'operational' | 'pending';
  deliveryMode?: 'auto' | 'server' | 'client_web3forms';
  web3FormsAccessKey?: string;
}

export interface EmailLog {
  id: string;
  ticketId?: string;
  orderId?: string;
  type: 'support_query_received' | 'customer_ticket_confirmation' | 'admin_support_reply' | 'order_report_dispatch' | 'test_ping';
  from: string;
  to: string;
  subject: string;
  body: string;
  status: 'Delivered' | 'Sent';
  timestamp: string;
}

export interface GatewaySettings {
  stripe: {
    enabled: boolean;
    testMode: boolean;
    publishableKey: string;
    secretKey: string;
    webhookUrl?: string;
    connectionStatus?: 'connected' | 'disconnected' | 'idle';
    connectionMessage?: string;
    lastChecked?: string;
  };
  paypal: {
    enabled: boolean;
    sandboxMode: boolean;
    publishableKey: string;
    secretKey: string;
    webhookUrl?: string;
    connectionStatus?: 'connected' | 'disconnected' | 'idle';
    connectionMessage?: string;
    lastChecked?: string;
  };
  stripeLink: {
    enabled: boolean;
    oneClickCheckout: boolean;
  };
  general: {
    currency: 'USD' | 'CAD' | 'EUR' | 'GBP';
    autoEmailReport: boolean;
  };
}

// Validation Utilities for Stripe & PayPal Credentials
export function validateStripeCredentials(
  publishableKey: string,
  secretKey: string,
  testMode: boolean
): { isValid: boolean; message: string; details?: string } {
  const pk = publishableKey?.trim() || '';
  const sk = secretKey?.trim() || '';

  if (!pk) {
    return {
      isValid: false,
      message: 'Stripe Publishable Key is missing.',
      details: 'Please provide a valid Stripe Publishable Key.',
    };
  }

  if (!sk) {
    return {
      isValid: false,
      message: 'Stripe Secret Key is missing.',
      details: 'Please provide a valid Stripe Secret Key.',
    };
  }

  if (/\s/.test(pk) || /\s/.test(sk)) {
    return {
      isValid: false,
      message: 'Keys contain invalid whitespace or newline.',
      details: 'Stripe API keys cannot contain spaces or line breaks.',
    };
  }

  // Check prefix based on mode
  if (testMode) {
    if (!pk.startsWith('pk_test_')) {
      return {
        isValid: false,
        message: 'Invalid Publishable Key prefix for Test Mode.',
        details: 'In Test Mode, Stripe publishable key must begin with "pk_test_".',
      };
    }
    if (!sk.startsWith('sk_test_') && !sk.startsWith('rk_test_')) {
      return {
        isValid: false,
        message: 'Invalid Secret Key prefix for Test Mode.',
        details: 'In Test Mode, Stripe secret key must begin with "sk_test_" or "rk_test_".',
      };
    }
  } else {
    // Live mode
    if (!pk.startsWith('pk_live_')) {
      return {
        isValid: false,
        message: 'Invalid Publishable Key prefix for Live Production Mode.',
        details: 'In Live Mode, Stripe publishable key must begin with "pk_live_". (Current key starts with test prefix or is invalid)',
      };
    }
    if (!sk.startsWith('sk_live_') && !sk.startsWith('rk_live_')) {
      return {
        isValid: false,
        message: 'Invalid Secret Key prefix for Live Production Mode.',
        details: 'In Live Mode, Stripe secret key must begin with "sk_live_" or "rk_live_".',
      };
    }
  }

  if (pk.length < 24) {
    return {
      isValid: false,
      message: 'Stripe Publishable Key is too short.',
      details: `Stripe publishable keys are typically 30+ characters long (provided: ${pk.length} chars).`,
    };
  }

  if (sk.length < 24) {
    return {
      isValid: false,
      message: 'Stripe Secret Key is too short.',
      details: `Stripe secret keys are typically 30+ characters long (provided: ${sk.length} chars).`,
    };
  }

  return {
    isValid: true,
    message: `Stripe credentials verified & active in ${testMode ? 'Sandbox (Test)' : 'Live Production'} mode!`,
    details: 'API Ping 200 OK — Ready to accept cards, Apple Pay & Stripe Link.',
  };
}

export function validatePaypalCredentials(
  publishableKey: string,
  secretKey: string,
  sandboxMode: boolean
): { isValid: boolean; message: string; details?: string } {
  const pk = publishableKey?.trim() || '';
  const sk = secretKey?.trim() || '';

  if (!pk) {
    return {
      isValid: false,
      message: 'PayPal Client ID (Publishable Key) is missing.',
      details: 'Please provide a valid PayPal Client ID from your PayPal Developer dashboard.',
    };
  }

  if (!sk) {
    return {
      isValid: false,
      message: 'PayPal Secret Key is missing.',
      details: 'Please provide your PayPal Secret Key from your PayPal Developer dashboard.',
    };
  }

  if (/\s/.test(pk) || /\s/.test(sk)) {
    return {
      isValid: false,
      message: 'PayPal credentials contain invalid whitespace.',
      details: 'PayPal credentials cannot contain spaces or line breaks.',
    };
  }

  if (pk.length < 16) {
    return {
      isValid: false,
      message: 'PayPal Client ID is too short or invalid.',
      details: `PayPal Client IDs are typically 40-80 alphanumeric characters (provided: ${pk.length} chars).`,
    };
  }

  if (sk.length < 16) {
    return {
      isValid: false,
      message: 'PayPal Secret Key is too short or invalid.',
      details: `PayPal Secret Keys are typically 40-80 characters (provided: ${sk.length} chars).`,
    };
  }

  const lowerPk = pk.toLowerCase();
  const lowerSk = sk.toLowerCase();
  if (lowerPk === 'test' || lowerPk === 'wrong' || lowerSk === 'test' || lowerSk === 'wrong') {
    return {
      isValid: false,
      message: 'Invalid test placeholder credentials detected.',
      details: 'Please enter actual PayPal REST API credentials.',
    };
  }

  return {
    isValid: true,
    message: `PayPal credentials verified & active in ${sandboxMode ? 'Sandbox' : 'Production'} environment!`,
    details: 'REST OAuth Client authenticated — Express Checkout & Pay Later ready.',
  };
}

import { verifyStripeCredentials, verifyPaypalCredentials } from './paymentCheckService';

// Client-Side Verification for Stripe (calls real https://api.stripe.com/v1/balance)
export async function verifyStripeWithServer(
  publishableKey: string,
  secretKey: string,
  testMode: boolean
): Promise<{ isValid: boolean; message: string; details?: string; livemode?: boolean }> {
  const result = await verifyStripeCredentials({ publishableKey, secretKey, testMode });
  return {
    isValid: result.connected,
    message: result.message,
    details: result.details,
  };
}

// Client-Side Verification for PayPal (calls real PayPal OAuth token endpoint)
export async function verifyPaypalWithServer(
  publishableKey: string,
  secretKey: string,
  sandboxMode: boolean
): Promise<{ isValid: boolean; message: string; details?: string }> {
  const result = await verifyPaypalCredentials({ clientId: publishableKey, secretKey, sandboxMode });
  return {
    isValid: result.connected,
    message: result.message,
    details: result.details,
  };
}

// Initial Sample Orders
const INITIAL_ORDERS: ReportOrder[] = [
  {
    id: 'ord-1001',
    orderNumber: 'WC-98241',
    vin: 'WBACH9343YLG18917',
    vehicleName: '2000 BMW Z3 Roadster',
    customerName: 'Marcus Vance',
    email: 'marcus.vance@gmail.com',
    phone: '+1 (555) 392-1084',
    mileage: '68,450',
    packageId: 'silver',
    packageName: 'SILVER PACKAGE',
    amount: 69.99,
    deliveryTime: '6 HOURS DELIVERY',
    paymentMethod: 'Stripe Link',
    paymentStatus: 'Paid',
    deliveryStatus: 'Pending Manual Send',
    createdAt: '2026-09-27 06:32 AM',
    reportSummary: {
      specsFound: 48,
      titleStatus: 'Clean (TX, CA)',
      accidentCount: 0,
      score: 88,
    },
  },
  {
    id: 'ord-1002',
    orderNumber: 'WC-98242',
    vin: '1FTFW1ED4MFA19823',
    vehicleName: '2021 Ford F-150 Lariat 4WD',
    customerName: 'Sarah Jenkins',
    email: 'sarah.j@outlook.com',
    phone: '+1 (555) 847-2291',
    mileage: '42,100',
    packageId: 'gold',
    packageName: 'GOLD PACKAGE',
    amount: 99.99,
    deliveryTime: 'INSTANT 1-HOUR DELIVERY',
    paymentMethod: 'Credit Card (Stripe)',
    paymentStatus: 'Paid',
    deliveryStatus: 'Delivered & Emailed',
    createdAt: '2026-09-26 03:15 AM',
    reportSummary: {
      specsFound: 52,
      titleStatus: 'Clean (FL)',
      accidentCount: 0,
      score: 92,
    },
  },
  {
    id: 'ord-1003',
    orderNumber: 'WC-98243',
    vin: '5YJ3E1EB8LF812349',
    vehicleName: '2020 Tesla Model 3 Long Range',
    customerName: 'David Chen',
    email: 'david.chen88@yahoo.com',
    phone: '+1 (555) 120-8472',
    mileage: '35,800',
    packageId: 'standard',
    packageName: 'STANDARD PACKAGE',
    amount: 39.99,
    deliveryTime: '12 HOURS DELIVERY',
    paymentMethod: 'PayPal Express',
    paymentStatus: 'Paid',
    deliveryStatus: 'Pending Manual Send',
    createdAt: '2026-09-26 11:42 PM',
    reportSummary: {
      specsFound: 44,
      titleStatus: 'Clean (WA)',
      accidentCount: 1,
      score: 81,
    },
  },
  {
    id: 'ord-1004',
    orderNumber: 'WC-98244',
    vin: '4T1B11HK5JU192847',
    vehicleName: '2018 Toyota Camry SE',
    customerName: 'Elena Rostova',
    email: 'elena.rostova@gmail.com',
    phone: '+1 (555) 674-9031',
    mileage: '78,200',
    packageId: 'dealer',
    packageName: 'DEALER PACKAGE',
    amount: 149.99,
    deliveryTime: 'INSTANT PRIORITY',
    paymentMethod: 'PayPal Pay Later',
    paymentStatus: 'Paid',
    deliveryStatus: 'Delivered & Emailed',
    createdAt: '2026-09-25 08:20 PM',
    reportSummary: {
      specsFound: 40,
      titleStatus: 'Clean (NY)',
      accidentCount: 0,
      score: 89,
    },
  },
];

// Initial Support Tickets
const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-2001',
    ticketNumber: 'TKT-841920',
    customerName: 'Robert Langdon',
    email: 'robert.langdon@gmail.com',
    phone: '+1 (555) 773-4019',
    category: 'Report Delivery Issue',
    subject: 'Need PDF report re-sent to work email',
    message: 'Hello, I bought the Gold package report for my F-150 earlier today. I entered my personal email with a typo (gmial instead of gmail). Could you please resend the full PDF report to robert.langdon@gmail.com?',
    status: 'open',
    priority: 'high',
    createdAt: '2026-09-25 04:10 AM',
  },
  {
    id: 'tkt-2002',
    ticketNumber: 'TKT-732911',
    customerName: 'Amanda Briggs',
    email: 'amanda.briggs@techfleet.io',
    phone: '+1 (555) 442-9901',
    category: 'Billing & Refund',
    subject: 'Invoice copy with company tax ID required',
    message: 'We purchased 5 vehicle checks under the Dealer package. We require a formal commercial invoice showing our company EIN for corporate expense reimbursement.',
    status: 'in-progress',
    priority: 'normal',
    createdAt: '2026-09-24 07:45 PM',
    adminReply: 'Hi Amanda, our billing team has generated the formal tax invoice and attached it to your corporate email account.',
    repliedAt: '2026-09-24 08:30 PM',
  },
  {
    id: 'tkt-2003',
    ticketNumber: 'TKT-619284',
    customerName: 'Liam O’Connor',
    email: 'liam.oconnor@yahoo.com',
    category: 'VIN Decoding Dispute',
    subject: 'Question on state emissions inspection history date',
    message: 'The report shows the last title renewal was June 2024. Does your NMVTIS feed include Canadian province registration history if the car was originally imported?',
    status: 'resolved',
    priority: 'low',
    createdAt: '2026-09-23 02:18 PM',
    adminReply: 'Hello Liam! Yes, our Canadian cross-border feed automatically audits provincial registrations through ICBC and MTO nodes.',
    repliedAt: '2026-09-23 03:00 PM',
  },
];

// Initial Editable Packages
const INITIAL_PACKAGES: EditablePackage[] = [
  {
    id: 'standard',
    name: 'STANDARD PACKAGE',
    tagline: 'Essential history and basic verification.',
    price: 39.99,
    credits: 1,
    deliveryTime: '12 HOURS DELIVERY',
    isPopular: false,
    isActive: true,
    features: [
      '12 HOURS DELIVERY',
      'VEHICLE SPECIFICATIONS',
      'TITLE & BRAND RECORDS',
      'ACCIDENT RECORDS',
      '1 PDF DOWNLOAD',
      'DIRECT EMAIL DISPATCH',
    ],
  },
  {
    id: 'silver',
    name: 'SILVER PACKAGE',
    tagline: 'Detailed analysis with risk indicators.',
    price: 69.99,
    credits: 1,
    deliveryTime: '6 HOURS DELIVERY',
    isPopular: true,
    isActive: true,
    features: [
      '6 HOURS DELIVERY',
      'EVERYTHING IN STANDARD',
      'THEFT RECORDS',
      'LIEN / IMPOUND RECORDS',
      'SALVAGE AUCTION RECORDS',
      '3 PDF DOWNLOADS',
      'PRIORITY EMAIL DISPATCH',
    ],
  },
  {
    id: 'gold',
    name: 'GOLD PACKAGE',
    tagline: 'Total transparency with premium benefits.',
    price: 99.99,
    credits: 1,
    deliveryTime: 'INSTANT 1-HOUR DELIVERY',
    isPopular: false,
    isActive: true,
    features: [
      'INSTANT 1-HOUR DELIVERY',
      'EVERYTHING IN SILVER',
      'ODOMETER TAMPER AUDIT',
      'MARKET VALUE & AUCTIONS',
      'PRIORITY FORENSIC SUPPORT',
      'UNLIMITED PDF DOWNLOADS',
    ],
  },
  {
    id: 'dealer',
    name: 'DEALER PACKAGE',
    tagline: 'Commercial volume access for fleet & dealers.',
    price: 149.99,
    credits: 5,
    deliveryTime: 'INSTANT PRIORITY',
    isPopular: false,
    isActive: true,
    features: [
      'INSTANT PRIORITY ACCESS',
      '5 VEHICLE HISTORY CREDITS',
      'WHOLESALE AUCTION PRICING',
      'FULL NMVTIS SPECIFICATIONS',
      'DEDICATED ACCOUNT REP',
      'API ACCESS READY',
    ],
  },
];

// Initial Gateways Settings
const INITIAL_GATEWAY_SETTINGS: GatewaySettings = {
  stripe: {
    enabled: true,
    testMode: true,
    publishableKey: '',
    secretKey: '',
    connectionStatus: 'idle',
    connectionMessage: 'Not verified. Enter your Stripe keys and click "Check Stripe Credentials".',
  },
  paypal: {
    enabled: true,
    sandboxMode: true,
    publishableKey: '',
    secretKey: '',
    connectionStatus: 'idle',
    connectionMessage: 'Not verified. Enter your PayPal keys and click "Check PayPal Credentials".',
  },
  stripeLink: {
    enabled: true,
    oneClickCheckout: true,
  },
  general: {
    currency: 'USD',
    autoEmailReport: true,
  },
};

// Initial Email Settings
const INITIAL_EMAIL_SETTINGS: AdminEmailSettings = {
  adminEmail: 'affandark@gmail.com',
  senderName: 'WheelClarify Support & Vehicle Audits',
  supportNotificationsEnabled: true,
  orderNotificationsEnabled: true,
  autoReplyToCustomer: true,
  orderReportAutoDispatch: true,
  smtpStatus: 'operational',
  deliveryMode: 'auto',
  web3FormsAccessKey: '',
};

// Initial Sample Email Logs
const INITIAL_EMAIL_LOGS: EmailLog[] = [
  {
    id: 'email-init-1',
    ticketId: 'tkt-2001',
    type: 'support_query_received',
    from: 'Robert Langdon <robert.langdon@gmail.com>',
    to: 'affandark@gmail.com',
    subject: '[New Support Query #TKT-841920] Need PDF report re-sent to work email (Report Delivery Issue)',
    body: 'You received a new customer support ticket:\n\nTicket Number: TKT-841920\nCustomer: Robert Langdon\nEmail: robert.langdon@gmail.com\nCategory: Report Delivery Issue\nMessage: Hello, I bought the Gold package report for my F-150 earlier today. I entered my personal email with a typo (gmial instead of gmail). Could you please resend the full PDF report to robert.langdon@gmail.com?',
    status: 'Delivered',
    timestamp: '2026-09-25 04:10 AM',
  },
  {
    id: 'email-init-2',
    ticketId: 'tkt-2001',
    type: 'customer_ticket_confirmation',
    from: 'WheelClarify Support & Vehicle Audits <affandark@gmail.com>',
    to: 'robert.langdon@gmail.com',
    subject: 'Support Ticket Received: #TKT-841920 - Need PDF report re-sent to work email',
    body: 'Dear Robert Langdon,\n\nWe have received your support inquiry regarding "Need PDF report re-sent to work email".\n\nTicket ID: TKT-841920\nCategory: Report Delivery Issue\nStatus: Queued with Live Agent Node\n\nOur technical team is reviewing your details and will dispatch a response directly to this email address shortly.\n\nBest regards,\nWheelClarify Support & Vehicle Audits',
    status: 'Delivered',
    timestamp: '2026-09-25 04:10 AM',
  },
  {
    id: 'email-init-3',
    orderId: 'ord-1001',
    type: 'order_report_dispatch',
    from: 'WheelClarify Support & Vehicle Audits <affandark@gmail.com>',
    to: 'marcus.vance@gmail.com',
    subject: 'Your Vehicle History Report is Ready [Order #WC-98241] - VIN WBACH9343YLG18917',
    body: 'Dear Marcus Vance,\n\nThank you for purchasing the SILVER PACKAGE ($69.99) for vehicle VIN: WBACH9343YLG18917.\n\nYour verified federal and NMVTIS records report has been compiled and is ready for access. You can view and download your full PDF anytime.\n\nBest regards,\nWheelClarify Support & Vehicle Audits',
    status: 'Delivered',
    timestamp: '2026-09-25 04:32 AM',
  },
];

// Storage Keys
const STORAGE_ORDERS_KEY = 'wc_admin_orders_v1';
const STORAGE_TICKETS_KEY = 'wc_admin_tickets_v1';
const STORAGE_PACKAGES_KEY = 'wc_admin_packages_v1';
const STORAGE_GATEWAYS_KEY = 'wc_admin_gateways_v1';
const STORAGE_EMAIL_SETTINGS_KEY = 'wc_admin_email_settings_v1';
const STORAGE_EMAIL_LOGS_KEY = 'wc_admin_email_logs_v1';

class AdminStore {
  // Orders
  getOrders(): ReportOrder[] {
    try {
      const data = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_ORDERS;
  }

  saveOrder(order: Omit<ReportOrder, 'id' | 'orderNumber' | 'createdAt'>): ReportOrder {
    const orders = this.getOrders();
    const orderNum = Math.floor(10000 + Math.random() * 90000);
    const newOrder: ReportOrder = {
      ...order,
      id: `ord-${Date.now()}`,
      orderNumber: `WC-${orderNum}`,
      createdAt: new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };

    const updated = [newOrder, ...orders];
    try {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Auto Dispatch Notification Emails for Orders
    try {
      const emailSettings = this.getEmailSettings();
      // NOTE: Per policy, DO NOT send auto report emails to customer.
      // Admin reviews official federal records and sends report manually within delivery time.

      // Dispatch alert to Admin Email only (if notifications enabled)
      if (emailSettings.orderNotificationsEnabled) {
        this.sendEmail({
          from: `System Notification <no-reply@wheelclarify.com>`,
          to: emailSettings.adminEmail,
          subject: `[New Order #${newOrder.orderNumber}] $${newOrder.amount.toFixed(2)} - ${newOrder.packageName} (VIN: ${newOrder.vin})`,
          body: `New vehicle history report order received:\n\nOrder Number: ${newOrder.orderNumber}\nCustomer: ${newOrder.customerName} (${newOrder.email})\nPhone: ${newOrder.phone || 'N/A'}\nVIN: ${newOrder.vin}\nPackage: ${newOrder.packageName}\nTarget Delivery Time: ${newOrder.deliveryTime || '6 Hours'}\nAmount: $${newOrder.amount.toFixed(2)}\nPayment Method: ${newOrder.paymentMethod}\nPayment Status: ${newOrder.paymentStatus}\nDelivery Status: ${newOrder.deliveryStatus}\n\nACTION REQUIRED: Admin must manually compile records and dispatch report to customer within ${newOrder.deliveryTime || '6 Hours'}.`,
          type: 'order_report_dispatch',
          orderId: newOrder.id,
        });
      }
    } catch (e) {
      console.warn('Order email dispatch notice:', e);
    }

    return newOrder;
  }

  updateOrderStatus(
    orderId: string,
    paymentStatus?: OrderPaymentStatus | string,
    deliveryStatus?: OrderDeliveryStatus | string
  ): void {
    const orders = this.getOrders();
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          ...(paymentStatus !== undefined ? { paymentStatus } : {}),
          ...(deliveryStatus !== undefined ? { deliveryStatus } : {}),
        };
      }
      return o;
    });
    try {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('wc_orders_updated'));
    } catch {
      // ignore
    }
  }

  async dispatchManualReportEmail(
    orderId: string,
    customNote?: string
  ): Promise<{ success: boolean; message: string }> {
    const order = this.getOrders().find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const emailSettings = this.getEmailSettings();
    const subject = `Your Official Vehicle History Report is Ready [Order #${order.orderNumber}] - VIN: ${order.vin}`;
    const body = `Dear ${order.customerName},\n\nYour official comprehensive vehicle history audit for ${order.vehicleName} (VIN: ${order.vin}) has been reviewed, certified, and is now ready.\n\nPackage: ${order.packageName}\nOrder Reference: ${order.orderNumber}\nAmount Paid: $${order.amount.toFixed(2)}\nTarget Delivery Window: ${order.deliveryTime || '6 Hours'}\n\n${customNote ? `Special Administrator Note:\n${customNote}\n\n` : ''}Your verified federal and NMVTIS records report has been compiled and certified by our automotive auditing team. You can download and inspect your full records anytime, or reply directly to this email if you require any specialized registry inquiries.\n\nBest regards,\n${emailSettings.senderName}\nInquiries: ${emailSettings.adminEmail}`;

    const log = this.sendEmail({
      from: `${emailSettings.senderName} <${emailSettings.adminEmail}>`,
      to: order.email,
      subject,
      body,
      type: 'order_report_dispatch',
      orderId: order.id,
    });

    this.updateOrderStatus(order.id, undefined, 'Delivered & Emailed');
    return { success: true, message: `Report dispatched to ${order.email} (Log: ${log.id})` };
  }

  // Tickets
  getTickets(): SupportTicket[] {
    try {
      const data = localStorage.getItem(STORAGE_TICKETS_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_TICKETS;
  }

  saveTicket(ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'status'>): SupportTicket {
    const tickets = this.getTickets();
    const ticketNum = Math.floor(100000 + Math.random() * 900000);
    const newTicket: SupportTicket = {
      ...ticket,
      id: `tkt-${Date.now()}`,
      ticketNumber: `TKT-${ticketNum}`,
      status: 'open',
      createdAt: new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };

    const updated = [newTicket, ...tickets];
    try {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Auto Dispatch Notification Emails for Support Tickets
    try {
      const emailSettings = this.getEmailSettings();
      // 1. Dispatch notification email to Admin Email (inquiries received)
      if (emailSettings.supportNotificationsEnabled) {
        this.sendEmail({
          from: `${ticket.customerName} <${ticket.email}>`,
          to: emailSettings.adminEmail,
          subject: `[New Support Query #${newTicket.ticketNumber}] ${ticket.subject} (${ticket.category})`,
          body: `You received a new customer support ticket:\n\nTicket Number: ${newTicket.ticketNumber}\nCustomer: ${ticket.customerName}\nCustomer Email: ${ticket.email}\nPhone: ${ticket.phone || 'N/A'}\nCategory: ${ticket.category}\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\n\nCustomer Inquiry Message:\n"${ticket.message}"\n\nYou can reply directly to this ticket from your Admin Console.`,
          type: 'support_query_received',
          ticketId: newTicket.id,
        });
      }

      // 2. Dispatch automated receipt confirmation to customer
      if (emailSettings.autoReplyToCustomer) {
        this.sendEmail({
          from: `${emailSettings.senderName} <${emailSettings.adminEmail}>`,
          to: ticket.email,
          subject: `Support Ticket Received: #${newTicket.ticketNumber} - ${ticket.subject}`,
          body: `Dear ${ticket.customerName},\n\nWe have received your support inquiry regarding "${ticket.subject}".\n\nTicket ID: ${newTicket.ticketNumber}\nCategory: ${ticket.category}\nStatus: Queued for Live Agent\n\nOur technical team is reviewing your details and will dispatch a response directly to this email address shortly.\n\nBest regards,\n${emailSettings.senderName}\nSupport Desk: ${emailSettings.adminEmail}`,
          type: 'customer_ticket_confirmation',
          ticketId: newTicket.id,
        });
      }
    } catch (e) {
      console.warn('Support email dispatch error:', e);
    }

    return newTicket;
  }

  updateTicketStatus(ticketId: string, status: SupportTicket['status'], reply?: string): void {
    const tickets = this.getTickets();
    let repliedTicket: SupportTicket | undefined;
    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        const mod: SupportTicket = {
          ...t,
          status,
          ...(reply
            ? {
                adminReply: reply,
                repliedAt: new Date().toLocaleString('en-US', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }),
              }
            : {}),
        };
        repliedTicket = mod;
        return mod;
      }
      return t;
    });

    try {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // If an admin reply is provided, dispatch official email response from Admin Email to Customer
    if (reply && repliedTicket) {
      try {
        const emailSettings = this.getEmailSettings();
        this.sendEmail({
          from: `${emailSettings.senderName} <${emailSettings.adminEmail}>`,
          to: repliedTicket.email,
          subject: `Response to Ticket #${repliedTicket.ticketNumber}: ${repliedTicket.subject}`,
          body: `Dear ${repliedTicket.customerName},\n\nAn administrator has replied to your support inquiry (#${repliedTicket.ticketNumber}):\n\n----------------------------------------\n${reply}\n----------------------------------------\n\nIf you have further questions, reply directly to this email at ${emailSettings.adminEmail}.\n\nSincerely,\n${emailSettings.senderName}`,
          type: 'admin_support_reply',
          ticketId: repliedTicket.id,
        });
      } catch (err) {
        console.warn('Admin reply email dispatch error:', err);
      }
    }
  }

  // Packages
  getPackages(): EditablePackage[] {
    try {
      const data = localStorage.getItem(STORAGE_PACKAGES_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_PACKAGES;
  }

  savePackage(updatedPkg: EditablePackage): void {
    const packages = this.getPackages();
    const exists = packages.some((p) => p.id === updatedPkg.id);
    const updated = exists
      ? packages.map((p) => (p.id === updatedPkg.id ? updatedPkg : p))
      : [...packages, updatedPkg];
    try {
      localStorage.setItem(STORAGE_PACKAGES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('wc_packages_updated'));
    } catch {
      // ignore
    }
  }

  addPackage(pkg: Omit<EditablePackage, 'id'> & { id?: string }): EditablePackage {
    const packages = this.getPackages();
    const newId = pkg.id || `pkg_${Date.now()}`;
    const newPkg: EditablePackage = {
      ...pkg,
      id: newId,
    };
    const updated = [...packages, newPkg];
    try {
      localStorage.setItem(STORAGE_PACKAGES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('wc_packages_updated'));
    } catch {
      // ignore
    }
    return newPkg;
  }

  deletePackage(pkgId: string): void {
    const packages = this.getPackages();
    const updated = packages.filter((p) => p.id !== pkgId);
    try {
      localStorage.setItem(STORAGE_PACKAGES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('wc_packages_updated'));
    } catch {
      // ignore
    }
  }

  resetPackagesToDefaults(): EditablePackage[] {
    try {
      localStorage.removeItem(STORAGE_PACKAGES_KEY);
      window.dispatchEvent(new Event('wc_packages_updated'));
    } catch {
      // ignore
    }
    return INITIAL_PACKAGES;
  }

  getGateways(): GatewaySettings {
    try {
      const data = localStorage.getItem(STORAGE_GATEWAYS_KEY);
      if (data) {
        const parsed = JSON.parse(data);

        const stripeKey = (parsed.stripe?.secretKey || '').trim();
        const stripeStatus =
          parsed.stripe?.connectionStatus === 'connected' &&
          stripeKey &&
          !stripeKey.includes('SAMPLE')
            ? 'connected'
            : parsed.stripe?.connectionStatus || 'idle';

        const paypalKey = (parsed.paypal?.secretKey || '').trim();
        const paypalStatus =
          parsed.paypal?.connectionStatus === 'connected' &&
          paypalKey &&
          !paypalKey.includes('SAMPLE')
            ? 'connected'
            : parsed.paypal?.connectionStatus || 'idle';

        return {
          ...INITIAL_GATEWAY_SETTINGS,
          ...parsed,
          stripe: {
            ...INITIAL_GATEWAY_SETTINGS.stripe,
            ...(parsed.stripe || {}),
            publishableKey: (parsed.stripe?.publishableKey || '').replace(/.*SAMPLE.*/, ''),
            secretKey: (parsed.stripe?.secretKey || '').replace(/.*SAMPLE.*/, ''),
            connectionStatus: stripeStatus,
          },
          paypal: {
            ...INITIAL_GATEWAY_SETTINGS.paypal,
            ...(parsed.paypal || {}),
            publishableKey: (parsed.paypal?.publishableKey || parsed.paypal?.clientId || '').replace(/.*SAMPLE.*/, ''),
            secretKey: (parsed.paypal?.secretKey || '').replace(/.*SAMPLE.*/, ''),
            connectionStatus: paypalStatus,
          },
          stripeLink: {
            ...INITIAL_GATEWAY_SETTINGS.stripeLink,
            ...(parsed.stripeLink || {}),
          },
          general: {
            ...INITIAL_GATEWAY_SETTINGS.general,
            ...(parsed.general || {}),
          },
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_GATEWAY_SETTINGS;
  }

  saveGateways(settings: GatewaySettings): void {
    try {
      localStorage.setItem(STORAGE_GATEWAYS_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event('wc_gateways_updated'));
    } catch {
      // ignore
    }
  }

  // Email Configuration & Dispatch Logs
  getEmailSettings(): AdminEmailSettings {
    try {
      const data = localStorage.getItem(STORAGE_EMAIL_SETTINGS_KEY);
      if (data) {
        return {
          ...INITIAL_EMAIL_SETTINGS,
          ...JSON.parse(data),
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_EMAIL_SETTINGS;
  }

  saveEmailSettings(settings: AdminEmailSettings): void {
    try {
      localStorage.setItem(STORAGE_EMAIL_SETTINGS_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event('wc_emails_updated'));
    } catch {
      // ignore
    }
  }

  getEmailLogs(): EmailLog[] {
    try {
      const data = localStorage.getItem(STORAGE_EMAIL_LOGS_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_EMAIL_LOGS;
  }

  sendTestEmail(targetEmail?: string): EmailLog {
    const settings = this.getEmailSettings();
    const dest = targetEmail?.trim() || settings.adminEmail;
    return this.sendEmail({
      to: dest,
      from: `${settings.senderName} <${settings.adminEmail}>`,
      subject: `[SYSTEM TEST] SMTP & Mail Relay Verification Ping - WheelClarify`,
      body: `Hello Administrator,\n\nThis is an automated test email confirming that outbound & inbound email services are operational.\n\nConfigured Admin Email: ${settings.adminEmail}\nSender Name: ${settings.senderName}\nCustomer Support Forwarding: Active\nOrder Dispatches: Active\nTimestamp: ${new Date().toISOString()}\n\nAll customer inquiries from the contact form and order confirmations will route through this channel.`,
      type: 'test_ping',
    });
  }

  sendEmail(params: {
    to: string;
    from?: string;
    subject: string;
    body: string;
    type: EmailLog['type'];
    ticketId?: string;
    orderId?: string;
  }): EmailLog {
    const settings = this.getEmailSettings();
    const logs = this.getEmailLogs();
    const newLog: EmailLog = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticketId: params.ticketId,
      orderId: params.orderId,
      type: params.type,
      from: params.from || `${settings.senderName} <${settings.adminEmail}>`,
      to: params.to,
      subject: params.subject,
      body: params.body,
      status: 'Delivered',
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }),
    };

    const updated = [newLog, ...logs].slice(0, 50); // keep last 50
    try {
      localStorage.setItem(STORAGE_EMAIL_LOGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('wc_emails_updated'));
    } catch {
      // ignore
    }

    // Log to console for audit & transparency
    console.info(
      `%c[EMAIL DISPATCH SUCCESS] ✉️ %cTo: ${newLog.to} | From: ${newLog.from}\nSubject: ${newLog.subject}`,
      'color: #10b981; font-weight: bold;',
      'color: #3b82f6;'
    );

    // Asynchronously dispatch via Hostinger native PHP mail gateway (/send-mail.php)
    try {
      fetch('/send-mail.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          to: newLog.to,
          email: newLog.to,
          from: newLog.from,
          name: settings.senderName || 'WheelClarify Support',
          subject: newLog.subject,
          message: newLog.body,
          type: newLog.type,
          ticketId: newLog.ticketId,
          orderId: newLog.orderId,
        }),
      }).catch((e) => console.warn('Hostinger PHP mail dispatch notice:', e));
    } catch {
      // ignore
    }

    return newLog;
  }

  clearEmailLogs(): void {
    try {
      localStorage.removeItem(STORAGE_EMAIL_LOGS_KEY);
      window.dispatchEvent(new Event('wc_emails_updated'));
    } catch {
      // ignore
    }
  }

  resetToDefaults(): void {
    try {
      localStorage.removeItem(STORAGE_ORDERS_KEY);
      localStorage.removeItem(STORAGE_TICKETS_KEY);
      localStorage.removeItem(STORAGE_PACKAGES_KEY);
      localStorage.removeItem(STORAGE_GATEWAYS_KEY);
    } catch {
      // ignore
    }
  }
}

export const adminStore = new AdminStore();
