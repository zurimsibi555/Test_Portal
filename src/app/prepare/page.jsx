'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { isBraveBrowser } from '@/lib/mediaHelpers';
import {
  BookOpen,
  ArrowLeft,
  Code2,
  ShieldCheck,
  HelpCircle,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
  Footprints,
  Camera,
  Mic,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import WebcamProctor from '@/components/WebcamProctor';
import AnimatedExplainer from '@/components/prepare/AnimatedExplainer';
import McqPracticePanel from '@/components/prepare/McqPracticePanel';
import { PREPARE_TOPICS } from '@/data/prepareTopics';

export default function PreparePage() {
  const practiceCounterRef = useRef(0);
  const [permStatus, setPermStatus] = useState({
    camGranted: false,
    micGranted: false,
    checking: true,
    error: '',
    audioSuspended: false,
    micMuted: false,
  });
  const [permRetryCount, setPermRetryCount] = useState(0);
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    isBraveBrowser().then(setIsBrave).catch(() => {});
  }, []);
  const [activeTabId, setActiveTabId] = useState(PREPARE_TOPICS[0].id); // topic.id | 'mcq-practice'
  const [compilerOpen, setCompilerOpen] = useState(false);
  const [compilerQuestion, setCompilerQuestion] = useState({
    id: 'prep-init',
    title: PREPARE_TOPICS[0].examples[0].title,
    sampleInput: PREPARE_TOPICS[0].examples[0].sampleInput,
    starterCode: PREPARE_TOPICS[0].examples[0].code,
  });

  const currentTopicIndex = PREPARE_TOPICS.findIndex((t) => t.id === activeTabId);
  const currentTopic =
    currentTopicIndex >= 0 ? PREPARE_TOPICS[currentTopicIndex] : PREPARE_TOPICS[0];

  const handleOpenPractice = (example, idx) => {
    practiceCounterRef.current += 1;
    setCompilerQuestion({
      id: `prep_${currentTopic.id}_${idx}_${practiceCounterRef.current}`,
      title: example.title,
      sampleInput: example.sampleInput || '',
      starterCode: example.code,
    });
    setCompilerOpen(true);
  };

  const handleOpenBlankSandbox = () => {
    practiceCounterRef.current += 1;
    const fallback = currentTopic.examples?.[0] || PREPARE_TOPICS[0].examples[0];
    setCompilerQuestion({
      id: `prep_sandbox_${practiceCounterRef.current}`,
      title: 'Java Practice Sandbox',
      sampleInput: fallback.sampleInput || '',
      starterCode: fallback.code,
    });
    setCompilerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col">
      {/* Hidden Camera & Microphone Proctor in PREPARE mode */}
      <WebcamProctor
        isActive={true}
        mode="PREPARE"
        studentName="Practice Student"
        rollNo="PREPARE-MODE"
        testId="prepare-sandbox"
        retryTrigger={permRetryCount}
        onPermissionStatus={setPermStatus}
      />

      {/* MANDATORY CAMERA & MICROPHONE GATE IN PREPARE MODE (also ensures AudioContext is unlocked by user click) */}
      {(!permStatus.camGranted || !permStatus.micGranted || permStatus.audioSuspended || permStatus.micMuted) && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-emerald-700 rounded-3xl p-7 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider">
                Mandatory Proctoring Access
              </span>
              <h2 className="text-xl font-black text-stone-900">
                {permStatus.camGranted && permStatus.micGranted && permStatus.micMuted
                  ? 'Microphone Is Muted on Device'
                  : permStatus.camGranted && permStatus.micGranted && permStatus.audioSuspended
                  ? 'Activate Live Microphone & Start'
                  : 'Camera & Microphone Required'}
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                {permStatus.checking
                  ? 'Requesting Camera & Microphone permissions. Please click "Allow" in the browser popup...'
                  : permStatus.camGranted && permStatus.micGranted && permStatus.micMuted
                  ? 'Your microphone is muted at the OS/browser level (common in Brave Shields, muted laptop mic key Fn+F4, or Bluetooth headset). Switch to Google Chrome and unmute your microphone.'
                  : permStatus.camGranted && permStatus.micGranted && permStatus.audioSuspended
                  ? 'Camera & Microphone permissions are granted! Click the button below once to activate live audio monitoring and enter Preparation Mode.'
                  : permStatus.error ||
                    'You must grant both Camera and Microphone permissions to access Preparation Mode.'}
              </p>
              {isBrave && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-medium text-left">
                  <strong>Brave Browser Detected:</strong> Brave Shields can mute microphone audio. Please open this portal in <strong>Google Chrome</strong>.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold ${
                  permStatus.camGranted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{permStatus.camGranted ? 'Camera Allowed' : 'Camera Required'}</span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold ${
                  permStatus.micGranted && !permStatus.micMuted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>
                  {!permStatus.micGranted
                    ? 'Mic Required'
                    : permStatus.micMuted
                    ? 'Mic Muted'
                    : 'Mic Allowed'}
                </span>
              </div>
            </div>

            {(!permStatus.camGranted || !permStatus.micGranted) && (
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-stone-200 text-[11px] text-stone-600 text-left space-y-1">
                <div className="font-bold text-stone-800">If you clicked Block/Deny earlier:</div>
                <p>
                  Click the <strong>Lock / Camera icon</strong> next to the website URL, change{' '}
                  <strong>Camera</strong> &amp; <strong>Microphone</strong> to <strong>Allow</strong>,
                  then click the button below.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {permStatus.camGranted && permStatus.micGranted && permStatus.audioSuspended && !permStatus.micMuted ? (
                <button
                  type="button"
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Preparation &amp; Activate Mic</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={permStatus.checking}
                  onClick={() => setPermRetryCount((c) => c + 1)}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${permStatus.checking ? 'animate-spin' : ''}`} />
                  <span>
                    {permStatus.checking
                      ? 'Checking Permissions...'
                      : permStatus.micMuted
                      ? 'Re-Check Microphone'
                      : 'Allow Camera & Microphone'}
                  </span>
                </button>
              )}
              <Link
                href="/"
                className="text-xs text-stone-500 hover:text-emerald-700 font-medium py-1"
              >
                &larr; Back to Exam Portal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Clean Top Header */}
      <header className="border-b border-stone-200 bg-white px-4 py-3 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 border border-stone-200 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exam Portal</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-stone-900">Prepare for Exam</h1>
                <p className="text-[11px] text-stone-500">
                  Beginner Articles, Visual Explainers &amp; Java Practice
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenBlankSandbox}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Open Java Compiler</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] text-stone-600 border border-stone-200 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {permStatus.camGranted && permStatus.micGranted ? 'Cam & Mic Active' : 'Permission Required'}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Simple 2-Column Article Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 md:py-6">
        {/* Left Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white border border-stone-200 rounded-2xl p-3 shadow-xs space-y-1.5 md:sticky md:top-20">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Beginner Articles
            </div>

            {PREPARE_TOPICS.map((topic, idx) => {
              const isActive = activeTabId === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => setActiveTabId(topic.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition border ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                      : 'bg-white hover:bg-[#FAF8F5] text-stone-700 border-transparent hover:border-stone-200 font-medium'
                  }`}
                >
                  <div
                    className={`text-[10px] font-semibold ${
                      isActive ? 'text-emerald-100' : 'text-amber-700'
                    }`}
                  >
                    {topic.badge}
                  </div>
                  <div className="mt-0.5 leading-snug">
                    {idx + 1}. {topic.title}
                  </div>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-stone-100">
              <button
                onClick={() => setActiveTabId('mcq-practice')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition border flex items-center justify-between ${
                  activeTabId === 'mcq-practice'
                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200 font-semibold'
                }`}
              >
                <span>MCQ Practice Quiz</span>
                <HelpCircle className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </aside>

        {/* Clean Single-Column Article Reader */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {activeTabId === 'mcq-practice' ? (
            <McqPracticePanel />
          ) : (
            <article className="space-y-5">
              {/* Article Title */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                  {currentTopic.badge}
                </span>
                <h2 className="text-2xl font-black text-stone-900">{currentTopic.title}</h2>
                <p className="text-sm text-stone-600 leading-relaxed">{currentTopic.subtitle}</p>
              </div>

              {/* Animated Visual Explainer */}
              <AnimatedExplainer animationType={currentTopic.animationType} />

              {/* 1. Definition & Analogy */}
              {currentTopic.definition && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-stone-900">What Is It? (Simple Definition)</h3>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {currentTopic.definition.summary}
                  </p>
                  {currentTopic.definition.analogy && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                      <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase text-[10px] tracking-wider block text-amber-800 mb-0.5">
                          Real-World Analogy
                        </span>
                        <span className="leading-relaxed">{currentTopic.definition.analogy}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Why & When + Important Rules (Bullet Points) */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
                {currentTopic.whyAndWhen && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-stone-900">Why &amp; When Do We Use It?</h3>
                    <ul className="space-y-2">
                      {currentTopic.whyAndWhen.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2.5 text-xs md:text-sm text-stone-700 bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-stone-200/80"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentTopic.keyRules && (
                  <div className="space-y-2.5 pt-2 border-t border-stone-100">
                    <h3 className="text-sm font-bold text-stone-900">
                      Key Rules &amp; Common Mistakes to Remember
                    </h3>
                    <ul className="space-y-2">
                      {currentTopic.keyRules.map((rule) => (
                        <li
                          key={rule}
                          className="flex items-start gap-2.5 text-xs md:text-sm text-stone-700 bg-[#FAF8F5] px-3.5 py-2.5 rounded-xl border border-stone-200/80"
                        >
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Simple Comparison Table */}
                {currentTopic.comparisonTable && (
                  <div className="pt-3 border-t border-stone-100 overflow-x-auto">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                      Quick Comparison
                    </h3>
                    <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                      <thead className="bg-[#FAF8F5] text-stone-700 font-bold border-b border-stone-200">
                        <tr>
                          {currentTopic.comparisonTable.headers.map((h) => (
                            <th key={h} className="px-3.5 py-2.5">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {currentTopic.comparisonTable.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="bg-white">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`px-3.5 py-2.5 ${
                                  cIdx === 0 ? 'font-bold text-stone-900' : 'text-stone-600'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. Step-by-Step Visual Working Trace */}
              {currentTopic.visualTrace && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-bold text-stone-900">
                      {currentTopic.visualTrace.title}
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {currentTopic.visualTrace.steps.map((s) => (
                      <div
                        key={s.step}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] border border-stone-200 flex flex-col sm:flex-row sm:items-start gap-3"
                      >
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {s.step}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="font-mono text-xs font-bold text-stone-900">
                            {s.codeLine}
                          </div>
                          <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-mono text-[11px] text-emerald-900 font-semibold">
                            {s.state}
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed">{s.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Examples with Practice Button */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 px-1">
                  Code Examples — Click Practice to Run &amp; Edit
                </h3>

                {currentTopic.examples.map((ex, idx) => (
                  <div
                    key={ex.title}
                    className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs"
                  >
                    <div className="px-4 py-3 bg-[#FAF8F5] border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-stone-900">{ex.title}</div>
                        {ex.description && (
                          <div className="text-[11px] text-stone-500">{ex.description}</div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenPractice(ex, idx)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Practice</span>
                      </button>
                    </div>

                    <pre className="p-4 text-xs font-mono text-stone-800 overflow-x-auto leading-relaxed bg-white">
                      {ex.code}
                    </pre>

                    {ex.expectedOutput && (
                      <div className="px-4 py-2.5 bg-[#FAF8F5] border-t border-stone-200 text-[11px] font-mono text-emerald-900">
                        <span className="font-sans font-bold text-stone-500 uppercase text-[10px] mr-2">
                          Sample Output:
                        </span>
                        <span className="whitespace-pre-wrap">{ex.expectedOutput}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sequential Article Navigation */}
              <div className="flex items-center justify-between pt-2 pb-6">
                <button
                  onClick={() =>
                    currentTopicIndex > 0 && setActiveTabId(PREPARE_TOPICS[currentTopicIndex - 1].id)
                  }
                  disabled={currentTopicIndex <= 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Article</span>
                </button>

                {currentTopicIndex < PREPARE_TOPICS.length - 1 ? (
                  <button
                    onClick={() => setActiveTabId(PREPARE_TOPICS[currentTopicIndex + 1].id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition"
                  >
                    <span>Next Article</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTabId('mcq-practice')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white transition"
                  >
                    <span>Try MCQ Practice Quiz</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          )}
        </main>
      </div>

      {/* Practice Compiler Modal (Opens when student clicks "Practice" on any code block) */}
      {compilerOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-5xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3 bg-[#FAF8F5] border-b border-stone-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-sm text-stone-900">
                  Practice Compiler &bull; {compilerQuestion.title}
                </span>
              </div>
              <button
                onClick={() => setCompilerOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Compiler</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 bg-[#FAF8F5]">
              <CodeEditor key={compilerQuestion.id} question={compilerQuestion} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
