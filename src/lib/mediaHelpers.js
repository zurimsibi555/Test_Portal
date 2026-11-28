/**
 * Browser & media acquisition helpers for proctoring reliability.
 * Detects Brave browser (whose Shields can mute mic / block WebRTC) and
 * auto-switches away from muted default audioinput devices (e.g. disconnected Bluetooth/virtual mics).
 */

export async function isBraveBrowser() {
  if (typeof navigator === 'undefined') return false;
  try {
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      return Boolean(await navigator.brave.isBrave());
    }
  } catch {
    // ignore
  }
  return false;
}

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acquires camera + microphone stream. If the OS default mic reports `muted === true`,
 * waits briefly for hardware settle and probes other audioinput devices to find an unmuted mic.
 */
export async function acquireLiveCamAndUnmutedMic(videoConstraints) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser does not support Camera/Microphone access.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: AUDIO_CONSTRAINTS,
  });

  const videoTrack = stream.getVideoTracks()[0] || null;
  let audioTrack = stream.getAudioTracks()[0] || null;
  if (audioTrack) {
    audioTrack.enabled = true;
  }

  // Give slow USB/laptop audio drivers a brief moment to unmute on open
  if (audioTrack && audioTrack.readyState === 'live' && audioTrack.muted) {
    await waitMs(350);
  }

  // If OS default mic is still muted (e.g. disconnected Bluetooth headset or virtual mic),
  // probe other available audioinput devices and swap in the first unmuted one.
  if (
    audioTrack &&
    audioTrack.readyState === 'live' &&
    audioTrack.muted &&
    navigator.mediaDevices?.enumerateDevices
  ) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const currentDeviceId = audioTrack.getSettings?.()?.deviceId;
      const candidates = devices.filter(
        (d) => d.kind === 'audioinput' && d.deviceId && d.deviceId !== currentDeviceId
      );

      for (const dev of candidates) {
        let altStream = null;
        try {
          altStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              ...AUDIO_CONSTRAINTS,
              deviceId: { exact: dev.deviceId },
            },
          });
          const altTrack = altStream.getAudioTracks()[0];
          if (altTrack) {
            altTrack.enabled = true;
            if (altTrack.muted) {
              await waitMs(250);
            }
            if (altTrack.readyState === 'live' && !altTrack.muted) {
              stream.removeTrack(audioTrack);
              try {
                audioTrack.stop();
              } catch {}
              stream.addTrack(altTrack);
              audioTrack = altTrack;
              break;
            }
          }
          altStream.getTracks().forEach((t) => t.stop());
        } catch {
          if (altStream) {
            altStream.getTracks().forEach((t) => t.stop());
          }
        }
      }
    } catch {
      // ignore enumeration failures
    }
  }

  return {
    stream,
    videoTrack,
    audioTrack,
    micMuted: Boolean(audioTrack?.muted),
    micLabel: audioTrack?.label || '',
  };
}
