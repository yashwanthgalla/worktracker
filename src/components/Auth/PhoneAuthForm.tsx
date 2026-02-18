import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../services/authService';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import {
  Phone, ArrowRight, ArrowLeft, Loader2, CheckCircle, Shield, ChevronDown, Search, X,
} from 'lucide-react';
import { countryCodes, getDefaultCountry, type CountryCode } from '../../data/countryCodes';

// ═══════════════════════════════════════════════════════
// Phone Auth Form – Firebase Phone Authentication
// Steps: phone-input → verify-code
// ═══════════════════════════════════════════════════════

type Step = 'phone-input' | 'verify-code';

export const PhoneAuthForm = () => {
  const setUser = useAppStore((s) => s.setUser);
  const [step, setStep] = useState<Step>('phone-input');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(getDefaultCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize reCAPTCHA on mount
  useEffect(() => {
    if (recaptchaRef.current) {
      AuthService.initRecaptcha('recaptcha-container');
    }
    return () => {
      AuthService.cleanupRecaptcha();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [resendTimer]);

  // Filter countries by search query
  const filteredCountries = countryCodes.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format phone number for display
  const formatPhoneDisplay = (num: string) => {
    if (num.length <= 3) return num;
    if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
    if (num.length <= 10) return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`;
    return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 10)}`;
  };

  // Handle phone number input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 15) {
      setPhoneNumber(value);
    }
  };

  // Handle verification code input
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setVerificationCode(value);
    }
  };

  // Send SMS verification code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber}`;
      const id = await AuthService.sendPhoneVerificationCode(fullPhoneNumber);
      setVerificationId(id);
      setStep('verify-code');
      setResendTimer(60); // 60 seconds before resend
      toast.success('Verification code sent!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
      toast.error(msg);
    }
    setLoading(false);
  };

  // Verify SMS code and complete sign in
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    if (!verificationId) {
      toast.error('No verification in progress');
      return;
    }

    setLoading(true);
    try {
      const { user } = await AuthService.signInWithPhoneNumber(verificationId, verificationCode);
      setUser(user);
      toast.success('Welcome!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code';
      toast.error(msg);
      setVerificationCode('');
    }
    setLoading(false);
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber}`;
      const id = await AuthService.sendPhoneVerificationCode(fullPhoneNumber);
      setVerificationId(id);
      setResendTimer(60);
      toast.success('Code resent!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code';
      toast.error(msg);
    }
    setLoading(false);
  };

  // Go back to phone input
  const handleGoBack = () => {
    setStep('phone-input');
    setVerificationCode('');
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* reCAPTCHA container (invisible) */}
      <div ref={recaptchaRef} id="recaptcha-container" />

      <AnimatePresence mode="wait">
        {step === 'phone-input' && (
          <motion.div
            key="phone-input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white mb-4">
                <Phone className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Sign in with Phone
              </h2>
              <p className="text-gray-400 text-sm">
                We'll send you a verification code via SMS
              </p>
            </div>

            {/* Phone Input Form */}
            <form onSubmit={handleSendCode} className="space-y-4">
              {/* Country + Phone Number Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Phone Number</label>
                <div className="flex gap-2">
                  {/* Country Selector */}
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(true)}
                    className="flex items-center gap-2 px-3 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200"
                  >
                    <span className="text-2xl">{selectedCountry.flag}</span>
                    <span className="text-sm font-medium text-gray-300">{selectedCountry.dialCode}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Phone Number Input */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="123 456 7890"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                      disabled={loading}
                    />
                  </div>
                </div>
                {phoneNumber && (
                  <p className="text-xs text-gray-400">
                    Full number: {selectedCountry.dialCode} {formatPhoneDisplay(phoneNumber)}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !phoneNumber || phoneNumber.length < 10}
                className="relative group w-full py-3 px-4 bg-linear-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Security Note */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300">
                <p className="font-medium text-blue-400 mb-1">Secure Authentication</p>
                <p className="text-gray-400">
                  Your phone number is encrypted and never shared with third parties.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'verify-code' && (
          <motion.div
            key="verify-code"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-green-500 to-blue-600 text-white mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold bg-linear-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                Verify Your Phone
              </h2>
              <p className="text-gray-400 text-sm">
                Enter the 6-digit code sent to<br />
                <span className="font-medium text-white">
                  {selectedCountry.dialCode} {formatPhoneDisplay(phoneNumber)}
                </span>
              </p>
            </div>

            {/* Verification Code Form */}
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {/* Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Verification Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="relative group w-full py-3 px-4 bg-linear-to-r from-green-500 to-blue-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Sign In
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Resend Code */}
            <div className="text-center space-y-2">
              {resendTimer > 0 ? (
                <p className="text-sm text-gray-400">
                  Resend code in <span className="font-medium text-white">{resendTimer}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend Code
                </button>
              )}
            </div>

            {/* Back Button */}
            <button
              onClick={handleGoBack}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Change Phone Number
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Country Picker Modal */}
      <AnimatePresence>
        {showCountryPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCountryPicker(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white">Select Country</h3>
                <button
                  onClick={() => setShowCountryPicker(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search country or code..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Country List */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredCountries.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No countries found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowCountryPicker(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors text-left"
                      >
                        <span className="text-2xl">{country.flag}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{country.name}</p>
                          <p className="text-xs text-gray-400">{country.code}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-400">{country.dialCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
