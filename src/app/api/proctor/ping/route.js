import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { updateLiveFeed, getLiveFeed, getRtcRequestsForStudent } from '@/lib/liveMonitor';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      sessionId,
      studentName,
      rollNo,
      testId,
      mode = 'EXAM',
      frameDataUrl,
      audioLevel,
      audioChunks,
      audioReset,
      rtcSignal,
      camGranted,
      micGranted,
      micMuted,
      audioSuspended,
      isPresent,
      webcamWarnings,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'sessionId is required' }, { status: 400 });
    }

    const isPreparePing = mode === 'PREPARE' || String(sessionId).startsWith('prep_');
    const store = isPreparePing ? null : getStore();
    const session = store?.sessions?.[sessionId];

    const updated = updateLiveFeed(sessionId, {
      studentName: session?.studentName || studentName || 'Preparation Mode',
      rollNo: session?.rollNo || rollNo || 'PREP',
      testId: session?.testId || testId || '',
      mode,
      frameDataUrl,
      audioLevel,
      audioChunks,
      audioReset,
      rtcSignal,
      camGranted,
      micGranted,
      micMuted,
      audioSuspended,
      isPresent,
      webcamWarnings,
    });

    // Only write store.json when permission status changes to avoid disk I/O lag on every ping
    if (session && !session.isSubmitted && store) {
      const nextCam = Boolean(camGranted);
      const nextMic = Boolean(micGranted);
      if (session.camGranted !== nextCam || session.micGranted !== nextMic) {
        session.camGranted = nextCam;
        session.micGranted = nextMic;
        session.lastMonitorAt = new Date().toISOString();
        saveStore(store);
      }
    }

    const feed = getLiveFeed(sessionId);
    const rtcRequests = getRtcRequestsForStudent(sessionId);
    return NextResponse.json({
      success: true,
      terminate: Boolean(feed?.terminateRequested || session?.violated),
      terminateReason: feed?.terminateReason || session?.violationReason || null,
      rtcRequests,
      updatedAt: updated?.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
