import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Legacy CEO metrics endpoint retired. Use /api/ceo/dashboard for live executive data.',
    },
    { status: 410 }
  );
}
