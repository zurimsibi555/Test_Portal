import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { getExamScheduleStatus } from '@/lib/examSchedule';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const { testId, studentName, rollNo } = await req.json();

    if (!testId || !studentName || !rollNo) {
      return NextResponse.json({ success: false, message: 'Missing required student or test fields' }, { status: 400 });
    }

    const store = getStore();
    const test = store.tests.find(t => t.id === testId);

    if (!test) {
      return NextResponse.json({ success: false, message: 'Test not found' }, { status: 404 });
    }

    // Enforce scheduled start time (1:00 PM sharp) and 30-minute expiry window
    const schedule = getExamScheduleStatus(test);
    if (schedule.status === 'UPCOMING') {
      return NextResponse.json(
        {
          success: false,
          code: 'EXAM_NOT_STARTED',
          message: 'Exam has not started yet. It begins on Saturday, 28 Nov at 1:00 PM sharp.',
        },
        { status: 403 }
      );
    }

    if (schedule.status === 'EXPIRED') {
      return NextResponse.json(
        {
          success: false,
          code: 'EXAM_EXPIRED_ABSENT',
          message: 'ABSENT: The 30-minute exam entry window expired at 1:30 PM. You cannot attend this exam.',
        },
        { status: 403 }
      );
    }

    // Prevent duplicate attempts by the same roll number on this test
    const normalizedRoll = rollNo.trim().toLowerCase();
    const alreadySubmitted = store.submissions.some(
      (s) => s.testId === testId && String(s.rollNo || '').trim().toLowerCase() === normalizedRoll
    );
    if (alreadySubmitted) {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_ATTEMPTED',
          message: 'You have already attended or submitted this examination. Re-entry is not allowed.',
        },
        { status: 403 }
      );
    }

    const sessionId = crypto.randomBytes(8).toString('hex');
    const durationSeconds = (test.durationMinutes || 45) * 60;

    const newSession = {
      id: sessionId,
      testId,
      studentName,
      rollNo,
      paired: false,
      pairedAt: null,
      startTime: null,
      durationSeconds,
      remainingSeconds: durationSeconds,
      isStarted: false,
      isSubmitted: false,
      violated: false,
      violationReason: null,
      createdAt: new Date().toISOString()
    };

    store.sessions[sessionId] = newSession;
    saveStore(store);

    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const derivedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
    const baseUrl =
      configuredUrl && !configuredUrl.includes('localhost')
        ? configuredUrl
        : derivedOrigin || configuredUrl || 'http://localhost:3000';
    const mobilePairUrl = `${baseUrl}/session/${sessionId}/mobile`;

    return NextResponse.json({
      success: true,
      sessionId,
      mobilePairUrl,
      session: newSession
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
