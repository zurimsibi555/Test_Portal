const baseIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

const rawTurnUrls = (process.env.NEXT_PUBLIC_TURN_URL || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

if (rawTurnUrls.length > 0) {
  baseIceServers.push({
    urls: rawTurnUrls.length === 1 ? rawTurnUrls[0] : rawTurnUrls,
    ...(process.env.NEXT_PUBLIC_TURN_USERNAME
      ? { username: process.env.NEXT_PUBLIC_TURN_USERNAME }
      : {}),
    ...(process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      ? { credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL }
      : {}),
  });
}

export const HAS_TURN_SERVER = rawTurnUrls.length > 0;
export const RTC_ICE_SERVERS = baseIceServers;
export const RTC_CONFIG = {
  iceServers: baseIceServers,
  iceCandidatePoolSize: 4,
};

