let lastChaffBatch = [];

const CHAFF_PAYLOAD_SIZE = 512;

function generatePaddedPayload(data) {
  const json = JSON.stringify(data);
  if (json.length >= CHAFF_PAYLOAD_SIZE) return json.substring(0, CHAFF_PAYLOAD_SIZE);
  return json + "X".repeat(CHAFF_PAYLOAD_SIZE - json.length);
}

export function generateChaffTransaction() {
  const seed = Date.now() + Math.random();
  const junkAddress = "0x" + Math.abs(Math.sin(seed) * 1e18).toString(16).substring(0, 40).padEnd(40, "0");
  const junkComponentId = "0x" + Math.abs(Math.cos(seed) * 1e18).toString(16).substring(0, 64).padEnd(64, "0");

  const chaff = {
    type: "PROCUREMENT_REQUEST",
    officer: junkAddress,
    componentId: junkComponentId,
    deviceToken: "DEVICE-TOKEN-" + Math.abs(Math.sin(seed * 2) * 1e8).toString(16).substring(0, 16).toUpperCase(),
    locationHash: "0x" + Math.abs(Math.tan(seed) * 1e18).toString(16).substring(0, 64).padEnd(64, "0"),
    timestamp: Date.now(),
    nonce: Math.floor(Math.random() * 1000000),
    gasEstimate: Math.floor(21000 + Math.random() * 50000),
    chainId: 31337,
    isChaff: true,
    padding: "",
  };

  const paddedPayload = generatePaddedPayload(chaff);
  chaff.padding = "X".repeat(Math.max(0, CHAFF_PAYLOAD_SIZE - JSON.stringify({ ...chaff, padding: "" }).length));

  return chaff;
}

export function fireChaff(realTransaction, count = 3) {
  const normalizedReal = {
    type: "PROCUREMENT_REQUEST",
    officer: realTransaction.officer || realTransaction.officerAddress || "",
    componentId: realTransaction.componentId || "",
    deviceToken: realTransaction.deviceToken || "",
    locationHash: realTransaction.locationHash || "0x" + "0".repeat(64),
    timestamp: realTransaction.timestamp || Date.now(),
    nonce: realTransaction.nonce || Math.floor(Math.random() * 1000000),
    gasEstimate: realTransaction.gasEstimate || Math.floor(21000 + Math.random() * 50000),
    chainId: realTransaction.chainId || 31337,
    isChaff: false,
    padding: "",
  };

  normalizedReal.padding = "X".repeat(
    Math.max(0, CHAFF_PAYLOAD_SIZE - JSON.stringify({ ...normalizedReal, padding: "" }).length)
  );

  const chaffTransactions = Array.from({ length: count }, () => generateChaffTransaction());
  const allTransactions = [normalizedReal, ...chaffTransactions];

  const shuffled = allTransactions
    .map((tx) => ({ tx, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ tx }) => tx);

  lastChaffBatch = shuffled.map((tx, index) => ({
    ...tx,
    batchIndex: index,
    byteSize: JSON.stringify(tx).length,
    mockTxHash: "0x" + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join(""),
    mockBlockNumber: Math.floor(8000000 + Math.random() * 100000),
  }));

  return lastChaffBatch;
}

export function getChaffTransactions() {
  return lastChaffBatch;
}

export function getChaffStats() {
  if (lastChaffBatch.length === 0) return null;

  const sizes = lastChaffBatch.map((tx) => tx.byteSize);
  const allSameSize = sizes.every((s) => s === sizes[0]);

  return {
    totalTransactions: lastChaffBatch.length,
    realCount: lastChaffBatch.filter((tx) => !tx.isChaff).length,
    chaffCount: lastChaffBatch.filter((tx) => tx.isChaff).length,
    byteSizes: sizes,
    allIdenticalSize: allSameSize,
    targetSize: CHAFF_PAYLOAD_SIZE,
  };
}
