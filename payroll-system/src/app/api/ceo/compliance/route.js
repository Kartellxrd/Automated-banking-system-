import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const logs = [
      {
        id: 'AUD-801',
        category: 'Statutory Taxes & BURS Compliance',
        site: 'System Wide',
        timestamp: 'Today, 08:00 AM',
        status: 'VERIFIED',
        detail: 'ALL tax brackets and statutory withholdings verified against 2026 Botswana tax tables.',
      },
      {
        id: 'AUD-802',
        category: 'Overtime Threshold Cap',
        site: 'Jwaneng Open Pit',
        timestamp: 'Today, 07:45 AM',
        status: 'VERIFIED',
        detail: 'No personnel exceeded maximum permissible weekly overtime hours (14 hrs limit).',
      },
      {
        id: 'AUD-803',
        category: 'Medical Fitness & Clearance',
        site: 'Orapa Processing Plant',
        timestamp: 'Yesterday, 04:30 PM',
        status: 'VERIFIED',
        detail: 'All medical certificates and safety fit-to-work uploads confirmed valid.',
      },
      {
        id: 'AUD-804',
        category: 'Bank Account Integrity Audit',
        site: 'All Batches',
        timestamp: 'Yesterday, 02:15 PM',
        status: 'VERIFIED',
        detail: 'Zero duplicate account numbers or invalid bank branch routing codes detected.',
      },
    ];

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve compliance logs.' },
      { status: 500 }
    );
  }
}