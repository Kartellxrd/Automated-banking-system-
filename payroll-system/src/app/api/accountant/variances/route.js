import { NextResponse } from 'next/server';

// Mock DB initial state
let mockVariances = [
  {
    id: 'VAR-301',
    workerName: 'Thabo Mokoena',
    workerId: 'EMP-4105',
    site: 'Orapa Shaft 3',
    jobTitle: 'Underground Blaster',
    regularHours: 160,
    overtimeHours: 24,
    normalRate: 145.00,
    billedRate: 165.00,
    budgetedAmount: 23200.00,
    stagedAmount: 27160.00,
    variancePercentage: 17.07,
    spikeReason: 'Weekend emergency shaft clearance authorized verbally by site lead.',
    status: 'Flagged',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'VAR-302',
    workerName: 'Kago Phuthego',
    workerId: 'EMP-8802',
    site: 'Jwaneng Pit B',
    jobTitle: 'Heavy Machinery Operator',
    regularHours: 160,
    overtimeHours: 8,
    normalRate: 120.00,
    billedRate: 120.00,
    budgetedAmount: 19200.00,
    stagedAmount: 20640.00,
    variancePercentage: 7.5,
    spikeReason: 'Standard scheduled shift extension.',
    status: 'Audited',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'VAR-303',
    workerName: 'Mpho Molefe',
    workerId: 'EMP-1109',
    site: 'Letlhakane Mine',
    jobTitle: 'Safety Inspector',
    regularHours: 160,
    overtimeHours: 32,
    normalRate: 135.00,
    billedRate: 135.00,
    budgetedAmount: 21600.00,
    stagedAmount: 28080.00,
    variancePercentage: 30.0,
    spikeReason: 'Unplanned compliance audit during weekend shut-down.',
    status: 'Flagged',
    createdAt: new Date().toISOString(),
  },
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    let result = [...mockVariances];

    if (statusFilter && statusFilter !== 'ALL') {
      result = result.filter(
        (item) => item.status.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.workerName.toLowerCase().includes(query) ||
          item.site.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch variances', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { workerName, workerId, site, regularHours, overtimeHours, normalRate, billedRate, spikeReason } = body;

    if (!workerName || !site || !normalRate) {
      return NextResponse.json(
        { success: false, message: 'Missing required variance calculation fields' },
        { status: 400 }
      );
    }

    const reg = Number(regularHours) || 0;
    const ot = Number(overtimeHours) || 0;
    const rate = Number(normalRate) || 0;
    const bRate = Number(billedRate) || rate;

    const budgetedAmount = reg * rate;
    const stagedAmount = reg * rate + ot * bRate * 1.5; // 1.5x Overtime Rate
    const variancePercentage = budgetedAmount > 0 
      ? Number((((stagedAmount - budgetedAmount) / budgetedAmount) * 100).toFixed(2))
      : 0;

    const newVariance = {
      id: `VAR-${Math.floor(100 + Math.random() * 900)}`,
      workerName,
      workerId: workerId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      site,
      jobTitle: body.jobTitle || 'General Worker',
      regularHours: reg,
      overtimeHours: ot,
      normalRate: rate,
      billedRate: bRate,
      budgetedAmount,
      stagedAmount,
      variancePercentage,
      spikeReason: spikeReason || 'Automated system variance detection',
      status: 'Flagged',
      createdAt: new Date().toISOString(),
    };

    mockVariances.unshift(newVariance);

    return NextResponse.json({ success: true, data: newVariance }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to record variance', error: error.message },
      { status: 500 }
    );
  }
}