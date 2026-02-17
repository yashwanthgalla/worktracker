import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthService } from '../../services/authService';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, AtSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface AuthFormProps {
    onSuccess: () => void;
}

export const AuthForm = ({ onSuccess }: AuthFormProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        username: '',
    });

    // Validate username format: lowercase, alphanumeric, underscores, periods, 3-30 chars
    const isValidUsername = (u: string) => /^[a-z0-9._]{3,30}$/.test(u);

    const checkUsernameAvailability = async (username: string) => {
        if (!username || !isValidUsername(username)) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('checking');
        const { data, error } = await supabase
            .from('user_profiles')
            .select('id')
            .ilike('username', username)
            .limit(1);

        if (error) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus(data && data.length > 0 ? 'taken' : 'available');
    };

    const handleUsernameChange = (value: string) => {
        // Auto-lowercase and strip invalid chars
        const cleaned = value.toLowerCase().replace(/[^a-z0-9._]/g, '');
        setFormData({ ...formData, username: cleaned });
        // Debounce check
        if (cleaned.length >= 3) {
            const timer = setTimeout(() => checkUsernameAvailability(cleaned), 400);
            return () => clearTimeout(timer);
        } else {
            setUsernameStatus('idle');
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await AuthService.signIn(formData.email, formData.password);
                toast.success('Welcome back!');
            } else {
                if (!isValidUsername(formData.username)) {
                    toast.error('Username must be 3-30 characters (letters, numbers, . or _)');
                    setLoading(false);
                    return;
                }
                if (usernameStatus === 'taken') {
                    toast.error('Username is already taken');
                    setLoading(false);
                    return;
                }
                if (!formData.fullName.trim()) {
                    toast.error('Please enter your full name');
                    setLoading(false);
                    return;
                }
                await AuthService.signUp(formData.email, formData.password, formData.fullName, formData.username);
                toast.success('Account created! Please check your email to verify.');
            }
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Authentication failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-secondary relative overflow-hidden">
            {/* Sahara AI-style gradient mesh background */}
            <div className="gradient-mesh">
                <div className="gradient-blob gradient-blob-1"></div>
                <div className="gradient-blob gradient-blob-2"></div>
                <div className="gradient-blob gradient-blob-3"></div>
                <div className="gradient-blob gradient-blob-4"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="glass-card p-10">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="text-center mb-10"
                    >
                        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-linear-to-br from-primary-400 via-orange-400 to-amber-400 flex items-center justify-center shadow-lg shadow-primary-200/50">
                            <span className="text-white text-xl font-bold">W</span>
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-text-primary mb-1">
                            WorkTracker
                        </h1>
                        <p className="text-text-tertiary text-[0.9375rem]">
                            {isLogin ? 'Welcome back.' : 'Start your productivity journey.'}
                        </p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) =>
                                                setFormData({ ...formData, fullName: e.target.value })
                                            }
                                            className="input-field pl-11"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">Username</label>
                                    <div className="relative">
                                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={(e) => handleUsernameChange(e.target.value)}
                                            className={`input-field pl-11 pr-10 ${
                                                usernameStatus === 'taken' ? 'border-red-300 focus:border-red-400 focus:ring-red-100' :
                                                usernameStatus === 'available' ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100' : ''
                                            }`}
                                            placeholder="johndoe"
                                            minLength={3}
                                            maxLength={30}
                                        />
                                        {usernameStatus === 'checking' && (
                                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                        )}
                                        {usernameStatus === 'available' && (
                                            <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        )}
                                        {usernameStatus === 'taken' && (
                                            <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    {usernameStatus === 'taken' && (
                                        <p className="text-xs text-red-500 mt-1">This username is already taken</p>
                                    )}
                                    {usernameStatus === 'available' && (
                                        <p className="text-xs text-emerald-500 mt-1">Username is available!</p>
                                    )}
                                    {formData.username && !isValidUsername(formData.username) && (
                                        <p className="text-xs text-amber-500 mt-1">3-30 characters: letters, numbers, . or _</p>
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    className="input-field pl-11"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    className="input-field pl-11"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                        </motion.button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[0.875rem] text-text-secondary hover:text-text-primary transition-colors"
                        >
                            {isLogin
                                ? "Don't have an account? "
                                : 'Already have an account? '}
                            <span className="font-medium text-primary-500 hover:text-primary-600">
                                {isLogin ? 'Sign up' : 'Sign in'}
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
