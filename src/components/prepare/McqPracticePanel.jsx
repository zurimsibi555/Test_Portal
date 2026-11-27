'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, HelpCircle } from 'lucide-react';
import { PRACTICE_MCQS } from '@/data/prepareTopics';

export default function McqPracticePanel() {
  const [answers, setAnswers] = useState({});

  const answeredCount = PRACTICE_MCQS.filter((q) => answers[q.id] !== undefined).length;
  const correctCount = PRACTICE_MCQS.filter(
    (q) => answers[q.id] === q.correctOption
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                MCQ Practice Bank ({PRACTICE_MCQS.length} Questions)
              </h2>
              <p className="text-[11px] text-stone-500">
                Score: <strong className="text-emerald-700">{correctCount}</strong> / {answeredCount} answered
              </p>
            </div>
          </div>

          <button
            onClick={() => setAnswers({})}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 border border-stone-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Quiz</span>
          </button>
        </div>
      </div>

      {/* Question Cards */}
      <div className="space-y-3">
        {PRACTICE_MCQS.map((q, idx) => {
          const picked = answers[q.id];
          const hasPicked = picked !== undefined;
          const isCorrect = picked === q.correctOption;

          return (
            <div
              key={q.id}
              className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <h3 className="text-xs md:text-sm font-semibold text-stone-900 leading-relaxed whitespace-pre-wrap">
                <span className="font-bold text-emerald-700 mr-1.5">Q{idx + 1}.</span>
                {q.question}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = picked === optIdx;
                  const isRightOpt = optIdx === q.correctOption;

                  let btnClass =
                    'bg-[#FAF8F5] hover:bg-stone-100 border-stone-200 text-stone-700';
                  if (hasPicked) {
                    if (isRightOpt) {
                      btnClass =
                        'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold';
                    } else if (isSelected && !isRightOpt) {
                      btnClass = 'bg-rose-50 border-rose-500 text-rose-900 font-semibold';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                      className={`text-left p-3 rounded-xl border text-xs flex items-center gap-2.5 transition ${btnClass}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white border border-stone-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {hasPicked && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    isCorrect
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold mb-0.5">
                      {isCorrect ? 'Correct!' : `Incorrect — Correct Option: ${String.fromCharCode(65 + q.correctOption)}`}
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
