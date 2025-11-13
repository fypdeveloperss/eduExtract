import { useState } from 'react';
import api from '../utils/axios';
import LoaderSpinner from './LoaderSpinner';

function PaymentModal({ content, isOpen, onClose, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      // In a real application, you would integrate with Stripe or other payment processors
      // For now, we'll simulate the payment process
      const paymentData = {
        contentId: content._id,
        paymentMethod,
        amount: content.price,
        currency: content.currency || 'USD'
      };

      const response = await api.post('/api/marketplace/purchase', paymentData);
      
      if (response.data.success) {
        onSuccess(response.data);
        onClose();
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 overflow-y-auto py-12 px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
    >
      <div className="bg-white dark:bg-[#171717] rounded-2xl p-6 md:p-6 md:mt-6 w-full max-w-3xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
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
        <div className="bg-gray-50 dark:bg-[#121212] p-4 md:p-5 rounded-xl mb-6 border border-gray-200 dark:border-gray-700 grid md:grid-cols-[2fr_1fr] gap-4 items-start">
          <div>
            <h3 className="font-semibold text-lg text-[#171717] dark:text-[#fafafacc] mb-2">{content.title}</h3>
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-3 line-clamp-3">{content.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-[#171717cc] dark:text-[#fafafacc]">
              <span className="px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#171717] capitalize">{content.category || 'General'}</span>
              <span className="px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#171717] capitalize">{content.difficulty}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Amount Due</span>
            <span className="text-2xl font-bold text-[#171717] dark:text-[#fafafacc]">
              {content.currency} {content.price}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafacc] mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#121212] transition-colors duration-200">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="credit_card"
                  checked={paymentMethod === 'credit_card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3 accent-[#171717] dark:accent-[#fafafa] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                />
                <span className="text-[#171717] dark:text-[#fafafacc] font-medium">Credit Card</span>
              </label>
              <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#121212] transition-colors duration-200">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="debit_card"
                  checked={paymentMethod === 'debit_card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3 accent-[#171717] dark:accent-[#fafafa] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                />
                <span className="text-[#171717] dark:text-[#fafafacc] font-medium">Debit Card</span>
              </label>
              <label className="flex items-center p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-[#171717cc] dark:text-[#fafafacc]">
                <span>More payment methods coming soon</span>
              </label>
            </div>
          </div>

          {/* Card Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafacc] mb-2">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength="19"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafacc] transition-colors duration-200"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafacc] mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  maxLength="5"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafacc] transition-colors duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafacc] mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                  placeholder="123"
                  maxLength="4"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafacc] transition-colors duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafacc] mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafacc] transition-colors duration-200"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-[#121212]">
              <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-[#171717] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#121212] transition-colors duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-xl hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <LoaderSpinner size="sm" />
                  Processing...
                </>
              ) : (
                `Pay ${content.currency} ${content.price}`
              )}
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
              <span>🔒</span>
              Your payment information is secure and encrypted
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentModal;