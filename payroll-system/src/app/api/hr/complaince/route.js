import { NextResponse } from 'next/server';

let complianceRecords = [
  {
    id: 'CMP-901',
    workerName: 'Kago Phuthego',
    workerId: 'EMP-8802',
    site: 'Jwaneng Pit B',
    jobTitle: 'Heavy Machinery Operator',
    loggedHours: 168,
    contractRate: 'BWP 120.00/hr',
    timesheetRate: 'BWP 120.00/hr',
    complianceStatus: 'Matched',
    certStatus: 'Valid',
    certExpiry: '2027-04-15',
    payCode: 'REG-01',
    mismatchDetails: null,
  },
  {
    id: 'CMP-902',
    workerName: 'Thabo Mokoena',
    workerId: 'EMP-4105',
    site: 'Orapa Shaft 3',
    jobTitle: 'Underground Blaster',
    loggedHours: 180,
    contractRate: 'BWP 145.00/hr',
    timesheetRate: 'BWP 165.00/hr',
    complianceStatus: 'Rate Mismatch',
    certStatus: 'Valid',
    certExpiry: '2026-11-20',
    payCode: 'OT-1.5',
    mismatchDetails: 'Site supervisor billed OT rate without prior written authorization.',
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: complianceRecords }, { status: 200 });
}

export async function POST(request) {
  try {
    const { id, action } = await request.json();

    if (action === 'FORCE_ALIGN') {
      complianceRecords = complianceRecords.map((item) =>
        item.id === id ? { ...item, complianceStatus: 'Matched', mismatchDetails: null } : item
      );
    }

    return NextResponse.json({ success: true, message: `Compliance record ${id} updated` }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process compliance match' }, { status: 400 });
  }
}