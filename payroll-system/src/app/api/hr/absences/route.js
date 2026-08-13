import { NextResponse } from 'next/server';

// Mock DB store for demonstration
let absences = [
  {
    id: 'ABS-501',
    workerName: 'Kago Phuthego',
    workerId: 'EMP-8802',
    site: 'Jwaneng Pit B',
    absenceType: 'Sick Leave / Medical Note',
    submittedDate: '2026-08-12',
    startDate: '2026-08-12',
    endDate: '2026-08-14',
    status: 'Pending',
    doctorName: 'Dr. M. Tau (Gaborone Private Hospital)',
    fileName: 'medical_cert_kago.pdf',
    fileUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
    notes: 'Patient diagnosed with severe acute respiratory infection; advised 3 days off shift.',
  },
  {
    id: 'ABS-502',
    workerName: 'Thabo Mokoena',
    workerId: 'EMP-4105',
    site: 'Orapa Shaft 3',
    absenceType: 'Unplanned Emergency Leave',
    submittedDate: '2026-08-11',
    startDate: '2026-08-11',
    endDate: '2026-08-11',
    status: 'Pending',
    doctorName: 'N/A (Personal Emergency)',
    fileName: 'emergency_letter_thabo.png',
    fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    notes: 'Family emergency, requested 1 shift absence.',
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: absences }, { status: 200 });
}

export async function PATCH(request) {
  try {
    const { id, status, reason } = await request.json();

    absences = absences.map((item) =>
      item.id === id ? { ...item, status, rejectionReason: reason || null } : item
    );

    return NextResponse.json({ success: true, message: `Absence ${id} updated to ${status}` }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }
}