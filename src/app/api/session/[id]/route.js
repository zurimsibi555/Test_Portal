import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { gradeAttemptedAnswers } from '@/lib/gradeSubmission';
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

    // 1.6 Sync In-Progress Draft Answers (preserves work in case of mobile/admin/shortcut auto-submit)
    if (action === 'sync_draft') {
      if (session.isSubmitted) {
        return NextResponse.json({ success: true, alreadySubmitted: true });
      }
      if (mcqAnswers && typeof mcqAnswers === 'object') {
        session.draftMcqAnswers = mcqAnswers;
      }
      if (codingAnswers && typeof codingAnswers === 'object') {
        session.draftCodingAnswers = codingAnswers;
      }
      if (codingSolutions && typeof codingSolutions === 'object') {
        session.draftCodingSolutions = codingSolutions;
      }
      session.lastDraftSyncAt = new Date().toISOString();
      saveStore(store);
      return NextResponse.json({ success: true });
    }

    // 2. Anti-cheat Violation Action (Triggered by either Mobile or Desktop) — grades all attempted answers
    if (action === 'violation') {
      if (session.isSubmitted) {
        return NextResponse.json({ success: true, alreadySubmitted: true, message: 'Session already submitted.' });
      }
      session.violated = true;
      session.violationReason = reason || 'Proctoring violation detected (Tab switch or App blur)';
      session.isSubmitted = true;

      const test = store.tests.find((t) => t.id === session.testId);
      const graded = await gradeAttemptedAnswers(store, session, {
        mcqAnswers,
        codingAnswers,
        codingSolutions,
      });

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
        mcqScore: graded.mcqScore,
        mcqMaxScore: graded.mcqMaxScore,
        codeScore: graded.codeScore,
        codeMaxScore: graded.codeMaxScore,
        totalScore: graded.totalScore,
        totalMaxScore: graded.totalMaxScore,
        score: graded.totalScore,
        mcqAttemptedCount: graded.mcqAttemptedCount,
        totalMcqs: graded.totalMcqs,
        codingAttemptedCount: graded.codingAttemptedCount,
        totalCodings: graded.totalCodings,
        status: 'DISQUALIFIED / AUTO_SUBMITTED',
        mcqDetails: graded.mcqDetails,
        codingDetails: graded.codingDetails,
        sentToStudent: false,
      };

      try {
        const { fileName } = saveSubmissionPdf(violationSub);
        violationSub.pdfFileName = fileName;
        violationSub.pdfGeneratedAt = new Date().toISOString();
      } catch (pdfErr) {
        console.error('PDF generation failed for violation:', pdfErr);
      }

      // Auto-save submission with violation flag + actual graded work
      store.submissions.push(violationSub);

      saveStore(store);
      return NextResponse.json({ success: true, message: 'Violation recorded. Test auto-submitted with attempted answers.' });
    }

    // 3. Normal Submission
    if (action === 'submit') {
      if (session.isSubmitted) {
        return NextResponse.json({ success: true, submitted: true, alreadySubmitted: true });
      }
      session.isSubmitted = true;
      const test = store.tests.find((t) => t.id === session.testId);
      const graded = await gradeAttemptedAnswers(store, session, {
        mcqAnswers,
        codingAnswers,
        codingSolutions,
      });

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
        mcqScore: graded.mcqScore,
        mcqMaxScore: graded.mcqMaxScore,
        codeScore: graded.codeScore,
        codeMaxScore: graded.codeMaxScore,
        totalScore: graded.totalScore,
        totalMaxScore: graded.totalMaxScore,
        mcqAttemptedCount: graded.mcqAttemptedCount,
        totalMcqs: graded.totalMcqs,
        codingAttemptedCount: graded.codingAttemptedCount,
        totalCodings: graded.totalCodings,
        webcamWarnings: session.webcamWarnings || 0,
        status: 'COMPLETED',
        mcqDetails: graded.mcqDetails,
        codingDetails: graded.codingDetails,
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
