'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, Loader2, Sparkles, Building2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Please provide both your company email and password.');
      setLoading(false);
      return;
    }

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes('invalid login credentials')) {
          throw new Error('Incorrect email or password. Please verify your details and try again.');
        } else if (msg.includes('email not confirmed')) {
          throw new Error('Your email address has not been verified yet.');
        } else if (msg.includes('too many requests') || msg.includes('rate limit')) {
          throw new Error('Too many attempts. Please wait a few moments before trying again.');
        } else {
          throw new Error(authError.message);
        }
      }

      const user = authData?.user;
      if (!user) {
        throw new Error('Authentication succeeded, but no user context was returned.');
      }

      // 2. Fetch User Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch note:', profileError);
        // Fallback to proxy-handled default route via full page reload
        window.location.href = '/dashboard/admin';
        return;
      }

      // 3. Hard navigation ensures auth cookies reach proxy middleware without 307 loop
      const role = profile?.role ? profile.role.toLowerCase() : '';
      if (role === 'admin' || role === 'ceo') {
        window.location.href = '/dashboard/admin';
      } else if (role) {
        window.location.href = `/dashboard/${role.replace('_', '-')}`;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md backdrop-blur-2xl bg-slate-900/60 border border-slate-800/80 p-8 sm:p-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-8">
        
        {/* Header Section */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Gateway</span>
          </div>
          
          <div className="flex justify-center items-center space-x-2 text-white pt-1">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Sign in with your credentials to access your portal.
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-300 text-xs sm:text-sm animate-in fade-in duration-200">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Company Email
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-150"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800/60 text-center">
          <p className="text-xs text-slate-500">
            Protected with row-level encryption and secure middleware authorization.
          </p>
        </div>
      </div>
    </div>
  );
}