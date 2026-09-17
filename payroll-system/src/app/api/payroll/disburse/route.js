import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy disbursement endpoint is retired. It does not move real money and must never mark payroll as paid. Use the CEO-authorized Payment Center and Accountant payment execution workflow.',
    },
    { status: 410 }
  );
}
