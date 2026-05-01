const ANOMALY_TYPES = {
  TIME_ANOMALY: "TIME_ANOMALY",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CLONING_DETECTED: "CLONING_DETECTED",
  CLEARANCE_VIOLATION: "CLEARANCE_VIOLATION",
  FAILED_ATTEMPTS: "FAILED_ATTEMPTS",
};

const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CLONING_TIME_WINDOW_MS = 2 * 60 * 60 * 1000;
const CLONING_MIN_DISTANCE_KM = 100;
const FAILED_ATTEMPTS_THRESHOLD = 3;
const FAILED_ATTEMPTS_WINDOW_MS = 60 * 60 * 1000;

export function checkTimeAnomaly(timestamp) {
  const date = new Date(typeof timestamp === "number" && timestamp < 1e12
    ? timestamp * 1000
    : timestamp);
  const hours = date.getHours();
  return hours >= 0 && hours < 5;
}

export function checkRateLimit(recentTimestamps, officerAddress) {
  if (!recentTimestamps || !Array.isArray(recentTimestamps)) return false;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentCount = recentTimestamps.filter(
    (ts) => ts >= windowStart
  ).length;
  return recentCount >= RATE_LIMIT_COUNT;
}

export function checkCloningAlert(componentId, recentScanEvents) {
  if (!recentScanEvents || !Array.isArray(recentScanEvents)) return false;

  const relevantScans = recentScanEvents.filter(
    (event) => event.componentId === componentId
  );

  if (relevantScans.length < 2) return false;

  for (let i = 0; i < relevantScans.length; i++) {
    for (let j = i + 1; j < relevantScans.length; j++) {
      const scan1 = relevantScans[i];
      const scan2 = relevantScans[j];

      const timeDiff = Math.abs(
        new Date(scan1.timestamp).getTime() - new Date(scan2.timestamp).getTime()
      );

      if (timeDiff > CLONING_TIME_WINDOW_MS) continue;

      if (scan1.location && scan2.location) {
        const distance = haversineDistance(
          scan1.location.lat,
          scan1.location.lng,
          scan2.location.lat,
          scan2.location.lng
        );
        if (distance > CLONING_MIN_DISTANCE_KM) return true;
      } else if (scan1.locationId && scan2.locationId && scan1.locationId !== scan2.locationId) {
        return true;
      }
    }
  }

  return false;
}

export function checkClearanceViolation(officerClearanceLevel, componentCategory) {
  if (typeof officerClearanceLevel !== "number" || typeof componentCategory !== "number") {
    return false;
  }
  return officerClearanceLevel < componentCategory;
}

export function checkFailedAttempts(auditEntries, officerAddress) {
  if (!auditEntries || !Array.isArray(auditEntries)) return false;

  const now = Date.now();
  const windowStart = now - FAILED_ATTEMPTS_WINDOW_MS;

  const failedAttempts = auditEntries.filter((entry) => {
    const entryTime = typeof entry.timestamp === "number" && entry.timestamp < 1e12
      ? entry.timestamp * 1000
      : new Date(entry.timestamp).getTime();

    return (
      entry.actor?.toLowerCase() === officerAddress?.toLowerCase() &&
      entry.outcome === "DENIED" &&
      entryTime >= windowStart
    );
  });

  return failedAttempts.length >= FAILED_ATTEMPTS_THRESHOLD;
}

export function runAllChecks(event) {
  const triggeredAnomalies = [];

  if (!event) return triggeredAnomalies;

  if (event.timestamp && checkTimeAnomaly(event.timestamp)) {
    triggeredAnomalies.push(ANOMALY_TYPES.TIME_ANOMALY);
  }

  if (event.recentTimestamps && event.officerAddress &&
    checkRateLimit(event.recentTimestamps, event.officerAddress)) {
    triggeredAnomalies.push(ANOMALY_TYPES.RATE_LIMIT_EXCEEDED);
  }

  if (event.componentId && event.recentScanEvents &&
    checkCloningAlert(event.componentId, event.recentScanEvents)) {
    triggeredAnomalies.push(ANOMALY_TYPES.CLONING_DETECTED);
  }

  if (event.officerClearance !== undefined && event.componentCategory !== undefined &&
    checkClearanceViolation(event.officerClearance, event.componentCategory)) {
    triggeredAnomalies.push(ANOMALY_TYPES.CLEARANCE_VIOLATION);
  }

  if (event.auditEntries && event.officerAddress &&
    checkFailedAttempts(event.auditEntries, event.officerAddress)) {
    triggeredAnomalies.push(ANOMALY_TYPES.FAILED_ATTEMPTS);
  }

  return triggeredAnomalies;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export { ANOMALY_TYPES };
