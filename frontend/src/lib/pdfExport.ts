/**
 * PDF Export utility using jsPDF
 */

import jsPDF from 'jspdf';

export interface ExportData {
  title: string;
  toolType: string;
  date: string;
  inputData?: any;
  resultData?: any;
  filename?: string;
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, margin, yPosition);
  yPosition += 15;

  // Metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Tool: ${data.toolType}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Date: ${data.date}`, margin, yPosition);
  yPosition += 7;
  if (data.filename) {
    doc.text(`File: ${data.filename}`, margin, yPosition);
    yPosition += 7;
  }
  yPosition += 10;

  // Separator line
  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Input Data
  if (data.inputData) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Input', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const inputText = typeof data.inputData === 'string' 
      ? data.inputData 
      : JSON.stringify(data.inputData, null, 2);
    const inputLines = doc.splitTextToSize(inputText, maxWidth);
    doc.text(inputLines, margin, yPosition);
    yPosition += inputLines.length * 5 + 15;
  }

  // Result Data
  if (data.resultData) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Result', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Handle different result data structures
    if (typeof data.resultData === 'object') {
      Object.entries(data.resultData).forEach(([key, value]) => {
        // Check if we need a new page
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`${key}:`, margin, yPosition);
        yPosition += 7;

        doc.setFont('helvetica', 'normal');
        const valueText = typeof value === 'string' 
          ? value 
          : JSON.stringify(value, null, 2);
        const valueLines = doc.splitTextToSize(valueText, maxWidth);
        doc.text(valueLines, margin + 5, yPosition);
        yPosition += valueLines.length * 5 + 10;
      });
    } else {
      const resultText = String(data.resultData);
      const resultLines = doc.splitTextToSize(resultText, maxWidth);
      doc.text(resultLines, margin, yPosition);
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `${data.toolType}_${new Date().getTime()}.pdf`;
  doc.save(filename);
}
