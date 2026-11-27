/**
 * In-memory store for live student webcam frames, microphone levels, and ordered PCM audio chunks.
 * Optimized for low-latency voice streaming & smooth video on Render Free Tier (512 MB RAM).
 */
const globalForMonitor = globalThis;

if (!globalForMonitor.__liveProctorFeed) {
  globalForMonitor.__liveProctorFeed = new Map();
}

const feedMap = globalForMonitor.__liveProctorFeed;
const MAX_FEEDS = 40;
const MAX_FRAME_LEN = 95000;
const MAX_AUDIO_CHUNKS = 18;
const MAX_CHUNK_LEN = 65000;

export function updateLiveFeed(sessionId, payload) {
  if (!sessionId) return null;
  const existing = feedMap.get(sessionId) || {};

  const hasNewFrame =
    typeof payload.frameDataUrl === 'string' && payload.frameDataUrl.length <= MAX_FRAME_LEN;
  const safeFrame = hasNewFrame ? payload.frameDataUrl : existing.frameDataUrl ?? null;
  const frameSeq = hasNewFrame ? (existing.frameSeq || 0) + 1 : existing.frameSeq || 0;

  // Merge incoming sequential PCM audio chunks (voice has top priority)
  const existingChunks = Array.isArray(existing.audioChunks) ? existing.audioChunks : [];
  let latestAudioSeq = existing.latestAudioSeq || 0;
  const chunkMap = new Map();
  for (const ch of existingChunks) {
    if (ch && typeof ch.seq === 'number') {
      chunkMap.set(ch.seq, ch);
    }
  }

  if (Array.isArray(payload.audioChunks)) {
    for (const ch of payload.audioChunks) {
      if (
        ch &&
        typeof ch.seq === 'number' &&
        typeof ch.pcmBase64 === 'string' &&
        ch.pcmBase64.length > 0 &&
        ch.pcmBase64.length <= MAX_CHUNK_LEN
      ) {
        chunkMap.set(ch.seq, {
          seq: ch.seq,
          sampleRate: Number(ch.sampleRate) || 16000,
          pcmBase64: ch.pcmBase64,
          ts: Date.now(),
        });
        if (ch.seq > latestAudioSeq) {
          latestAudioSeq = ch.seq;
        }
      }
    }
  }

  const mergedChunks = Array.from(chunkMap.values())
    .sort((a, b) => a.seq - b.seq)
    .slice(-MAX_AUDIO_CHUNKS);

  const updated = {
    ...existing,
    sessionId,
    studentName: payload.studentName ?? existing.studentName ?? 'Student',
    rollNo: payload.rollNo ?? existing.rollNo ?? 'N/A',
    testId: payload.testId ?? existing.testId ?? '',
    mode: payload.mode ?? existing.mode ?? 'EXAM',
    frameDataUrl: safeFrame,
    frameSeq,
    audioLevel: payload.audioLevel ?? existing.audioLevel ?? 0,
    audioChunks: mergedChunks,
    latestAudioSeq,
    camGranted: payload.camGranted ?? existing.camGranted ?? false,
    micGranted: payload.micGranted ?? existing.micGranted ?? false,
    isPresent: payload.isPresent ?? existing.isPresent ?? true,
    webcamWarnings: payload.webcamWarnings ?? existing.webcamWarnings ?? 0,
    terminateRequested: existing.terminateRequested ?? false,
    terminateReason: existing.terminateReason ?? null,
    updatedAt: Date.now(),
  };

  if (!feedMap.has(sessionId) && feedMap.size >= MAX_FEEDS) {
    const oldestKey = feedMap.keys().next().value;
    if (oldestKey) feedMap.delete(oldestKey);
  }

  feedMap.set(sessionId, updated);
  return updated;
}

export function getLiveFeed(sessionId) {
  return feedMap.get(sessionId) || null;
}

export function requestSessionTermination(sessionId, reason) {
  const existing = feedMap.get(sessionId) || { sessionId };
  const updated = {
    ...existing,
    terminateRequested: true,
    terminateReason: reason || 'Terminated by administrator during live monitoring',
    updatedAt: Date.now(),
  };
  feedMap.set(sessionId, updated);
  return updated;
}

export function listActiveLiveFeeds(maxAgeMs = 45000, options = {}) {
  const { listeningSessionId = null, afterAudioSeq = 0, knownFrameSeqs = {} } = options;
  const now = Date.now();
  const list = [];

  for (const [id, entry] of feedMap.entries()) {
    if (now - (entry.updatedAt || 0) <= maxAgeMs) {
      const isListened = listeningSessionId && id === listeningSessionId;
      const pendingAudioChunks = isListened
        ? (entry.audioChunks || []).filter((ch) => ch.seq > afterAudioSeq)
        : [];
      const currentFrameSeq = entry.frameSeq || 0;
      const clientHasFrame =
        knownFrameSeqs && Number(knownFrameSeqs[id]) === currentFrameSeq && currentFrameSeq > 0;

      list.push({
        sessionId: entry.sessionId,
        studentName: entry.studentName,
        rollNo: entry.rollNo,
        testId: entry.testId,
        mode: entry.mode,
        frameDataUrl: clientHasFrame ? undefined : entry.frameDataUrl,
        frameSeq: currentFrameSeq,
        audioLevel: entry.audioLevel || 0,
        latestAudioSeq: entry.latestAudioSeq || 0,
        audioChunks: pendingAudioChunks,
        camGranted: entry.camGranted,
        micGranted: entry.micGranted,
        isPresent: entry.isPresent,
        webcamWarnings: entry.webcamWarnings,
        terminateRequested: entry.terminateRequested,
        terminateReason: entry.terminateReason,
        updatedAt: entry.updatedAt,
      });
    } else {
      feedMap.delete(id);
    }
  }

  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
