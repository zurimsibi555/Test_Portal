"use client";

import { useState } from "react";
import { HelpCircle, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AddMcqQuestion({ testId, onCreated, tests = [] }) {
  const [targetTestId, setTargetTestId] = useState(testId || (tests[0]?.id || ""));
  const [formData, setFormData] = useState({
    question: "",
    options: ["", "", "", ""],
    correctOption: 0,
    points: 2.5,
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalTestId = testId || targetTestId;
    if (!finalTestId) {
      setStatus({ type: "error", message: "Please select a target test first." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const adminKey = typeof window !== "undefined" ? localStorage.getItem("admin_key") || "" : "";
      const res = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({
          type: "mcq",
          testId: finalTestId,
          ...formData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: "success", message: "MCQ question saved successfully!" });
        setFormData({
          question: "",
          options: ["", "", "", ""],
          correctOption: 0,
          points: 2.5,
        });
        if (onCreated) onCreated(data.question);
      } else {
        setStatus({ type: "error", message: data.message || "Failed to add question." });
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-2xl bg-white border border-stone-200 p-6 rounded-2xl shadow-sm text-stone-800"
    >
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Add Multiple Choice Question</h2>
            <p className="text-xs text-stone-500">Add an objective question with single correct choice</p>
          </div>
        </div>

        <div className="w-48">
          {!testId && tests.length > 0 && (
            <select
              value={targetTestId}
              onChange={(e) => setTargetTestId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-[#FAF8F5] border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:border-emerald-700"
              required
            >
              <option value="" disabled>Select Target Test</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {status.message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            status.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
          Question Text
        </label>
        <textarea
          rows={3}
          placeholder="e.g. Which of the following collections allows null values in Java?"
          className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700 resize-none"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-700 uppercase block">
          Options (Select the correct option):
        </label>
        {formData.options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2.5">
            <input
              type="radio"
              name="correctOption"
              checked={formData.correctOption === idx}
              onChange={() => setFormData({ ...formData, correctOption: idx })}
              className="w-4 h-4 accent-emerald-700 cursor-pointer"
            />
            <input
              type="text"
              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              value={opt}
              onChange={(e) => {
                const updated = [...formData.options];
                updated[idx] = e.target.value;
                setFormData({ ...formData, options: updated });
              }}
              className="flex-1 p-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700"
              required
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
          Marks / Points
        </label>
        <input
          type="number"
          step="0.5"
          min="0.5"
          max="50"
          className="w-full p-2 bg-[#FAF8F5] border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:bg-white focus:border-emerald-700"
          value={formData.points}
          onChange={(e) => setFormData({ ...formData, points: e.target.value })}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving Question...</span>
          </>
        ) : (
          <span>Save MCQ Question</span>
        )}
      </button>
    </form>
  );
}
