const baseIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

if (process.env.NEXT_PUBLIC_TURN_URL) {
  baseIceServers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    ...(process.env.NEXT_PUBLIC_TURN_USERNAME
      ? { username: process.env.NEXT_PUBLIC_TURN_USERNAME }
      : {}),
    ...(process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      ? { credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL }
      : {}),
  });
}

export const RTC_ICE_SERVERS = baseIceServers;

