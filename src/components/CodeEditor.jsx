'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  SkipForward,
  Terminal,
  FileCode2,
} from 'lucide-react';

export default function CodeEditor({
  question,
  initialCode,
  initialEvaluation = null,
  isLastQuestion = false,
  onCodeChange,
  onEvaluationComplete,
  onSubmitAndNext,
  onSkip,
}) {
  const [code, setCode] = useState(initialCode || question.starterCode || '');
  const [customInput, setCustomInput] = useState(question.sampleInput || '');
  const [output, setOutput] = useState('');
  const [errorOutput, setErrorOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState(initialEvaluation);
  const [activeConsoleTab, setActiveConsoleTab] = useState(
    initialEvaluation ? 'tests' : 'output'
  ); // 'output' | 'tests'
  const consoleSectionRef = useRef(null);

  const scrollConsoleIntoView = () => {
    requestAnimationFrame(() => {
      consoleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  useEffect(() => {
    setCode(initialCode || question.starterCode || '');
    setCustomInput(question.sampleInput || '');
    setEvaluationResults(initialEvaluation);
    setOutput('');
    setErrorOutput('');
  }, [question.id, initialCode, initialEvaluation, question.starterCode, question.sampleInput]);

  const handleEditorChange = (value) => {
    const val = value || '';
    setCode(val);
    if (onCodeChange) onCodeChange(val);
  };

  const handleReset = () => {
    if (confirm('Reset code to starter template? Your current edits will be lost.')) {
      setCode(question.starterCode);
      if (onCodeChange) onCodeChange(question.starterCode);
      setOutput('');
      setErrorOutput('');
      setEvaluationResults(null);
    }
  };

  // Run code against custom input
  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setErrorOutput('');
    setActiveConsoleTab('output');

    try {
      const res = await fetch('/api/compiler/java', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, stdin: customInput }),
      });

      const data = await res.json();
      if (data.success) {
        setOutput(data.output || '(Execution completed with no standard output)');
        setErrorOutput('');
      } else {
        setOutput(data.output || '');
        setErrorOutput(data.error || data.message || 'Execution failed');
      }
    } catch (err) {
      setErrorOutput(`Network error: ${err.message}`);
    } finally {
      setIsRunning(false);
      scrollConsoleIntoView();
    }
  };

  // Run code against all hidden & sample test cases
  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setActiveConsoleTab('tests');
    setErrorOutput('');

    try {
      const res = await fetch('/api/tests/evaluate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          studentCode: code,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEvaluationResults(data);
        if (onEvaluationComplete) {
          onEvaluationComplete(question.id, data);
        }
        return data;
      } else {
        setErrorOutput(data.message || 'Failed to evaluate test cases');
        setEvaluationResults(null);
        return null;
      }
    } catch (err) {
      setErrorOutput(`Evaluation error: ${err.message}`);
      setEvaluationResults(null);
      return null;
    } finally {
      setIsEvaluating(false);
      scrollConsoleIntoView();
    }
  };

  // Handle Submit & Next (evaluates if needed, then calls onSubmitAndNext)
  const handleSubmitAndNext = async () => {
    setIsSubmitting(true);
    try {
      let evalResult = evaluationResults;
      // If not yet evaluated, evaluate first
      if (!evalResult) {
        evalResult = await handleEvaluate();
      }
      if (onSubmitAndNext) {
        onSubmitAndNext(question.id, code, evalResult);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-stone-800 rounded-2xl overflow-y-auto border border-stone-200 shadow-sm">
      {/* Editor Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#FAF8F5] border-b border-stone-200 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-stone-700">
            <FileCode2 className="w-4 h-4 text-emerald-700" />
            <span>Main.java</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-medium">
            Java 23 (OpenJDK)
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 border border-transparent hover:border-stone-300 transition font-medium"
            title="Reset to starter template"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning || isEvaluating || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 shadow-xs transition disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run Code</span>
          </button>

          <button
            onClick={handleEvaluate}
            disabled={isRunning || isEvaluating || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 hover:border-amber-400 shadow-xs transition disabled:opacity-50"
          >
            {isEvaluating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Evaluate Test Cases</span>
          </button>

          {onSkip && (
            <button
              onClick={onSkip}
              disabled={isRunning || isEvaluating || isSubmitting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 font-medium transition disabled:opacity-50"
              title="Skip this question for now"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip</span>
            </button>
          )}

          {onSubmitAndNext && (
            <button
              onClick={handleSubmitAndNext}
              disabled={isRunning || isEvaluating || isSubmitting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>{isLastQuestion ? 'Submit & Review' : 'Submit & Next'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Monaco Code Editor in Clean Theme */}
      <div className="flex-1 min-h-[240px] relative border-b border-stone-200">
        <Editor
          height="100%"
          language="java"
          theme="vs"
          value={code}
          onChange={handleEditorChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
            formatOnPaste: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
          }}
        />
      </div>

      {/* Console & Test Cases Output Bottom Section */}
      <div ref={consoleSectionRef} className="h-64 shrink-0 bg-[#FAF8F5] flex flex-col">
        {/* Console Header Tabs */}
        <div className="flex items-center justify-between px-3 border-b border-stone-200 bg-white text-xs shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveConsoleTab('output')}
              className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition ${
                activeConsoleTab === 'output'
                  ? 'border-emerald-700 text-emerald-700 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Standard I/O Console</span>
            </button>

            <button
              onClick={() => setActiveConsoleTab('tests')}
              className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition ${
                activeConsoleTab === 'tests'
                  ? 'border-emerald-700 text-emerald-700 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Test Cases Result</span>
              {evaluationResults && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    evaluationResults.passedTests === evaluationResults.totalTests
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {evaluationResults.passedTests}/{evaluationResults.totalTests}
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-stone-500">
            {activeConsoleTab === 'output' ? 'Custom Stdin Support' : 'Evaluation Test Cases'}
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 text-xs font-mono bg-white">
          {activeConsoleTab === 'output' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full min-h-[160px]">
              <div className="flex flex-col min-h-0 h-full">
                <label className="text-[11px] font-semibold text-slate-600 mb-1 shrink-0">
                  Standard Input (stdin):
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Provide standard input for your program..."
                  className="flex-1 min-h-[110px] w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 text-xs font-mono resize-none transition"
                />
              </div>

              <div className="flex flex-col min-h-0 h-full">
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Standard Output / Diagnostics:
                  </label>
                  {errorOutput ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Error / Compile Failed
                    </span>
                  ) : output ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Success
                    </span>
                  ) : null}
                </div>
                <div className="flex-1 min-h-[110px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg overflow-auto space-y-2">
                  {output && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Program Output:</div>
                      <pre className="text-slate-800 whitespace-pre-wrap">{output}</pre>
                    </div>
                  )}
                  {errorOutput && (
                    <div className="p-2 bg-rose-50/80 border border-rose-200 rounded text-rose-700">
                      <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-0.5">Error Details:</div>
                      <pre className="text-rose-700 whitespace-pre-wrap font-mono">{errorOutput}</pre>
                    </div>
                  )}
                  {!output && !errorOutput && (
                    <span className="text-slate-400">Click &quot;Run Code&quot; to see program output here.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {isEvaluating ? (
                <div className="flex items-center justify-center h-32 gap-3 text-slate-600">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
                  <span className="font-medium">Evaluating code against test cases...</span>
                </div>
              ) : errorOutput && !evaluationResults ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Evaluation Error</span>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap font-mono mt-1 text-rose-800">
                    {errorOutput}
                  </pre>
                </div>
              ) : evaluationResults ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      {evaluationResults.passedTests === evaluationResults.totalTests ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                      <span className="font-semibold text-slate-800">
                        {evaluationResults.passedTests} of {evaluationResults.totalTests} Test Cases Passed
                      </span>
                    </div>
                    <div className="text-emerald-800 font-bold text-sm bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Score: +{evaluationResults.score} / {evaluationResults.maxScore} pts
                    </div>
                  </div>

                  {evaluationResults.hasCompilationError && evaluationResults.compilationError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-700">
                        <AlertCircle className="w-4 h-4" />
                        <span>Compilation Error:</span>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono">{evaluationResults.compilationError}</pre>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {evaluationResults.results?.map((res) => (
                      <div
                        key={res.testCaseNumber}
                        className={`p-2.5 rounded-xl border text-xs ${
                          res.passed
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span>
                            Test #{res.testCaseNumber} {res.isHidden && '(Hidden)'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              res.passed
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-rose-200 text-rose-900'
                            }`}
                          >
                            {res.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>

                        {!res.isHidden && (
                          <div className="space-y-0.5 text-[11px] text-slate-600">
                            <div>
                              Input: <code className="text-slate-800 font-semibold">{res.input}</code>
                            </div>
                            <div>
                              Expected: <code className="text-slate-800 font-semibold">{res.expected}</code>
                            </div>
                            <div>
                              Output:{' '}
                              <code className={res.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                                {res.actual}
                              </code>
                            </div>
                          </div>
                        )}

                        {res.error && (
                          <div className="mt-1 text-[11px] text-rose-600 whitespace-pre-wrap">
                            {res.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-center py-10 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  <p>Click &quot;Evaluate Test Cases&quot; to test your Java solution against all evaluation benchmarks.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
