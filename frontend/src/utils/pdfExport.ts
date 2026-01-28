import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export type ExportMode = 'runner' | 'assistance';

interface ExportOptions {
  raceName: string;
  mode: ExportMode;
  element: HTMLElement;
}

/**
 * Export roadbook element to PDF (A4 landscape)
 */
export async function exportToPDF({ raceName, mode, element }: ExportOptions): Promise<void> {
  // A4 landscape dimensions in mm
  const A4_WIDTH = 297;
  const A4_HEIGHT = 210;
  const MARGIN = 10;

  // Create canvas from element - optimized for file size
  const canvas = await html2canvas(element, {
    scale: 1.5, // Good quality without excessive size
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate scaling to fit content
  const imgWidth = A4_WIDTH - 2 * MARGIN;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Add title
  const modeLabel = mode === 'runner' ? 'Coureur' : 'Assistance';
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${raceName} - Roadbook ${modeLabel}`, MARGIN, MARGIN);

  // Add image - use JPEG with compression for smaller file size
  const imgData = canvas.toDataURL('image/jpeg', 0.85);

  // Page dimensions
  const pageHeight = A4_HEIGHT - 2 * MARGIN;
  const titleOffset = 10; // Space for title on first page

  // Calculate how many pages we need
  const firstPageContentHeight = pageHeight - titleOffset;
  const remainingHeight = imgHeight - firstPageContentHeight;
  const additionalPages = remainingHeight > 0 ? Math.ceil(remainingHeight / pageHeight) : 0;

  // First page - position image starting after title
  pdf.addImage(imgData, 'JPEG', MARGIN, MARGIN + titleOffset, imgWidth, imgHeight);

  // Additional pages if needed - shift the image up to show next portion
  for (let i = 0; i < additionalPages; i++) {
    pdf.addPage();
    // Calculate Y position to show the correct portion of the image
    const yOffset = -(firstPageContentHeight + i * pageHeight) + MARGIN;
    pdf.addImage(imgData, 'JPEG', MARGIN, yOffset, imgWidth, imgHeight);
  }

  // Add footer with date on each page
  const totalPages = pdf.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString('fr-FR');

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Généré le ${dateStr} avec GPXIFY - Page ${i}/${totalPages}`,
      A4_WIDTH / 2,
      A4_HEIGHT - 5,
      { align: 'center' }
    );
  }

  // Download
  const fileName = `roadbook_${raceName.toLowerCase().replace(/\s+/g, '_')}_${mode}.pdf`;
  pdf.save(fileName);
}

/**
 * Prepare element for PDF export (hide interactive elements, etc.)
 */
export function prepareForExport(element: HTMLElement): () => void {
  // Store original styles
  const inputs = element.querySelectorAll('input, button, select');
  const originalStyles: Map<Element, string> = new Map();

  inputs.forEach((input) => {
    originalStyles.set(input, (input as HTMLElement).style.cssText);
    if (input.tagName === 'INPUT') {
      // Replace input with its value as text
      const inputEl = input as HTMLInputElement;
      inputEl.style.border = 'none';
      inputEl.style.background = 'transparent';
    }
  });

  // Return cleanup function
  return () => {
    inputs.forEach((input) => {
      (input as HTMLElement).style.cssText = originalStyles.get(input) || '';
    });
  };
}