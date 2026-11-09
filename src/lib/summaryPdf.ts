// Renders a SummaryDoc to an A4 PDF in the browser with jsPDF. Loaded on demand, so the
// library only downloads when someone asks for a PDF. Nothing is uploaded.

import type { SummaryDoc } from './summary.ts';

const INK: [number, number, number] = [42, 37, 30];
const MUTED: [number, number, number] = [107, 97, 82];
const LINE: [number, number, number] = [184, 169, 136];
const HEAD: [number, number, number] = [242, 235, 220];
const PRIMARY: [number, number, number] = [31, 61, 109];
const TONE: Record<SummaryDoc['headline']['outcome'], [number, number, number]> = {
  payable: [155, 44, 44],
  refund: [47, 107, 58],
  nil: [31, 61, 109],
};

/** The built-in PDF fonts only cover Latin-1, so map the few typographic characters we use. */
const latin = (s: string) =>
  s
    .replace(/[−–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, '-')
    .replace(/[^\x00-\xff]/g, '');

export async function downloadSummaryPdf(doc: SummaryDoc, fileName: string): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const M = 16;
  let y = 18;

  // letterhead
  pdf
    .setFont('times', 'italic')
    .setFontSize(10)
    .setTextColor(...MUTED);
  pdf.text('Tax Simplified', M, y);
  pdf.text(latin(`Generated ${doc.generated}`), W - M, y, { align: 'right' });
  y += 9;
  pdf
    .setFont('times', 'bold')
    .setFontSize(20)
    .setTextColor(...PRIMARY);
  pdf.text(latin(doc.title), M, y);
  y += 7;
  pdf
    .setFont('times', 'normal')
    .setFontSize(12)
    .setTextColor(...INK);
  pdf.text(latin(doc.person), M, y);
  y += 4;
  pdf
    .setDrawColor(...LINE)
    .setLineWidth(0.3)
    .line(M, y, W - M, y);
  y += 6;

  // headline figure
  const tone = TONE[doc.headline.outcome];
  pdf
    .setDrawColor(...tone)
    .setLineWidth(0.6)
    .rect(M, y, W - 2 * M, 18);
  pdf
    .setFont('times', 'bold')
    .setFontSize(10)
    .setTextColor(...tone);
  pdf.text(latin(doc.headline.label), M + 5, y + 7);
  pdf.setFont('courier', 'bold').setFontSize(18);
  pdf.text(latin(doc.headline.amount), M + 5, y + 14.5);
  y += 24;

  // key facts
  autoTable(pdf, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'plain',
    body: doc.facts.map(([k, v]) => [latin(k), latin(v)]),
    styles: {
      font: 'times',
      fontSize: 10.5,
      textColor: INK,
      cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 2 },
    },
    columnStyles: { 0: { textColor: MUTED, cellWidth: 42 } },
  });
  y = lastY(pdf) + 6;

  for (const t of doc.tables) {
    if (y > pdf.internal.pageSize.getHeight() - 40) {
      pdf.addPage();
      y = 18;
    }
    pdf
      .setFont('times', 'bold')
      .setFontSize(12)
      .setTextColor(...PRIMARY);
    pdf.text(latin(t.title), M, y);
    const align = (i: number) => (t.numeric.includes(i) ? 'right' : 'left');
    autoTable(pdf, {
      startY: y + 2,
      margin: { left: M, right: M, bottom: 20 },
      theme: 'plain',
      head: [t.head.map(latin)],
      body: t.rows.map((r) => r.map(latin)),
      foot: t.foot ? [t.foot.map(latin)] : undefined,
      showFoot: 'lastPage',
      styles: {
        font: 'times',
        fontSize: 9.5,
        textColor: INK,
        cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
        lineColor: LINE,
      },
      headStyles: { fillColor: HEAD, textColor: MUTED, fontStyle: 'bold' },
      footStyles: { fontStyle: 'bold', lineWidth: { top: 0.4 }, lineColor: INK },
      bodyStyles: { lineWidth: { bottom: 0.1 } },
      didParseCell: (c) => {
        c.cell.styles.halign = align(c.column.index);
        if (t.numeric.includes(c.column.index) && c.section !== 'head') c.cell.styles.font = 'courier';
        if (t.title === 'Computation' && c.column.index === 0) c.cell.styles.textColor = MUTED;
      },
    });
    y = lastY(pdf) + 8;
  }

  if (doc.notes.length) {
    if (y > pdf.internal.pageSize.getHeight() - 40) {
      pdf.addPage();
      y = 18;
    }
    pdf
      .setFont('times', 'bold')
      .setFontSize(12)
      .setTextColor(...PRIMARY);
    pdf.text('Notes', M, y);
    y += 5;
    pdf
      .setFont('times', 'normal')
      .setFontSize(10)
      .setTextColor(...INK);
    for (const n of doc.notes) {
      const lines = pdf.splitTextToSize(latin(n), W - 2 * M - 4) as string[];
      if (y + lines.length * 4.5 > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        y = 18;
      }
      pdf.text('-', M, y);
      pdf.text(lines, M + 4, y);
      y += lines.length * 4.5 + 1.5;
    }
  }

  // footer on every page
  const pages = pdf.getNumberOfPages();
  const H = pdf.internal.pageSize.getHeight();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf
      .setDrawColor(...LINE)
      .setLineWidth(0.2)
      .line(M, H - 14, W - M, H - 14);
    pdf
      .setFont('times', 'normal')
      .setFontSize(8)
      .setTextColor(...MUTED);
    pdf.text(pdf.splitTextToSize(latin(doc.footer), W - 2 * M - 20) as string[], M, H - 10);
    pdf.text(`${p} / ${pages}`, W - M, H - 10, { align: 'right' });
  }

  pdf.save(fileName);
}

function lastY(pdf: unknown): number {
  return (pdf as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
}
