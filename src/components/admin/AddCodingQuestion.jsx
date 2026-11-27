"use client";

import { useState } from "react";
import { Plus, Trash2, Code2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AddCodingQuestion({ testId, onCreated, tests = [] }) {
  const [targetTestId, setTargetTestId] = useState(testId || (tests[0]?.id || ""));
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    constraints: "",
    sample_input: "",
    sample_output: "",
    starter_code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
        
    }
}`,
    test_cases: [
      { input: "", output: "", isHidden: false },
      { input: "", output: "", isHidden: true }
    ],
    points: 10,
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const addTestCase = () => {
    setFormData((prev) => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: "", output: "", isHidden: true }],
    }));
  };

  const removeTestCase = (index) => {
    if (formData.test_cases.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index),
    }));
  };

  const updateTestCase = (index, field, value) => {
    const updated = [...formData.test_cases];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, test_cases: updated }));
  };

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
      const payload = {
        test_id: finalTestId,
        testId: finalTestId,
        type: "coding",
        title: formData.title,
        description: formData.description,
        constraints: formData.constraints,
        sample_input: formData.sample_input,
        sampleInput: formData.sample_input,
        sample_output: formData.sample_output,
        sampleOutput: formData.sample_output,
        starter_code: formData.starter_code,
        starterCode: formData.starter_code,
        test_cases: formData.test_cases,
        testCases: formData.test_cases,
        points: Number(formData.points) || 10,
      };

      const res = await fetch("/api/admin/questions/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({
          type: "success",
          message: `Java problem "${formData.title}" added successfully!`,
        });
        setFormData({
          title: "",
          description: "",
          constraints: "",
          sample_input: "",
          sample_output: "",
          starter_code: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
          test_cases: [
            { input: "", output: "", isHidden: false },
            { input: "", output: "", isHidden: true }
          ],
          points: 10,
        });
        if (onCreated) onCreated(data.question);
      } else {
        setStatus({
          type: "error",
          message: data.message || "Failed to add coding question.",
        });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "Network error while saving question.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-3xl bg-white border border-stone-200 p-6 rounded-2xl shadow-sm text-stone-800"
    >
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Add Java Coding Problem</h2>
            <p className="text-xs text-stone-500">
              Create problems with public samples and hidden automated test cases
            </p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
            Problem Title
          </label>
          <input
            type="text"
            placeholder="e.g. Find Maximum Subarray Sum"
            className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
            Score Points
          </label>
          <input
            type="number"
            min="1"
            max="100"
            className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700"
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
          Problem Statement & Requirements
        </label>
        <textarea
          placeholder="Describe the problem, input format, output format, and explanations..."
          rows={4}
          className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700 resize-none"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
          Constraints (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. 1 <= N <= 10^5, -10^4 <= Arr[i] <= 10^4"
          className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs font-mono text-emerald-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700"
          value={formData.constraints}
          onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
            Sample Input (stdin)
          </label>
          <textarea
            rows={3}
            placeholder="5&#10;1 2 3 4 5"
            className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-mono text-xs text-amber-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700 resize-none"
            value={formData.sample_input}
            onChange={(e) => setFormData({ ...formData, sample_input: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
            Sample Output (stdout)
          </label>
          <textarea
            rows={3}
            placeholder="15"
            className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-mono text-xs text-emerald-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-emerald-700 resize-none"
            value={formData.sample_output}
            onChange={(e) => setFormData({ ...formData, sample_output: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-stone-700 uppercase block mb-1">
          Java Starter Code Template
        </label>
        <textarea
          rows={5}
          className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-mono text-xs text-stone-800 focus:outline-none focus:bg-white focus:border-emerald-700 resize-none"
          value={formData.starter_code}
          onChange={(e) => setFormData({ ...formData, starter_code: e.target.value })}
          required
        />
      </div>

      {/* Dynamic Test Cases Section */}
      <div className="border-t border-stone-200 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-semibold block text-sm text-stone-900">
              Evaluation Test Cases (Hidden / Automated)
            </label>
            <p className="text-[11px] text-stone-500">
              Student code is evaluated against each input and compared with expected output.
            </p>
          </div>
          <button
            type="button"
            onClick={addTestCase}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Test Case</span>
          </button>
        </div>

        <div className="space-y-3">
          {formData.test_cases.map((tc, index) => (
            <div
              key={index}
              className="p-3 bg-[#FAF8F5] border border-stone-200 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700">
                  Test Case #{index + 1}
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-600 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={!!tc.isHidden}
                      onChange={(e) => updateTestCase(index, "isHidden", e.target.checked)}
                      className="rounded accent-emerald-700"
                    />
                    <span>Hidden Test Case</span>
                  </label>
                  {formData.test_cases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      className="text-rose-600 hover:text-rose-700 transition"
                      title="Delete test case"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <textarea
                    rows={2}
                    placeholder="Input (stdin)"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-emerald-700 resize-none"
                    value={tc.input}
                    onChange={(e) => updateTestCase(index, "input", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <textarea
                    rows={2}
                    placeholder="Expected Output (stdout)"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono text-xs text-emerald-800 placeholder-stone-400 focus:outline-none focus:border-emerald-700 resize-none"
                    value={tc.output}
                    onChange={(e) => updateTestCase(index, "output", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving Problem...</span>
          </>
        ) : (
          <span>Save Java Problem</span>
        )}
      </button>
    </form>
  );
}
