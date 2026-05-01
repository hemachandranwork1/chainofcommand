const compromisedTokens = new Map();
let sessionCounter = 0;

export const COMPROMISED_DEVICE_TOKEN = "DEVICE-TOKEN-COMPROMISED-ROOTED-001";

compromisedTokens.set(COMPROMISED_DEVICE_TOKEN, {
  flaggedAt: Date.now(),
  reason: "Pre-flagged for demo: rooted device simulation",
});

export function generateDeviceToken() {
  sessionCounter++;
  const sessionId = `session-${Date.now()}-${sessionCounter}`;
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const token = `DEVICE-TOKEN-${sessionId}-${random}`;
  return token;
}

export function flagDeviceToken(token, reason = "Manually flagged") {
  compromisedTokens.set(token, {
    flaggedAt: Date.now(),
    reason,
  });
}

export function isTokenCompromised(token) {
  return compromisedTokens.has(token);
}

export function getCompromisedTokens() {
  return Array.from(compromisedTokens.entries()).map(([token, data]) => ({
    token,
    flaggedAt: data.flaggedAt,
    reason: data.reason,
  }));
}

export function resetTokens() {
  compromisedTokens.clear();
  compromisedTokens.set(COMPROMISED_DEVICE_TOKEN, {
    flaggedAt: Date.now(),
    reason: "Pre-flagged for demo: rooted device simulation",
  });
  sessionCounter = 0;
}

export function getTokenStatus(token) {
  if (compromisedTokens.has(token)) {
    return {
      compromised: true,
      ...compromisedTokens.get(token),
    };
  }
  return { compromised: false };
}
