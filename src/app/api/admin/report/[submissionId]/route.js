import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { getSavedSubmissionPdf, saveSubmissionPdf } from '@/lib/pdfReport';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Only administrators can access student PDF reports.' },
        { status: 401 }
      );
    }

    const { submissionId } = await params;
    const store = getStore();
    const submission = store.submissions.find((s) => s.id === submissionId);

    if (!submission) {
      return NextResponse.json({ success: false, message: 'Submission not found' }, { status: 404 });
    }

    const test = store.tests.find((t) => t.id === submission.testId);
    const enrichedSubmission = {
      ...submission,
      testTitle: submission.testTitle || test?.title || submission.testId,
    };

    let pdfBuffer = getSavedSubmissionPdf(submissionId);
    if (!pdfBuffer) {
      const saved = saveSubmissionPdf(enrichedSubmission);
      pdfBuffer = saved.buffer;
    }

    const safeRoll = String(submission.rollNo || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = submission.pdfFileName || `Report_${safeRoll}_${submission.id}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { submissionId } = await params;
    const { sentToStudent } = await req.json();

    const store = getStore();
    const submission = store.submissions.find((s) => s.id === submissionId);

    if (!submission) {
      return NextResponse.json({ success: false, message: 'Submission not found' }, { status: 404 });
    }

    submission.sentToStudent = Boolean(sentToStudent);
    submission.sentAt = submission.sentToStudent ? new Date().toISOString() : null;
    saveStore(store);

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
