import { NextResponse } from 'next/server';

function retired() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy roster-lock endpoint is retired. Roster locking/submission is handled by the protected Site Clerk roster workflow and HR review state.',
    },
    { status: 410 }
  );
}

export const GET = retired;
export const POST = retired;
