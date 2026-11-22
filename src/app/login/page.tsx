'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Utensils, Shield, ChefHat, Receipt, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        // Query user's staff role to route appropriately
        const { data: staff } = await supabase
          .from('restaurant_staff')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .single();

        if (redirectTo) {
          router.push(redirectTo);
          return;
        }

        const role = staff?.role;
        if (role === 'kitchen') {
          router.push('/kitchen');
        } else if (role === 'cashier') {
          router.push('/cashier');
        } else {
          router.push('/admin');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to authenticate. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('TableQR@2026');
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-100">
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Authentication Failed</p>
            <p className="mt-1 text-xs opacity-90">{error}</p>
          </div>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleLogin}>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
            Staff Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@tableqr.in"
              className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm transition outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm transition outline-none"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Demo Fill Buttons */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
          Quick Demo Fill (Seed Accounts)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickFill('owner@tableqr.in')}
            className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 rounded-xl text-left flex items-center gap-2 font-medium transition cursor-pointer text-slate-700"
          >
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Owner (/admin)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('manager@tableqr.in')}
            className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 rounded-xl text-left flex items-center gap-2 font-medium transition cursor-pointer text-slate-700"
          >
            <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">Manager (/admin)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('cashier@tableqr.in')}
            className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 rounded-xl text-left flex items-center gap-2 font-medium transition cursor-pointer text-slate-700"
          >
            <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Cashier (/cashier)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('kitchen@tableqr.in')}
            className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 rounded-xl text-left flex items-center gap-2 font-medium transition cursor-pointer text-slate-700"
          >
            <ChefHat className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">Kitchen (/kitchen)</span>
          </button>
        </div>
        <p className="mt-2 text-[11px] text-center text-slate-400">
          Default Seed Password: <code className="font-mono text-slate-600">TableQR@2026</code>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-md">
            <Utensils className="w-6 h-6" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            Table<span className="text-amber-600">QR</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          Staff Portal Login
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to access your kitchen display, cashier desk, or management console
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Suspense fallback={<div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-sm">Loading login portal...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
