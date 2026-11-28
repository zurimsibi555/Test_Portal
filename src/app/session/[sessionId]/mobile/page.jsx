'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Smartphone, ShieldCheck, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

function MobileSessionContent() {
  const params = useParams();
  const sessionId = params?.sessionId;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaired, setIsPaired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [violated, setViolated] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const violationTriggeredRef = useRef(false);

  // Send violation to backend (if desktop already submitted cleanly, sync submitted state instead)
  const triggerViolation = useCallback(async (reason) => {
    if (violationTriggeredRef.current || submitted) return;
    violationTriggeredRef.current = true;

    try {
      const res = await fetch(`/api/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'violation', reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.alreadySubmitted) {
        const sRes = await fetch(`/api/session/${sessionId}`).catch(() => null);
        const sJson = await sRes?.json().catch(() => null);
        if (sJson?.session && !sJson.session.violated) {
          setSubmitted(true);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }

    setViolated(true);
    setViolationMessage(reason);
  }, [sessionId, submitted]);

  // Initial Pair & fetch session
  useEffect(() => {
    async function pairDevice() {
      try {
        const pairRes = await fetch(`/api/session/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pair' }),
        });
        const pairData = await pairRes.json();
        if (pairData.success) {
          setSession(pairData.session);
          setIsPaired(true);
          setRemainingSeconds(pairData.session.remainingSeconds || 5400);
        }
      } catch (err) {
        console.error('Pairing error', err);
      } finally {
        setLoading(false);
      }
    }

    pairDevice();

    // Request Screen Wake Lock so mobile display stays awake
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
    }
  }, [sessionId]);

  // Mobile Anti-Cheat Detectors (disabled once exam is submitted)
  useEffect(() => {
    if (!isPaired || violated || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Mobile browser minimized or student switched application');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Mobile screen focus lost (App switcher or split screen opened)');
    };

    const handlePageHide = () => {
      triggerViolation('Mobile page closed or navigated away');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isPaired, violated, submitted, triggerViolation]);

  // Poll desktop submission status so mobile unlocks cleanly once exam finishes
  useEffect(() => {
    if (!isPaired || violated || submitted) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`, { cache: 'no-store' });
        const json = await res.json();
        if (json?.success && json?.session?.isSubmitted) {
          if (json.session.violated) {
            setViolated(true);
            setViolationMessage(json.session.violationReason || 'Session terminated');
          } else {
            setSubmitted(true);
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(poll);
  }, [isPaired, violated, submitted, sessionId]);

  // Synced countdown
  useEffect(() => {
    if (!isPaired || violated || submitted) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaired, violated, submitted]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-stone-600 font-medium">Connecting to Desktop Exam Session...</p>
        </div>
      </div>
    );
  }

  // SUBMITTED SCREEN
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-emerald-700" />
        </div>
        <h1 className="text-2xl font-black mb-2 text-stone-900">Exam Submitted Successfully</h1>
        <p className="text-stone-600 text-xs max-w-xs leading-relaxed">
          Your desktop examination has been submitted. You may safely close this companion screen now.
        </p>
      </div>
    );
  }

  // VIOLATION SCREEN
  if (violated) {
    return (
      <div className="min-h-screen bg-rose-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-full bg-rose-100 border-2 border-rose-400 flex items-center justify-center mb-6 animate-bounce">
          <ShieldAlert className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-2 text-rose-800">
          Cheating Detected!
        </h1>
        <p className="text-rose-700 text-sm mb-6 max-w-xs font-semibold">
          {violationMessage}
        </p>
        <div className="p-4 bg-white rounded-2xl border border-rose-200 text-xs text-rose-800 max-w-sm shadow-sm">
          Your desktop examination has been automatically submitted and reported to the teacher as a proctoring violation.
        </div>
      </div>
    );
  }

  // ACTIVE MOBILE PROCTORING SCREEN (Milky White Theme)
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col justify-between p-6 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Proctor Companion Active
          </span>
        </div>
        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>

      {/* Center Live Status & Timer */}
      <div className="text-center my-auto py-8">
        <div className="inline-flex p-4 rounded-3xl bg-emerald-50 text-emerald-700 mb-6 border border-emerald-200 shadow-xs">
          <ShieldCheck className="w-12 h-12 text-emerald-700" />
        </div>

        <h2 className="text-sm font-semibold text-stone-500 mb-1">Live Synced Exam Timer</h2>
        <div className="text-6xl font-black font-mono text-stone-900 tracking-tight mb-4">
          {formatTimer(remainingSeconds)}
        </div>

        <div className="inline-block px-4 py-2 rounded-2xl bg-white border border-stone-200 text-xs text-stone-700 shadow-xs">
          Student: <strong className="text-stone-900">{session?.studentName}</strong> ({session?.rollNo})
        </div>
      </div>

      {/* Warning Notice at Bottom */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>IMPORTANT WARNING</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-800">
          Keep this screen open and active. <strong>DO NOT switch apps, minimize your browser, or lock this phone</strong>, otherwise your exam on the computer will auto-submit immediately!
        </p>
      </div>
    </div>
  );
}

export default function MobileSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">Connecting...</div>}>
      <MobileSessionContent />
    </Suspense>
  );
}
