'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CameraOff,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Mic,
  MicOff,
} from 'lucide-react';

export default function WebcamProctor({
  isActive,
  sessionId,
  mode = 'EXAM', // 'EXAM' | 'PREPARE'
  studentName = '',
  rollNo = '',
  testId = '',
  maxWarnings = 3,
  onViolation,
  onPermissionStatus,
}) {
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [camGranted, setCamGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isPresent, setIsPresent] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [graceCountdown, setGraceCountdown] = useState(10);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micDataRef = useRef(null);
  const latestAudioClipRef = useRef(null);
  const latestAudioMimeRef = useRef('audio/webm');
  const consecutiveMissesRef = useRef(0);
  const isGraceActiveRef = useRef(false);
  const isPresentRef = useRef(true);
  const warningCountRef = useRef(0);
  const micLevelRef = useRef(0);

  const isPrepareMode = mode === 'PREPARE';

  // Play synthesized warning beep using Web Audio API (Exam mode only)
  const playAlertSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
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

  // Clear Warning Popup when presence is restored
  const clearWebcamWarning = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowWarningModal(false);
    isGraceActiveRef.current = false;
    consecutiveMissesRef.current = 0;
  }, []);

  // Initialize Camera + Microphone Stream
  useEffect(() => {
    if (!isActive) return;

    let localStream = null;
    let micAnalyserCtx = null;
    let recorderLoopTimer = null;
    let activeRecorder = null;
    let cancelled = false;

    async function initMedia() {
      let hasCam = false;
      let hasMic = false;

      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
          },
          audio: true,
        });
        hasCam = localStream.getVideoTracks().length > 0;
        hasMic = localStream.getAudioTracks().length > 0;
      } catch {
        // Fallback: try video-only if microphone is unavailable/denied
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: 'user',
            },
            audio: false,
          });
          hasCam = localStream.getVideoTracks().length > 0;
        } catch {
          setCameraError('Camera & Microphone access denied or device not detected.');
          setCamGranted(false);
          setMicGranted(false);
          if (onPermissionStatus) {
            onPermissionStatus({
              camGranted: false,
              micGranted: false,
              error: 'Camera and microphone permission denied.',
            });
          }
          if (!isPrepareMode) {
            triggerWebcamWarning('Camera/Microphone permission not granted');
          }
          return;
        }
      }

      if (cancelled) {
        localStream?.getTracks().forEach((t) => t.stop());
        return;
      }

      setStream(localStream);
      setCamGranted(hasCam);
      setMicGranted(hasMic);
      setCameraError('');
      if (onPermissionStatus) {
        onPermissionStatus({ camGranted: hasCam, micGranted: hasMic, error: '' });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
      }

      // Setup live mic analyser & 2.5s clip recorder for admin audio monitoring
      if (hasMic) {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          micAnalyserCtx = new AudioCtx();
          const source = micAnalyserCtx.createMediaStreamSource(localStream);
          const analyser = micAnalyserCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          micAnalyserRef.current = analyser;
          micDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        } catch {
          // ignore audio context errors
        }

        try {
          const audioOnlyStream = new MediaStream(localStream.getAudioTracks());
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';
          latestAudioMimeRef.current = mimeType || 'audio/webm';

          const recordSlice = () => {
            if (cancelled) return;
            try {
              const rec = mimeType
                ? new MediaRecorder(audioOnlyStream, { mimeType })
                : new MediaRecorder(audioOnlyStream);
              activeRecorder = rec;
              const chunks = [];
              rec.ondataavailable = (ev) => {
                if (ev.data && ev.data.size > 0) chunks.push(ev.data);
              };
              rec.onstop = () => {
                if (chunks.length === 0 || cancelled) return;
                const blob = new Blob(chunks, { type: latestAudioMimeRef.current });
                const reader = new FileReader();
                reader.onloadend = () => {
                  const res = reader.result;
                  if (typeof res === 'string') {
                    latestAudioClipRef.current = res;
                  }
                };
                reader.readAsDataURL(blob);
              };
              rec.start();
              recorderLoopTimer = setTimeout(() => {
                if (rec.state === 'recording') {
                  rec.stop();
                }
                if (!cancelled) {
                  recordSlice();
                }
              }, 2500);
            } catch {
              // ignore MediaRecorder errors
            }
          };

          if (typeof MediaRecorder !== 'undefined') {
            recordSlice();
          }
        } catch {
          // ignore
        }
      }
    }

    initMedia();

    return () => {
      cancelled = true;
      if (recorderLoopTimer) clearTimeout(recorderLoopTimer);
      if (activeRecorder && activeRecorder.state === 'recording') {
        try {
          activeRecorder.stop();
        } catch {}
      }
      if (micAnalyserCtx && micAnalyserCtx.state !== 'closed') {
        micAnalyserCtx.close().catch(() => {});
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive, isPrepareMode]);

  // Bind video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Frame & Audio Level Analysis Loop
  useEffect(() => {
    if (!isActive || !stream) return;

    checkIntervalRef.current = setInterval(() => {
      // 1. Sample mic level
      if (micAnalyserRef.current && micDataRef.current) {
        micAnalyserRef.current.getByteFrequencyData(micDataRef.current);
        let sum = 0;
        for (let i = 0; i < micDataRef.current.length; i++) {
          sum += micDataRef.current[i];
        }
        const avg = sum / micDataRef.current.length;
        const normalized = Math.min(100, Math.round((avg / 90) * 100));
        micLevelRef.current = normalized;
        setMicLevel(normalized);
      }

      // 2. Analyze video frame presence
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      canvas.width = 240;
      canvas.height = 180;
      ctx.drawImage(video, 0, 0, 240, 180);

      const frameData = ctx.getImageData(0, 0, 240, 180);
      const data = frameData.data;

      let totalBrightness = 0;
      let totalVariation = 0;
      const sampleStep = 12;
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

      if (!isPrepareMode) {
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
  }, [isActive, stream, isPrepareMode, showWarningModal, triggerWebcamWarning, clearWebcamWarning]);

  // Stream live snapshots & mic audio to Admin Monitor every 2.5 seconds
  useEffect(() => {
    if (!isActive || !sessionId) return;

    const sendPing = async () => {
      let frameDataUrl = null;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video && video.readyState >= 2) {
        try {
          const ctx = canvas.getContext('2d');
          canvas.width = 160;
          canvas.height = 120;
          ctx.drawImage(video, 0, 0, 160, 120);
          frameDataUrl = canvas.toDataURL('image/jpeg', 0.35);
        } catch {
          // ignore
        }
      }

      const audioClip = latestAudioClipRef.current;
      latestAudioClipRef.current = null;

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
            audioClipBase64: audioClip,
            audioMimeType: latestAudioMimeRef.current,
            camGranted,
            micGranted,
            isPresent: isPresentRef.current,
            webcamWarnings: warningCountRef.current,
          }),
        });
        const data = await res.json();
        if (data.terminate && !isPrepareMode && onViolation) {
          onViolation(data.terminateReason || 'Exam terminated by Administrator');
        }
      } catch {
        // ignore network hiccups
      }
    };

    sendPing();
    pingIntervalRef.current = setInterval(sendPing, 4000);
    return () => clearInterval(pingIntervalRef.current);
  }, [isActive, sessionId, studentName, rollNo, testId, mode, camGranted, micGranted, isPrepareMode, onViolation]);

  if (!isActive) return null;

  // PREPARE MODE: Keep camera & mic completely hidden from student UI while permissions & admin monitoring remain active
  if (isPrepareMode) {
    return (
      <div className="hidden" aria-hidden="true">
        <canvas ref={canvasRef} className="hidden" />
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      </div>
    );
  }

  // EXAM MODE: Visible Webcam + Mic Monitor PiP Badge (Milky White + Emerald Theme)
  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <div className="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur border border-stone-200 rounded-2xl p-2.5 shadow-lg flex flex-col gap-2 w-48">
        <div className="flex items-center justify-between px-0.5 text-[10px] font-semibold text-stone-700">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isPresent ? 'bg-emerald-600 animate-pulse' : 'bg-rose-500 animate-ping'
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
          {cameraError ? (
            <div className="p-2 text-center text-rose-600 space-y-1">
              <CameraOff className="w-5 h-5 mx-auto" />
              <p className="text-[9px] leading-tight">No Camera</p>
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
            {isPresent ? (
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

      {/* WARNING POPUP MODAL (When student is not captured into webcam) */}
      {showWarningModal && (
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
