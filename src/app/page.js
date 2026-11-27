'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Code2,
  Lock,
  ArrowRight,
  Clock,
  Sparkles,
  Smartphone,
  Camera,
  BookOpen,
  AlertTriangle,
  XCircle,
  X,
  Mic,
  CalendarClock,
} from 'lucide-react';
import { getExamScheduleStatus, formatCountdown } from '@/lib/examSchedule';

export default function Home() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showExamPopup, setShowExamPopup] = useState(true);
  const [alreadyAttended, setAlreadyAttended] = useState(false);

  useEffect(() => {
    async function fetchTests() {
      try {
        const res = await fetch('/api/admin/manage', { cache: 'no-store' });
        const data = await res.json();
        const loadedTests =
          data.success && data.tests?.length > 0
            ? data.tests
            : [
                {
                  id: 'demo-java-test',
                  title: 'Java Foundation Test',
                  description:
                    'Official Core Java, OOPs concepts, and Problem Solving examination.',
                  durationMinutes: 45,
                  scheduledStartTime: '2026-11-27T00:00:00+05:30',
                  entryWindowMinutes: 10080,
                  alwaysOpen: true,
                },
              ];
        setTests(loadedTests);
        const firstTest = loadedTests[0];
        if (typeof window !== 'undefined' && firstTest?.id && !firstTest.alwaysOpen) {
          const status = localStorage.getItem(`exam_completed_${firstTest.id}`);
          if (status) {
            setAlreadyAttended(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, []);

  // Live 1-second clock for schedule popup & 30-min expiry window
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const primaryTest = tests[0] || {
    id: 'demo-java-test',
    title: 'Java Foundation Test',
    description: 'Official Core Java, OOPs concepts, and Problem Solving examination.',
    durationMinutes: 45,
    scheduledStartTime: '2026-11-27T00:00:00+05:30',
    entryWindowMinutes: 10080,
    alwaysOpen: true,
  };

  const schedule = getExamScheduleStatus(primaryTest, nowMs);
  const isExpiredAbsent = schedule.status === 'EXPIRED';
  const isUpcoming = schedule.status === 'UPCOMING';
  const isBlockedAttended = !schedule.alwaysOpen && alreadyAttended;
  const isLive = schedule.status === 'LIVE' && !isBlockedAttended;

  const formattedStart = new Date(schedule.startMs).toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col justify-between selection:bg-emerald-700 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-stone-200/90 bg-white/90 backdrop-blur sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-stone-900 block">
                Podcast <span className="text-emerald-700">Exam Portal</span>
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                Student Examination & Anti-Cheat System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/prepare"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>Prepare for Exam</span>
            </Link>

            <Link
              href="/admin"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-xs transition"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Teacher Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* EXAM SCHEDULE / LIVE / ABSENT POPUP ON SITE OPEN */}
      {!loading && showExamPopup && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowExamPopup(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              aria-label="Close popup"
            >
              <X className="w-4 h-4" />
            </button>

            {isExpiredAbsent ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="text-center space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider">
                    Marked Absent
                  </span>
                  <h2 className="text-xl font-black text-stone-900">Exam Window Expired</h2>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    <strong>{primaryTest.title}</strong> started on <strong>{formattedStart}</strong> and the 30-minute joining window has closed. You cannot attend this exam anymore.
                  </p>
                </div>
                <button
                  onClick={() => setShowExamPopup(false)}
                  className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Close Notice
                </button>
              </>
            ) : isLive ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    Exam Is Live Now
                  </span>
                  <h2 className="text-xl font-black text-stone-900">{primaryTest.title}</h2>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {schedule.alwaysOpen
                      ? 'The examination is currently live and open for testing. Camera and microphone permissions are required.'
                      : 'The examination has started! Enter within the 30-minute window or you will be marked Absent.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-sm font-bold">
                    {schedule.alwaysOpen
                      ? 'Status: Open for Live Testing'
                      : `Entry Closes In: ${formatCountdown(schedule.msUntilExpiry)}`}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/test/${primaryTest.id}`}
                    className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition"
                  >
                    <span>Enter Exam Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setShowExamPopup(false)}
                    className="w-full py-2 text-xs text-stone-500 hover:text-stone-800 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
                  <CalendarClock className="w-7 h-7" />
                </div>
                <div className="text-center space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black uppercase tracking-wider">
                    Upcoming Examination
                  </span>
                  <h2 className="text-xl font-black text-stone-900">{primaryTest.title}</h2>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Starts sharp on <strong>Saturday, 28 Nov at 1:00 PM</strong>. The entry window expires after <strong>30 minutes (1:30 PM)</strong>.
                  </p>
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-stone-200">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-0.5">
                      Starts In
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-700">
                      {formatCountdown(schedule.msUntilStart)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/prepare"
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Prepare for Exam</span>
                  </Link>
                  <button
                    onClick={() => setShowExamPopup(false)}
                    className="w-full py-2 text-xs text-stone-500 hover:text-stone-800 font-medium"
                  >
                    View Exam Details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Student Assessment Section */}
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1 w-full flex flex-col items-center justify-center text-center space-y-8">
        {/* Intro Tag */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Online Proctoring & Java Compiler</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight">
            Student Examination Platform
          </h1>

          <p className="text-xs md:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
            {schedule.alwaysOpen
              ? 'Examination is currently live and open for testing. Both camera and microphone permissions are strictly required.'
              : 'Exam opens on schedule with a strict entry window. Both camera and microphone permissions are required during the exam.'}
          </p>
        </div>

        {/* ABSENT CARD WHEN 30-MIN WINDOW EXPIRES */}
        {isExpiredAbsent ? (
          <div className="w-full bg-white border-2 border-rose-300 rounded-3xl p-8 shadow-md text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <XCircle className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-widest">
                ABSENT — WINDOW EXPIRED
              </span>
              <h2 className="text-2xl font-black text-stone-900">{primaryTest.title}</h2>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                This examination started at <strong>1:00 PM sharp</strong> and the 30-minute entry window closed at <strong>1:30 PM</strong>. You can no longer attend this examination and have been marked <strong>Absent</strong>.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200 text-xs text-stone-600 max-w-md mx-auto">
              You may still use the <strong>Prepare for Exam</strong> section in the top bar for practice.
            </div>
          </div>
        ) : (
          /* PRIMARY TEST CARD: Java Foundation Test */
          <div className="w-full bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-md text-left space-y-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Official Examination • 100 Marks Total
                </span>
                <h2 className="text-2xl font-black text-stone-900">{primaryTest.title}</h2>
                <p className="text-xs text-stone-500">
                  {primaryTest.description ||
                    'Comprehensive evaluation covering Core Java, OOPs concepts, and Problem Solving.'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF8F5] border border-stone-200 text-stone-800 font-mono text-xs font-bold shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  {primaryTest.durationMinutes || 45} Minutes
                </span>
                <span className="text-[10px] font-semibold text-stone-500">
                  {isUpcoming
                    ? `Opens Soon (${formatCountdown(schedule.msUntilStart)})`
                    : schedule.alwaysOpen
                    ? 'Live Now • Open for Testing'
                    : `Live • Closes in ${formatCountdown(schedule.msUntilExpiry)}`}
                </span>
              </div>
            </div>

            {/* Key Exam Regulations & Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-stone-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-stone-900 text-[11px]">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>1. Scan QR & Keep Aside</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Scan QR on phone. Keep phone aside. If you switch apps on phone, test auto-submits.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-stone-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-stone-900 text-[11px]">
                  <Camera className="w-3.5 h-3.5 text-rose-600" />
                  <Mic className="w-3.5 h-3.5 text-emerald-700" />
                  <span>2. Cam & Mic Monitored</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Camera & microphone permissions are required and monitored live by the administrator.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-stone-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-stone-900 text-[11px]">
                  <Code2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>3. 20 MCQs + 10 Coding</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  20 MCQs (2.5 marks each = 50) + 10 Java problems (5 marks each = 50).
                </p>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              {isBlockedAttended ? (
                <div className="w-full py-4 bg-stone-100 border border-stone-300 text-stone-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>You have already completed/submitted this examination.</span>
                </div>
              ) : isUpcoming ? (
                <button
                  disabled
                  className="w-full py-4 bg-stone-200 text-stone-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>
                    Exam Starts Sat 28 Nov at 1:00 PM Sharp ({formatCountdown(schedule.msUntilStart)})
                  </span>
                </button>
              ) : (
                <Link
                  href={`/test/${primaryTest.id}`}
                  className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-base shadow-md flex items-center justify-center gap-3 transition transform active:scale-[0.99]"
                >
                  <span>Start {primaryTest.title}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* If there are more tests created by teacher, show them simply below */}
        {tests.length > 1 && (
          <div className="w-full space-y-3 pt-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Other Assigned Tests
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {tests.slice(1).map((t) => (
                <div
                  key={t.id}
                  className="p-4 bg-white border border-stone-200 rounded-2xl flex items-center justify-between shadow-xs"
                >
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">{t.title}</h4>
                    <span className="text-xs text-stone-500">{t.durationMinutes} mins</span>
                  </div>
                  <Link
                    href={`/test/${t.id}`}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Start Test &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500 bg-white">
        <p>Podcast Online Examination & Anti-Cheat Proctoring Portal &bull; Academic Year 2026</p>
      </footer>
    </div>
  );
}
