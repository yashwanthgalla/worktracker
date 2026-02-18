import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../services/authService';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, UserPlus, LogIn, Send, AtSign,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════
// Auth Form – Firebase Auth + Google Sign-In
// Steps: form → verify-email (sign-up only)
// ═══════════════════════════════════════════════════════

type Step = 'form' | 'verify-email';

export const AuthForm = () => {
  const setUser = useAppStore((s) => s.setUser);
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingCreds, setPendingCreds] = useState<{ email: string; password: string } | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Cleanup ───
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ─── Email/password submit ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { user } = await AuthService.signIn(email, password);
        setUser(user);
        toast.success('Welcome back!');
      } else {
        const result = await AuthService.signUp(email, password, fullName, username);
        if (result.pendingVerification && result._creds) {
          setPendingCreds(result._creds);
          await AuthService.sendVerificationEmail(result._creds.email, result._creds.password);
          toast.success('Verification email sent!');
          setStep('verify-email');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      toast.error(msg);
    }
    setLoading(false);
  };

  // ─── Google Sign-In ───
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { user } = await AuthService.signInWithGoogle();
      setUser(user);
      toast.success(`Welcome${user.user_metadata.full_name ? ', ' + user.user_metadata.full_name : ''}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      toast.error(msg);
    }
    setGoogleLoading(false);
  };

  // ─── Email verification polling ───
  const startPolling = useCallback(() => {
    if (!pendingCreds || polling) return;
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const verified = await AuthService.checkEmailVerified(pendingCreds.email, pendingCreds.password);
        if (verified) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPolling(false);
          const { user } = await AuthService.completeVerification(pendingCreds.email, pendingCreds.password);
          setUser(user);
          toast.success('Email verified! Welcome!');
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [pendingCreds, polling, setUser]);

  useEffect(() => {
    if (step === 'verify-email') startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, startPolling]);

  const resendVerification = async () => {
    if (!pendingCreds) return;
    try {
      await AuthService.sendVerificationEmail(pendingCreds.email, pendingCreds.password);
      toast.success('Verification email resent!');
    } catch { toast.error('Failed to resend'); }
  };

  // ─── Render ───
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-white text-xl font-semibold">WorkTracker</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Organize your work,<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-teal-300">amplify your focus</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            Smart task management with AI-powered insights, focus timers, and team collaboration — all in one beautiful workspace.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-6 text-gray-500 text-sm">
          <span>🔒 Secure</span><span>⚡ Fast</span><span>🤖 AI-Powered</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">{isLogin ? 'Welcome back' : 'Create account'}</h2>
                  <p className="text-gray-500 mt-2">{isLogin ? 'Sign in to continue to WorkTracker' : 'Get started with WorkTracker for free'}</p>
                </div>

                {/* Google Sign-In Button */}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 mb-4 disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 uppercase tracking-wider">or continue with email</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {!isLogin && (
                        <>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                            <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all" />
                          </div>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                            <input type="text" placeholder="Username (optional)" value={username} onChange={(e) => setUsername(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all" />
                          </div>
                        </>
                      )}
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all" />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                        <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                          className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      </div>

                      {isLogin && (
                        <div className="text-right">
                          <button type="button" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            onClick={async () => {
                              if (!email) { toast.error('Enter your email first'); return; }
                              try { await AuthService.resetPassword(email); toast.success('Password reset email sent!'); } catch { toast.error('Failed to send reset email'); }
                            }}>
                            Forgot password?
                          </button>
                        </div>
                      )}

                      <button type="submit" disabled={loading}
                        className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                        {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (
                          <>
                            {isLogin ? <LogIn className="w-4.5 h-4.5" /> : <UserPlus className="w-4.5 h-4.5" />}
                            {isLogin ? 'Sign In' : 'Create Account'}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={() => { setIsLogin(!isLogin); setStep('form'); }} className="text-emerald-600 hover:text-emerald-700 font-semibold">
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </motion.div>
            )}

            {step === 'verify-email' && (
              <motion.div key="verify-email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
                  <p className="text-gray-500 mb-1">We've sent a verification link to</p>
                  <p className="font-semibold text-gray-800 mb-6">{pendingCreds?.email}</p>
                  <p className="text-sm text-gray-400 mb-8">Click the link in your email, then come back here. We'll automatically sign you in.</p>

                  {polling && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 mb-6">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Waiting for verification…</span>
                    </div>
                  )}

                  <button onClick={resendVerification}
                    className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                    <Send className="w-4 h-4" /> Resend verification email
                  </button>

                  <button onClick={() => { setStep('form'); if (pollRef.current) clearInterval(pollRef.current); setPolling(false); }}
                    className="flex items-center gap-2 mx-auto mt-4 text-sm text-gray-400 hover:text-gray-600">
                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
