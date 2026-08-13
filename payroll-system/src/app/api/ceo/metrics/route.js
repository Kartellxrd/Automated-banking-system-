import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const metricsData = {
      totalLaborSpend: 428950.0,
      activeSites: 4,
      totalWorkers: 184,
      pendingAuthCount: 2,
      complianceFlags: 0,
      siteExpenditures: [
        { site: 'Jwaneng Open Pit Operation', code: 'JWN-01', laborSpend: 185400.0, workers: 72, variance: '+2.4%' },
        { site: 'Orapa Processing Plant', code: 'ORP-02', laborSpend: 142150.0, workers: 58, variance: '-1.1%' },
        { site: 'Letlhakane Shaft Expansion', code: 'LTK-03', laborSpend: 62400.0, workers: 32, variance: '+0.8%' },
        { site: 'Damtshaa Logistics Hub', code: 'DMT-04', laborSpend: 39000.0, workers: 22, variance: '0.0%' },
      ],
    };

    return NextResponse.json({ success: true, data: metricsData });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch executive metrics.' },
      { status: 500 }
    );
  }
}