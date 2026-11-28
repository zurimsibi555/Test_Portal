import { evaluateJavaTestSuite } from './javaCompiler.js';

/**
 * Evaluates and grades a student's attempted MCQ and Java coding solutions.
 * Shared across normal submissions, proctoring auto-submissions (violations), and admin terminations.
 */
export async function gradeAttemptedAnswers(store, session, overrides = {}) {
  const mcqAnswers = {
    ...(session?.draftMcqAnswers || {}),
    ...(overrides?.mcqAnswers || {}),
  };
  const codingAnswers = {
    ...(session?.draftCodingAnswers || {}),
    ...(overrides?.codingAnswers || {}),
  };
  const codingSolutions = {
    ...(session?.draftCodingSolutions || {}),
    ...(overrides?.codingSolutions || {}),
  };

  const testMcqs = (store.mcqQuestions || []).filter((q) => q.testId === session.testId);
  let mcqScore = 0;
  let mcqMaxScore = 0;
  let mcqAttemptedCount = 0;

  const mcqDetails = testMcqs.map((q, idx) => {
    const maxMarks = Number(q.points ?? 2.5);
    mcqMaxScore += maxMarks;
    const rawSelected = mcqAnswers && mcqAnswers[q.id] !== undefined ? mcqAnswers[q.id] : null;
    const selectedOption = rawSelected !== null && rawSelected !== undefined ? Number(rawSelected) : null;
    if (selectedOption !== null && !Number.isNaN(selectedOption)) {
      mcqAttemptedCount += 1;
    }
    const isCorrect = selectedOption === q.correctOption;
    const marksAwarded = isCorrect ? maxMarks : 0;
    mcqScore += marksAwarded;
    return {
      questionId: q.id,
      questionNumber: idx + 1,
      question: q.question,
      options: q.options,
      selectedOption,
      correctOption: q.correctOption,
      isCorrect,
      marksAwarded,
      maxMarks,
    };
  });

  const testCodings = (store.codingQuestions || []).filter((q) => q.testId === session.testId);
  const evaluatedCoding = { ...codingAnswers };

  // Auto-evaluate any written/modified coding solutions that were not evaluated yet
  for (const question of testCodings) {
    const code = codingSolutions?.[question.id];
    const starterTrimmed = (question.starterCode || '').trim();
    const hasModifiedCode = Boolean(code && code.trim() && code.trim() !== starterTrimmed);

    if (hasModifiedCode && (!evaluatedCoding[question.id] || evaluatedCoding[question.id].score === undefined)) {
      const tCases = question.testCases || question.test_cases || [];
      if (tCases.length > 0) {
        try {
          const evalRes = await evaluateJavaTestSuite(code, tCases);
          const passedTests = (evalRes.results || []).filter((r) => r.passed).length;
          const maxPoints = Number(question.points ?? 5);
          const score = Number(((passedTests / tCases.length) * maxPoints).toFixed(2));
          evaluatedCoding[question.id] = { score, passedTests, totalTests: tCases.length };
        } catch {
          evaluatedCoding[question.id] = { score: 0, passedTests: 0, totalTests: tCases.length };
        }
      }
    }
  }

  let codeScore = 0;
  let codeMaxScore = 0;
  let codingAttemptedCount = 0;

  const codingDetails = testCodings.map((q, idx) => {
    const maxMarks = Number(q.points ?? 5);
    codeMaxScore += maxMarks;
    const code = codingSolutions?.[q.id] || '';
    const evalData = evaluatedCoding[q.id] || {};
    const hasAttempted =
      (code && code.trim() !== (q.starterCode || '').trim()) ||
      evalData.passedTests !== undefined;
    if (hasAttempted) {
      codingAttemptedCount += 1;
    }
    const marksAwarded = Number(evalData.score ?? 0);
    codeScore += marksAwarded;
    return {
      questionId: q.id,
      questionNumber: idx + 1,
      title: q.title,
      code,
      passedTests: evalData.passedTests ?? 0,
      totalTests: evalData.totalTests ?? (q.testCases || q.test_cases || []).length,
      marksAwarded,
      maxMarks,
    };
  });

  const roundedMcqScore = Number(mcqScore.toFixed(2));
  const roundedCodeScore = Number(codeScore.toFixed(2));
  const roundedMcqMax = Number(mcqMaxScore.toFixed(2));
  const roundedCodeMax = Number(codeMaxScore.toFixed(2));
  const totalScore = Number((roundedMcqScore + roundedCodeScore).toFixed(2));
  const totalMaxScore = Number((roundedMcqMax + roundedCodeMax).toFixed(2));

  return {
    mcqScore: roundedMcqScore,
    mcqMaxScore: roundedMcqMax,
    codeScore: roundedCodeScore,
    codeMaxScore: roundedCodeMax,
    totalScore,
    totalMaxScore,
    mcqAttemptedCount,
    totalMcqs: testMcqs.length,
    codingAttemptedCount,
    totalCodings: testCodings.length,
    mcqDetails,
    codingDetails,
  };
}
