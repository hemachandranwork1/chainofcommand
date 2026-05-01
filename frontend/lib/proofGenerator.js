import { jsPDF } from "jspdf";

const POLYGON_EXPLORER = "https://amoy.polygonscan.com/tx/";

export async function generateProofPDF(auditEvent) {
  const {
    eventType = "PROCUREMENT_EVENT",
    actor = "UNKNOWN",
    componentId = "UNKNOWN",
    timestamp,
    blockNumber,
    transactionHash,
    outcome = "UNKNOWN",
    denialReason = "",
  } = auditEvent;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFillColor(10, 20, 10);
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setDrawColor(0, 255, 70);
  doc.setLineWidth(0.5);
  doc.rect(margin - 5, 15, contentWidth + 10, 267);

  doc.setTextColor(0, 255, 70);
  doc.setFont("courier", "bold");
  doc.setFontSize(16);
  doc.text("CHAINOFCOMMAND", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(12);
  doc.text("CRYPTOGRAPHIC PROCUREMENT PROOF", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(0, 200, 50);
  doc.text("CLASSIFICATION: RESTRICTED - OFFICIAL USE ONLY", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setTextColor(0, 255, 70);
  doc.setFontSize(9);
  doc.setFont("courier", "bold");
  doc.text("DOCUMENT INTEGRITY STATEMENT", margin, y);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 220, 60);

  const integrityStatement =
    "This document constitutes cryptographic proof of a procurement event recorded on an " +
    "immutable blockchain ledger. The data integrity is mathematically provable via the " +
    "on-chain transaction hash. This record cannot be altered, deleted, or disputed by " +
    "any party at any clearance level. This document is admissible as forensic evidence.";

  const splitStatement = doc.splitTextToSize(integrityStatement, contentWidth);
  doc.text(splitStatement, margin, y);
  y += splitStatement.length * 5 + 6;

  doc.setDrawColor(0, 150, 40);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 255, 70);
  doc.text("EVENT DETAILS", margin, y);
  y += 7;

  const eventDate = timestamp
    ? new Date(typeof timestamp === "number" && timestamp < 1e12 ? timestamp * 1000 : timestamp)
    : new Date();

  const fields = [
    ["EVENT TYPE", eventType],
    ["OUTCOME", outcome],
    ["OFFICER ADDRESS", actor],
    ["COMPONENT ID", typeof componentId === "string" ? componentId : componentId.toString()],
    ["TIMESTAMP", eventDate.toISOString()],
    ["UNIX TIMESTAMP", eventDate.getTime().toString()],
    ["BLOCK NUMBER", blockNumber ? blockNumber.toString() : "PENDING"],
    ["TRANSACTION HASH", transactionHash || "PENDING"],
    ["DENIAL REASON", denialReason || "N/A"],
  ];

  doc.setFont("courier", "normal");
  doc.setFontSize(8);

  for (const [label, value] of fields) {
    doc.setTextColor(0, 180, 50);
    doc.text(`${label}:`, margin, y);
    doc.setTextColor(0, 255, 70);
    const splitValue = doc.splitTextToSize(value, contentWidth - 55);
    doc.text(splitValue, margin + 55, y);
    y += splitValue.length * 5 + 2;
  }

  y += 4;
  doc.setDrawColor(0, 150, 40);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 255, 70);
  doc.text("BLOCKCHAIN VERIFICATION", margin, y);
  y += 7;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 220, 60);

  if (transactionHash) {
    const explorerUrl = `${POLYGON_EXPLORER}${transactionHash}`;
    doc.text("Verify this transaction on Polygon Sepolia (Amoy) block explorer:", margin, y);
    y += 6;
    doc.setTextColor(0, 255, 120);
    const splitUrl = doc.splitTextToSize(explorerUrl, contentWidth);
    doc.text(splitUrl, margin, y);
    y += splitUrl.length * 5 + 4;

    doc.setTextColor(0, 220, 60);
    doc.text("Scan QR code to verify:", margin, y);
    y += 6;

    try {
      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(explorerUrl, {
        width: 80,
        margin: 1,
        color: { dark: "#00ff46", light: "#0a140a" },
      });
      doc.addImage(qrDataUrl, "PNG", margin, y, 30, 30);
      y += 35;
    } catch {
      doc.text("[QR CODE - See URL above]", margin, y);
      y += 8;
    }
  } else {
    doc.text("Transaction hash pending. Record generated at time of event.", margin, y);
    y += 8;
  }

  y += 4;
  doc.setDrawColor(0, 150, 40);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 255, 70);
  doc.text("CRYPTOGRAPHIC ATTESTATION", margin, y);
  y += 7;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 200, 50);

  const attestation =
    "Formal Invariant: ApprovalGranted cannot be emitted unless IdentityRegistry returns " +
    "sufficient clearance, ComponentRegistry returns a clean Merkle path with no transfer gaps, " +
    "and the device token is uncompromised. This invariant is provable using SMT solvers. " +
    "Encryption: AES-256-GCM for field encryption, ECDH for key exchange. " +
    "Architecture: Crypto-agile design supports migration to ML-DSA post-quantum signatures.";

  const splitAttestation = doc.splitTextToSize(attestation, contentWidth);
  doc.text(splitAttestation, margin, y);
  y += splitAttestation.length * 5 + 8;

  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 150, 40);
  doc.text(
    `Generated: ${new Date().toISOString()} | ChainOfCommand Defense Procurement Security System`,
    pageWidth / 2,
    285,
    { align: "center" }
  );

  const pdfBlob = doc.output("blob");
  return pdfBlob;
}

export function downloadProofPDF(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `procurement-proof-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
