'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, PlusCircle, CheckCircle2, AlertTriangle, Code, HelpCircle, FileText, Lock, RefreshCw, LogOut, Camera, Download, MailCheck, Video, Mic, MicOff, Volume2, VolumeX, Ban, CalendarClock, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AddCodingQuestion from '@/components/admin/AddCodingQuestion';
import AddMcqQuestion from '@/components/admin/AddMcqQuestion';
import { base64ToFloat32 } from '@/lib/audioPcm';

export default function AdminPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'monitor' | 'new-test' | 'add-mcq' | 'add-coding'
  const [data, setData] = useState({ tests: [], mcqQuestions: [], codingQuestions: [], submissions: [] });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Live monitor & seamless Web Audio PCM player state
  const [liveFeeds, setLiveFeeds] = useState([]);
  const [listeningSessionId, setListeningSessionId] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const listeningSessionIdRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const nextAudioTimeRef = useRef(0);
  const lastAudioSeqRef = useRef(0);
  const knownFramesRef = useRef({});

  // Form states
  const [testForm, setTestForm] = useState({ title: '', description: '', durationMinutes: 45 });
  const [selectedTestId, setSelectedTestId] = useState('');
  
  const [mcqForm, setMcqForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctOption: 0,
    points: 2.5
  });

  const [codingForm, setCodingForm] = useState({
    title: '',
    description: '',
    constraints: '',
    sampleInput: '',
    sampleOutput: '',
    points: 10,
    testCases: [
      { input: '', output: '', isHidden: false },
      { input: '', output: '', isHidden: true }
    ]
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/manage', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.tests.length > 0 && !selectedTestId) {
          setSelectedTestId(json.tests[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedTestId]);

  useEffect(() => {
    listeningSessionIdRef.current = listeningSessionId;
  }, [listeningSessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/manage', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.success && json.isAdmin) {
          setIsAuthenticated(true);
          setData(json);
          if (json.tests?.length > 0) {
            setSelectedTestId((prev) => prev || json.tests[0].id);
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmed = adminKey.trim();
    if (!trimmed) {
      setAuthError('Please enter your admin secret key.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: trimmed }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAdminKey('');
        setIsAuthenticated(true);
        fetchData();
      } else {
        setAuthError(json.message || 'Invalid Admin Secret Key');
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setAdminKey('');
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {}
    router.push('/admin/login');
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', ...testForm })
      });
      const resData = await res.json();
      if (resData.success) {
        setFeedback({ type: 'success', message: `Test "${testForm.title}" created successfully!` });
        setTestForm({ title: '', description: '', durationMinutes: 45 });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: resData.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleAddMcq = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mcq', testId: selectedTestId, ...mcqForm })
      });
      const resData = await res.json();
      if (resData.success) {
        setFeedback({ type: 'success', message: 'MCQ question added successfully!' });
        setMcqForm({ question: '', options: ['', '', '', ''], correctOption: 0, points: 2 });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: resData.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleAddCoding = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'coding', testId: selectedTestId, ...codingForm })
      });
      const resData = await res.json();
      if (resData.success) {
        setFeedback({ type: 'success', message: `Java problem "${codingForm.title}" added successfully!` });
        setCodingForm({
          title: '',
          description: '',
          constraints: '',
          sampleInput: '',
          sampleOutput: '',
          points: 10,
          testCases: [{ input: '', output: '', isHidden: false }, { input: '', output: '', isHidden: true }]
        });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: resData.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDownloadPdf = async (sub) => {
    try {
      const res = await fetch(`/api/admin/report/${sub.id}`, { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', message: err.message || 'Failed to download PDF report' });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sub.pdfFileName || `Report_${sub.rollNo}_${sub.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: 'error', message: `PDF download error: ${err.message}` });
    }
  };

  const stopAudioPlayer = useCallback(() => {
    lastAudioSeqRef.current = 0;
    nextAudioTimeRef.current = 0;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    gainNodeRef.current = null;
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(18, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.005, ctx.currentTime);
      compressor.release.setValueAtTime(0.15, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.value = 1.15;
      compressor.connect(gain);
      gain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      gainNodeRef.current = compressor;
      nextAudioTimeRef.current = 0;
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }, []);

  const playPcmChunks = useCallback(
    (chunks) => {
      if (!Array.isArray(chunks) || chunks.length === 0) return;

      try {
        const ctx = ensureAudioContext();
        const freshChunks = chunks
          .filter((c) => c?.pcmBase64 && typeof c.seq === 'number' && c.seq > lastAudioSeqRef.current)
          .sort((a, b) => a.seq - b.seq);

        if (freshChunks.length === 0) return;

        const now = ctx.currentTime;
        // If playback fell too far behind (> 1.8s queued), trim to latest 2 chunks cleanly
        let toPlay = freshChunks;
        if (nextAudioTimeRef.current - now > 1.8) {
          toPlay = freshChunks.slice(-2);
          nextAudioTimeRef.current = now + 0.08;
        } else if (nextAudioTimeRef.current < now) {
          nextAudioTimeRef.current = now + 0.08;
        }

        for (const chunk of toPlay) {
          lastAudioSeqRef.current = chunk.seq;

          const float32 = base64ToFloat32(chunk.pcmBase64);
          if (float32.length === 0) continue;

          const sr = Number(chunk.sampleRate) || 16000;
          const buffer = ctx.createBuffer(1, float32.length, sr);
          buffer.copyToChannel(float32, 0);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(gainNodeRef.current || ctx.destination);

          const startAt = Math.max(ctx.currentTime + 0.01, nextAudioTimeRef.current);
          source.start(startAt);
          nextAudioTimeRef.current = startAt + buffer.duration;
        }
      } catch {
        // ignore playback errors
      }
    },
    [ensureAudioContext]
  );

  const fetchLiveFeeds = useCallback(async () => {
    try {
      const targetSid = listeningSessionIdRef.current;
      const params = new URLSearchParams();
      if (targetSid) {
        params.set('listeningSessionId', targetSid);
        params.set('afterAudioSeq', String(lastAudioSeqRef.current || 0));
      }

      const framePairs = Object.entries(knownFramesRef.current).map(
        ([sid, info]) => `${sid}:${info.frameSeq || 0}`
      );
      if (framePairs.length > 0) {
        params.set('frameSeqs', framePairs.join(','));
      }

      const query = params.toString();
      const res = await fetch(`/api/admin/monitor${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success) {
        const nextKnown = {};
        const feeds = (json.feeds || []).map((f) => {
          const prevFrame = knownFramesRef.current[f.sessionId];
          const frameDataUrl =
            f.frameDataUrl !== undefined ? f.frameDataUrl : prevFrame?.frameDataUrl || null;
          nextKnown[f.sessionId] = { frameSeq: f.frameSeq || 0, frameDataUrl };
          return { ...f, frameDataUrl };
        });
        knownFramesRef.current = nextKnown;
        setLiveFeeds(feeds);

        if (targetSid) {
          const target = feeds.find((f) => f.sessionId === targetSid);
          if (target?.audioChunks?.length > 0) {
            playPcmChunks(target.audioChunks);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [playPcmChunks]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'monitor') {
      stopAudioPlayer();
      return;
    }

    let stopped = false;
    let timerId = null;

    const loop = async () => {
      if (stopped) return;
      await fetchLiveFeeds();
      if (!stopped) {
        const delay = listeningSessionIdRef.current ? 280 : 900;
        timerId = setTimeout(loop, delay);
      }
    };

    loop();
    return () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [isAuthenticated, activeTab, fetchLiveFeeds, stopAudioPlayer]);

  const handleToggleListen = (feed) => {
    if (listeningSessionId === feed.sessionId) {
      listeningSessionIdRef.current = null;
      setListeningSessionId(null);
      stopAudioPlayer();
      return;
    }

    stopAudioPlayer();
    try {
      ensureAudioContext();
    } catch {}

    // Start from slightly before latest chunk so initial playback starts cleanly without stale backlog
    lastAudioSeqRef.current = Math.max(0, (feed.latestAudioSeq || 0) - 2);
    listeningSessionIdRef.current = feed.sessionId;
    setListeningSessionId(feed.sessionId);
  };

  const handleTerminateStudent = async (feed) => {
    if (!confirm(`Terminate active exam for ${feed.studentName} (${feed.rollNo})?`)) return;
    try {
      const res = await fetch('/api/admin/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate',
          sessionId: feed.sessionId,
          reason: 'Terminated by Administrator during live camera/microphone monitoring'
        })
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: `Terminated session for ${feed.studentName}.` });
        fetchLiveFeeds();
        fetchData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleSent = async (sub) => {
    try {
      const res = await fetch(`/api/admin/report/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentToStudent: !sub.sentToStudent })
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDeleteSubmission = async (sub) => {
    if (!confirm(`Delete test report for ${sub.studentName} (${sub.rollNo})?`)) return;
    try {
      const res = await fetch(`/api/admin/manage?submissionId=${encodeURIComponent(sub.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: 'Report deleted permanently.' });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: json.message || 'Failed to delete report' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleClearAllSubmissions = async () => {
    if (!confirm('Delete ALL test reports and PDFs permanently? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/manage?clearAll=true', {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: 'All test reports cleared.' });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: json.message || 'Failed to clear reports' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleTestAlwaysOpen = async (test) => {
    try {
      const res = await fetch('/api/admin/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id, alwaysOpen: !test.alwaysOpen }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: 'success',
          message: `"${test.title}" is now ${json.test.alwaysOpen ? 'OPEN for live testing' : 'using scheduled window'}.`,
        });
        fetchData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mb-4 border border-emerald-200">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Teacher Admin Access</h1>
          <p className="text-sm text-stone-500 mb-6">
            Enter your secret key to manage tests, download detailed student PDF reports, and view proctoring logs.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Admin Secret Key
              </label>
              <input
                type="password"
                placeholder="Enter admin secret key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700"
                required
              />
              {authError && <p className="text-xs text-rose-600 mt-1">{authError}</p>}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
            >
              {authLoading ? 'Verifying...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-200 text-center">
            <Link href="/" className="text-xs text-stone-500 hover:text-emerald-700">
              &larr; Back to Student Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white/95 backdrop-blur sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-stone-900">Teacher Control Center</h1>
              <p className="text-xs text-stone-500">PDF Evaluation Reports, Question Setup & Proctoring</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-[#FAF8F5] hover:bg-stone-100 border border-stone-200 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg transition"
            >
              Student View
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* Alerts */}
        {feedback.message && (
          <div
            className={`p-3 rounded-xl mb-6 text-sm flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback({ type: '', message: '' })} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
              activeTab === 'submissions'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Submissions & PDF Reports ({data.submissions.length})
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
              activeTab === 'monitor'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
            }`}
          >
            <Video className="w-4 h-4" />
            Live Cam & Mic Monitor ({liveFeeds.length})
          </button>
          <button
            onClick={() => setActiveTab('new-test')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
              activeTab === 'new-test'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Create New Test ({data.tests.length})
          </button>
          <button
            onClick={() => setActiveTab('add-mcq')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
              activeTab === 'add-mcq'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Add MCQ Question ({data.mcqQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab('add-coding')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
              activeTab === 'add-coding'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
            }`}
          >
            <Code className="w-4 h-4" />
            Add Java Coding Problem ({data.codingQuestions.length})
          </button>
        </div>

        {/* TAB 1: SUBMISSIONS & PROCTORING LOGS */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Student Submissions & Detailed PDF Reports</h2>
                <p className="text-xs text-stone-500">
                  Results are hidden from students. Download each detailed PDF and send it to the student manually.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Admin-Only Result Distribution
                </span>
                {data.submissions.length > 0 && (
                  <button
                    onClick={handleClearAllSubmissions}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Reports</span>
                  </button>
                )}
              </div>
            </div>

            {data.submissions.length === 0 ? (
              <div className="p-12 text-center bg-white border border-stone-200 rounded-2xl shadow-xs">
                <FileText className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-stone-800 font-semibold mb-1">No Submissions Yet</h3>
                <p className="text-xs text-stone-500">
                  When students finish tests or get auto-submitted on cheating, their PDF reports will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-stone-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-stone-500 uppercase font-semibold border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Test Title</th>
                      <th className="px-4 py-3">MCQ (50)</th>
                      <th className="px-4 py-3">Code (50)</th>
                      <th className="px-4 py-3">Total (100)</th>
                      <th className="px-4 py-3">Proctoring Status</th>
                      <th className="px-4 py-3">Detailed PDF & Delivery</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-stone-700">
                    {[...data.submissions].reverse().map((sub) => (
                      <tr key={sub.id} className="hover:bg-[#FAF8F5]/70 transition">
                        <td className="px-4 py-3 font-semibold text-stone-900">{sub.studentName}</td>
                        <td className="px-4 py-3 font-mono text-stone-600">{sub.rollNo}</td>
                        <td className="px-4 py-3 text-stone-600">
                          {data.tests.find((t) => t.id === sub.testId)?.title || sub.testId}
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-700">
                          {sub.mcqScore !== undefined ? `${sub.mcqScore} pts` : '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">
                          {sub.codeScore !== undefined ? `${sub.codeScore} pts` : '-'}
                        </td>
                        <td className="px-4 py-3 font-bold text-stone-900 text-sm">
                          {sub.totalScore !== undefined ? `${sub.totalScore} / ${sub.totalMaxScore || 100}` : '0 / 100'}
                        </td>
                        <td className="px-4 py-3">
                          {sub.violated ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                AUTO_SUBMITTED
                              </span>
                              <p className="text-[10px] text-rose-700">{sub.violationReason}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                CLEAN SUBMISSION
                              </span>
                              {sub.webcamWarnings > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                                  <Camera className="w-2.5 h-2.5" />
                                  {sub.webcamWarnings} webcam warning(s)
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadPdf(sub)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold shadow-xs transition"
                              title="Download detailed PDF report"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={() => handleToggleSent(sub)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                                sub.sentToStudent
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-[#FAF8F5] text-stone-600 border-stone-300 hover:bg-stone-100'
                              }`}
                              title="Mark whether you have manually sent the PDF to this student"
                            >
                              <MailCheck className="w-3 h-3" />
                              <span>{sub.sentToStudent ? 'Sent ✓' : 'Mark Sent'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSubmission(sub)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition"
                              title="Delete this report permanently"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                          {new Date(sub.submittedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1.5: LIVE CAM & MIC MONITOR */}
        {activeTab === 'monitor' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Live Student Camera & Microphone Monitor</h2>
                <p className="text-xs text-stone-500">
                  Real-time webcam feed, microphone audio levels, and remote audio listening across Exam &amp; Prepare modes.
                </p>
              </div>
              <button
                onClick={fetchLiveFeeds}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Feeds</span>
              </button>
            </div>

            {liveFeeds.length === 0 ? (
              <div className="p-12 text-center bg-white border border-stone-200 rounded-2xl shadow-xs">
                <Video className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-stone-800 font-semibold mb-1">No Active Students Connected</h3>
                <p className="text-xs text-stone-500">
                  When students enter Exam Mode or Prepare Mode with camera &amp; mic permissions, their live feeds will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveFeeds.map((feed) => {
                  const isListening = listeningSessionId === feed.sessionId;
                  return (
                    <div
                      key={feed.sessionId}
                      className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-stone-900">{feed.studentName}</div>
                          <div className="text-[11px] font-mono text-stone-500">{feed.rollNo}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            feed.mode === 'EXAM'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {feed.mode}
                        </span>
                      </div>

                      {/* Webcam Snapshot Preview */}
                      <div className="relative rounded-xl overflow-hidden bg-[#FAF8F5] border border-stone-200 aspect-[4/3] flex items-center justify-center">
                        {feed.frameDataUrl ? (
                          <img
                            src={feed.frameDataUrl}
                            alt={`Live feed of ${feed.studentName}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-stone-400">Waiting for camera frame...</span>
                        )}

                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur ${
                              feed.isPresent
                                ? 'bg-emerald-700/90 text-white'
                                : 'bg-rose-600/90 text-white'
                            }`}
                          >
                            {feed.isPresent ? 'Present' : 'Not Visible'}
                          </span>
                        </div>
                      </div>

                      {/* Microphone Meter & Controls */}
                      <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 font-semibold text-stone-700">
                            {feed.micGranted ? (
                              <Mic className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <MicOff className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            Mic Level: {feed.audioLevel || 0}%
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Warnings: {feed.webcamWarnings || 0}
                          </span>
                        </div>

                        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 ${
                              (feed.audioLevel || 0) > 65 ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${feed.micGranted ? Math.max(4, feed.audioLevel || 0) : 0}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleToggleListen(feed)}
                            disabled={!feed.micGranted}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border transition disabled:opacity-40 ${
                              isListening
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                            }`}
                          >
                            {isListening ? (
                              <>
                                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                                <span>Listening (Live Audio)</span>
                              </>
                            ) : (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Listen to Mic</span>
                              </>
                            )}
                          </button>

                          {feed.mode === 'EXAM' && (
                            <button
                              onClick={() => handleTerminateStudent(feed)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                              title="Terminate student exam immediately"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Terminate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE NEW TEST */}
        {activeTab === 'new-test' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-stone-900 mb-2">Create New Examination</h2>
              <p className="text-xs text-stone-500 mb-6">
                Create a test instance with a customized timer, start schedule, and 30-minute joining window.
              </p>

              <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 uppercase mb-1">Test Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm Java Programming & Algorithms"
                    value={testForm.title}
                    onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:bg-white focus:border-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 uppercase mb-1">Description / Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="Instructions for students (e.g. Keep camera and phone ready for QR verification)..."
                    value={testForm.description}
                    onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:bg-white focus:border-emerald-700 resize-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 uppercase mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={testForm.durationMinutes}
                    onChange={(e) => setTestForm({ ...testForm, durationMinutes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:bg-white focus:border-emerald-700"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-sm transition"
                >
                  Create Test
                </button>
              </form>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-stone-900">Active Exam Schedules</h2>
              </div>
              <p className="text-xs text-stone-500">
                Students see a popup when opening the portal and are marked <strong>Absent</strong> if they miss the 30-minute entry window.
              </p>

              <div className="space-y-3">
                {data.tests.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-stone-900 text-sm">{t.title}</div>
                      <button
                        type="button"
                        onClick={() => handleToggleTestAlwaysOpen(t)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          t.alwaysOpen
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {t.alwaysOpen ? 'Open for Testing ✓' : 'Open for Testing'}
                      </button>
                    </div>
                    <div className="text-stone-600">
                      Starts: <strong className="font-mono">{t.scheduledStartTime || '2026-11-27T00:00:00+05:30'}</strong>
                    </div>
                    <div className="text-stone-600">
                      Entry Window: <strong>{t.alwaysOpen ? 'Always Open (Testing)' : `${t.entryWindowMinutes || 30} minutes`}</strong> &bull; Duration: <strong>{t.durationMinutes} mins</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADD MCQ QUESTION */}
        {activeTab === 'add-mcq' && (
          <AddMcqQuestion
            testId={selectedTestId}
            tests={data.tests}
            onCreated={(newQ) => {
              setFeedback({ type: 'success', message: 'MCQ Question added successfully!' });
              fetchData();
              setActiveTab('submissions');
            }}
          />
        )}

        {/* TAB 4: ADD JAVA CODING PROBLEM */}
        {activeTab === 'add-coding' && (
          <AddCodingQuestion
            testId={selectedTestId}
            tests={data.tests}
            onCreated={(newProblem) => {
              setFeedback({
                type: 'success',
                message: `Java problem "${newProblem.title}" added successfully!`,
              });
              fetchData();
              setActiveTab('submissions');
            }}
          />
        )}
      </main>
    </div>
  );
}
