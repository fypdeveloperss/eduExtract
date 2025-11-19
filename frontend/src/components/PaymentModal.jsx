import { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import api from '../utils/axios';
import LoaderSpinner from './LoaderSpinner';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

function PaymentModal({ content, isOpen, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const amountLabel = useMemo(() => {
    const currency = content.currency || 'USD';
    const amount =
      typeof content.price === 'number'
        ? content.price.toFixed(2)
        : content.price || '0.00';
    return `${currency} ${amount}`;
  }, [content.currency, content.price]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!stripePromise) {
      setError('Stripe is not configured. Please contact support.');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const successUrl = `${window.location.origin}/marketplace/content/${content._id}?checkout=success`;
      const cancelUrl = window.location.href;

      const response = await api.post('/api/marketplace/checkout/session', {
        contentId: content._id,
        successUrl,
        cancelUrl
      });

      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId
      });

      if (stripeError) {
        setError(stripeError.message || 'Unable to redirect to checkout.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to initiate checkout. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4"
    >
      <div className="bg-white dark:bg-[#171717] rounded-2xl p-6 md:p-6 md:mt-6 w-full max-w-3xl shadow-2xl border border-[#fafafa1a] transition-colors duration-300">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc]">Purchase Content</h2>
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mt-1">Secure checkout to unlock this resource</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Content Summary */}
        <div className="bg-gray-50 dark:bg-[#121212] p-4 md:p-5 rounded-xl mb-6 border border-[#fafafa1a] grid md:grid-cols-[2fr_1fr] gap-4 items-start">
          <div>
            <h3 className="font-semibold text-lg text-[#171717] dark:text-[#fafafacc] mb-2">{content.title}</h3>
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-3 line-clamp-3">{content.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-[#171717cc] dark:text-[#fafafacc]">
              <span className="px-2 py-1 rounded-full border border-[#fafafa1a] bg-white dark:bg-[#171717] capitalize">{content.category || 'General'}</span>
              {content.difficulty && (
                <span className="px-2 py-1 rounded-full border border-[#fafafa1a] bg-white dark:bg-[#171717] capitalize">
                  {content.difficulty}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Amount Due</span>
            <span className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc]">
              {amountLabel}
            </span>
            <span className="text-xs text-[#17171799] dark:text-[#fafafacc99]">Powered by Stripe</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121212] border border-[#fafafa1a] rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafacc] mb-1">What happens next?</p>
            <ul className="text-sm text-[#171717cc] dark:text-[#fafafacc] space-y-1 list-disc pl-5">
              <li>You’ll be redirected to Stripe’s secure checkout.</li>
              <li>Use any major credit or debit card.</li>
              <li>Upon success you’ll return here with instant access.</li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="border border-red-200 dark:border-red-800 rounded-xl p-4 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#fafafa1a] rounded-xl text-[#171717] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#121212] transition-colors duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={handleCheckout}
              className="flex-1 px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-xl hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <LoaderSpinner size="sm" />
                  Redirecting...
                </>
              ) : (
                `Pay ${amountLabel}`
              )}
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <span>🔒</span>
            Secure card processing via Stripe. EduExtract never stores your card data.
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;