import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { StructuredReportData } from '../types';
import { ShiftReportPdfDocument } from './PdfDocument';
import { formatReportFilename } from '../components/ReportView';

/**
 * Generates a vector PDF Blob from report data using @react-pdf/renderer
 */
export async function generateReportPdfBlob(
  structuredData: StructuredReportData,
  targetFrequencyId?: number
): Promise<Blob> {
  const docElement = React.createElement(ShiftReportPdfDocument, { structuredData, targetFrequencyId });
  const pdfInstance = pdf(docElement);
  const blob = await pdfInstance.toBlob();
  return blob;
}

/**
 * Downloads the generated PDF directly in browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Client-side vector PDF download
 */
export async function downloadReportPdf(
  structuredData: StructuredReportData,
  targetFrequencyId?: number
): Promise<void> {
  const filename = formatReportFilename(
    structuredData.operational_date,
    structuredData.shift,
    targetFrequencyId
  );
  const blob = await generateReportPdfBlob(structuredData, targetFrequencyId);
  downloadBlob(blob, filename);
}

/**
 * Shares PDF via Web Share API or falls back to direct download
 */
export async function shareReportPdf(
  structuredData: StructuredReportData,
  targetFrequencyId?: number
): Promise<{ shared: boolean; method: 'web-share' | 'download' }> {
  const filename = formatReportFilename(
    structuredData.operational_date,
    structuredData.shift,
    targetFrequencyId
  );
  const blob = await generateReportPdfBlob(structuredData, targetFrequencyId);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: 'Laporan Maintenance',
      text: `Laporan Maintenance ${structuredData.operational_date}`,
    });
    return { shared: true, method: 'web-share' };
  } else {
    downloadBlob(blob, filename);
    return { shared: false, method: 'download' };
  }
}

/**
 * Fallback generator using Express Puppeteer server endpoint if needed
 */
export async function generatePdfPuppeteerFallback(
  htmlContent: string,
  filename: string
): Promise<Blob> {
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: htmlContent, filename }),
  });

  if (!response.ok) {
    throw new Error(`Puppeteer server error ${response.status}`);
  }

  return await response.blob();
}
