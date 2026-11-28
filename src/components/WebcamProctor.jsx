'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CameraOff,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Mic,
  MicOff,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { downsampleFloat32ToInt16, int16ToBase64 } from '@/lib/audioPcm';
import { RTC_CONFIG } from '@/lib/webrtcConfig';

const TARGET_SAMPLE_RATE = 16000;
const SAMPLES_PER_CHUNK = 4800; // 300ms of clear 16kHz wideband voice

export default function WebcamProctor({
  isActive,
  sessionId,
  mode = 'EXAM', // 'EXAM' | 'PREPARE'
  studentName = '',
  rollNo = '',
  testId = '',
  maxWarnings = 3,
  retryTrigger = 0,
  onViolation,
  onPermissionStatus,
}) {
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [camGranted, setCamGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [audioSuspended, setAudioSuspended] = useState(false);
  const [checkingPerms, setCheckingPerms] = useState(true);
  const [internalRetry, setInternalRetry] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [isPresent, setIsPresent] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [graceCountdown, setGraceCountdown] = useState(10);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const videoOnlyStreamRef = useRef(null);
  const presenceCanvasRef = useRef(null);
  const streamCanvasRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const alertAudioCtxRef = useRef(null);
  const captureCtxRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const lastAudioProcessAtRef = useRef(0);
  const autoSessionIdRef = useRef('');
  const rtcPeersRef = useRef(new Map());
  const rtcOutgoingRef = useRef({ answers: [], candidates: [] });
  const hasConnectedRtcRef = useRef(false);
  const hasVerifiedRtcAudioRef = useRef(false);
  const audioRequestedRef = useRef(false);
  const streamEpochRef = useRef(0);

  // Voice PCM streaming refs (Priority #1)
  const audioQueueRef = useRef([]);
  const audioSeqRef = useRef(0);
  const audioResetPendingRef = useRef(true);
  const pcmBufferRef = useRef([]);
  const pcmSampleCountRef = useRef(0);

  const consecutiveMissesRef = useRef(0);
  const isGraceActiveRef = useRef(false);
  const isPresentRef = useRef(true);
  const warningCountRef = useRef(0);
  const micLevelRef = useRef(0);
  const lastMicUiUpdateRef = useRef(0);
  const camGrantedRef = useRef(false);
  const micGrantedRef = useRef(false);
  const micMutedRef = useRef(false);
  const audioSuspendedRef = useRef(false);
  const onPermissionStatusRef = useRef(onPermissionStatus);

  useEffect(() => {
    onPermissionStatusRef.current = onPermissionStatus;
  }, [onPermissionStatus]);

  const isPrepareMode = mode === 'PREPARE';

  const notifyPerms = useCallback(
    (
      cam,
      mic,
      checking = false,
      error = '',
      audioSusp = audioSuspendedRef.current,
      muted = micMutedRef.current
    ) => {
      camGrantedRef.current = cam;
      micGrantedRef.current = mic;
      audioSuspendedRef.current = audioSusp;
      micMutedRef.current = muted;
      setCamGranted(cam);
      setMicGranted(mic);
      setAudioSuspended(audioSusp);
      setMicMuted(muted);
      setCheckingPerms(checking);
      setCameraError(error);
      if (onPermissionStatusRef.current) {
        onPermissionStatusRef.current({
          camGranted: cam,
          micGranted: mic,
          checking,
          error,
          audioSuspended: audioSusp,
          micMuted: muted,
        });
      }
    },
    []
  );

  // Play synthesized warning beep using Web Audio API (Exam mode only)
  const playAlertSound = useCallback(() => {
    try {
      if (!alertAudioCtxRef.current) {
        alertAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = alertAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio might be restricted by browser policy
    }
  }, []);

  // Trigger Warning Popup (Exam mode only)
  const triggerWebcamWarning = useCallback(
    (reason) => {
      if (isPrepareMode || isGraceActiveRef.current) return;
      isGraceActiveRef.current = true;

      setWarningCount((prev) => {
        const next = prev + 1;
        warningCountRef.current = next;
        if (sessionId) {
          fetch(`/api/session/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'webcam_warning', count: next, reason }),
          }).catch(() => {});
        }

        if (next > maxWarnings && onViolation) {
          onViolation(`Repeated webcam violations: Student not visible in camera (${next} times)`);
        }
        return next;
      });

      setShowWarningModal(true);
      setGraceCountdown(10);
      playAlertSound();

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setGraceCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            if (onViolation) {
              onViolation('Webcam violation: Student failed to return to camera view in time');
            }
            return 0;
          }
          playAlertSound();
          return prev - 1;
        });
      }, 1000);
    },
    [isPrepareMode, sessionId, maxWarnings, onViolation, playAlertSound]
  );

  const clearWebcamWarning = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowWarningModal(false);
    isGraceActiveRef.current = false;
    consecutiveMissesRef.current = 0;
  }, []);

  // Forcefully require BOTH Camera & Microphone + capture continuous 16kHz PCM voice
  useEffect(() => {
    if (!isActive) return;

    let localStream = null;
    let captureCtx = null;
    let processorNode = null;
    let silentGain = null;
    let sourceNode = null;
    let analyserNode = null;
    let cancelled = false;
    let camPermHandle = null;
    let micPermHandle = null;
    const rtcPeers = rtcPeersRef.current;

    if (!autoSessionIdRef.current) {
      const randPart =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10);
      autoSessionIdRef.current = `prep_${Date.now().toString(36)}_${randPart}`;
    }

    const syncAudioState = () => {
      if (cancelled || !captureCtx) return;
      const isSusp = captureCtx.state !== 'running';
      if (audioSuspendedRef.current !== isSusp) {
        notifyPerms(
          camGrantedRef.current,
          micGrantedRef.current,
          false,
          '',
          isSusp
        );
      }
    };

    const resumeAudioOnGesture = () => {
      if (captureCtx && captureCtx.state === 'suspended') {
        captureCtx.resume().then(syncAudioState).catch(() => {});
      }
    };

    const gestureEvents = ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'keydown', 'click'];
    gestureEvents.forEach((evt) =>
      window.addEventListener(evt, resumeAudioOnGesture, { capture: true, passive: true })
    );

    const handleTrackRevoked = (message) => {
      if (cancelled) return;
      if (localStream) {
        localStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
      }
      setStream(null);
      notifyPerms(false, false, false, message, false);
    };

    async function initMedia() {
      notifyPerms(false, false, true, '', false);
      streamEpochRef.current += 1;
      audioSeqRef.current = 0;
      audioResetPendingRef.current = true;
      audioQueueRef.current = [];
      pcmBufferRef.current = [];
      pcmSampleCountRef.current = 0;
      micLevelRef.current = 0;

      // Create AudioContext before awaiting getUserMedia to preserve any active user gesture
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        captureCtx = new AudioCtx({ latencyHint: 'interactive' });
        captureCtxRef.current = captureCtx;
        captureCtx.onstatechange = syncAudioState;
        if (captureCtx.state === 'suspended') {
          captureCtx.resume().then(syncAudioState).catch(() => {});
        }
      } catch {
        captureCtx = null;
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Browser does not support Camera/Microphone access.');
        }

        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480, max: 640 },
            height: { ideal: 360, max: 480 },
            frameRate: { ideal: 20, max: 24 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch (err) {
        if (cancelled) return;
        if (captureCtx && captureCtx.state !== 'closed') {
          captureCtx.close().catch(() => {});
        }
        captureCtxRef.current = null;
        const msg =
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'Camera & Microphone permissions are mandatory. Please allow both in your browser settings.'
            : 'Camera or Microphone not detected/accessible. Both devices are required.';
        notifyPerms(false, false, false, msg, false);
        return;
      }

      if (cancelled) {
        localStream.getTracks().forEach((t) => t.stop());
        if (captureCtx && captureCtx.state !== 'closed') {
          captureCtx.close().catch(() => {});
        }
        return;
      }

      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
      }
      const hasLiveCam = Boolean(videoTrack && videoTrack.readyState === 'live');
      const hasLiveMic = Boolean(audioTrack && audioTrack.readyState === 'live');

      // Enforce BOTH camera AND microphone strictly (no video-only fallback)
      if (!hasLiveCam || !hasLiveMic) {
        localStream.getTracks().forEach((t) => t.stop());
        if (captureCtx && captureCtx.state !== 'closed') {
          captureCtx.close().catch(() => {});
        }
        captureCtxRef.current = null;
        notifyPerms(
          hasLiveCam,
          hasLiveMic,
          false,
          'Both Camera and Microphone permissions are strictly required to continue.',
          false
        );
        return;
      }

      videoTrack.onended = () =>
        handleTrackRevoked('Camera access was stopped or disconnected. Re-enable Camera & Mic.');
      audioTrack.onended = () =>
        handleTrackRevoked('Microphone access was stopped or disconnected. Re-enable Camera & Mic.');

      const syncMuteState = () => {
        if (cancelled) return;
        const isMutedNow = Boolean(audioTrack.muted);
        if (micMutedRef.current !== isMutedNow) {
          notifyPerms(
            camGrantedRef.current,
            micGrantedRef.current,
            false,
            '',
            audioSuspendedRef.current,
            isMutedNow
          );
        }
      };
      audioTrack.onmute = syncMuteState;
      audioTrack.onunmute = syncMuteState;

      // Watch live browser permission revocations
      if (navigator.permissions?.query) {
        try {
          camPermHandle = await navigator.permissions.query({ name: 'camera' });
          camPermHandle.onchange = () => {
            if (camPermHandle.state !== 'granted') {
              handleTrackRevoked('Camera permission was revoked. Please allow Camera & Mic.');
            }
          };
        } catch {}
        try {
          micPermHandle = await navigator.permissions.query({ name: 'microphone' });
          micPermHandle.onchange = () => {
            if (micPermHandle.state !== 'granted') {
              handleTrackRevoked('Microphone permission was revoked. Please allow Camera & Mic.');
            }
          };
        } catch {}
      }

      const initialAudioSusp = Boolean(captureCtx && captureCtx.state !== 'running');
      const initialMicMuted = Boolean(audioTrack.muted);
      streamRef.current = localStream;
      setStream(localStream);
      notifyPerms(true, true, false, '', initialAudioSusp, initialMicMuted);

      if (videoRef.current) {
        const vOnly = new MediaStream([videoTrack]);
        videoOnlyStreamRef.current = vOnly;
        videoRef.current.srcObject = vOnly;
        videoRef.current.disablePictureInPicture = true;
        videoRef.current.disableRemotePlayback = true;
      }

      // Setup continuous, gap-free 16kHz PCM voice capture & RMS mic meter
      try {
        if (!captureCtx || captureCtx.state === 'closed') {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          captureCtx = new AudioCtx({ latencyHint: 'interactive' });
          captureCtxRef.current = captureCtx;
          captureCtx.onstatechange = syncAudioState;
        }

        sourceNode = captureCtx.createMediaStreamSource(localStream);
        analyserNode = captureCtx.createAnalyser();
        analyserNode.fftSize = 1024;
        analyserNodeRef.current = analyserNode;
        processorNode = captureCtx.createScriptProcessor(4096, 1, 1);
        silentGain = captureCtx.createGain();
        silentGain.gain.value = 0;

        processorNode.onaudioprocess = (ev) => {
          if (cancelled) return;
          lastAudioProcessAtRef.current = Date.now();
          if (audioSuspendedRef.current) {
            syncAudioState();
          }
          const inputData = ev.inputBuffer.getChannelData(0);

          // 1. Compute smooth speech-sensitive RMS mic level
          let sumSq = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSq += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSq / inputData.length);
          const level = rms < 0.0004 ? 0 : Math.min(100, Math.round(Math.pow(rms, 0.72) * 180));
          micLevelRef.current = level;
          const nowTs = Date.now();
          if (nowTs - lastMicUiUpdateRef.current >= 180) {
            lastMicUiUpdateRef.current = nowTs;
            setMicLevel(level);
          }

          // 2. Resample to 16kHz Int16 PCM and flush every 300ms
          const int16 = downsampleFloat32ToInt16(
            inputData,
            captureCtx.sampleRate,
            TARGET_SAMPLE_RATE
          );
          if (int16.length > 0) {
            pcmBufferRef.current.push(int16);
            pcmSampleCountRef.current += int16.length;

            if (pcmSampleCountRef.current >= SAMPLES_PER_CHUNK) {
              const combined = new Int16Array(pcmSampleCountRef.current);
              let offset = 0;
              for (const part of pcmBufferRef.current) {
                combined.set(part, offset);
                offset += part.length;
              }
              pcmBufferRef.current = [];
              pcmSampleCountRef.current = 0;

              const pcmBase64 = int16ToBase64(combined);
              audioSeqRef.current += 1;
              audioQueueRef.current.push({
                seq: audioSeqRef.current,
                sampleRate: TARGET_SAMPLE_RATE,
                pcmBase64,
              });
              if (audioQueueRef.current.length > 16) {
                audioQueueRef.current = audioQueueRef.current.slice(-16);
              }
            }
          }
        };

        sourceNode.connect(analyserNode);
        sourceNode.connect(processorNode);
        processorNode.connect(silentGain);
        silentGain.connect(captureCtx.destination);

        if (captureCtx.state === 'suspended') {
          await captureCtx.resume().catch(() => {});
        }
        syncAudioState();
      } catch {
        // Ignore AudioContext setup errors
      }
    }

    initMedia();

    return () => {
      cancelled = true;
      gestureEvents.forEach((evt) =>
        window.removeEventListener(evt, resumeAudioOnGesture, { capture: true })
      );
      if (camPermHandle) camPermHandle.onchange = null;
      if (micPermHandle) micPermHandle.onchange = null;
      if (processorNode) {
        processorNode.onaudioprocess = null;
        try {
          processorNode.disconnect();
        } catch {}
      }
      if (analyserNode) {
        try {
          analyserNode.disconnect();
        } catch {}
      }
      if (sourceNode) {
        try {
          sourceNode.disconnect();
        } catch {}
      }
      if (silentGain) {
        try {
          silentGain.disconnect();
        } catch {}
      }
      if (captureCtx) {
        captureCtx.onstatechange = null;
        if (captureCtx.state !== 'closed') {
          captureCtx.close().catch(() => {});
        }
      }
      captureCtxRef.current = null;
      analyserNodeRef.current = null;
      streamRef.current = null;
      hasConnectedRtcRef.current = false;
      hasVerifiedRtcAudioRef.current = false;
      for (const entry of rtcPeers.values()) {
        try {
          entry.pc.close();
        } catch {}
      }
      rtcPeers.clear();
      rtcOutgoingRef.current = { answers: [], candidates: [] };
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.onended = null;
          track.stop();
        });
      }
    };
  }, [isActive, retryTrigger, internalRetry, notifyPerms]);

  // Bind video-only stream & strictly block Picture-in-Picture (including Chrome Auto-PiP on tab switch)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!isActive) return;

    if (videoEl && stream) {
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        const vOnly = new MediaStream([vTrack]);
        videoOnlyStreamRef.current = vOnly;
        videoEl.srcObject = vOnly;
      } else {
        videoEl.srcObject = stream;
      }
      videoEl.disablePictureInPicture = true;
      videoEl.disableRemotePlayback = true;
      videoEl.play?.().catch(() => {});
      if (document.pictureInPictureElement === videoEl) {
        document.exitPictureInPicture().catch(() => {});
      }
    }

    const exitPipIfActive = () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };

    try {
      if ('mediaSession' in navigator && navigator.mediaSession?.setActionHandler) {
        navigator.mediaSession.setActionHandler('enterpictureinpicture', null);
      }
    } catch {}

    videoEl?.addEventListener('enterpictureinpicture', exitPipIfActive);
    document.addEventListener('visibilitychange', exitPipIfActive);

    return () => {
      videoEl?.removeEventListener('enterpictureinpicture', exitPipIfActive);
      document.removeEventListener('visibilitychange', exitPipIfActive);
    };
  }, [isActive, stream, camGranted]);

  // Lightweight Presence Check Loop (120x90 canvas so UI stays smooth)
  useEffect(() => {
    if (!isActive || !stream) return;

    checkIntervalRef.current = setInterval(() => {
      // Auto-recover AudioContext if transiently suspended
      if (captureCtxRef.current && captureCtxRef.current.state === 'suspended') {
        captureCtxRef.current.resume().catch(() => {});
      }

      // Verify live track health continuously & ensure audio track stays enabled
      const vTrack = stream.getVideoTracks()[0];
      const aTrack = stream.getAudioTracks()[0];
      if (!vTrack || vTrack.readyState !== 'live' || !aTrack || aTrack.readyState !== 'live') {
        notifyPerms(false, false, false, 'Camera or Microphone stopped. Both must remain active.');
        return;
      }
      if (!aTrack.enabled) {
        aTrack.enabled = true;
      }

      const mutedNow = Boolean(aTrack.muted);
      if (micMutedRef.current !== mutedNow) {
        notifyPerms(true, true, false, '', audioSuspendedRef.current, mutedNow);
      }

      // Fallback RMS meter using AnalyserNode if ScriptProcessor callback hasn't fired recently
      if (
        captureCtxRef.current?.state === 'running' &&
        analyserNodeRef.current &&
        Date.now() - lastAudioProcessAtRef.current > 700
      ) {
        try {
          const buf = new Float32Array(analyserNodeRef.current.fftSize);
          analyserNodeRef.current.getFloatTimeDomainData(buf);
          let sumSq = 0;
          for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
          const rms = Math.sqrt(sumSq / buf.length);
          const lvl = rms < 0.0004 ? 0 : Math.min(100, Math.round(Math.pow(rms, 0.72) * 180));
          micLevelRef.current = lvl;
          setMicLevel(lvl);
        } catch {}
      }

      const video = videoRef.current;
      const canvas = presenceCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = 120;
      canvas.height = 90;
      ctx.drawImage(video, 0, 0, 120, 90);

      const frameData = ctx.getImageData(0, 0, 120, 90);
      const data = frameData.data;

      let totalBrightness = 0;
      let totalVariation = 0;
      const sampleStep = 10;
      let sampleCount = 0;

      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalBrightness += brightness;
        sampleCount++;
      }

      const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;

      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalVariation += Math.abs(brightness - avgBrightness);
      }
      const variance = sampleCount > 0 ? totalVariation / sampleCount : 0;

      const isTooDark = avgBrightness < 12;
      const isTooBright = avgBrightness > 245;
      const hasPresence = !isTooDark && !isTooBright && variance > 8;

      isPresentRef.current = hasPresence;
      setIsPresent(hasPresence);

      if (!isPrepareMode && camGrantedRef.current && micGrantedRef.current) {
        if (!hasPresence) {
          consecutiveMissesRef.current += 1;
          if (consecutiveMissesRef.current >= 2) {
            triggerWebcamWarning(
              isTooDark
                ? 'Camera is blocked or dark'
                : 'Student face/presence not detected in camera frame'
            );
          }
        } else {
          if (consecutiveMissesRef.current > 0) {
            consecutiveMissesRef.current = 0;
          }
          if (showWarningModal) {
            clearWebcamWarning();
          }
        }
      }
    }, 1000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isActive, stream, isPrepareMode, showWarningModal, triggerWebcamWarning, clearWebcamWarning, notifyPerms]);

  // Non-overlapping streaming loop: WebRTC signaling + PCM/JPEG fallback
  useEffect(() => {
    const activeSessionId = sessionId || autoSessionIdRef.current;
    if (!isActive || !activeSessionId) return;

    let stopped = false;
    let timerId = null;
    let inFlight = false;
    let lastFrameSentAt = 0;
    let lastPingDurationMs = 0;

    const refreshConnectedRtcFlag = async () => {
      let anyConnected = false;
      let anyAudioBytesSent = false;
      for (const entry of rtcPeersRef.current.values()) {
        if (entry.pc?.connectionState === 'connected') {
          anyConnected = true;
          try {
            const stats = await entry.pc.getStats();
            stats.forEach((report) => {
              if (
                report.type === 'outbound-rtp' &&
                (report.kind === 'audio' || report.mediaType === 'audio') &&
                Number(report.bytesSent || 0) > 0
              ) {
                anyAudioBytesSent = true;
              }
            });
          } catch {}
        }
      }
      hasConnectedRtcRef.current = anyConnected;
      hasVerifiedRtcAudioRef.current = anyConnected && anyAudioBytesSent;
    };

    const scheduleFastPing = () => {
      if (stopped || inFlight) return;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      timerId = setTimeout(sendPing, 30);
    };

    const handleRtcRequests = async (rtcRequests) => {
      if (!Array.isArray(rtcRequests)) return;
      const activeStream = streamRef.current;
      const seenViewers = new Set(rtcRequests.map((r) => r.viewerId));

      // Close peers whose admin viewer disconnected
      for (const [vid, entry] of rtcPeersRef.current.entries()) {
        if (!seenViewers.has(vid)) {
          try {
            entry.pc.close();
          } catch {}
          rtcPeersRef.current.delete(vid);
        }
      }

      if (!activeStream || typeof RTCPeerConnection === 'undefined') {
        refreshConnectedRtcFlag();
        return;
      }

      for (const req of rtcRequests) {
        if (!req?.viewerId || !req?.offerId || !req?.offer) continue;
        let entry = rtcPeersRef.current.get(req.viewerId);

        if (!entry || entry.offerId !== req.offerId) {
          if (entry) {
            try {
              entry.pc.close();
            } catch {}
          }
          const pc = new RTCPeerConnection(RTC_CONFIG);
          entry = {
            pc,
            offerId: req.offerId,
            remoteSet: false,
            appliedCandidateCount: 0,
            queuedCandidates: [],
          };
          rtcPeersRef.current.set(req.viewerId, entry);

          for (const track of activeStream.getTracks()) {
            const sender = pc.addTrack(track, activeStream);
            if (track.kind === 'video' && sender?.getParameters && sender?.setParameters) {
              try {
                const params = sender.getParameters();
                if (!params.encodings || params.encodings.length === 0) {
                  params.encodings = [{}];
                }
                params.encodings[0].maxBitrate = 380000;
                params.encodings[0].maxFramerate = 20;
                try {
                  await sender.setParameters({
                    ...params,
                    degradationPreference: 'maintain-framerate',
                  });
                } catch {
                  sender.setParameters(params).catch(() => {});
                }
              } catch {}
            }
          }

          pc.onicecandidate = (ev) => {
            if (ev.candidate && !stopped) {
              rtcOutgoingRef.current.candidates.push({
                viewerId: req.viewerId,
                offerId: req.offerId,
                candidate: ev.candidate.toJSON(),
              });
              scheduleFastPing();
            }
          };

          pc.onconnectionstatechange = () => {
            refreshConnectedRtcFlag();
          };

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(req.offer));
            entry.remoteSet = true;
            for (const c of entry.queuedCandidates) {
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }
            entry.queuedCandidates = [];
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            rtcOutgoingRef.current.answers.push({
              viewerId: req.viewerId,
              offerId: req.offerId,
              answer: pc.localDescription.toJSON(),
            });
            scheduleFastPing();
          } catch {
            try {
              pc.close();
            } catch {}
            rtcPeersRef.current.delete(req.viewerId);
          }
        }

        const incomingCandidates = Array.isArray(req.candidates) ? req.candidates : [];
        if (entry && incomingCandidates.length > entry.appliedCandidateCount) {
          const fresh = incomingCandidates.slice(entry.appliedCandidateCount);
          entry.appliedCandidateCount = incomingCandidates.length;
          for (const cand of fresh) {
            if (entry.remoteSet) {
              entry.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            } else {
              entry.queuedCandidates.push(cand);
            }
          }
        }
      }

      refreshConnectedRtcFlag();
    };

    const sendPing = async () => {
      if (stopped || inFlight) return;
      inFlight = true;

      const now = Date.now();
      await refreshConnectedRtcFlag();
      const rtcConnected = hasConnectedRtcRef.current;
      const rtcAudioVerified = hasVerifiedRtcAudioRef.current;

      // Only skip HTTP PCM chunks once WebRTC outbound audio RTP packets are verified flowing.
      // When Admin is not actively listening in fallback mode, retain a rolling ~1s ring buffer locally to save mobile bandwidth.
      if (rtcAudioVerified) {
        if (audioQueueRef.current.length > 0) {
          audioQueueRef.current = [];
        }
      } else if (!audioRequestedRef.current && audioQueueRef.current.length > 3) {
        audioQueueRef.current = audioQueueRef.current.slice(-3);
      }
      const audioChunks =
        !rtcAudioVerified && audioRequestedRef.current ? audioQueueRef.current.slice(0, 6) : [];
      const shouldResetAudio = audioResetPendingRef.current;

      const outAnswers = rtcOutgoingRef.current.answers.slice(0, 4);
      const outCandidates = rtcOutgoingRef.current.candidates.slice(0, 20);
      const rtcSignal =
        outAnswers.length > 0 || outCandidates.length > 0
          ? { answers: outAnswers, candidates: outCandidates }
          : null;

      // In fallback mode, send lightweight 280x210 JPEG snapshots smoothly (~3 fps); when WebRTC is live, keep 4s backup thumbnail
      let frameDataUrl = null;
      const fallbackFrameMs = lastPingDurationMs > 900 ? 750 : 340;
      const frameIntervalMs = rtcConnected ? 4000 : fallbackFrameMs;
      const shouldSendFrame =
        camGrantedRef.current &&
        now - lastFrameSentAt >= frameIntervalMs;

      if (shouldSendFrame) {
        const canvas = streamCanvasRef.current;
        const video = videoRef.current;
        if (canvas && video && video.readyState >= 2) {
          try {
            const ctx = canvas.getContext('2d');
            canvas.width = 280;
            canvas.height = 210;
            ctx.drawImage(video, 0, 0, 280, 210);
            frameDataUrl = canvas.toDataURL('image/jpeg', 0.46);
            lastFrameSentAt = now;
          } catch {
            // ignore
          }
        }
      }

      const startedAt = Date.now();
      const abortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutHandle = abortCtrl ? setTimeout(() => abortCtrl.abort(), 5000) : null;
      try {
        const res = await fetch('/api/proctor/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortCtrl?.signal,
          body: JSON.stringify({
            sessionId: activeSessionId,
            studentName,
            rollNo,
            testId,
            mode,
            frameDataUrl,
            audioLevel: micLevelRef.current,
            audioChunks,
            audioReset: shouldResetAudio,
            streamEpoch: streamEpochRef.current,
            rtcSignal,
            camGranted: camGrantedRef.current,
            micGranted: micGrantedRef.current,
            micMuted: micMutedRef.current,
            audioSuspended: audioSuspendedRef.current,
            isPresent: isPresentRef.current,
            webcamWarnings: warningCountRef.current,
          }),
        });
        lastPingDurationMs = Date.now() - startedAt;
        if (res.ok) {
          if (shouldResetAudio) {
            audioResetPendingRef.current = false;
          }
          if (audioChunks.length > 0) {
            const maxAckSeq = audioChunks[audioChunks.length - 1].seq;
            audioQueueRef.current = audioQueueRef.current.filter((c) => c.seq > maxAckSeq);
          }
          if (outAnswers.length > 0) {
            rtcOutgoingRef.current.answers.splice(0, outAnswers.length);
          }
          if (outCandidates.length > 0) {
            rtcOutgoingRef.current.candidates.splice(0, outCandidates.length);
          }
        }
        const data = await res.json();
        audioRequestedRef.current = Boolean(data.audioRequested);
        if (data.terminate && !isPrepareMode && onViolation) {
          onViolation(data.terminateReason || 'Exam terminated by Administrator');
        }
        if (Array.isArray(data.rtcRequests)) {
          await handleRtcRequests(data.rtcRequests);
        }
      } catch {
        lastPingDurationMs = Date.now() - startedAt;
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        inFlight = false;
        if (!stopped) {
          const hasPendingRtc =
            rtcOutgoingRef.current.answers.length > 0 ||
            rtcOutgoingRef.current.candidates.length > 0;
          const nextDelay = hasPendingRtc
            ? 60
            : audioRequestedRef.current && audioQueueRef.current.length > 0
            ? 140
            : rtcConnected
            ? 650
            : 300;
          timerId = setTimeout(sendPing, nextDelay);
        }
      }
    };

    sendPing();
    return () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [isActive, sessionId, studentName, rollNo, testId, mode, isPrepareMode, onViolation]);

  if (!isActive) return null;

  // PREPARE MODE: Keep camera & mic hidden from student UI (PreparePage handles mandatory permission gate overlay)
  if (isPrepareMode) {
    return (
      <div className="hidden" aria-hidden="true">
        <canvas ref={presenceCanvasRef} className="hidden" />
        <canvas ref={streamCanvasRef} className="hidden" />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          disablePictureInPicture
          disableRemotePlayback
          className="hidden"
        />
      </div>
    );
  }

  const permissionsMissing = !checkingPerms && (!camGranted || !micGranted);

  // EXAM MODE: Visible Webcam + Mic Monitor Badge + Forceful Permission Block
  return (
    <>
      <canvas ref={presenceCanvasRef} className="hidden" />
      <canvas ref={streamCanvasRef} className="hidden" />

      <div className="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur border border-stone-200 rounded-2xl p-2.5 shadow-lg flex flex-col gap-2 w-48">
        <div className="flex items-center justify-between px-0.5 text-[10px] font-semibold text-stone-700">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                camGranted && micGranted && isPresent
                  ? 'bg-emerald-600 animate-pulse'
                  : 'bg-rose-500 animate-ping'
              }`}
            ></span>
            <span>Cam & Mic Proctor</span>
          </div>
          {warningCount > 0 && (
            <span className="text-rose-600 font-mono font-bold">
              {warningCount}/{maxWarnings}
            </span>
          )}
        </div>

        <div className="relative rounded-xl overflow-hidden bg-[#FAF8F5] aspect-[4/3] flex items-center justify-center border border-stone-200">
          {cameraError || !camGranted ? (
            <div className="p-2 text-center text-rose-600 space-y-1">
              <CameraOff className="w-5 h-5 mx-auto" />
              <p className="text-[9px] leading-tight">Permission Required</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              disablePictureInPicture
              disableRemotePlayback
              className="w-full h-full object-cover mirror scale-x-[-1]"
            />
          )}

          {/* Overlay Status Badge */}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur text-[9px] text-stone-800 border border-stone-200 font-medium flex items-center gap-1 shadow-xs">
            {isPresent && camGranted ? (
              <>
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                <span>Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                <span className="text-rose-600">Not Visible</span>
              </>
            )}
          </div>
        </div>

        {/* Live Microphone Level Bar */}
        <div className="flex items-center gap-2 px-1 py-1 rounded-lg bg-[#FAF8F5] border border-stone-200">
          {micGranted ? (
            <Mic className="w-3 h-3 text-emerald-700 shrink-0" />
          ) : (
            <MicOff className="w-3 h-3 text-rose-600 shrink-0" />
          )}
          <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                micLevel > 65 ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${micGranted ? Math.max(6, micLevel) : 0}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-stone-600 w-7 text-right">
            {micGranted ? `${micLevel}%` : 'Off'}
          </span>
        </div>

        {micGranted && micMuted && (
          <div className="w-full py-1 px-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-[10px] font-bold text-center">
            Mic Muted on Device — Unmute Now
          </div>
        )}

        {micGranted && audioSuspended && (
          <button
            type="button"
            onClick={() => captureCtxRef.current?.resume?.().catch(() => {})}
            className="w-full py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold transition"
          >
            Tap to Activate Mic Audio
          </button>
        )}
      </div>

      {/* FORCEFUL EXAM PERMISSION LOCK OVERLAY (Non-dismissible until BOTH Camera & Mic granted) */}
      {permissionsMissing && (
        <div className="fixed inset-0 z-[70] bg-stone-900/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-rose-500 rounded-3xl p-7 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider">
                Mandatory Permissions Required
              </span>
              <h3 className="text-xl font-black text-stone-900">
                Camera &amp; Microphone Access Blocked
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {cameraError ||
                  'Exam mode cannot continue without active Camera and Microphone permissions. Please allow both in your browser.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold ${
                  camGranted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{camGranted ? 'Camera Active' : 'Camera Denied'}</span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold ${
                  micGranted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{micGranted ? 'Mic Active' : 'Mic Denied'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-stone-200 text-[11px] text-stone-600 text-left space-y-1">
              <div className="font-bold text-stone-800">How to enable:</div>
              <p>
                1. Click the <strong>Camera / Lock icon</strong> in your browser address bar.
                <br />
                2. Set both <strong>Camera</strong> and <strong>Microphone</strong> to <strong>Allow</strong>.
                <br />
                3. Click the button below to resume your exam.
              </p>
            </div>

            <button
              type="button"
              disabled={checkingPerms}
              onClick={() => setInternalRetry((n) => n + 1)}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${checkingPerms ? 'animate-spin' : ''}`} />
              <span>{checkingPerms ? 'Verifying Permissions...' : 'Allow & Re-Verify Camera & Mic'}</span>
            </button>
          </div>
        </div>
      )}

      {/* WARNING POPUP MODAL (When student is not captured into webcam) */}
      {!permissionsMissing && showWarningModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-md w-full bg-white border-2 border-rose-500 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto animate-bounce">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                Proctoring Warning #{warningCount} of {maxWarnings}
              </div>

              <h3 className="text-xl font-bold text-stone-900">
                Student Not Detected in Webcam!
              </h3>

              <p className="text-xs text-stone-600 leading-relaxed">
                You have moved away from the webcam or your face is not clearly visible in the camera frame.
                Anti-cheat regulations require you to remain in full view of the camera at all times.
              </p>
            </div>

            <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[11px] text-stone-600 uppercase font-semibold block">
                  Auto-Disqualification in:
                </span>
                <span className="text-2xl font-black text-rose-600 font-mono">
                  00:{graceCountdown.toString().padStart(2, '0')}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-stone-600 uppercase font-semibold block">
                  Remaining Warnings:
                </span>
                <span className="text-sm font-bold text-amber-700 font-mono">
                  {Math.max(0, maxWarnings - warningCount)} Left
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  clearWebcamWarning();
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>I Am Back in Front of Camera</span>
              </button>
              <p className="text-[10px] text-stone-400 mt-2">
                The modal will automatically dismiss once the proctor verifies your presence.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
