import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function sanitizeText(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[^\x20-\x7E\n\r\t]/g, ' ');
}

/**
 * Generates a detailed PDF evaluation report for a student submission.
 * Returns a Node.js Buffer containing the PDF bytes.
 */
export function generateSubmissionPdfBuffer(submission) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 40;

  const ensureSpace = (needed = 40) => {
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = 44;
    }
  };

  // Header Banner (Deep Forest Emerald)
  doc.setFillColor(21, 128, 61); // #15803D
  doc.rect(0, 0, pageWidth, 84, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DETAILED EXAMINATION EVALUATION REPORT', margin, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    sanitizeText(`${submission.testTitle || submission.testId || 'Java Foundation Test'}  |  Confidential Admin Copy`),
    margin,
    56
  );

  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    pageWidth - margin,
    56,
    { align: 'right' }
  );

  y = 106;

  // Student & Session Metadata Card
  doc.setFillColor(250, 248, 245); // Milky white #FAF8F5
  doc.setDrawColor(230, 225, 214);
  doc.roundedRect(margin, y, contentWidth, 98, 6, 6, 'FD');

  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Student Name: ${sanitizeText(submission.studentName)}`, margin + 14, y + 22);
  doc.text(`Roll No / ID: ${sanitizeText(submission.rollNo)}`, margin + 280, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`Submission ID: ${sanitizeText(submission.id)}`, margin + 14, y + 42);
  doc.text(`Submitted At: ${new Date(submission.submittedAt).toLocaleString()}`, margin + 280, y + 42);

  const isDisqualified = !!submission.violated;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isDisqualified ? 185 : 21, isDisqualified ? 28 : 128, isDisqualified ? 28 : 61);
  doc.text(`Status: ${sanitizeText(submission.status || (isDisqualified ? 'DISQUALIFIED' : 'COMPLETED'))}`, margin + 14, y + 62);
  doc.setTextColor(87, 83, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`Webcam Warnings: ${submission.webcamWarnings || 0}`, margin + 280, y + 62);

  const mcqAtt =
    submission.mcqAttemptedCount ??
    (Array.isArray(submission.mcqDetails)
      ? submission.mcqDetails.filter((m) => m.selectedOption !== null && m.selectedOption !== undefined).length
      : 0);
  const mcqTot = submission.totalMcqs ?? (Array.isArray(submission.mcqDetails) ? submission.mcqDetails.length : 0);
  const codeAtt =
    submission.codingAttemptedCount ??
    (Array.isArray(submission.codingDetails)
      ? submission.codingDetails.filter((c) => Boolean(c.code && c.code.trim())).length
      : 0);
  const codeTot = submission.totalCodings ?? (Array.isArray(submission.codingDetails) ? submission.codingDetails.length : 0);
  doc.text(`Attempted: MCQs ${mcqAtt}/${mcqTot}  |  Coding ${codeAtt}/${codeTot}`, margin + 14, y + 82);

  y += 114;

  if (isDisqualified && submission.violationReason) {
    ensureSpace(46);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(margin, y, contentWidth, 36, 4, 4, 'FD');
    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Violation Reason: ${sanitizeText(submission.violationReason)}`, margin + 12, y + 22);
    y += 50;
  }

  // Score Summary Boxes
  ensureSpace(78);
  const mcqScore = submission.mcqScore ?? 0;
  const mcqMax = submission.mcqMaxScore ?? 50;
  const codeScore = submission.codeScore ?? 0;
  const codeMax = submission.codeMaxScore ?? 50;
  const totalScore = submission.totalScore ?? (mcqScore + codeScore);
  const totalMax = submission.totalMaxScore ?? (mcqMax + codeMax);
  const pct = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : '0.0';

  const boxWidth = (contentWidth - 20) / 3;
  const summaryBoxes = [
    { label: 'SECTION 1: MCQs', value: `${mcqScore} / ${mcqMax}`, sub: '2.5 marks per MCQ' },
    { label: 'SECTION 2: JAVA CODING', value: `${codeScore} / ${codeMax}`, sub: '5 marks per problem' },
    { label: 'TOTAL MARKS', value: `${totalScore} / ${totalMax}`, sub: `Percentage: ${pct}%` },
  ];

  summaryBoxes.forEach((box, idx) => {
    const bx = margin + idx * (boxWidth + 10);
    doc.setFillColor(idx === 2 ? 236 : 255, idx === 2 ? 253 : 255, idx === 2 ? 245 : 255);
    doc.setDrawColor(idx === 2 ? 16 : 230, idx === 2 ? 185 : 225, idx === 2 ? 129 : 214);
    doc.roundedRect(bx, y, boxWidth, 60, 6, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(87, 83, 78);
    doc.text(box.label, bx + 12, y + 18);

    doc.setFontSize(15);
    doc.setTextColor(idx === 2 ? 21 : 28, idx === 2 ? 128 : 25, idx === 2 ? 61 : 23);
    doc.text(box.value, bx + 12, y + 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(box.sub, bx + 12, y + 52);
  });

  y += 80;

  // Section 1: Detailed MCQ Breakdown
  if (Array.isArray(submission.mcqDetails) && submission.mcqDetails.length > 0) {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61);
    doc.text('Section 1: Multiple Choice Questions Breakdown', margin, y);
    y += 18;

    submission.mcqDetails.forEach((item, index) => {
      const qLines = doc.splitTextToSize(
        `Q${item.questionNumber || index + 1}. ${sanitizeText(item.question)}`,
        contentWidth - 20
      );
      const selectedLabel =
        item.selectedOption !== null && item.selectedOption !== undefined
          ? `${String.fromCharCode(65 + item.selectedOption)}) ${sanitizeText(item.options?.[item.selectedOption] ?? '')}`
          : 'Not Answered';
      const correctLabel = `${String.fromCharCode(65 + item.correctOption)}) ${sanitizeText(item.options?.[item.correctOption] ?? '')}`;
      const selectedLines = doc.splitTextToSize(`Student Answer: ${selectedLabel}`, contentWidth - 85);
      const correctLines = doc.splitTextToSize(`Correct Answer: ${correctLabel}`, contentWidth - 24);
      const blockHeight = 20 + qLines.length * 12 + selectedLines.length * 11 + correctLines.length * 11 + 14;
      ensureSpace(blockHeight);

      doc.setFillColor(250, 248, 245);
      doc.setDrawColor(230, 225, 214);
      doc.roundedRect(margin, y, contentWidth, blockHeight - 6, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(28, 25, 23);
      doc.text(qLines, margin + 10, y + 15);

      const answerY = y + 15 + qLines.length * 12 + 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(item.isCorrect ? 21 : 185, item.isCorrect ? 128 : 28, item.isCorrect ? 61 : 28);
      doc.text(selectedLines, margin + 10, answerY);

      doc.setFont('helvetica', 'bold');
      doc.text(`${item.marksAwarded} / ${item.maxMarks}`, pageWidth - margin - 10, answerY, { align: 'right' });

      const correctY = answerY + selectedLines.length * 11 + 2;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(87, 83, 78);
      doc.text(correctLines, margin + 10, correctY);

      y += blockHeight;
    });

    y += 10;
  }

  // Section 2: Detailed Coding Breakdown
  if (Array.isArray(submission.codingDetails) && submission.codingDetails.length > 0) {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61);
    doc.text('Section 2: Java Coding Solutions Breakdown', margin, y);
    y += 18;

    submission.codingDetails.forEach((prob, index) => {
      const codePreview = sanitizeText(prob.code || '// No code submitted').slice(0, 3500);
      const codeLines = doc.splitTextToSize(codePreview, contentWidth - 24).slice(0, 45);
      const boxH = 44 + codeLines.length * 10 + 14;
      ensureSpace(boxH);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(230, 225, 214);
      doc.roundedRect(margin, y, contentWidth, boxH - 6, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(28, 25, 23);
      doc.text(`Problem ${prob.questionNumber || index + 1}: ${sanitizeText(prob.title)}`, margin + 10, y + 18);

      doc.setFontSize(9);
      doc.setTextColor(21, 128, 61);
      doc.text(
        `Test Cases: ${prob.passedTests ?? 0}/${prob.totalTests ?? 0}   |   Score: ${prob.marksAwarded ?? 0} / ${prob.maxMarks ?? 5}`,
        pageWidth - margin - 10,
        y + 18,
        { align: 'right' }
      );

      doc.setFillColor(250, 248, 245);
      doc.rect(margin + 10, y + 28, contentWidth - 20, codeLines.length * 10 + 10, 'F');
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(68, 64, 60);
      doc.text(codeLines, margin + 14, y + 40);

      y += boxH;
    });
  }

  // Page numbers footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `Confidential Admin Report • Sent manually by Administrator • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generates and persists the submission PDF to data/reports/<submission.id>.pdf
 */
export function saveSubmissionPdf(submission) {
  ensureReportsDir();
  const safeRoll = String(submission.rollNo || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Report_${safeRoll}_${submission.id}.pdf`;
  const filePath = path.join(REPORTS_DIR, `${submission.id}.pdf`);
  const buffer = generateSubmissionPdfBuffer(submission);
  fs.writeFileSync(filePath, buffer);
  return { fileName, filePath, buffer };
}

export function getSavedSubmissionPdf(submissionId) {
  const filePath = path.join(REPORTS_DIR, `${submissionId}.pdf`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null;
}

export function deleteSubmissionPdf(submissionId) {
  const safeId = String(submissionId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return;
  const filePath = path.join(REPORTS_DIR, `${safeId}.pdf`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function clearAllSubmissionPdfs() {
  if (!fs.existsSync(REPORTS_DIR)) return;
  for (const file of fs.readdirSync(REPORTS_DIR)) {
    if (file.endsWith('.pdf')) {
      fs.unlinkSync(path.join(REPORTS_DIR, file));
    }
  }
}
