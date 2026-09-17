import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy payroll export endpoint is retired. Payment exports must be generated only from a CEO-authorized immutable payment run.',
    },
    { status: 410 }
  );
}
