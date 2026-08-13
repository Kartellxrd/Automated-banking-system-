import { NextResponse } from 'next/server';

let stagingBatches = [
  {
    id: 'STG-101',
    workerName: 'Kago Phuthego',
    workerId: 'EMP-8802',
    site: 'Jwaneng Pit B',
    jobTitle: 'Heavy Machinery Operator',
    regularHours: 160,
    otHours: 8,
    grossPayBWP: 21120.00,
    status: 'Ready for Approval',
    period: '01 Aug - 15 Aug 2026',
  },
  {
    id: 'STG-102',
    workerName: 'Thabo Mokoena',
    workerId: 'EMP-4105',
    site: 'Orapa Shaft 3',
    jobTitle: 'Underground Blaster',
    regularHours: 160,
    otHours: 20,
    grossPayBWP: 28050.00,
    status: 'Ready for Approval',
    period: '01 Aug - 15 Aug 2026',
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: stagingBatches }, { status: 200 });
}

export async function POST(request) {
  try {
    const { batchIds } = await request.json(); // Array of IDs e.g. ['STG-101', 'STG-102']

    stagingBatches = stagingBatches.map((item) =>
      batchIds.includes(item.id) ? { ...item, status: 'Approved' } : item
    );

    return NextResponse.json(
      { success: true, message: `Approved ${batchIds.length} staging records.` },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to authorize staging batch' }, { status: 400 });
  }
}