import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { evaluateJavaTestSuite } from '@/lib/javaCompiler';
import { saveSubmissionPdf } from '@/lib/pdfReport';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const store = getStore();
    const session = store.sessions[id];

    if (!session) {
      return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason, mcqAnswers, codingAnswers, codingSolutions } = body;

    const store = getStore();
    const session = store.sessions[id];

    if (!session) {
      return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
    }

    // 1. Mobile Pair Action
    if (action === 'pair') {
      session.paired = true;
      session.pairedAt = new Date().toISOString();
      session.isStarted = true;
      session.startTime = session.startTime || Date.now();
      saveStore(store);
      return NextResponse.json({ success: true, message: 'Paired successfully', session });
    }

    // 1.5 Webcam Warning Action
    if (action === 'webcam_warning') {
      session.webcamWarnings = (session.webcamWarnings || 0) + 1;
      session.lastWebcamWarningAt = new Date().toISOString();
      session.lastWebcamWarningReason = reason || 'Student not detected in webcam';
      saveStore(store);
      return NextResponse.json({ success: true, webcamWarnings: session.webcamWarnings, session });
    }

    // 2. Anti-cheat Violation Action (Triggered by either Mobile or Desktop)
    if (action === 'violation') {
      if (session.isSubmitted) {
        return NextResponse.json({ success: true, alreadySubmitted: true, message: 'Session already submitted.' });
      }
      session.violated = true;
      session.violationReason = reason || 'Proctoring violation detected (Tab switch or App blur)';
      session.isSubmitted = true;

      const test = store.tests.find((t) => t.id === session.testId);
      const testMcqs = store.mcqQuestions.filter((q) => q.testId === session.testId);
      const testCodings = store.codingQuestions.filter((q) => q.testId === session.testId);
      const mcqMaxScore = testMcqs.reduce((acc, q) => acc + Number(q.points ?? 2.5), 0);
      const codeMaxScore = testCodings.reduce((acc, q) => acc + Number(q.points ?? 10), 0);

      const violationSub = {
        id: `sub_${Date.now()}`,
        sessionId: id,
        testId: session.testId,
        testTitle: test?.title || session.testId,
        studentName: session.studentName,
        rollNo: session.rollNo,
        violated: true,
        violationReason: session.violationReason,
        webcamWarnings: session.webcamWarnings || 0,
        submittedAt: new Date().toISOString(),
        mcqScore: 0,
        mcqMaxScore,
        codeScore: 0,
        codeMaxScore,
        totalScore: 0,
        totalMaxScore: mcqMaxScore + codeMaxScore,
        score: 0,
        status: 'DISQUALIFIED / AUTO_SUBMITTED',
        sentToStudent: false,
      };

      try {
        const { fileName } = saveSubmissionPdf(violationSub);
        violationSub.pdfFileName = fileName;
        violationSub.pdfGeneratedAt = new Date().toISOString();
      } catch (pdfErr) {
        console.error('PDF generation failed for violation:', pdfErr);
      }

      // Auto-save submission with penalty/flag
      store.submissions.push(violationSub);

      saveStore(store);
      return NextResponse.json({ success: true, message: 'Violation recorded. Test terminated.' });
    }

    // 3. Normal Submission
    if (action === 'submit') {
      if (session.isSubmitted) {
        return NextResponse.json({ success: true, submitted: true, alreadySubmitted: true });
      }
      session.isSubmitted = true;
      const test = store.tests.find((t) => t.id === session.testId);

      // Calculate MCQ Score (2.5 marks per MCQ by default)
      const testMcqs = store.mcqQuestions.filter((q) => q.testId === session.testId);
      let mcqScore = 0;
      let mcqMaxScore = 0;
      const mcqDetails = testMcqs.map((q, idx) => {
        const maxMarks = Number(q.points ?? 2.5);
        mcqMaxScore += maxMarks;
        const selectedOption =
          mcqAnswers && mcqAnswers[q.id] !== undefined ? mcqAnswers[q.id] : null;
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

      // Coding points passed in or auto-evaluated (10 marks per problem by default)
      const testCodings = store.codingQuestions.filter((q) => q.testId === session.testId);
      let codeScore = 0;
      let codeMaxScore = 0;
      const evaluatedCoding = { ...(codingAnswers || {}) };

      // Auto-evaluate any written solutions that were not evaluated yet
      if (codingSolutions && store.codingQuestions) {
        for (const [qId, code] of Object.entries(codingSolutions)) {
          if (code && (!evaluatedCoding[qId] || evaluatedCoding[qId].score === undefined)) {
            const question = store.codingQuestions.find((q) => q.id === qId);
            if (question) {
              const tCases = question.testCases || question.test_cases || [];
              if (tCases.length > 0) {
                const evalRes = await evaluateJavaTestSuite(code, tCases);
                const passedTests = (evalRes.results || []).filter((r) => r.passed).length;
                const maxPoints = Number(question.points ?? 10);
                const score =
                  tCases.length > 0 ? Math.round((passedTests / tCases.length) * maxPoints) : 0;
                evaluatedCoding[qId] = { score, passedTests, totalTests: tCases.length };
              }
            }
          }
        }
      }

      const codingDetails = testCodings.map((q, idx) => {
        const maxMarks = Number(q.points ?? 10);
        codeMaxScore += maxMarks;
        const evalData = evaluatedCoding[q.id] || {};
        const marksAwarded = Number(evalData.score ?? 0);
        codeScore += marksAwarded;
        return {
          questionId: q.id,
          questionNumber: idx + 1,
          title: q.title,
          code: codingSolutions?.[q.id] || '',
          passedTests: evalData.passedTests ?? 0,
          totalTests: evalData.totalTests ?? (q.testCases || q.test_cases || []).length,
          marksAwarded,
          maxMarks,
        };
      });

      const roundedMcqScore = Number(mcqScore.toFixed(2));
      const roundedCodeScore = Number(codeScore.toFixed(2));
      const totalScore = Number((roundedMcqScore + roundedCodeScore).toFixed(2));
      const totalMaxScore = Number((mcqMaxScore + codeMaxScore).toFixed(2));

      const submission = {
        id: `sub_${Date.now()}`,
        sessionId: id,
        testId: session.testId,
        testTitle: test?.title || session.testId,
        studentName: session.studentName,
        rollNo: session.rollNo,
        violated: false,
        violationReason: null,
        submittedAt: new Date().toISOString(),
        mcqScore: roundedMcqScore,
        mcqMaxScore,
        codeScore: roundedCodeScore,
        codeMaxScore,
        totalScore,
        totalMaxScore,
        webcamWarnings: session.webcamWarnings || 0,
        status: 'COMPLETED',
        mcqDetails,
        codingDetails,
        sentToStudent: false,
      };

      try {
        const { fileName } = saveSubmissionPdf(submission);
        submission.pdfFileName = fileName;
        submission.pdfGeneratedAt = new Date().toISOString();
      } catch (pdfErr) {
        console.error('PDF generation failed:', pdfErr);
      }

      store.submissions.push(submission);
      saveStore(store);

      // Do NOT return scores or evaluation details to the student
      return NextResponse.json({
        success: true,
        submitted: true,
        submissionId: submission.id,
        message: 'Assessment submitted. Your detailed PDF report has been sent to the administrator.',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
