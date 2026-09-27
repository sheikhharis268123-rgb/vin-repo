import React, { useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Car,
  Mail,
  ShieldCheck,
  Printer,
  Home,
  Headphones,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface ConfirmedOrderData {
  orderNumber: string;
  vin: string;
  vehicleName: string;
  customerName: string;
  email: string;
  phone?: string;
  packageName: string;
  packageId: string;
  amount: number;
  paymentMethod: string;
  deliveryTime: string;
  createdAt?: string;
}

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ConfirmedOrderData | null;
  onNavigateHome?: () => void;
  onViewReportPreview?: () => void;
  onNavigateSupport?: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  order,
  onNavigateHome,
  onViewReportPreview,
  onNavigateSupport,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="relative bg-[#0d121c] border-2 border-emerald-500/50 text-white rounded-[32px] max-w-xl w-full p-6 sm:p-8 shadow-[0_25px_80px_rgba(16,185,129,0.25)] space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close confirmation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Green Confirmed Badge */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full mx-auto flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.4)] animate-bounce">
            <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 text-[11px] font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>PAYMENT CONFIRMED &amp; RECEIVED</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-white leading-none">
            PAYMENT SUCCESSFUL!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-md mx-auto">
            Your vehicle audit order has been successfully confirmed.
          </p>
        </div>

        {/* =========================================================================
            PROMINENT REPORT DELIVERY TIME SECTION (CHANGES ACCORDING TO PACKAGE)
            ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-yellow-400/15 via-amber-500/10 to-transparent border-2 border-yellow-400/40 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-yellow-400 font-black text-xs sm:text-sm uppercase tracking-wider">
              <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span>REPORT DELIVERY TIME</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-tight shadow-xs">
              {order.deliveryTime || '6 HOURS DELIVERY'}
            </span>
          </div>

          <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-medium">
            <span className="text-yellow-400 font-bold">Manual Verification Notice: </span>
            Our automotive specialists are pulling official data from federal NMVTIS, 50-state DMV registries, insurance total loss archives, and police records.
            Administrator will compile the complete records and manually dispatch the official vehicle report to your email:{' '}
            <span className="text-white font-mono font-bold underline decoration-yellow-400">
              {order.email}
            </span>{' '}
            within <span className="text-yellow-400 font-black uppercase">{order.deliveryTime || '6 HOURS'}</span>.
          </p>
        </div>

        {/* =========================================================================
            ORDER & VEHICLE AUDIT DETAILS CARD
            ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <span className="text-slate-400 font-medium">Order Reference:</span>
            <span className="font-mono font-black text-white text-sm bg-white/10 px-2.5 py-0.5 rounded-md">
              {order.orderNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-slate-400 block text-[11px]">Vehicle:</span>
              <span className="font-bold text-white text-sm flex items-center gap-1.5 mt-0.5">
                <Car className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>{order.vehicleName}</span>
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">VIN Number:</span>
              <span className="font-mono font-bold text-yellow-400 text-sm tracking-wide mt-0.5 block">
                {order.vin}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Selected Package:</span>
              <span className="font-bold text-white text-xs mt-0.5 block">
                {order.packageName}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Amount Paid:</span>
              <span className="font-mono font-black text-emerald-400 text-sm mt-0.5 block">
                ${order.amount.toFixed(2)} USD
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Payment Method:</span>
              <span className="font-medium text-slate-200 text-xs mt-0.5 block">
                {order.paymentMethod}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Target Delivery:</span>
              <span className="font-bold text-yellow-400 text-xs mt-0.5 block uppercase">
                Within {order.deliveryTime || '6 Hours'}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Guarantee Strip */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 py-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit SSL Encrypted Verification</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-yellow-400" />
            <span>Admin Manual Dispatch</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigateHome) onNavigateHome();
            }}
            className="w-full sm:flex-1 py-3.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>

          {onViewReportPreview && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewReportPreview();
              }}
              className="w-full sm:w-auto px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border border-white/15"
            >
              <FileText className="w-4 h-4 text-yellow-400" />
              <span>View Report</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-3.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
            title="Print Receipt"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
