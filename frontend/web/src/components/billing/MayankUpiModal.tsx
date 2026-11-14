'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  QrCode,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock } from 'lucide-react';
import {
  MayankUpiOrderResponse,
  checkMayankUpiStatus,
  submitMayankUpiUtr,
} from '@/lib/mayank_upi';
import {
  createRazorpayWalletOrder,
  verifyRazorpayPayment,
  loadRazorpayScript,
} from '@/lib/razorpay';

interface MayankUpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: MayankUpiOrderResponse | null;
  onSuccess: (data: { message: string; creditsAdded: number; paymentId: string }) => void;
}

export const MayankUpiModal: React.FC<MayankUpiModalProps> = ({
  isOpen,
  onClose,
  orderData,
  onSuccess,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'listening' | 'verified' | 'failed'>('listening');
  const [showUtrField, setShowUtrField] = useState(false);
  const [gatewayStalled, setGatewayStalled] = useState(false);
  const [rzpBusy, setRzpBusy] = useState(false);
  const [rzpError, setRzpError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback defaults to ensure nothing is ever blank on screen
  const displayAmount =
    (orderData?.amount_inr && Number(orderData.amount_inr) > 0)
      ? Number(orderData.amount_inr)
      : (orderData?.amount_credits && Number(orderData.amount_credits) > 0)
        ? Number(orderData.amount_credits)
        : 99;

  const upiId =
    (orderData?.upi_id && orderData.upi_id.trim().length > 3)
      ? orderData.upi_id.trim()
      : 'progeniatlas@ptaxis';

  const payeeName =
    (orderData?.payee_name && orderData.payee_name.trim().length > 0)
      ? orderData.payee_name.trim()
      : 'Progeni Atlas';

  const orderRef = orderData?.order_id || 'ORDER';

  const upiIntentUri =
    orderData?.upi_intent ||
    `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${displayAmount.toFixed(2)}&cu=INR&tr=${encodeURIComponent(orderRef)}&tn=${encodeURIComponent('Progeni Atlas Credits')}`;

  const qrValue = orderData?.qr_data || upiIntentUri;

  // Auto-polling for real-time payment confirmation
  useEffect(() => {
    if (!isOpen || !orderData?.order_id || pollingStatus === 'verified') {
      return;
    }

    const poll = async () => {
      try {
        const res = await checkMayankUpiStatus(orderData.order_id);
        if (res.success && res.status === 'paid') {
          setPollingStatus('verified');
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setTimeout(() => {
            onSuccess({
              message: `Payment of ₹${displayAmount} confirmed! ${orderData.amount_credits} credits added.`,
              creditsAdded: orderData.amount_credits,
              paymentId: orderData.order_id,
            });
            onClose();
          }, 1200);
        }
      } catch {
        // Continue polling silently
      }
    };

    pollTimerRef.current = setInterval(poll, 3000);

    // If the live gateway cannot confirm within 15s, nudge the user to self-verify via UTR
    stallTimerRef.current = setTimeout(() => {
      setShowUtrField(true);
      setGatewayStalled(true);
    }, 15000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, [isOpen, orderData, pollingStatus, displayAmount, onSuccess, onClose]);

  // Reset flow state whenever the modal is (re)opened for a fresh order
  useEffect(() => {
    if (isOpen) {
      setPollingStatus('listening');
      setShowUtrField(false);
      setGatewayStalled(false);
      setUtrInput('');
      setUtrError(null);
      setRzpBusy(false);
      setRzpError(null);
    }
  }, [isOpen, orderData?.order_id]);

  if (!isOpen || !orderData) return null;

  const handleCopyUpi = () => {
    if (upiId) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleCopyOrder = () => {
    if (orderRef) {
      navigator.clipboard.writeText(orderRef);
      setCopiedOrder(true);
      setTimeout(() => setCopiedOrder(false), 2000);
    }
  };

  const handleRazorpayPay = async () => {
    if (!orderData || rzpBusy) return;
    setRzpBusy(true);
    setRzpError(null);
    try {
      const created = await createRazorpayWalletOrder(displayAmount);
      if (!created.success || !created.razorpay_order_id || !created.key_id) {
        throw new Error(created.error || 'Razorpay checkout is not available yet.');
      }
      const ok = await loadRazorpayScript();
      if (!ok) {
        throw new Error('Failed to load Razorpay checkout. Check your internet connection.');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Razorpay = (window as any).Razorpay;
      const rzp = new Razorpay({
        key: created.key_id,
        amount: created.amount_paise || Math.round(displayAmount * 100),
        currency: created.currency || 'INR',
        name: 'Progeni Atlas',
        description: created.description || `${orderData.amount_credits || displayAmount} Atlas Credits`,
        order_id: created.razorpay_order_id,
        prefill: {
          name: orderData.user_name || '',
          email: orderData.user_email || '',
        },
        theme: { color: '#059669' },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const v = await verifyRazorpayPayment({
              orderId: created.order_id || created.razorpay_order_id || '',
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            if (v.success) {
              setPollingStatus('verified');
              setTimeout(() => {
                onSuccess({
                  message: v.message || `Payment confirmed! ${created.amount_credits || displayAmount} credits added.`,
                  creditsAdded: v.credits_added || created.amount_credits || displayAmount,
                  paymentId: resp.razorpay_payment_id,
                });
                onClose();
              }, 800);
            } else {
              setRzpError(v.error || 'Payment verification failed. Contact support.');
            }
          } catch (verifyErr) {
            setRzpError(verifyErr instanceof Error ? verifyErr.message : 'Payment verification failed.');
          }
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rzp.on('payment.failed', (resp: any) => {
        setRzpError(`Payment failed${resp?.error?.description ? `: ${resp.error.description}` : ''}. No money was deducted.`);
      });
      rzp.open();
    } catch (err) {
      setRzpError(err instanceof Error ? err.message : 'Unable to start Razorpay checkout.');
    } finally {
      setRzpBusy(false);
    }
  };

  const handleDirectUpiIntent = () => {
    if (upiIntentUri) {
      window.location.href = upiIntentUri;
    }
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) {
      setUtrError('Please enter the 12-digit UPI reference / UTR number.');
      return;
    }
    setSubmittingUtr(true);
    setUtrError(null);

    try {
      const res = await submitMayankUpiUtr({
        orderId: orderData.order_id,
        utr: utrInput.trim(),
        amountCredits: orderData.amount_credits,
        amountInr: displayAmount,
      });

      if (res.success) {
        setPollingStatus('verified');
        setTimeout(() => {
          onSuccess({
            message: res.message || `Payment verified! ${orderData.amount_credits} credits added.`,
            creditsAdded: res.credits_added || orderData.amount_credits,
            paymentId: utrInput.trim(),
          });
          onClose();
        }, 800);
      } else {
        setUtrError(res.error || 'Failed to verify UTR number.');
      }
    } catch (err) {
      setUtrError(err instanceof Error ? err.message : 'Failed to submit UTR.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-canvas/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="relative w-full max-w-md rounded-2xl bg-surface border border-line shadow-xl overflow-hidden transition-all text-ink">

        {/* Top Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-line flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/30 shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-1.5">
                Scan &amp; Pay with UPI
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue font-bold border border-accent-blue/30">
                  Instant
                </span>
              </h3>
              <p className="text-xs text-ink-faint mt-0.5">
                Google Pay · PhonePe · Paytm · BHIM · Any UPI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-muted hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">

          {/* Order Details Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-inset border border-line">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Total Payable</p>
              <p className="text-2xl font-black text-ink tracking-tight">₹{displayAmount}.00</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
                <Sparkles className="w-3.5 h-3.5" />
                +{orderData?.amount_credits || displayAmount} Credits
              </span>
              <p className="text-[11px] text-ink-faint font-mono mt-1">Ref: {orderRef.slice(-8)}</p>
            </div>
          </div>

          {/* Razorpay hosted checkout — instant auto-credit on payment */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleRazorpayPay}
              disabled={rzpBusy}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              {rzpBusy ? 'Starting Razorpay…' : 'Pay via Razorpay (UPI / Card / NetBanking) — Instant Credit'}
            </button>
            {rzpError && (
              <p className="text-[11px] text-accent-rose font-medium flex items-start gap-1 leading-snug">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {rzpError}
              </p>
            )}
          </div>

          {/* QR Code Canvas */}
          <div className="flex flex-col items-center justify-center space-y-2.5 py-1">
            <div className="p-3 rounded-xl bg-surface border border-line shadow-xs flex items-center justify-center">
              <QRCodeSVG
                value={qrValue}
                size={176}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs font-medium text-ink-muted text-center">
              Scan with any UPI app on your mobile phone to complete payment
            </p>
          </div>

          {/* Real-time Listening Pulse */}
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-inset border border-line text-xs font-medium">
            {pollingStatus === 'verified' ? (
              <span className="flex items-center gap-2 text-accent-emerald font-bold">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                Payment Confirmed! Adding credits...
              </span>
            ) : (
              <span className="flex items-center gap-2 text-ink-muted">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
                </span>
                Waiting for payment confirmation...
              </span>
            )}
          </div>

          {/* 1-Click Pay on Mobile (UPI Intent) */}
          <button
            type="button"
            onClick={handleDirectUpiIntent}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            Open Directly in UPI App (GPay / PhonePe)
          </button>

          {/* UPI ID Copy Field */}
          <div className="p-3 rounded-lg bg-inset border border-line flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-ink-faint uppercase block font-medium">Payee: {payeeName}</span>
              <span className="font-mono font-bold text-ink text-xs sm:text-sm">{upiId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="px-2.5 py-1 rounded-md border border-line bg-surface hover:bg-surface-2 transition text-xs font-medium text-ink-muted flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              {copiedUpi ? (
                <>
                  <Check className="w-3.5 h-3.5 text-accent-emerald" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy ID
                </>
              )}
            </button>
          </div>

          {/* Fallback UTR Submission Accordion */}
          <div className="border-t border-line pt-3">
            {gatewayStalled && pollingStatus !== 'verified' && (
              <div className="mb-2 p-2.5 rounded-lg bg-accent-amber/10 border border-accent-amber/30 text-[11px] leading-snug text-accent-amber font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-accent-amber" />
                <span>Live payment confirmation is unavailable right now. If your money was already debited, paste your 12-digit UTR below — credits will be added instantly.</span>
              </div>
            )}
            {!showUtrField ? (
              <button
                type="button"
                onClick={() => setShowUtrField(true)}
                className="text-xs text-accent-blue hover:text-blue-800 hover:underline font-semibold flex items-center justify-center gap-1 w-full text-center cursor-pointer"
              >
                Already paid on your app? Submit 12-digit UTR </button>
            ) : (
              <form onSubmit={handleUtrSubmit} className="space-y-2 animate-fadeIn">
                <label className="text-[11px] font-semibold text-ink-muted uppercase block">
                  Enter 12-digit UPI Reference (UTR) No.
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    placeholder="e.g. 431289102934"
                    maxLength={24}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-inset/50 text-xs font-mono text-ink focus:outline-none focus:border-blue-600 focus:bg-surface focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={submittingUtr}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    {submittingUtr ? 'Verifying...' : 'Verify UTR'}
                  </button>
                </div>
                {utrError && (
                  <p className="text-[11px] text-accent-rose font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {utrError}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Footer Security Strip */}
        <div className="px-5 py-3 bg-inset border-t border-line flex items-center justify-between text-[11px] text-ink-muted">
          <span className="flex items-center gap-1.5 font-medium text-accent-emerald">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" />
            Verified UPI Gateway
          </span>
          <span className="font-mono text-[10px] text-ink-muted">Instant Automated Credit</span>
        </div>
      </div>
    </div>
  );
};
