import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { updateLiveFeed, getLiveFeed } from '@/lib/liveMonitor';

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
      audioClipBase64,
      audioMimeType,
      camGranted,
      micGranted,
      isPresent,
      webcamWarnings,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'sessionId is required' }, { status: 400 });
    }

    const store = getStore();
    const session = store.sessions[sessionId];

    const updated = updateLiveFeed(sessionId, {
      studentName: session?.studentName || studentName || 'Preparation Mode',
      rollNo: session?.rollNo || rollNo || 'PREP',
      testId: session?.testId || testId || '',
      mode,
      frameDataUrl,
      audioLevel,
      audioClipBase64,
      audioMimeType,
      camGranted,
      micGranted,
      isPresent,
      webcamWarnings,
    });

    // Update lightweight status on session if it exists
    if (session && !session.isSubmitted) {
      session.camGranted = Boolean(camGranted);
      session.micGranted = Boolean(micGranted);
      session.lastMonitorAt = new Date().toISOString();
      saveStore(store);
    }

    const feed = getLiveFeed(sessionId);
    return NextResponse.json({
      success: true,
      terminate: Boolean(feed?.terminateRequested || session?.violated),
      terminateReason: feed?.terminateReason || session?.violationReason || null,
      updatedAt: updated?.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
