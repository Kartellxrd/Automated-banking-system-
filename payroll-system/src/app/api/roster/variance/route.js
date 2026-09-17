import { NextResponse } from 'next/server';

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy roster-variance endpoint is retired. Attendance corrections must be made in the Site Clerk draft/rejected roster workflow before HR approval.',
    },
    { status: 410 }
  );
}
