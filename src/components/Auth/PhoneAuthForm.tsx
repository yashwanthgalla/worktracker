import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../services/authService';
import { OTPService } from '../../services/otpService';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import {
  Phone, ArrowRight, ArrowLeft, Loader2, CheckCircle, Shield, ChevronDown, Search, X, RefreshCw, Globe,
} from 'lucide-react';
import { countryCodes, getDefaultCountry, type CountryCode } from '../../data/countryCodes';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '../ui/input-otp';

// ═══════════════════════════════════════════════════════
// Phone Auth Form – MSG91 OTP + Firebase Sign In
// Steps: phone-input → verify-code
// ═══════════════════════════════════════════════════════

type Step = 'phone-input' | 'verify-code';

export const PhoneAuthForm = () => {
  const setUser = useAppStore((s) => s.setUser);
  const [step, setStep] = useState<Step>('phone-input');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(getDefaultCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<number | null>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);

  // Initialize MSG91 on mount
  useEffect(() => {
    OTPService.init().catch(console.error);
    return () => {
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

  // Focus country search when picker opens
  useEffect(() => {
    if (showCountryPicker) {
      setTimeout(() => countrySearchRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [showCountryPicker]);

  // Filter countries by search query (memoized for real-time search)
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryCodes;
    const q = searchQuery.toLowerCase().trim();
    return countryCodes.filter((country) =>
      country.name.toLowerCase().includes(q) ||
      country.dialCode.includes(q) ||
      country.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Scroll country list to top when search changes
  useEffect(() => {
    if (countryListRef.current) {
      countryListRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

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

  // Auto-submit OTP when all 6 digits are entered
  const handleOtpChange = (value: string) => {
    setOtpValue(value);
    if (value.length === 6) {
      // Auto-submit after a brief delay for UX
      setTimeout(() => {
        submitVerification(value);
      }, 200);
    }
  };

  // Send SMS verification code via MSG91
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const phone = `${selectedCountry.dialCode}${phoneNumber}`;
      setFullPhoneNumber(phone);
      await OTPService.send(phone);
      setStep('verify-code');
      setResendTimer(60);
      toast.success('Verification code sent!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
      toast.error(msg);
    }
    setLoading(false);
  };

  // Verify OTP via MSG91 then sign in via Firebase
  const submitVerification = async (code?: string) => {
    const codeToVerify = code || otpValue;
    if (!codeToVerify || codeToVerify.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    if (!fullPhoneNumber) {
      toast.error('No verification in progress');
      return;
    }

    setLoading(true);
    try {
      const verified = await OTPService.verify(fullPhoneNumber, codeToVerify);
      if (!verified) {
        toast.error('Invalid verification code');
        setOtpValue('');
        setLoading(false);
        return;
      }
      // OTP verified — now sign in / create user in Firebase
      // Use custom token or direct Firestore profile creation
      const { user } = await AuthService.signInWithPhoneOTP(fullPhoneNumber);
      setUser(user);
      toast.success('Welcome!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      toast.error(msg);
      setOtpValue('');
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    submitVerification();
  };

  // Resend verification code via MSG91
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await OTPService.retry(fullPhoneNumber);
      setResendTimer(60);
      setOtpValue('');
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
    setOtpValue('');
  };

  return (
    <div className="relative w-full max-w-md mx-auto">

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
                  {/* Country Selector - Enhanced with real-time preview */}
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(true)}
                    className="flex items-center gap-2 px-3 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
                  >
                    <span className="text-2xl leading-none">{selectedCountry.flag}</span>
                    <span className="text-sm font-medium text-gray-300">{selectedCountry.dialCode}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
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
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    {selectedCountry.flag} {selectedCountry.name} &middot; {selectedCountry.dialCode} {formatPhoneDisplay(phoneNumber)}
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
            {/* OTP Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Card Header */}
              <div className="p-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-br from-green-500 to-blue-600 text-white">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Verify your login</h2>
                    <p className="text-sm text-gray-400">
                      Enter the 6-digit code sent to{' '}
                      <span className="font-medium text-white">
                        {selectedCountry.flag} {selectedCountry.dialCode} {formatPhoneDisplay(phoneNumber)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6">
                <form onSubmit={handleVerifyCode} className="space-y-5">
                  {/* OTP Label + Resend */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Verification Code</label>
                      {resendTimer > 0 ? (
                        <span className="text-xs text-gray-500">
                          Resend in <span className="font-medium text-gray-300">{resendTimer}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendCode}
                          disabled={loading}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 rounded-md border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Resend Code
                        </button>
                      )}
                    </div>

                    {/* OTP Input */}
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpValue}
                        onChange={handleOtpChange}
                        disabled={loading}
                        variant="dark"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator className="mx-2" />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Code auto-submits when all digits are entered
                    </p>
                  </div>

                  {/* Verify Button */}
                  <button
                    type="submit"
                    disabled={loading || otpValue.length !== 6}
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
              </div>

              {/* Card Footer */}
              <div className="px-6 pb-6 space-y-3">
                <div className="text-center text-xs text-gray-500">
                  Having trouble?{' '}
                  <button
                    onClick={handleResendCode}
                    disabled={loading || resendTimer > 0}
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors disabled:text-gray-600 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    Request a new code
                  </button>
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
              </div>
            </div>
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
                    ref={countrySearchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search country or dial code..."
                    className="w-full pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* Result count */}
                <p className="text-xs text-gray-500 mt-2 px-1">
                  {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} found
                </p>
              </div>

              {/* Country List */}
              <div ref={countryListRef} className="flex-1 overflow-y-auto p-2">
                {filteredCountries.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <Globe className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-gray-400 text-sm">No countries found</p>
                    <p className="text-gray-500 text-xs">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredCountries.map((country) => {
                      const isSelected = country.code === selectedCountry.code;
                      return (
                        <button
                          key={country.code}
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowCountryPicker(false);
                            setSearchQuery('');
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-left ${
                            isSelected
                              ? 'bg-blue-500/15 border border-blue-500/30 ring-1 ring-blue-500/20'
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <span className="text-2xl leading-none">{country.flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                              {country.name}
                            </p>
                            <p className="text-xs text-gray-400">{country.code}</p>
                          </div>
                          <span className={`text-sm font-mono font-medium ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
                            {country.dialCode}
                          </span>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
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
