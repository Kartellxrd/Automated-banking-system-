import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Kiosk clock-out is not part of Periscope V1 and this unauthenticated legacy endpoint has been retired. V1 attendance is captured by the assigned Site Clerk and submitted to HR.',
    },
    { status: 410 }
  );
}
