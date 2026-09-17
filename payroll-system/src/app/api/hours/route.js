import { NextResponse } from 'next/server';

function retired() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy hours endpoint is retired. Attendance must flow through the protected Site Clerk roster workflow and HR approval before payroll preparation.',
    },
    { status: 410 }
  );
}

export const GET = retired;
export const POST = retired;
export const PATCH = retired;
export const DELETE = retired;
