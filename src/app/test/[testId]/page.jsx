'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

import {
  Clock,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  Code2,
  ListFilter,
  Send,
  AlertTriangle,
  MonitorCheck,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  ArrowRight,
  RotateCcw,
  SkipForward,
  Camera,
  Mic,
  RefreshCw,
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import AntiCheatGuard from '@/components/AntiCheatGuard';
import WebcamProctor from '@/components/WebcamProctor';
import Link from 'next/link';
import { getExamScheduleStatus, formatCountdown } from '@/lib/examSchedule';

function TestContent() {
  const params = useParams();
  const testId = params?.testId;

  // Stages: 'LOGIN' | 'QR_PAIR' | 'EXAM' | 'SUBMITTED' | 'DISQUALIFIED'
  const [stage, setStage] = useState('LOGIN');
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');

  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session state
  const [session, setSession] = useState(null);
  const [mobilePairUrl, setMobilePairUrl] = useState('');
  const [isMobilePaired, setIsMobilePaired] = useState(false);

  // Exam state
  const [activeSection, setActiveSection] = useState('mcq'); // 'mcq' | 'coding'
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0); // Single MCQ pagination
  const [selectedCodingIndex, setSelectedCodingIndex] = useState(0); // Coding problem pagination
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [codingSolutions, setCodingSolutions] = useState({});
  const [codingEvaluations, setCodingEvaluations] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(45 * 60);

  // Violation & Submission confirmation (no scores shown to student)
  const [violationReason, setViolationReason] = useState('');
  const [submissionId, setSubmissionId] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [alreadyAttended, setAlreadyAttended] = useState(false);
  const [preflightPerms, setPreflightPerms] = useState({
    camGranted: false,
    micGranted: false,
    checking: false,
    error: '',
  });

  const verifyCamAndMic = useCallback(async () => {
    setPreflightPerms((prev) => ({ ...prev, checking: true, error: '' }));
    let tempStream = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support Camera/Microphone access.');
      }
      tempStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      const vTrack = tempStream.getVideoTracks()[0];
      const aTrack = tempStream.getAudioTracks()[0];
      const camOk = Boolean(vTrack && vTrack.readyState === 'live');
      const micOk = Boolean(aTrack && aTrack.readyState === 'live');
      if (!camOk || !micOk) {
        setPreflightPerms({
          camGranted: camOk,
          micGranted: micOk,
          checking: false,
          error: 'Both Camera and Microphone permissions are strictly required.',
        });
        return false;
      }
      setPreflightPerms({ camGranted: true, micGranted: true, checking: false, error: '' });
      return true;
    } catch (err) {
      const msg =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera & Microphone permissions denied. Please allow both in browser settings to begin.'
          : err?.message || 'Camera or Microphone not detected.';
      setPreflightPerms({ camGranted: false, micGranted: false, checking: false, error: msg });
      return false;
    } finally {
      if (tempStream) {
        tempStream.getTracks().forEach((t) => t.stop());
      }
    }
  }, []);

  useEffect(() => {
    if (stage !== 'QR_PAIR') return;
    const timer = setTimeout(() => {
      verifyCamAndMic();
    }, 0);
    return () => clearTimeout(timer);
  }, [stage, verifyCamAndMic]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load test questions
  useEffect(() => {
    async function loadTest() {
      try {
        const res = await fetch('/api/admin/manage', { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          const test = data.tests.find((t) => t.id === testId) || data.tests[0];
          const mcqs = data.mcqQuestions.filter((q) => q.testId === test.id);
          const coding = data.codingQuestions.filter((q) => q.testId === test.id);
          setTestData({ ...test, mcqs, coding });
          setRemainingSeconds((test.durationMinutes || 45) * 60);
          if (typeof window !== 'undefined' && test?.id && !test.alwaysOpen) {
            if (localStorage.getItem(`exam_completed_${test.id}`)) {
              setAlreadyAttended(true);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId]);

  // Handle Initial Login & Session Creation
  const handleStartLogin = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNo.trim()) return;
    setLoginError('');

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: testData.id, studentName, rollNo }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        setMobilePairUrl(data.mobilePairUrl);
        setStage('QR_PAIR');
      } else {
        setLoginError(data.message || 'Unable to start exam session.');
      }
    } catch (err) {
      setLoginError(`Error creating session: ${err.message}`);
    }
  };

  const handleViolation = useCallback(
    async (reason) => {
      setViolationReason(reason);
      setStage('DISQUALIFIED');
      if (typeof window !== 'undefined' && testData?.id) {
        localStorage.setItem(`exam_completed_${testData.id}`, 'DISQUALIFIED');
      }

      if (session?.id) {
        try {
          await fetch(`/api/session/${session.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'violation', reason }),
          });
        } catch (err) {
          console.error('Failed to report violation', err);
        }
      }
    },
    [session, testData]
  );

  // Poll for Mobile Pairing & Remote Violations
  const pollingRef = useRef(null);
  useEffect(() => {
    if (!session?.id || stage === 'SUBMITTED' || stage === 'DISQUALIFIED') return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${session.id}`);
        const data = await res.json();
        if (data.success && data.session) {
          if (data.session.paired && !isMobilePaired) {
            setIsMobilePaired(true);
          }
          if (data.session.violated) {
            clearInterval(pollingRef.current);
            handleViolation(data.session.violationReason || 'Mobile device cheat detected');
          }
        }
      } catch {
        // ignore polling failures
      }
    }, 2000);

    return () => clearInterval(pollingRef.current);
  }, [session?.id, isMobilePaired, stage, handleViolation]);

  const handleSubmitTest = useCallback(
    async (autoReason = null) => {
      if (!autoReason && !confirm('Are you sure you want to finish and submit the test?')) {
        return;
      }
      if (!session?.id) return;

      try {
        const res = await fetch(`/api/session/${session.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit',
            mcqAnswers,
            codingAnswers: codingEvaluations,
            codingSolutions,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSubmissionId(data.submissionId || null);
          if (typeof window !== 'undefined' && testData?.id) {
            localStorage.setItem(`exam_completed_${testData.id}`, 'SUBMITTED');
          }
          setStage('SUBMITTED');
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      } catch (err) {
        alert(`Submission error: ${err.message}`);
      }
    },
    [session, mcqAnswers, codingEvaluations, codingSolutions, testData]
  );

  const handleSubmitTestRef = useRef(handleSubmitTest);
  useEffect(() => {
    handleSubmitTestRef.current = handleSubmitTest;
  }, [handleSubmitTest]);

  // Timer countdown
  useEffect(() => {
    if (stage !== 'EXAM') return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTestRef.current('Time expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  const enterFullscreenAndStart = async () => {
    const ok = await verifyCamAndMic();
    if (!ok) return;

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
    setStage('EXAM');
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-stone-800">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-stone-600">Loading test configuration & environment...</p>
        </div>
      </div>
    );
  }

  // Enforce Scheduled Time & 30-Minute Absent Window before entering exam
  const schedule = getExamScheduleStatus(testData, nowMs);
  const isBlockedAttended = !schedule.alwaysOpen && alreadyAttended;

  if (stage === 'LOGIN' && (schedule.status === 'EXPIRED' || isBlockedAttended)) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border-2 border-rose-300 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider">
              {isBlockedAttended ? 'Already Attempted' : 'ABSENT — Window Expired'}
            </span>
            <h1 className="text-2xl font-bold text-stone-900">{testData.title}</h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              {isBlockedAttended
                ? 'You have already attended or submitted this examination. Re-entry is not permitted.'
                : 'The examination started on Saturday, 28 Nov at 1:00 PM sharp and the 30-minute joining window closed at 1:30 PM. You have been marked Absent and cannot attend it again.'}
            </p>
          </div>
          <Link
            href="/"
            className="inline-block w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
          >
            Return to Portal Home
          </Link>
        </div>
      </div>
    );
  }

  if (stage === 'LOGIN' && schedule.status === 'UPCOMING') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
              Scheduled Examination
            </span>
            <h1 className="text-2xl font-bold text-stone-900">{testData.title}</h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              This exam starts on <strong>Saturday, 28 Nov at 1:00 PM sharp</strong>. The joining window will stay open for 30 minutes (until 1:30 PM).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200">
            <div className="text-[11px] uppercase font-bold text-stone-500">Opens In</div>
            <div className="text-3xl font-black font-mono text-emerald-700 mt-1">
              {formatCountdown(schedule.msUntilStart)}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/prepare"
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
            >
              Prepare for Exam
            </Link>
            <Link href="/" className="text-xs text-stone-500 hover:text-emerald-700 font-medium py-1">
              &larr; Back to Portal Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. LOGIN / IDENTITY VERIFICATION STAGE
  if (stage === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl text-stone-800">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mb-5 border border-emerald-200">
            <MonitorCheck className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-bold text-stone-900 mb-1">{testData.title}</h1>
          <p className="text-xs text-stone-500 mb-6">
            Duration: <span className="text-emerald-700 font-semibold">{testData.durationMinutes} Minutes</span> | Total: <span className="font-semibold text-stone-800">100 Marks</span> ({testData.mcqs.length} MCQs × 2.5 + {testData.coding.length} Coding × 5).
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Anti-Cheating Regulations:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-amber-800 text-[11px] leading-relaxed">
              <li>Switching browser tabs or minimizing the window will trigger a proctoring violation.</li>
              <li>Scan the pairing QR code with your mobile device before entering fullscreen.</li>
              <li>Remain in full view of the webcam and keep your microphone active (monitored by admin).</li>
            </ul>
          </div>

          {loginError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleStartLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Roll Number / Student ID
              </label>
              <input
                type="text"
                placeholder="e.g. CS2026-089"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 font-mono transition"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Continue to Mobile QR Pairing</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-stone-500 hover:text-emerald-700 font-medium">
              &larr; Back to Portal Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. QR CODE SCANNING & MOBILE PAIRING STAGE
  if (stage === 'QR_PAIR') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl text-center text-stone-800">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-700 mb-4 border border-emerald-200">
            <Smartphone className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-stone-900 mb-1">Step 2: Scan QR with Mobile Device</h2>
          <p className="text-xs text-stone-500 mb-6 max-w-md mx-auto">
            Scan this QR code using your phone camera. Your phone acts as an anti-cheat proctor and synchronized live timer during the exam.
          </p>

          <div className="p-4 bg-white rounded-2xl inline-block shadow-md border border-stone-200 mb-4">
            <QRCodeSVG value={mobilePairUrl} size={220} level="H" includeMargin={true} />
          </div>

          {/* Explicit Mobile Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs text-amber-900 text-left space-y-1.5 max-w-md mx-auto">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Important: Keep Mobile Aside After Scan
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Once paired, place your phone on the desk beside your laptop. The exam timer is synchronized.
              <strong> If you switch apps, minimize the screen, or open other windows on your phone, your test will auto-submit immediately!</strong>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6 text-xs">
            {isMobilePaired ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Mobile Device Paired & Synced!
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold animate-pulse">
                <Clock className="w-4 h-4 text-amber-600" />
                Waiting for mobile QR scan...
              </span>
            )}
          </div>

          {/* Mandatory Camera & Microphone Pre-Check */}
          <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-4 mb-5 text-left space-y-3 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Mandatory Device Check
              </span>
              <button
                type="button"
                onClick={verifyCamAndMic}
                disabled={preflightPerms.checking}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                <RefreshCw className={`w-3 h-3 ${preflightPerms.checking ? 'animate-spin' : ''}`} />
                <span>{preflightPerms.checking ? 'Checking...' : 'Verify Cam & Mic'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                  preflightPerms.camGranted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{preflightPerms.camGranted ? 'Camera Ready' : 'Camera Required'}</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                  preflightPerms.micGranted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{preflightPerms.micGranted ? 'Mic Ready' : 'Mic Required'}</span>
              </div>
            </div>

            {preflightPerms.error && (
              <p className="text-[11px] text-rose-700 font-medium leading-snug">
                {preflightPerms.error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={enterFullscreenAndStart}
              disabled={!preflightPerms.camGranted || !preflightPerms.micGranted || preflightPerms.checking}
              className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                isMobilePaired
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>
                {!preflightPerms.camGranted || !preflightPerms.micGranted
                  ? 'Allow Camera & Mic to Begin Test'
                  : isMobilePaired
                  ? 'Start Exam in Fullscreen'
                  : 'Enter Fullscreen & Begin Test'}
              </span>
            </button>

            {!isMobilePaired && preflightPerms.camGranted && preflightPerms.micGranted && (
              <button
                onClick={enterFullscreenAndStart}
                className="text-xs text-stone-500 hover:text-emerald-700 underline font-medium"
              >
                (Teacher Demo Mode: Bypass mobile pair & start test)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. DISQUALIFIED / VIOLATION STAGE
  if (stage === 'DISQUALIFIED') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-rose-200 rounded-3xl p-8 shadow-xl text-center text-stone-800">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-stone-900 mb-2">Test Auto-Submitted & Disqualified</h2>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl mb-6 text-xs text-rose-900 text-left space-y-1">
            <div className="font-bold uppercase tracking-wider text-[11px] text-rose-700">Violation Reason:</div>
            <p className="text-sm font-semibold">{violationReason || 'Tab switch or phone screen minimized'}</p>
          </div>

          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            The proctoring system detected an unpermitted activity (tab switch, window blur, or mobile screen change). Your session has been terminated and logged with the administrator.
          </p>

          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition shadow-md"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // 4. NORMAL SUBMISSION SUCCESS STAGE (NO RESULT SHOWN TO STUDENT)
  if (stage === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl text-center text-stone-800">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-stone-900 mb-1">Test Submitted Successfully!</h2>
          <p className="text-xs text-stone-500 mb-6">
            Student: <span className="text-stone-900 font-semibold">{studentName}</span> ({rollNo})
          </p>

          <div className="p-5 bg-[#FAF8F5] border border-stone-200 rounded-2xl mb-6 text-left space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Evaluation Under Admin Review
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your responses have been securely recorded and a detailed evaluation PDF has been generated and sent to the administrator.
              <strong> Results are confidential and will be shared with you manually by the admin.</strong>
            </p>
            {submissionId && (
              <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 font-mono">
                Reference ID: {submissionId}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="inline-block w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              Finish & Return to Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentMcq = testData.mcqs[currentMcqIndex];
  const totalMcqs = testData.mcqs.length;
  const answeredMcqsCount = Object.keys(mcqAnswers).length;

  const currentCoding = testData.coding[selectedCodingIndex];
  const totalCodingProblems = testData.coding.length;

  // Handle MCQ single-question Submit & Next
  const handleMcqSubmitAndNext = () => {
    if (currentMcqIndex < totalMcqs - 1) {
      setCurrentMcqIndex((prev) => prev + 1);
    } else {
      // If it was the last MCQ, switch over to Coding section
      setActiveSection('coding');
    }
  };

  const handleMcqPrevious = () => {
    if (currentMcqIndex > 0) {
      setCurrentMcqIndex((prev) => prev - 1);
    }
  };

  const handleMcqSkip = () => {
    if (currentMcqIndex < totalMcqs - 1) {
      setCurrentMcqIndex((prev) => prev + 1);
    } else {
      setActiveSection('coding');
    }
  };

  const handleClearMcq = () => {
    if (currentMcq) {
      const updated = { ...mcqAnswers };
      delete updated[currentMcq.id];
      setMcqAnswers(updated);
    }
  };

  // Handle Coding problem Submit & Next
  const handleCodingSubmitAndNext = (questionId, code, evaluationResult) => {
    if (code) {
      setCodingSolutions((prev) => ({ ...prev, [questionId]: code }));
    }
    if (evaluationResult) {
      setCodingEvaluations((prev) => ({ ...prev, [questionId]: evaluationResult }));
    }

    if (selectedCodingIndex < totalCodingProblems - 1) {
      setSelectedCodingIndex((prev) => prev + 1);
    } else {
      // Last coding question: ask to review & submit test
      if (confirm('You have reached the end of the coding section. Would you like to submit your complete test now?')) {
        handleSubmitTest();
      }
    }
  };

  const handleCodingSkip = () => {
    if (selectedCodingIndex < totalCodingProblems - 1) {
      setSelectedCodingIndex((prev) => prev + 1);
    } else {
      // Wrap around or allow staying
      setSelectedCodingIndex(0);
    }
  };

  // 5. LIVE EXAM INTERFACE (MILKY WHITE THEME + LEFT SIDEBAR SECTIONS + CODING COMPILER)
  const totalMcqMarks = testData.mcqs.reduce((sum, q) => sum + Number(q.points ?? 2.5), 0);
  const totalCodingMarks = testData.coding.reduce((sum, q) => sum + Number(q.points ?? 10), 0);

  return (
    <div className="h-screen bg-[#FAF8F5] text-stone-800 flex flex-col select-none overflow-hidden">
      {/* Anti-Cheat Background Guard */}
      <AntiCheatGuard isActive={stage === 'EXAM'} onViolation={handleViolation} />

      {/* AI Webcam + Mic Proctor (Visible in Exam Mode, monitored by Admin) */}
      <WebcamProctor
        isActive={stage === 'EXAM'}
        sessionId={session?.id}
        mode="EXAM"
        studentName={studentName}
        rollNo={rollNo}
        testId={testData.id}
        maxWarnings={3}
        onViolation={handleViolation}
      />

      {/* Top Test Navigation Bar (Milky White) */}
      <header className="h-14 border-b border-stone-200 bg-white px-4 flex items-center justify-between z-20 shadow-xs shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
            <span className="font-bold text-sm text-stone-900">{testData.title}</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-stone-500 pl-4 border-l border-stone-200">
            <span>
              Student: <strong className="text-stone-800">{studentName}</strong>
            </span>
            <span>
              Roll: <strong className="text-stone-800 font-mono">{rollNo}</strong>
            </span>
          </div>
        </div>

        {/* Timer & Submit */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
              remainingSeconds < 300
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                : 'bg-[#FAF8F5] text-stone-800 border-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => handleSubmitTest()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Test</span>
          </button>
        </div>
      </header>

      {/* Main Examination Workspace: Left Sections Sidebar + Right Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: SECTIONS & QUESTION NAVIGATOR */}
        <aside className="w-72 shrink-0 bg-white border-r border-stone-200 flex flex-col overflow-y-auto p-4 gap-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1">
            Exam Sections
          </div>

          {/* Section 1 Card: MCQs */}
          <div
            className={`rounded-2xl border transition p-3 space-y-3 ${
              activeSection === 'mcq'
                ? 'bg-[#FAF8F5] border-emerald-700/40 shadow-xs'
                : 'bg-white border-stone-200 hover:border-stone-300'
            }`}
          >
            <button
              onClick={() => setActiveSection('mcq')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSection === 'mcq'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <ListFilter className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Section 1: MCQs</div>
                  <div className="text-[10px] text-stone-500">
                    {totalMcqs} Qs &bull; {totalMcqMarks} Marks
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {answeredMcqsCount}/{totalMcqs}
              </span>
            </button>

            {/* MCQ Palette Grid inside Left Sidebar */}
            <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-stone-200/70">
              {testData.mcqs.map((q, idx) => {
                const isAnswered = mcqAnswers[q.id] !== undefined;
                const isCurrent = activeSection === 'mcq' && currentMcqIndex === idx;

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveSection('mcq');
                      setCurrentMcqIndex(idx);
                    }}
                    className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center transition border ${
                      isCurrent
                        ? 'border-2 border-emerald-700 bg-emerald-50 text-emerald-800 shadow-xs'
                        : isAnswered
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                    title={`Q${idx + 1} ${isAnswered ? '(Answered)' : '(Unanswered)'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2 Card: Java Coding */}
          <div
            className={`rounded-2xl border transition p-3 space-y-2.5 ${
              activeSection === 'coding'
                ? 'bg-[#FAF8F5] border-emerald-700/40 shadow-xs'
                : 'bg-white border-stone-200 hover:border-stone-300'
            }`}
          >
            <button
              onClick={() => setActiveSection('coding')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSection === 'coding'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Section 2: Coding</div>
                  <div className="text-[10px] text-stone-500">
                    {totalCodingProblems} Problems &bull; {totalCodingMarks} Marks
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                {Object.keys(codingEvaluations).length}/{totalCodingProblems}
              </span>
            </button>

            <div className="space-y-1.5 pt-2 border-t border-stone-200/70">
              {testData.coding.map((prob, idx) => {
                const isCurrent = activeSection === 'coding' && selectedCodingIndex === idx;
                const isEvaluated = !!codingEvaluations[prob.id];

                return (
                  <button
                    key={prob.id}
                    onClick={() => {
                      setActiveSection('coding');
                      setSelectedCodingIndex(idx);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-left text-[11px] font-semibold flex items-center justify-between transition border ${
                      isCurrent
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : isEvaluated
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <span className="truncate pr-2">
                      {idx + 1}. {prob.title}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono opacity-80">
                      {isEvaluated ? '✓' : `${prob.points}m`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Marks Summary */}
          <div className="mt-auto p-3 rounded-2xl bg-[#FAF8F5] border border-stone-200 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-stone-800">
              <span>Total Assessment</span>
              <span className="text-emerald-700 font-mono">
                {totalMcqMarks + totalCodingMarks} Marks
              </span>
            </div>
            <p className="text-[10px] text-stone-500">
              2.5 marks per MCQ &bull; 5 marks per Java solution
            </p>
          </div>
        </aside>

        {/* RIGHT MAIN WORKSPACE */}
        <main className="flex-1 overflow-hidden p-4">
          {/* SECTION 1: ONE MCQ PER PAGE WITH SUBMIT & NEXT */}
          {activeSection === 'mcq' && currentMcq && (
            <div className="h-full max-w-4xl mx-auto flex flex-col gap-4 overflow-y-auto pr-1">
              {/* Current MCQ Question Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                        Question {currentMcqIndex + 1} of {totalMcqs}
                      </span>
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Single Choice Question
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-mono font-bold border border-amber-200">
                      +{currentMcq.points || 2.5} marks
                    </span>
                  </div>

                  {/* Question Statement */}
                  <h3 className="text-base font-semibold text-stone-900 leading-relaxed whitespace-pre-wrap font-sans">
                    {currentMcq.question}
                  </h3>

                  {/* Options List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {currentMcq.options.map((opt, optIdx) => {
                      const isSelected = mcqAnswers[currentMcq.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() =>
                            setMcqAnswers((prev) => ({
                              ...prev,
                              [currentMcq.id]: optIdx,
                            }))
                          }
                          className={`text-left p-4 rounded-xl border-2 text-xs flex items-center gap-3.5 transition ${
                            isSelected
                              ? 'bg-emerald-50/90 border-emerald-700 text-emerald-950 font-semibold shadow-xs ring-2 ring-emerald-600/10'
                              : 'bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] border-stone-200 text-stone-700'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition ${
                              isSelected
                                ? 'bg-emerald-700 text-white'
                                : 'bg-white text-stone-600 border border-stone-300'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMcqPrevious}
                      disabled={currentMcqIndex === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    {mcqAnswers[currentMcq.id] !== undefined && (
                      <button
                        onClick={handleClearMcq}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                        title="Clear answer for this question"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Choice</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMcqSkip}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 transition"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip Question</span>
                    </button>

                    <button
                      onClick={handleMcqSubmitAndNext}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
                    >
                      <span>
                        {currentMcqIndex === totalMcqs - 1
                          ? 'Submit & Go to Coding Section'
                          : 'Submit & Next'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: CODING SECTION (ONLINE JAVA COMPILER WITH SUBMIT & NEXT) */}
          {activeSection === 'coding' && (
            <div className="h-full flex gap-4">
              {/* Left Column: Problem Statement */}
              <div className="w-1/3 flex flex-col bg-white border border-stone-200 rounded-2xl p-4 overflow-hidden shadow-xs">
                {currentCoding && (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-stone-700">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100">
                      <h2 className="text-base font-bold text-stone-900">{currentCoding.title}</h2>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold shrink-0">
                        +{currentCoding.points} marks
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold text-stone-500 uppercase text-[10px] tracking-wider">
                        Description:
                      </h4>
                      <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">
                        {currentCoding.description}
                      </p>
                    </div>

                    {currentCoding.constraints && (
                      <div className="space-y-1">
                        <h4 className="font-semibold text-stone-500 uppercase text-[10px] tracking-wider">
                          Constraints:
                        </h4>
                        <pre className="p-2.5 bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-700 font-mono text-[11px] whitespace-pre-wrap">
                          {currentCoding.constraints}
                        </pre>
                      </div>
                    )}

                    <div className="space-y-1">
                      <h4 className="font-semibold text-stone-500 uppercase text-[10px] tracking-wider">
                        Sample Input:
                      </h4>
                      <pre className="p-2.5 bg-[#FAF8F5] border border-stone-200 rounded-lg text-emerald-800 font-mono text-[11px]">
                        {currentCoding.sampleInput || '(No input)'}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold text-stone-500 uppercase text-[10px] tracking-wider">
                        Sample Output:
                      </h4>
                      <pre className="p-2.5 bg-[#FAF8F5] border border-stone-200 rounded-lg text-amber-800 font-mono text-[11px]">
                        {currentCoding.sampleOutput}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Clean Monaco Java Editor + Compiler */}
              <div className="flex-1 h-full">
                {currentCoding && (
                  <CodeEditor
                    key={currentCoding.id}
                    question={currentCoding}
                    initialCode={codingSolutions[currentCoding.id]}
                    initialEvaluation={codingEvaluations[currentCoding.id] || null}
                    isLastQuestion={selectedCodingIndex === totalCodingProblems - 1}
                    onCodeChange={(newCode) => {
                      setCodingSolutions((prev) => ({
                        ...prev,
                        [currentCoding.id]: newCode,
                      }));
                    }}
                    onEvaluationComplete={(questionId, result) => {
                      setCodingEvaluations((prev) => ({
                        ...prev,
                        [questionId]: result,
                      }));
                    }}
                    onSubmitAndNext={handleCodingSubmitAndNext}
                    onSkip={handleCodingSkip}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-stone-800">
          Loading Test Environment...
        </div>
      }
    >
      <TestContent />
    </Suspense>
  );
}
