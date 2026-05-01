const sessionTokens = new Map();
const queriedTokens = new Map();
let latestAlert = null;

export function generateSessionHoneyToken(sessionId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const phantomHash =
    "0xHONEY" +
    btoa(`${sessionId}-${timestamp}-${random}`)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 58)
      .toUpperCase();

  sessionTokens.set(sessionId, {
    hash: phantomHash,
    createdAt: timestamp,
    queryCount: 0,
  });

  return phantomHash;
}

export function queryHoneyToken(sessionId, hash) {
  const stored = sessionTokens.get(sessionId);

  if (!stored) {
    const alert = {
      triggered: true,
      sessionId,
      hash,
      reason: "Session not found - unauthorized access attempt",
      timestamp: Date.now(),
      role: "UNKNOWN",
    };
    latestAlert = alert;
    return { isLegitimate: false, alert };
  }

  if (stored.hash !== hash) {
    const alert = {
      triggered: true,
      sessionId,
      hash,
      reason: "Hash mismatch - phantom component accessed from wrong session",
      timestamp: Date.now(),
      role: "UNKNOWN",
    };
    latestAlert = alert;
    return { isLegitimate: false, alert };
  }

  if (stored.queryCount > 0) {
    const alert = {
      triggered: true,
      sessionId,
      hash,
      reason: "Same phantom hash queried multiple times - reconnaissance detected",
      timestamp: Date.now(),
      queryCount: stored.queryCount + 1,
    };
    latestAlert = alert;
    stored.queryCount++;
    return { isLegitimate: false, alert };
  }

  const queryKey = hash;
  const existingQuery = queriedTokens.get(queryKey);

  if (existingQuery && existingQuery.sessionId !== sessionId) {
    const alert = {
      triggered: true,
      sessionId,
      hash,
      originalSessionId: existingQuery.sessionId,
      reason: "Same phantom hash queried from different session - cloning attack detected",
      timestamp: Date.now(),
    };
    latestAlert = alert;
    stored.queryCount++;
    return { isLegitimate: false, alert };
  }

  queriedTokens.set(queryKey, { sessionId, queriedAt: Date.now() });
  stored.queryCount++;

  return { isLegitimate: true, alert: null };
}

export function getHoneyTokenAlert() {
  return latestAlert;
}

export function clearHoneyTokens() {
  sessionTokens.clear();
  queriedTokens.clear();
  latestAlert = null;
}

export function isHoneyTokenHash(hash) {
  if (typeof hash === "string" && hash.startsWith("0xHONEY")) return true;
  for (const [, value] of sessionTokens.entries()) {
    if (value.hash === hash) return true;
  }
  return false;
}

export function getAllHoneyTokenSessions() {
  return Array.from(sessionTokens.entries()).map(([sessionId, data]) => ({
    sessionId,
    hash: data.hash,
    createdAt: data.createdAt,
    queryCount: data.queryCount,
  }));
}
