import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy payroll calculation endpoint is retired. Payroll must be prepared by the Accountant from HR-approved rosters using the protected payroll workflow.',
    },
    { status: 410 }
  );
}
