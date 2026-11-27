import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { listActiveLiveFeeds, requestSessionTermination } from '@/lib/liveMonitor';
import { saveSubmissionPdf } from '@/lib/pdfReport';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const listeningSessionId = searchParams.get('listeningSessionId') || null;
    const afterAudioSeq = Number(searchParams.get('afterAudioSeq') || 0);
    const frameSeqsRaw = searchParams.get('frameSeqs') || '';
    const knownFrameSeqs = {};
    if (frameSeqsRaw) {
      for (const pair of frameSeqsRaw.split(',')) {
        const [sid, seq] = pair.split(':');
        if (sid && seq) knownFrameSeqs[sid] = Number(seq) || 0;
      }
    }

    const feeds = listActiveLiveFeeds(45000, {
      listeningSessionId,
      afterAudioSeq,
      knownFrameSeqs,
    });
    return NextResponse.json(
      {
        success: true,
        feeds,
        serverTime: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { action, sessionId, reason } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'sessionId is required' }, { status: 400 });
    }

    if (action === 'terminate') {
      const terminationReason =
        reason || 'Terminated remotely by Administrator during live camera/mic monitoring';
      requestSessionTermination(sessionId, terminationReason);

      const store = getStore();
      const session = store.sessions[sessionId];
      if (session && !session.isSubmitted) {
        session.violated = true;
        session.violationReason = terminationReason;
        session.isSubmitted = true;

        const test = store.tests.find((t) => t.id === session.testId);
        const testMcqs = store.mcqQuestions.filter((q) => q.testId === session.testId);
        const testCodings = store.codingQuestions.filter((q) => q.testId === session.testId);
        const mcqMaxScore = testMcqs.reduce((acc, q) => acc + Number(q.points ?? 2.5), 0);
        const codeMaxScore = testCodings.reduce((acc, q) => acc + Number(q.points ?? 5), 0);

        const sub = {
          id: `sub_${Date.now()}`,
          sessionId,
          testId: session.testId,
          testTitle: test?.title || session.testId,
          studentName: session.studentName,
          rollNo: session.rollNo,
          violated: true,
          violationReason: terminationReason,
          webcamWarnings: session.webcamWarnings || 0,
          submittedAt: new Date().toISOString(),
          mcqScore: 0,
          mcqMaxScore,
          codeScore: 0,
          codeMaxScore,
          totalScore: 0,
          totalMaxScore: mcqMaxScore + codeMaxScore,
          score: 0,
          status: 'TERMINATED BY ADMIN',
          sentToStudent: false,
        };

        try {
          const { fileName } = saveSubmissionPdf(sub);
          sub.pdfFileName = fileName;
          sub.pdfGeneratedAt = new Date().toISOString();
        } catch (err) {
          console.error('PDF generation failed on admin termination:', err);
        }

        store.submissions.push(sub);
        saveStore(store);
      }

      return NextResponse.json({ success: true, message: 'Session termination requested.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
