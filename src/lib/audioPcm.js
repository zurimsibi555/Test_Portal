/**
 * Lightweight 16kHz Mono Int16 PCM helpers for low-latency, gap-free voice streaming.
 * Uses box-filter averaging during downsampling to prevent high-frequency aliasing noise.
 */

export function downsampleFloat32ToInt16(input, inputRate, targetRate = 16000) {
  if (!input || input.length === 0) return new Int16Array(0);

  if (inputRate === targetRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  const ratio = inputRate / targetRate;
  const newLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(newLength);

  if (ratio > 1) {
    // Average all source samples in each output bucket (simple low-pass decimation)
    for (let i = 0; i < newLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += input[j];
        count++;
      }
      const sample = count > 0 ? Math.max(-1, Math.min(1, sum / count)) : 0;
      out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return out;
  }

  // Linear interpolation if inputRate < targetRate
  for (let i = 0; i < newLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] || 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] || s0;
    const sample = Math.max(-1, Math.min(1, s0 + (s1 - s0) * frac));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return out;
}

export function int16ToBase64(int16Array) {
  const bytes = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
  let binary = '';
  const chunkSize = 0x2000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToFloat32(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}
