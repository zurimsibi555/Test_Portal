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
const RTC_SIGNAL_TTL_MS = 25000;
const MAX_RTC_VIEWERS = 3;
const MAX_ICE_CANDIDATES = 40;

function pruneRtcSignals(entry, now = Date.now()) {
  if (!entry?.rtcSignals || typeof entry.rtcSignals !== 'object') return {};
  const next = {};
  for (const [vid, sig] of Object.entries(entry.rtcSignals)) {
    if (sig && now - (sig.updatedAt || 0) <= RTC_SIGNAL_TTL_MS) {
      next[vid] = sig;
    }
  }
  return next;
}

export function updateLiveFeed(sessionId, payload) {
  if (!sessionId) return null;
  const existing = feedMap.get(sessionId) || {};

  const hasNewFrame =
    typeof payload.frameDataUrl === 'string' && payload.frameDataUrl.length <= MAX_FRAME_LEN;
  const safeFrame = hasNewFrame ? payload.frameDataUrl : existing.frameDataUrl ?? null;
  const frameSeq = hasNewFrame ? (existing.frameSeq || 0) + 1 : existing.frameSeq || 0;

  // Merge incoming sequential PCM audio chunks (voice has top priority)
  const incomingChunks = Array.isArray(payload.audioChunks) ? payload.audioChunks : [];
  const maxIncomingSeq = incomingChunks.reduce(
    (max, ch) => (ch && typeof ch.seq === 'number' && ch.seq > max ? ch.seq : max),
    0
  );
  const existingLatestSeq = existing.latestAudioSeq || 0;
  const shouldResetAudio =
    Boolean(payload.audioReset) ||
    (maxIncomingSeq > 0 && existingLatestSeq > 10 && maxIncomingSeq < existingLatestSeq - 10);

  const existingChunks =
    !shouldResetAudio && Array.isArray(existing.audioChunks) ? existing.audioChunks : [];
  let latestAudioSeq = shouldResetAudio ? 0 : existingLatestSeq;
  const chunkMap = new Map();
  for (const ch of existingChunks) {
    if (ch && typeof ch.seq === 'number') {
      chunkMap.set(ch.seq, ch);
    }
  }

  for (const ch of incomingChunks) {
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

  const mergedChunks = Array.from(chunkMap.values())
    .sort((a, b) => a.seq - b.seq)
    .slice(-MAX_AUDIO_CHUNKS);

  const existingRtc = pruneRtcSignals(existing);
  if (payload.rtcSignal && typeof payload.rtcSignal === 'object') {
    const answers = Array.isArray(payload.rtcSignal.answers) ? payload.rtcSignal.answers : [];
    for (const item of answers) {
      const sig = item?.viewerId ? existingRtc[item.viewerId] : null;
      if (sig && sig.offerId === item.offerId && item.answer) {
        sig.answer = item.answer;
        sig.updatedAt = Date.now();
      }
    }
    const candidates = Array.isArray(payload.rtcSignal.candidates)
      ? payload.rtcSignal.candidates
      : [];
    for (const item of candidates) {
      const sig = item?.viewerId ? existingRtc[item.viewerId] : null;
      if (
        sig &&
        sig.offerId === item.offerId &&
        item.candidate &&
        sig.studentCandidates.length < MAX_ICE_CANDIDATES
      ) {
        sig.studentCandidates.push(item.candidate);
        sig.updatedAt = Date.now();
      }
    }
  }

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
    rtcSignals: existingRtc,
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

export function getRtcRequestsForStudent(sessionId) {
  const entry = feedMap.get(sessionId);
  if (!entry) return [];
  const pruned = pruneRtcSignals(entry);
  entry.rtcSignals = pruned;
  return Object.values(pruned).map((sig) => ({
    viewerId: sig.viewerId,
    offerId: sig.offerId,
    offer: sig.offer,
    candidates: sig.adminCandidates || [],
  }));
}

export function upsertRtcOffer(sessionId, viewerId, offerId, offer) {
  const entry = feedMap.get(sessionId);
  if (!entry || !viewerId || !offerId || !offer) return false;
  const rtcSignals = pruneRtcSignals(entry);
  const keys = Object.keys(rtcSignals);
  if (!rtcSignals[viewerId] && keys.length >= MAX_RTC_VIEWERS) {
    keys.sort((a, b) => (rtcSignals[a].updatedAt || 0) - (rtcSignals[b].updatedAt || 0));
    delete rtcSignals[keys[0]];
  }
  rtcSignals[viewerId] = {
    viewerId,
    offerId,
    offer,
    answer: null,
    adminCandidates: [],
    studentCandidates: [],
    updatedAt: Date.now(),
  };
  entry.rtcSignals = rtcSignals;
  return true;
}

export function addRtcAdminCandidate(sessionId, viewerId, offerId, candidate) {
  const entry = feedMap.get(sessionId);
  const sig = entry?.rtcSignals?.[viewerId];
  if (!sig || sig.offerId !== offerId || !candidate) return false;
  if (sig.adminCandidates.length < MAX_ICE_CANDIDATES) {
    sig.adminCandidates.push(candidate);
  }
  sig.updatedAt = Date.now();
  return true;
}

export function closeRtcViewer(viewerId, sessionId = null) {
  if (!viewerId) return;
  if (sessionId) {
    const entry = feedMap.get(sessionId);
    if (entry?.rtcSignals?.[viewerId]) {
      delete entry.rtcSignals[viewerId];
    }
    return;
  }
  for (const entry of feedMap.values()) {
    if (entry?.rtcSignals?.[viewerId]) {
      delete entry.rtcSignals[viewerId];
    }
  }
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
  const {
    listeningSessionId = null,
    afterAudioSeq = 0,
    knownFrameSeqs = {},
    viewerId = null,
  } = options;
  const now = Date.now();
  const list = [];

  for (const [id, entry] of feedMap.entries()) {
    if (now - (entry.updatedAt || 0) <= maxAgeMs) {
      entry.rtcSignals = pruneRtcSignals(entry, now);
      let rtcSignal = null;
      if (viewerId && entry.rtcSignals[viewerId]) {
        const sig = entry.rtcSignals[viewerId];
        sig.updatedAt = now;
        rtcSignal = {
          offerId: sig.offerId,
          answer: sig.answer,
          candidates: sig.studentCandidates || [],
        };
      }

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
        rtcSignal,
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
