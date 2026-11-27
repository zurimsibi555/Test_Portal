'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

function AdminLoginForm() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: key.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Also set localStorage for backup
        localStorage.setItem('admin_key', key.trim());
        router.push(redirectPath);
      } else {
        setError(data.message || 'Invalid Admin Secret Key');
      }
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mb-5 border border-emerald-200">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1 mb-6">
          <span className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">
            Podcast Examination System
          </span>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Admin & Teacher Sign In</h1>
          <p className="text-xs text-stone-500">
            Enter your teacher passkey to manage examinations, download student PDF reports, and review proctoring logs.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1.5">
              Admin Secret Key
            </label>
            <input
              type="password"
              placeholder="Enter admin key (default: teacher123)"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-3 bg-[#FAF8F5] border border-stone-300 rounded-xl text-stone-900 text-sm placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700 transition"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <span>Enter Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <Link href="/" className="hover:text-emerald-700 transition">
            &larr; Back to Student Portal
          </Link>
          <span className="font-mono text-[11px]">Key: teacher123</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-stone-800">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
