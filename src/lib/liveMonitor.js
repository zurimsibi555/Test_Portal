/**
 * In-memory store for live student webcam frames, microphone levels, and audio snippets.
 * Optimized for Render Free Tier (512 MB RAM) with strict TTL & entry/payload caps.
 */
const globalForMonitor = globalThis;

if (!globalForMonitor.__liveProctorFeed) {
  globalForMonitor.__liveProctorFeed = new Map();
}

const feedMap = globalForMonitor.__liveProctorFeed;
const MAX_FEEDS = 40;
const MAX_FRAME_LEN = 80000;
const MAX_AUDIO_LEN = 120000;

export function updateLiveFeed(sessionId, payload) {
  if (!sessionId) return null;
  const existing = feedMap.get(sessionId) || {};

  const safeFrame =
    typeof payload.frameDataUrl === 'string' && payload.frameDataUrl.length <= MAX_FRAME_LEN
      ? payload.frameDataUrl
      : existing.frameDataUrl ?? null;

  const safeAudio =
    typeof payload.audioClipBase64 === 'string' && payload.audioClipBase64.length <= MAX_AUDIO_LEN
      ? payload.audioClipBase64
      : null; // Drop stale audio clips to keep RAM minimal

  const updated = {
    ...existing,
    sessionId,
    studentName: payload.studentName ?? existing.studentName ?? 'Student',
    rollNo: payload.rollNo ?? existing.rollNo ?? 'N/A',
    testId: payload.testId ?? existing.testId ?? '',
    mode: payload.mode ?? existing.mode ?? 'EXAM',
    frameDataUrl: safeFrame,
    audioLevel: payload.audioLevel ?? existing.audioLevel ?? 0,
    audioClipBase64: safeAudio,
    audioMimeType: payload.audioMimeType ?? existing.audioMimeType ?? 'audio/webm',
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

export function listActiveLiveFeeds(maxAgeMs = 45000) {
  const now = Date.now();
  const list = [];
  for (const [id, entry] of feedMap.entries()) {
    if (now - (entry.updatedAt || 0) <= maxAgeMs) {
      list.push(entry);
    } else {
      feedMap.delete(id);
    }
  }
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
