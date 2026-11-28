/**
 * Shared examination schedule helper.
 * Supports `alwaysOpen` tests (open immediately for testing/live access)
 * as well as scheduled start times with a configurable entry window.
 */
export const DEFAULT_EXAM_START_ISO = '2026-11-28T22:00:00+05:30';
export const DEFAULT_ENTRY_WINDOW_MINUTES = 30; // 10:00 PM to 10:30 PM IST

export function getExamScheduleStatus(test, nowMs = Date.now()) {
  const startIso = test?.scheduledStartTime || DEFAULT_EXAM_START_ISO;
  const windowMinutes = Number(test?.entryWindowMinutes ?? DEFAULT_ENTRY_WINDOW_MINUTES);
  const startMs = Date.parse(startIso);
  const endMs = startMs + windowMinutes * 60 * 1000;

  if (test?.alwaysOpen) {
    return {
      status: 'LIVE',
      alwaysOpen: true,
      startIso,
      startMs,
      endMs,
      windowMinutes,
      msUntilStart: 0,
      msUntilExpiry: Math.max(0, endMs - nowMs),
    };
  }

  let status = 'LIVE';
  if (nowMs < startMs) {
    status = 'UPCOMING';
  } else if (nowMs > endMs) {
    status = 'EXPIRED';
  }

  return {
    status, // 'UPCOMING' | 'LIVE' | 'EXPIRED'
    alwaysOpen: false,
    startIso,
    startMs,
    endMs,
    windowMinutes,
    msUntilStart: Math.max(0, startMs - nowMs),
    msUntilExpiry: Math.max(0, endMs - nowMs),
  };
}

export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

/**
 * Checks whether the current browser has already completed THIS scheduled exam window.
 * Automatically clears stale localStorage locks from earlier manual testing or cleared reports.
 */
export function hasCompletedCurrentExam(test, submissionCount, nowMs = Date.now()) {
  if (typeof window === 'undefined' || !test?.id || test.alwaysOpen) return false;
  const key = `exam_completed_${test.id}`;
  const raw = localStorage.getItem(key);
  if (!raw) return false;

  if (typeof submissionCount === 'number' && submissionCount === 0) {
    localStorage.removeItem(key);
    return false;
  }

  const schedule = getExamScheduleStatus(test, nowMs);
  if (schedule.status === 'UPCOMING') {
    localStorage.removeItem(key);
    return false;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.at === 'number' &&
      parsed.at >= schedule.startMs &&
      parsed.startIso === schedule.startIso
    ) {
      return true;
    }
  } catch {
    // Legacy plain-string lock from earlier testing: clear it
  }

  localStorage.removeItem(key);
  return false;
}

export function markExamCompleted(test, status) {
  if (typeof window === 'undefined' || !test?.id) return;
  localStorage.setItem(
    `exam_completed_${test.id}`,
    JSON.stringify({
      status,
      at: Date.now(),
      startIso: test.scheduledStartTime || DEFAULT_EXAM_START_ISO,
    })
  );
}
