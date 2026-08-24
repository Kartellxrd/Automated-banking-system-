import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateTimesheetPDF({ siteName, shiftDate, roster, isLocked }) {
  const doc = new jsPDF('portrait', 'mm', 'a4');

  // --- 1. Header & Site Branding ---
  doc.setFillColor(15, 23, 42); // Dark slate background header
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OFFICIAL SITE TIMESHEET', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Site / Location: ${siteName.toUpperCase()}`, 14, 23);
  doc.text(`Date: ${shiftDate}`, 140, 23);

  // --- 2. Shift Metadata & Calculations ---
  // Ensure strict numerical calculations
  const totalEmployees = roster.length;
  const totalRegHours = roster.reduce((sum, w) => sum + (parseFloat(w.regHours) || 0), 0);
  const totalOtHours = roster.reduce((sum, w) => sum + (parseFloat(w.otHours) || 0), 0);
  const totalCombinedHours = totalRegHours + totalOtHours;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Shift Summary', 14, 40);

  // Summary Cards Table
  autoTable(doc, {
    startY: 43,
    head: [['Total Workers', 'Regular Hours', 'Overtime Hours', 'Total Hours Paid', 'Status']],
    body: [
      [
        totalEmployees.toString(),
        `${totalRegHours.toFixed(2)} hrs`,
        `${totalOtHours.toFixed(2)} hrs`,
        `${totalCombinedHours.toFixed(2)} hrs`,
        isLocked ? 'LOCKED & SUBMITTED' : 'OPEN / PENDING',
      ],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, fontStyle: 'bold', halign: 'center' },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
  });

  // --- 3. Detailed Attendance Table ---
  const tableRows = roster.map((worker) => {
    const reg = parseFloat(worker.regHours) || 0;
    const ot = parseFloat(worker.otHours) || 0;
    const total = reg + ot;

    return [
      worker.code || 'N/A',
      worker.name,
      worker.role || 'General Worker',
      `${worker.clockIn || '--'} - ${worker.clockOut || '--'}`,
      reg.toFixed(2),
      ot.toFixed(2),
      total.toFixed(2),
      worker.auditNote || worker.status || '-',
    ];
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [
      [
        'Emp Code',
        'Worker Name',
        'Job Role',
        'Clock In / Out',
        'Reg (hrs)',
        'OT (hrs)',
        'Total (hrs)',
        'Audit Notes / Status',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 },
      1: { cellWidth: 35 },
      2: { cellWidth: 28 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      7: { cellWidth: 'auto' },
    },
    foot: [
      [
        'TOTALS',
        '',
        '',
        '',
        totalRegHours.toFixed(2),
        totalOtHours.toFixed(2),
        totalCombinedHours.toFixed(2),
        '',
      ],
    ],
    footStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'right',
    },
  });

  // --- 4. Verification & Sign-off Block ---
  const finalY = doc.lastAutoTable.finalY + 15;

  // Check if sign-off block fits on page, else add page
  if (finalY > 240) {
    doc.addPage();
  }

  const signY = finalY > 240 ? 30 : finalY;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPERVISOR SIGN-OFF', 14, signY);

  // Line for Clerk Signature
  doc.setDrawColor(148, 163, 184);
  doc.line(14, signY + 15, 80, signY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Site Clerk Signature', 14, signY + 19);

  // Line for HR Approval
  doc.line(130, signY + 15, 196, signY + 15);
  doc.text('HR Representative Verification', 130, signY + 19);

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated via Site Clerk System on ${new Date().toLocaleString()} | Official Payroll Audit Document`,
    14,
    285
  );

  // Save the PDF download
  const cleanSite = siteName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Timesheet_${cleanSite}_${shiftDate}.pdf`);
}