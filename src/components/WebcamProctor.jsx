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
  const [checkingPerms, setCheckingPerms] = useState(true);
  const [internalRetry, setInternalRetry] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [isPresent, setIsPresent] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [graceCountdown, setGraceCountdown] = useState(10);

  const videoRef = useRef(null);
  const presenceCanvasRef = useRef(null);
  const streamCanvasRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const alertAudioCtxRef = useRef(null);

  // Voice PCM streaming refs (Priority #1)
  const audioQueueRef = useRef([]);
  const audioSeqRef = useRef(0);
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
  const onPermissionStatusRef = useRef(onPermissionStatus);

  useEffect(() => {
    onPermissionStatusRef.current = onPermissionStatus;
  }, [onPermissionStatus]);

  const isPrepareMode = mode === 'PREPARE';

  const notifyPerms = useCallback((cam, mic, checking = false, error = '') => {
    camGrantedRef.current = cam;
    micGrantedRef.current = mic;
    setCamGranted(cam);
    setMicGranted(mic);
    setCheckingPerms(checking);
    setCameraError(error);
    if (onPermissionStatusRef.current) {
      onPermissionStatusRef.current({
        camGranted: cam,
        micGranted: mic,
        checking,
        error,
      });
    }
  }, []);

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
    let cancelled = false;
    let camPermHandle = null;
    let micPermHandle = null;

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
      notifyPerms(false, false, false, message);
    };

    async function initMedia() {
      notifyPerms(false, false, true, '');

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Browser does not support Camera/Microphone access.');
        }

        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320, max: 480 },
            height: { ideal: 240, max: 360 },
            frameRate: { ideal: 15, max: 20 },
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
        const msg =
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'Camera & Microphone permissions are mandatory. Please allow both in your browser settings.'
            : 'Camera or Microphone not detected/accessible. Both devices are required.';
        notifyPerms(false, false, false, msg);
        return;
      }

      if (cancelled) {
        localStream.getTracks().forEach((t) => t.stop());
        return;
      }

      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      const hasLiveCam = Boolean(videoTrack && videoTrack.readyState === 'live');
      const hasLiveMic = Boolean(audioTrack && audioTrack.readyState === 'live');

      // Enforce BOTH camera AND microphone strictly (no video-only fallback)
      if (!hasLiveCam || !hasLiveMic) {
        localStream.getTracks().forEach((t) => t.stop());
        notifyPerms(
          hasLiveCam,
          hasLiveMic,
          false,
          'Both Camera and Microphone permissions are strictly required to continue.'
        );
        return;
      }

      videoTrack.onended = () =>
        handleTrackRevoked('Camera access was stopped or disconnected. Re-enable Camera & Mic.');
      audioTrack.onended = () =>
        handleTrackRevoked('Microphone access was stopped or disconnected. Re-enable Camera & Mic.');

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

      setStream(localStream);
      notifyPerms(true, true, false, '');

      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
      }

      // Setup continuous, gap-free 16kHz PCM voice capture & RMS mic meter
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        captureCtx = new AudioCtx();
        const audioOnlyStream = new MediaStream([audioTrack]);
        sourceNode = captureCtx.createMediaStreamSource(audioOnlyStream);
        processorNode = captureCtx.createScriptProcessor(4096, 1, 1);
        silentGain = captureCtx.createGain();
        silentGain.gain.value = 0;

        pcmBufferRef.current = [];
        pcmSampleCountRef.current = 0;

        processorNode.onaudioprocess = (ev) => {
          if (cancelled) return;
          const inputData = ev.inputBuffer.getChannelData(0);

          // 1. Compute smooth RMS mic level
          let sumSq = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSq += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSq / inputData.length);
          const level = Math.min(100, Math.round(rms * 420));
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

        sourceNode.connect(processorNode);
        processorNode.connect(silentGain);
        silentGain.connect(captureCtx.destination);

        if (captureCtx.state === 'suspended') {
          captureCtx.resume().catch(() => {});
        }
      } catch {
        // Ignore AudioContext setup errors
      }
    }

    const resumeAudioOnGesture = () => {
      if (captureCtx && captureCtx.state === 'suspended') {
        captureCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', resumeAudioOnGesture, { passive: true });
    window.addEventListener('keydown', resumeAudioOnGesture, { passive: true });

    initMedia();

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', resumeAudioOnGesture);
      window.removeEventListener('keydown', resumeAudioOnGesture);
      if (camPermHandle) camPermHandle.onchange = null;
      if (micPermHandle) micPermHandle.onchange = null;
      if (processorNode) {
        processorNode.onaudioprocess = null;
        try {
          processorNode.disconnect();
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
      if (captureCtx && captureCtx.state !== 'closed') {
        captureCtx.close().catch(() => {});
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.onended = null;
          track.stop();
        });
      }
    };
  }, [isActive, retryTrigger, internalRetry, notifyPerms]);

  // Bind video element when stream or permission state changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
  }, [stream, camGranted]);

  // Lightweight Presence Check Loop (120x90 canvas so UI stays smooth)
  useEffect(() => {
    if (!isActive || !stream) return;

    checkIntervalRef.current = setInterval(() => {
      // Verify live track health continuously
      const vTrack = stream.getVideoTracks()[0];
      const aTrack = stream.getAudioTracks()[0];
      if (!vTrack || vTrack.readyState !== 'live' || !aTrack || aTrack.readyState !== 'live') {
        notifyPerms(false, false, false, 'Camera or Microphone stopped. Both must remain active.');
        return;
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

  // Non-overlapping streaming loop: Voice PCM chunks get top priority; adaptive video snapshots follow
  useEffect(() => {
    if (!isActive || !sessionId) return;

    let stopped = false;
    let timerId = null;
    let lastFrameSentAt = 0;
    let lastPingDurationMs = 0;

    const sendPing = async () => {
      if (stopped) return;

      const now = Date.now();
      // Peek audio chunks and remove only after server acknowledges so voice never drops on transient errors
      const audioChunks = audioQueueRef.current.slice(0, 6);

      // Voice priority: skip video frame if audio backlog exists, previous request was slow (>900ms), or <1200ms elapsed
      let frameDataUrl = null;
      const shouldSendFrame =
        camGrantedRef.current &&
        audioQueueRef.current.length <= 1 &&
        now - lastFrameSentAt >= 1200 &&
        lastPingDurationMs < 900;

      if (shouldSendFrame) {
        const canvas = streamCanvasRef.current;
        const video = videoRef.current;
        if (canvas && video && video.readyState >= 2) {
          try {
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 150;
            ctx.drawImage(video, 0, 0, 200, 150);
            frameDataUrl = canvas.toDataURL('image/jpeg', 0.42);
            lastFrameSentAt = now;
          } catch {
            // ignore
          }
        }
      }

      const startedAt = Date.now();
      try {
        const res = await fetch('/api/proctor/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            studentName,
            rollNo,
            testId,
            mode,
            frameDataUrl,
            audioLevel: micLevelRef.current,
            audioChunks,
            camGranted: camGrantedRef.current,
            micGranted: micGrantedRef.current,
            isPresent: isPresentRef.current,
            webcamWarnings: warningCountRef.current,
          }),
        });
        lastPingDurationMs = Date.now() - startedAt;
        if (res.ok && audioChunks.length > 0) {
          audioQueueRef.current.splice(0, audioChunks.length);
        }
        const data = await res.json();
        if (data.terminate && !isPrepareMode && onViolation) {
          onViolation(data.terminateReason || 'Exam terminated by Administrator');
        }
      } catch {
        lastPingDurationMs = Date.now() - startedAt;
      } finally {
        if (!stopped) {
          const nextDelay = audioQueueRef.current.length > 0 ? 120 : 320;
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
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      </div>
    );
  }

  const permissionsMissing = !checkingPerms && (!camGranted || !micGranted);

  // EXAM MODE: Visible Webcam + Mic Monitor PiP Badge + Forceful Permission Block
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
